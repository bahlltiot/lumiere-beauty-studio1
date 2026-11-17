'use strict';

const crypto = require('node:crypto');

const MAX_BODY = 6 * 1024 * 1024;

function send(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function fail(res, status, message, fields) {
  send(res, status, { error: message, ...(fields ? { fields } : {}) });
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        reject(Object.assign(new Error('Слишком большой объём данных'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(Object.assign(new Error('Некорректный JSON'), { status: 400 }));
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Некорректный JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(header = '') {
  const result = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split('$');
    if (algo !== 'scrypt' || !salt || !hash) return false;
    const actual = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/;
const PHONE_RE = /^[+()\d\s-]{10,20}$/;

function cleanText(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

function normalizeEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function normalizePhone(value) {
  return cleanText(value, 30).replace(/\s+/g, ' ');
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidEmail(value) {
  return EMAIL_RE.test(value) && value.length <= 160;
}

function isValidPhone(value) {
  const digits = phoneDigits(value);
  return PHONE_RE.test(value) && digits.length >= 10 && digits.length <= 15;
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /[a-zA-Zа-яА-Я]/.test(value) && /\d/.test(value);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value))) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function timeToMinutes(value) {
  const [h, m] = String(value).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayISO(iso) {
  return new Date(`${iso}T12:00:00`).getDay();
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function formatDateRu(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function bookingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
  return `LM-${code}`;
}

function makeRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return function limit(key) {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }
    let entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const seconds = Math.ceil((entry.resetAt - now) / 1000);
      const error = new Error(`Слишком много попыток. Повторите через ${Math.ceil(seconds / 60)} мин.`);
      error.status = 429;
      error.retryAfter = seconds;
      throw error;
    }
  };
}

module.exports = {
  send,
  fail,
  readBody,
  parseCookies,
  randomToken,
  sha256,
  hashPassword,
  verifyPassword,
  cleanText,
  normalizeEmail,
  normalizePhone,
  phoneDigits,
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidDate,
  isValidTime,
  timeToMinutes,
  minutesToTime,
  todayISO,
  addDaysISO,
  weekdayISO,
  nowMinutes,
  formatDateRu,
  bookingCode,
  makeRateLimiter,
};
