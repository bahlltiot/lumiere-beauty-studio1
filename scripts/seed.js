'use strict';

/**
 * Подготовка демо-базы.
 * Запуск: npm run seed
 *
 * Скрипт создаёт data/lumiere.sqlite и наполняет её демо-данными,
 * если база ещё не существует или пуста. Существующие данные не удаляются.
 */

const fs = require('node:fs');
const path = require('node:path');
const { DB_FILE, DATA_DIR, UPLOAD_DIR, initDb, closeDb } = require('../server/db');

const existed = fs.existsSync(DB_FILE);

initDb();

const { db } = require('../server/db');
const counts = {
  services: db.prepare('SELECT COUNT(*) AS c FROM services').get().c,
  masters: db.prepare('SELECT COUNT(*) AS c FROM masters').get().c,
  gallery: db.prepare('SELECT COUNT(*) AS c FROM gallery').get().c,
  reviews: db.prepare('SELECT COUNT(*) AS c FROM reviews').get().c,
  bookings: db.prepare('SELECT COUNT(*) AS c FROM bookings').get().c,
  users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
};

closeDb();

console.log('');
console.log(existed ? '  База уже существует — данные сохранены.' : '  Демо-база создана.');
console.log(`  Файл:     ${DB_FILE}`);
console.log(`  Данные:   ${DATA_DIR}`);
console.log(`  Загрузки: ${UPLOAD_DIR}`);
console.log('');
console.log(`  Услуги: ${counts.services} · Мастера: ${counts.masters} · Галерея: ${counts.gallery} · Отзывы: ${counts.reviews} · Записи: ${counts.bookings} · Пользователи: ${counts.users}`);
console.log('');
console.log('  Администратор: admin@lumiere.studio / Lumiere2026!');
console.log('  Клиент:        client@lumiere.studio / Client2026!');
console.log('');
console.log('  Запуск сайта:  npm start');
console.log('  Админ-панель:  http://localhost:3000/admin');
console.log('');
console.log('  Чтобы начать с чистого листа, остановите сервер, удалите файл базы');
console.log(`  ${path.relative(process.cwd(), DB_FILE)} и запустите npm run seed снова.`);
console.log('');
