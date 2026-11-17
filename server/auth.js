'use strict';

const { getSetting, db } = require('./db');
const {
  randomToken,
  sha256,
  parseCookies,
  makeRateLimiter,
} = require('./utils');

const SESSION_COOKIE = 'lum_session';
const ADMIN_COOKIE = 'lum_admin';
const CLIENT_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const ADMIN_TTL_MS = 1000 * 60 * 60 * 12;
const SECURE = process.env.COOKIE_SECURE === '1';

const loginLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 12 });
const registerLimiter = makeRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const resetLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 6 });

function cookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (SECURE) parts.push('Secure');
  return parts.join('; ');
}

function setSessionCookie(res, kind, token) {
  const name = kind === 'admin' ? ADMIN_COOKIE : SESSION_COOKIE;
  const ttl = kind === 'admin' ? ADMIN_TTL_MS : CLIENT_TTL_MS;
  res.setHeader('Set-Cookie', cookie(name, token, ttl / 1000));
}

function clearSessionCookie(res, kind) {
  const name = kind === 'admin' ? ADMIN_COOKIE : SESSION_COOKIE;
  res.setHeader('Set-Cookie', cookie(name, '', 0));
}

function createSession(userId, kind) {
  const token = randomToken(32);
  const now = new Date();
  const ttl = kind === 'admin' ? ADMIN_TTL_MS : CLIENT_TTL_MS;
  const expires = new Date(now.getTime() + ttl);
  const table = kind === 'admin' ? 'admin_sessions' : 'sessions';
  db.prepare(`INSERT INTO ${table}(token_hash, user_id, expires_at, created_at) VALUES(?,?,?,?)`)
    .run(sha256(token), userId, expires.toISOString(), now.toISOString());
  return token;
}

function getSessionUser(req, kind) {
  const cookies = parseCookies(req.headers.cookie || '');
  const name = kind === 'admin' ? ADMIN_COOKIE : SESSION_COOKIE;
  const token = cookies[name];
  if (!token || token.length < 20) return null;
  const table = kind === 'admin' ? 'admin_sessions' : 'sessions';
  const row = db
    .prepare(
      `SELECT u.id, u.role, u.name, u.phone, u.email, u.birthdate, u.created_at, s.expires_at
       FROM ${table} s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(sha256(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM ${table} WHERE token_hash = ?`).run(sha256(token));
    return null;
  }
  if (kind === 'admin' && row.role !== 'admin') return null;
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthdate: row.birthdate || '',
    createdAt: row.created_at,
  };
}

function getClientUser(req) {
  return getSessionUser(req, 'client');
}

function getAdminUser(req) {
  return getSessionUser(req, 'admin');
}

function destroySession(req, kind) {
  const cookies = parseCookies(req.headers.cookie || '');
  const name = kind === 'admin' ? ADMIN_COOKIE : SESSION_COOKIE;
  const token = cookies[name];
  if (!token) return;
  const table = kind === 'admin' ? 'admin_sessions' : 'sessions';
  db.prepare(`DELETE FROM ${table} WHERE token_hash = ?`).run(sha256(token));
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (process.env.TRUST_PROXY === '1' && typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function rateLimit(limiter, key) {
  limiter(key);
}

function sameOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === req.headers.host;
  } catch {
    return false;
  }
}

function demoResetLinkEnabled() {
  return process.env.DEMO_RESET_LINK !== '0';
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    birthdate: user.birthdate || '',
    createdAt: user.createdAt,
  };
}

module.exports = {
  SESSION_COOKIE,
  ADMIN_COOKIE,
  loginLimiter,
  registerLimiter,
  resetLimiter,
  setSessionCookie,
  clearSessionCookie,
  createSession,
  getClientUser,
  getAdminUser,
  destroySession,
  clientIp,
  rateLimit,
  sameOrigin,
  demoResetLinkEnabled,
  publicUser,
};
