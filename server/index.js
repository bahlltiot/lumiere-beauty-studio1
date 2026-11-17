'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

// .env должен быть прочитан до загрузки db/auth: они фиксируют DATA_DIR,
// COOKIE_SECURE и другие переменные на этапе require.
loadEnv();

const { initDb, UPLOAD_DIR, DATA_DIR, DB_FILE, closeDb } = require('./db');
const { handleApi } = require('./api');
const { send, fail } = require('./utils');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
};

const PRETTY = {
  '/': '/index.html',
  '/booking': '/booking.html',
  '/booking/': '/booking.html',
  '/account': '/account.html',
  '/account/': '/account.html',
  '/admin': '/admin.html',
  '/admin/': '/admin.html',
  '/privacy': '/privacy.html',
};

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self'; connect-src 'self'; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function serveFile(req, res, filePath, { immutable = false, status = 200 } = {}) {
  if (!fileExists(filePath)) {
    return notFound(req, res);
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const revalidate = ['.html', '.css', '.js', '.mjs', '.json'].includes(ext);
  const cache = immutable ? 'public, max-age=31536000, immutable' : revalidate ? 'no-cache' : 'public, max-age=86400';

  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    return res.end();
  }
  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', stat.size);
    res.writeHead(status);
    return res.end();
  }

  let data = fs.readFileSync(filePath);
  const acceptsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');
  const compressible = /^(text\/|application\/(json|xml|manifest)|image\/svg)/.test(type);
  if (acceptsGzip && compressible && data.length > 1024) {
    data = zlib.gzipSync(data, { level: 6 });
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  res.setHeader('Content-Length', data.length);
  res.writeHead(status);
  res.end(data);
}

function notFound(req, res) {
  const page = path.join(PUBLIC_DIR, '404.html');
  if (fileExists(page)) {
    securityHeaders(res);
    return serveFile(req, res, page, { status: 404 });
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Страница не найдена');
}

function handleStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return notFound(req, res);
  }

  if (PRETTY[pathname]) {
    return serveFile(req, res, path.join(PUBLIC_DIR, PRETTY[pathname]));
  }

  if (pathname.startsWith('/uploads/')) {
    const name = path.basename(pathname);
    const file = path.join(UPLOAD_DIR, name);
    if (!file.startsWith(UPLOAD_DIR)) return notFound(req, res);
    return serveFile(req, res, file, { immutable: true });
  }

  const safePath = path.normalize(pathname).replace(/^([/\\])+/, '');
  const file = path.join(PUBLIC_DIR, safePath);
  if (!file.startsWith(PUBLIC_DIR)) return notFound(req, res);

  if (fileExists(file) && fs.statSync(file).isFile()) {
    return serveFile(req, res, file, { immutable: pathname.startsWith('/assets/') });
  }

  if (!path.extname(pathname)) {
    const html = path.join(PUBLIC_DIR, `${safePath}.html`);
    if (fileExists(html)) return serveFile(req, res, html);
  }

  return notFound(req, res);
}

initDb();

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Некорректный запрос');
  }

  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    try {
      await handleApi(req, res, url);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) console.error('[api]', req.method, url.pathname, error);
      if (!res.headersSent) fail(res, status, status >= 500 ? 'Внутренняя ошибка сервера' : error.message);
      else res.end();
    }
    return;
  }

  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    return res.end('Метод не поддерживается');
  }

  handleStatic(req, res, url);
});

server.on('error', (error) => {
  console.error('[server]', error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  LUMIÈRE — сайт студии красоты');
  console.log(`  Локально:  http://localhost:${PORT}`);
  console.log(`  Админка:  http://localhost:${PORT}/admin`);
  console.log(`  База:     ${DB_FILE}`);
  console.log(`  Данные:   ${DATA_DIR}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('  Демо-доступ администратора: admin@lumiere.studio / Lumiere2026!');
    console.log('  Демо-клиент:               client@lumiere.studio / Client2026!');
  }
  console.log('');
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal}: остановка…`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => console.error('[uncaught]', error));
process.on('unhandledRejection', (error) => console.error('[unhandled]', error));
