'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config/site.config');
const { hashPassword, todayISO, addDaysISO, weekdayISO } = require('./utils');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'lumiere.sqlite');

let db;

/**
 * Стабильная ссылка на базу для модулей, которые загружаются до initDb().
 * Позволяет безопасно деструктурировать `const { db } = require('./db')`.
 */
const dbProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!db) throw new Error('База данных не инициализирована. Вызовите initDb() до первого запроса.');
      const value = Reflect.get(db, prop);
      return typeof value === 'function' ? value.bind(db) : value;
    },
  }
);

function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDb() {
  ensureDirs();
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      birthdate TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      short TEXT NOT NULL,
      description TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      image TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS masters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      photo TEXT NOT NULL,
      experience TEXT NOT NULL,
      bio TEXT NOT NULL,
      services TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      service_id INTEGER NOT NULL REFERENCES services(id),
      master_id INTEGER NOT NULL REFERENCES masters(id),
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','canceled')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      comment TEXT,
      price INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
      ON bookings(master_id, date, time)
      WHERE status IN ('pending','confirmed');

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, master_id);

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start TEXT,
      end TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedIfEmpty();
  cleanupSessions();
}

function cleanupSessions() {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now);
  db.prepare('DELETE FROM password_resets WHERE expires_at < ? OR used = 1').run(now);
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = null;
    }
  }
  return out;
}

function isScheduleOpen(date) {
  const day = weekdayISO(date);
  const rules = getSetting('schedule') || config.schedule;
  const rule = rules.find((r) => Number(r.weekday) === day);
  return Boolean(rule && rule.open);
}

function seedIfEmpty() {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM settings').get();
  if (existing.c > 0) return;

  db.exec('BEGIN IMMEDIATE');
  try {
    setSetting('brand', config.brand);
    setSetting('seo', config.seo);
    setSetting('theme', config.theme);
    setSetting('contacts', config.contacts);
    setSetting('about', config.about);
    setSetting('schedule', config.schedule);
    setSetting('booking', config.booking);

    const now = new Date().toISOString();
    const insertUser = db.prepare(
      'INSERT INTO users(role, name, phone, email, password_hash, created_at) VALUES(?,?,?,?,?,?)'
    );
    insertUser.run('admin', 'Администратор', '+7 (495) 120-45-67', 'admin@lumiere.studio', hashPassword('Lumiere2026!'), now);
    const clientId = Number(
      insertUser.run('client', 'Наталья Смирнова', '+7 (916) 555-24-18', 'client@lumiere.studio', hashPassword('Client2026!'), now)
        .lastInsertRowid
    );

    const insertService = db.prepare(
      `INSERT INTO services(slug, title, short, description, duration, price, category, image, active, sort)
       VALUES(?,?,?,?,?,?,?,?,1,?)`
    );
    config.services.forEach((s, i) =>
      insertService.run(s.slug, s.title, s.short, s.description, s.duration, s.price, s.category, s.image, i)
    );

    const insertMaster = db.prepare(
      `INSERT INTO masters(name, role, photo, experience, bio, services, active, sort)
       VALUES(?,?,?,?,?,?,1,?)`
    );
    const masterIds = config.masters.map((m, i) =>
      Number(
        insertMaster.run(m.name, m.role, m.photo, m.experience, m.bio, JSON.stringify(m.services), i).lastInsertRowid
      )
    );

    const insertGallery = db.prepare(
      'INSERT INTO gallery(title, category, image, sort, active) VALUES(?,?,?,?,1)'
    );
    config.gallery.forEach((g, i) => insertGallery.run(g.title, g.category, g.image, i));

    const insertReview = db.prepare(
      'INSERT INTO reviews(user_id, name, rating, text, status, demo, created_at) VALUES(?,?,?,?,?,?,?)'
    );
    config.reviews.forEach((r) =>
      insertReview.run(null, r.name, r.rating, r.text, 'approved', r.demo ? 1 : 0, `${r.date}T12:00:00.000Z`)
    );

    const services = db.prepare('SELECT id, slug, price, duration FROM services').all();
    const svc = (slug) => services.find((s) => s.slug === slug);
    const insertBooking = db.prepare(
      `INSERT INTO bookings(code, user_id, service_id, master_id, date, time, status, name, phone, email, comment, price, duration, created_at, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    const findOpenDate = (startOffset) => {
      let date = addDaysISO(todayISO(), startOffset);
      for (let i = 0; i < 10; i++) {
        if (isScheduleOpen(date)) return date;
        date = addDaysISO(date, 1);
      }
      return date;
    };

    const d1 = findOpenDate(2);
    const d2 = findOpenDate(4);
    const d3 = addDaysISO(todayISO(), -14);

    insertBooking.run(
      'LM-DEMO01', clientId, svc('narashchivanie-resnic').id, masterIds[0], d1, '12:00', 'confirmed',
      'Наталья Смирнова', '+7 (916) 555-24-18', 'client@lumiere.studio', '', svc('narashchivanie-resnic').price,
      svc('narashchivanie-resnic').duration, now, now
    );
    insertBooking.run(
      'LM-DEMO02', clientId, svc('oformlenie-brovej').id, masterIds[1], d2, '16:00', 'pending',
      'Наталья Смирнова', '+7 (916) 555-24-18', 'client@lumiere.studio', 'Хочу мягкую форму', svc('oformlenie-brovej').price,
      svc('oformlenie-brovej').duration, now, now
    );
    insertBooking.run(
      'LM-DEMO03', clientId, svc('okrashivanie-brovej').id, masterIds[0], d3, '15:00', 'completed',
      'Наталья Смирнова', '+7 (916) 555-24-18', 'client@lumiere.studio', '', svc('okrashivanie-brovej').price,
      svc('okrashivanie-brovej').duration, now, now
    );
    insertBooking.run(
      'LM-DEMO04', null, svc('laminovanie-resnic').id, masterIds[0], d2, '11:00', 'confirmed',
      'Ирина Полякова', '+7 (903) 777-12-05', 'irina@example.com', '', svc('laminovanie-resnic').price,
      svc('laminovanie-resnic').duration, now, now
    );

    db.exec('COMMIT');
    console.log(`[db] Демо-данные созданы: ${DB_FILE}`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function closeDb() {
  if (db) db.close();
}

module.exports = {
  ROOT,
  DATA_DIR,
  UPLOAD_DIR,
  DB_FILE,
  db: dbProxy,
  initDb,
  closeDb,
  getSetting,
  setSetting,
  getSettings,
};
