'use strict';

const { db, getSetting } = require('./db');
const {
  timeToMinutes,
  minutesToTime,
  todayISO,
  addDaysISO,
  weekdayISO,
  isValidDate,
  isValidTime,
  nowMinutes,
  bookingCode,
} = require('./utils');

const ACTIVE_STATUSES = ['pending', 'confirmed'];

function getBookingRules() {
  return getSetting('booking') || {
    slotStep: 30,
    leadHours: 2,
    cancelHours: 24,
    horizonDays: 45,
  };
}

function getSchedule() {
  return getSetting('schedule') || [];
}

function getService(slug) {
  return db.prepare('SELECT * FROM services WHERE slug = ? AND active = 1').get(String(slug || ''));
}

function getServiceById(id) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(Number(id));
}

function getMaster(id) {
  return db.prepare('SELECT * FROM masters WHERE id = ? AND active = 1').get(Number(id));
}

function getMasterById(id) {
  return db.prepare('SELECT * FROM masters WHERE id = ?').get(Number(id));
}

function masterHandlesService(master, service) {
  try {
    const list = JSON.parse(master.services || '[]');
    return Array.isArray(list) && (list.length === 0 || list.includes(service.slug));
  } catch {
    return false;
  }
}

function dayRule(date) {
  const weekday = weekdayISO(date);
  return getSchedule().find((r) => Number(r.weekday) === weekday);
}

function getBlocks(date) {
  return db.prepare('SELECT start, end FROM blocks WHERE date = ?').all(date);
}

function getBookingsForDay(date, masterId) {
  return db
    .prepare(
      `SELECT time, duration FROM bookings
       WHERE date = ? AND master_id = ? AND status IN ('pending','confirmed')`
    )
    .all(date, Number(masterId));
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function computeDay({ date, service, master }) {
  const result = { date, open: false, reason: '', slots: [] };
  if (!isValidDate(date)) {
    result.reason = 'Некорректная дата';
    return result;
  }
  if (!service || !master) {
    result.reason = 'Выберите услугу и мастера';
    return result;
  }
  if (!masterHandlesService(master, service)) {
    result.reason = 'Мастер не оказывает эту услугу';
    return result;
  }

  const today = todayISO();
  const rules = getBookingRules();
  const maxDate = addDaysISO(today, rules.horizonDays || 45);
  if (date < today) {
    result.reason = 'Дата уже прошла';
    return result;
  }
  if (date > maxDate) {
    result.reason = 'Запись открыта на ближайшие недели';
    return result;
  }

  const rule = dayRule(date);
  if (!rule || !rule.open) {
    result.reason = 'В этот день студия не работает';
    return result;
  }

  const openMin = timeToMinutes(rule.start);
  const closeMin = timeToMinutes(rule.end);
  const duration = Number(service.duration);
  const step = Math.max(15, Number(rules.slotStep) || 30);
  const lead = Number(rules.leadHours || 0) * 60;
  const blocks = getBlocks(date);
  const bookings = getBookingsForDay(date, master.id);
  const effectiveMin = date === today ? nowMinutes() + lead : 0;

  const fullDayBlock = blocks.some((b) => !b.start && !b.end);
  if (fullDayBlock) {
    result.reason = 'В этот день студия не работает';
    return result;
  }

  for (let t = openMin; t + duration <= closeMin; t += step) {
    if (t < effectiveMin) continue;
    const end = t + duration;
    const busy = bookings.some((b) => {
      const bStart = timeToMinutes(b.time);
      return overlaps(t, end, bStart, bStart + Number(b.duration));
    });
    const blocked = blocks.some((b) => {
      const bStart = b.start ? timeToMinutes(b.start) : 0;
      const bEnd = b.end ? timeToMinutes(b.end) : 24 * 60;
      return overlaps(t, end, bStart, bEnd);
    });
    if (!busy && !blocked) {
      result.slots.push(minutesToTime(t));
    }
  }

  result.open = result.slots.length > 0;
  if (!result.open) {
    result.reason = date === today && openMin < effectiveMin && openMin + duration <= effectiveMin
      ? 'На сегодня свободных окон уже нет'
      : 'На этот день свободных окон нет';
  }
  return result;
}

function getCalendar({ serviceSlug, masterId, from, days = 14 }) {
  const service = getService(serviceSlug);
  const master = getMaster(masterId);
  const start = isValidDate(from) ? from : todayISO();
  const count = Math.min(31, Math.max(1, Number(days) || 14));
  const out = [];
  for (let i = 0; i < count; i++) {
    const date = addDaysISO(start, i);
    const day = computeDay({ date, service, master });
    out.push({
      date,
      open: day.open,
      slotsCount: day.slots.length,
      firstTime: day.slots[0] || null,
      reason: day.reason,
    });
  }
  return out;
}

function normalizeStatus(status) {
  return ['pending', 'confirmed', 'completed', 'canceled'].includes(status) ? status : null;
}

function allowedTransition(current, next) {
  if (current === next) return true;
  const map = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['completed', 'canceled'],
    canceled: ['pending'],
    completed: [],
  };
  return (map[current] || []).includes(next);
}

function parseDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function canCancel(booking, rules = getBookingRules()) {
  if (!['pending', 'confirmed'].includes(booking.status)) return false;
  const start = parseDateTime(booking.date, booking.time);
  const hours = (start.getTime() - Date.now()) / 3600000;
  return hours >= Number(rules.cancelHours || 0);
}

function createBooking({ service, master, date, time, name, phone, email, comment, userId }) {
  const rules = getBookingRules();
  const day = computeDay({ date, service, master });
  if (!day.slots.includes(time)) {
    const error = new Error('Это время уже занято. Пожалуйста, выберите другое окно.');
    error.status = 409;
    throw error;
  }
  const now = new Date().toISOString();
  let code = bookingCode();
  for (let i = 0; i < 5; i++) {
    const exists = db.prepare('SELECT 1 FROM bookings WHERE code = ?').get(code);
    if (!exists) break;
    code = bookingCode();
  }
  const insert = db.prepare(
    `INSERT INTO bookings(code, user_id, service_id, master_id, date, time, status, name, phone, email, comment, price, duration, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  db.exec('BEGIN IMMEDIATE');
  try {
    const check = db.prepare(
      `SELECT 1 FROM bookings WHERE master_id = ? AND date = ? AND time = ? AND status IN ('pending','confirmed')`
    ).get(master.id, date, time);
    if (check) {
      const error = new Error('Это время уже занято. Пожалуйста, выберите другое окно.');
      error.status = 409;
      throw error;
    }
    const info = insert.run(
      code,
      userId || null,
      service.id,
      master.id,
      date,
      time,
      'pending',
      name,
      phone,
      email,
      comment || '',
      Number(service.price),
      Number(service.duration),
      now,
      now
    );
    db.exec('COMMIT');
    void rules;
    return getBookingById(Number(info.lastInsertRowid));
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    if (String(error.message).includes('UNIQUE constraint')) {
      const conflict = new Error('Это время уже занято. Пожалуйста, выберите другое окно.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

const BOOKING_SELECT = `
  SELECT b.*, s.title AS service_title, s.slug AS service_slug, s.image AS service_image,
         m.name AS master_name, m.role AS master_role, m.photo AS master_photo
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN masters m ON m.id = b.master_id
`;

function getBookingById(id) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(Number(id));
}

function getBookingByCode(code) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.code = ?`).get(String(code || ''));
}

function listUserBookings(userId) {
  return db
    .prepare(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.date DESC, b.time DESC`)
    .all(Number(userId));
}

function listAllBookings({ status, date, search } = {}) {
  let sql = `${BOOKING_SELECT} WHERE 1=1`;
  const params = [];
  if (status && normalizeStatus(status)) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  if (date && isValidDate(date)) {
    sql += ' AND b.date = ?';
    params.push(date);
  }
  if (search) {
    sql += ' AND (b.name LIKE ? OR b.phone LIKE ? OR b.code LIKE ? OR b.email LIKE ?)';
    const q = `%${String(search).slice(0, 60)}%`;
    params.push(q, q, q, q);
  }
  sql += ' ORDER BY b.date DESC, b.time DESC LIMIT 500';
  return db.prepare(sql).all(...params);
}

function getUpcomingBookings(limit = 6) {
  return db
    .prepare(
      `${BOOKING_SELECT}
       WHERE b.date >= ? AND b.status IN ('pending','confirmed')
       ORDER BY b.date ASC, b.time ASC LIMIT ?`
    )
    .all(todayISO(), Number(limit));
}

function updateBookingStatus(id, status) {
  const booking = getBookingById(id);
  if (!booking) {
    const e = new Error('Запись не найдена');
    e.status = 404;
    throw e;
  }
  if (!normalizeStatus(status)) {
    const e = new Error('Некорректный статус');
    e.status = 400;
    throw e;
  }
  if (!allowedTransition(booking.status, status)) {
    const e = new Error(`Нельзя изменить статус «${booking.status}» на «${status}»`);
    e.status = 400;
    throw e;
  }
  db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    new Date().toISOString(),
    booking.id
  );
  return getBookingById(id);
}

function isValidSlotShape(date, time) {
  return isValidDate(date) && isValidTime(time);
}

module.exports = {
  getBookingRules,
  getSchedule,
  getService,
  getServiceById,
  getMaster,
  getMasterById,
  masterHandlesService,
  computeDay,
  getCalendar,
  createBooking,
  canCancel,
  getBookingById,
  getBookingByCode,
  listUserBookings,
  listAllBookings,
  getUpcomingBookings,
  updateBookingStatus,
  normalizeStatus,
  isValidSlotShape,
  ACTIVE_STATUSES,
};
