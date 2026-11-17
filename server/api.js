'use strict';

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config/site.config');
const { db, getSettings, getSetting, setSetting, UPLOAD_DIR } = require('./db');
const {
  send,
  fail,
  readBody,
  cleanText,
  normalizeEmail,
  normalizePhone,
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidDate,
  isValidTime,
  timeToMinutes,
  todayISO,
  addDaysISO,
  hashPassword,
  verifyPassword,
  randomToken,
  sha256,
  formatDateRu,
  makeRateLimiter,
} = require('./utils');
const {
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
} = require('./auth');
const bookings = require('./bookings');

const CATEGORIES = { lash: 'Ресницы', brow: 'Брови', care: 'Уход', studio: 'Студия' };
const REVIEW_STATUS = ['pending', 'approved', 'rejected'];
const SETTINGS_KEYS = ['brand', 'seo', 'theme', 'contacts', 'about', 'schedule', 'booking'];

function nowISO() {
  return new Date().toISOString();
}

function rowToService(row) {
  return { ...row, active: Boolean(row.active), price: Number(row.price), duration: Number(row.duration) };
}

function rowToMaster(row) {
  let services = [];
  try {
    services = JSON.parse(row.services || '[]');
  } catch {}
  return { ...row, services, active: Boolean(row.active) };
}

function rowToGallery(row) {
  return { ...row, active: Boolean(row.active) };
}

function rowToReview(row) {
  return {
    id: row.id,
    name: row.name,
    rating: Number(row.rating),
    text: row.text,
    date: String(row.created_at).slice(0, 10),
    dateLabel: formatDateRu(String(row.created_at).slice(0, 10)),
    demo: Boolean(row.demo),
    status: row.status,
    createdAt: row.created_at,
  };
}

function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    time: row.time,
    status: row.status,
    name: row.name,
    phone: row.phone,
    email: row.email,
    comment: row.comment || '',
    price: Number(row.price),
    duration: Number(row.duration),
    createdAt: row.created_at,
    service: {
      id: row.service_id,
      title: row.service_title,
      slug: row.service_slug,
      image: row.service_image,
    },
    master: {
      id: row.master_id,
      name: row.master_name,
      role: row.master_role,
      photo: row.master_photo,
    },
    canCancel: bookings.canCancel(row),
  };
}

function sitePayload() {
  const settings = getSettings();
  const services = db
    .prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id')
    .all()
    .map(rowToService);
  const masters = db
    .prepare('SELECT * FROM masters WHERE active = 1 ORDER BY sort, id')
    .all()
    .map(rowToMaster);
  const gallery = db
    .prepare('SELECT * FROM gallery WHERE active = 1 ORDER BY sort, id')
    .all()
    .map(rowToGallery);
  return {
    brand: settings.brand || config.brand,
    seo: settings.seo || config.seo,
    theme: settings.theme || config.theme,
    contacts: settings.contacts || config.contacts,
    about: settings.about || config.about,
    schedule: settings.schedule || config.schedule,
    booking: settings.booking || config.booking,
    categories: CATEGORIES,
    services,
    masters,
    gallery,
  };
}

function getServiceInput(body, current = {}) {
  const title = cleanText(body.title ?? current.title, 80);
  const short = cleanText(body.short ?? current.short, 160);
  const description = cleanText(body.description ?? current.description, 1200);
  const duration = Number(body.duration ?? current.duration);
  const price = Number(body.price ?? current.price);
  const category = String(body.category ?? current.category ?? 'lash');
  const image = safeImage(body.image ?? current.image);
  const active = body.active === undefined ? (current.active === undefined ? true : Boolean(current.active)) : Boolean(body.active);
  const fields = {};
  if (title.length < 2) fields.title = 'Укажите название';
  if (short.length < 5) fields.short = 'Добавьте короткое описание';
  if (description.length < 20) fields.description = 'Добавьте описание (минимум 20 символов)';
  if (!Number.isInteger(duration) || duration < 15 || duration > 600) fields.duration = 'Длительность: от 15 до 600 минут';
  if (!Number.isInteger(price) || price < 0 || price > 1000000) fields.price = 'Некорректная стоимость';
  if (!CATEGORIES[category] || category === 'studio') fields.category = 'Выберите категорию';
  if (!image) fields.image = 'Добавьте фотографию';
  if (Object.keys(fields).length) return { error: fields };
  return {
    value: { title, short, description, duration, price, category, image, active },
  };
}

function safeImage(value) {
  const image = cleanText(value, 1200);
  if (!image) return '';
  if (image.startsWith('https://') || image.startsWith('/uploads/') || image.startsWith('/assets/')) return image;
  return '';
}

function slugify(text) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(text)
    .toLowerCase()
    .split('')
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function uniqueSlug(base, ignoreId = 0) {
  let slug = base || 'usluga';
  let i = 2;
  while (db.prepare('SELECT 1 FROM services WHERE slug = ? AND id != ?').get(slug, Number(ignoreId))) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

function getAdminStats() {
  const today = todayISO();
  const todayCount = db.prepare(
    "SELECT COUNT(*) AS c FROM bookings WHERE date = ? AND status != 'canceled'"
  ).get(today).c;
  const pending = db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = 'pending'").get().c;
  const weekRevenue = db.prepare(
    "SELECT COALESCE(SUM(price),0) AS s FROM bookings WHERE status IN ('confirmed','completed') AND date >= ?"
  ).get(addDaysISO(today, -7)).s;
  const clients = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'client'").get().c;
  const rating = db.prepare(
    "SELECT COALESCE(ROUND(AVG(rating),1),0) AS r, COUNT(*) AS c FROM reviews WHERE status = 'approved'"
  ).get();
  return {
    todayBookings: todayCount,
    pending,
    weekRevenue: Number(weekRevenue),
    clients,
    rating: Number(rating.r),
    reviews: rating.c,
  };
}

function validateSettings(key, value) {
  if (!SETTINGS_KEYS.includes(key)) throw Object.assign(new Error('Неизвестный раздел настроек'), { status: 400 });
  if (!value || typeof value !== 'object') throw Object.assign(new Error('Некорректные данные'), { status: 400 });
  const current = getSetting(key) || {};
  const result = { ...current };

  if (key === 'brand') {
    for (const field of ['name', 'suffix', 'tagline', 'legalName', 'description', 'heroTitle', 'heroAccent', 'heroText', 'founded', 'city']) {
      if (value[field] !== undefined) result[field] = cleanText(value[field], field === 'description' || field === 'heroText' ? 500 : 120);
    }
    if (value.heroImage !== undefined) result.heroImage = safeImage(value.heroImage);
    if (value.logoImage !== undefined) result.logoImage = safeImage(value.logoImage);
    if (!result.name) throw Object.assign(new Error('Название бренда обязательно'), { status: 400 });
  }

  if (key === 'seo') {
    for (const field of ['title', 'description', 'keywords']) {
      if (value[field] !== undefined) result[field] = cleanText(value[field], field === 'description' ? 300 : 160);
    }
  }

  if (key === 'contacts') {
    for (const field of ['phone', 'phoneHref', 'email', 'address', 'metro', 'hours', 'hoursNote', 'mapEmbed', 'mapLink']) {
      if (value[field] !== undefined) result[field] = cleanText(value[field], field === 'mapEmbed' ? 1000 : 200);
    }
    if (value.email !== undefined && !isValidEmail(result.email)) {
      throw Object.assign(new Error('Некорректный email студии'), { status: 400 });
    }
    if (value.socials && typeof value.socials === 'object') {
      result.socials = { ...(current.socials || {}) };
      for (const network of ['instagram', 'telegram', 'whatsapp', 'vk']) {
        if (value.socials[network] !== undefined) {
          const link = cleanText(value.socials[network], 300);
          if (link && !/^https?:\/\//.test(link)) {
            throw Object.assign(new Error(`Ссылка ${network} должна начинаться с https://`), { status: 400 });
          }
          result.socials[network] = link;
        }
      }
    }
    if (result.mapEmbed && !/^https:\/\//.test(result.mapEmbed)) {
      throw Object.assign(new Error('Ссылка карты должна начинаться с https://'), { status: 400 });
    }
  }

  if (key === 'theme') {
    const colors = value.colors && typeof value.colors === 'object' ? value.colors : {};
    const allowed = ['bg', 'surface', 'card', 'ink', 'muted', 'line', 'accent', 'accentSoft', 'accentDeep', 'dark', 'onDark'];
    result.colors = { ...(current.colors || {}) };
    for (const name of allowed) {
      if (colors[name] !== undefined) {
        const color = String(colors[name]).trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
          throw Object.assign(new Error(`Цвет «${name}» должен быть в формате #RRGGBB`), { status: 400 });
        }
        result.colors[name] = color;
      }
    }
    if (value.preset !== undefined) {
      result.preset = config.themePresets[value.preset] ? value.preset : 'custom';
    }
    if (value.fonts && typeof value.fonts === 'object') {
      const heading = String(value.fonts.heading || result.fonts.heading);
      const body = String(value.fonts.body || result.fonts.body);
      if (!config.headingFonts.includes(heading) || !config.bodyFonts.includes(body)) {
        throw Object.assign(new Error('Выберите шрифт из предложенного списка'), { status: 400 });
      }
      result.fonts = { heading, body };
    }
  }

  if (key === 'about') {
    for (const field of ['name', 'role', 'experience', 'clients', 'quote', 'bio', 'approach']) {
      if (value[field] !== undefined) result[field] = cleanText(value[field], 1500);
    }
    for (const field of ['photo', 'secondaryPhoto']) {
      if (value[field] !== undefined) result[field] = safeImage(value[field]);
    }
    if (Array.isArray(value.education)) {
      result.education = value.education.map((v) => cleanText(v, 250)).filter(Boolean).slice(0, 12);
    }
    if (Array.isArray(value.advantages)) {
      result.advantages = value.advantages
        .map((v) => ({ title: cleanText(v.title, 80), text: cleanText(v.text, 300) }))
        .filter((v) => v.title && v.text)
        .slice(0, 6);
    }
  }

  if (key === 'schedule') {
    if (!Array.isArray(value) || value.length !== 7) {
      throw Object.assign(new Error('Расписание должно содержать 7 дней'), { status: 400 });
    }
    const days = [];
    const seen = new Set();
    for (const day of value) {
      const weekday = Number(day.weekday);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || seen.has(weekday)) {
        throw Object.assign(new Error('Некорректный день недели'), { status: 400 });
      }
      seen.add(weekday);
      const start = String(day.start || '10:00');
      const end = String(day.end || '20:00');
      if (!isValidTime(start) || !isValidTime(end) || timeToMinutes(start) >= timeToMinutes(end)) {
        throw Object.assign(new Error('Проверьте часы работы'), { status: 400 });
      }
      const labels = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      days.push({ weekday, label: labels[weekday], open: Boolean(day.open), start, end });
    }
    days.sort((a, b) => ((a.weekday || 7) - (b.weekday || 7)));
    return days;
  }

  if (key === 'booking') {
    const limits = { slotStep: [15, 60], leadHours: [0, 72], cancelHours: [0, 168], horizonDays: [1, 120] };
    for (const [field, [min, max]] of Object.entries(limits)) {
      if (value[field] !== undefined) {
        const num = Number(value[field]);
        if (!Number.isFinite(num) || num < min || num > max) {
          throw Object.assign(new Error(`Параметр «${field}» вне допустимых значений`), { status: 400 });
        }
        result[field] = Math.round(num);
      }
    }
  }

  return result;
}

function isJsonRequest(req) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (type.startsWith('application/json')) return true;
  // POST/DELETE без тела (отмена, выход, удаление) допустимы без Content-Type.
  const length = Number(req.headers['content-length'] || 0);
  return length === 0 && !req.headers['transfer-encoding'];
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 (***) ***-**-${digits.slice(-2)}`;
  }
  if (digits.length >= 6) return `${digits.slice(0, 2)} *** ${digits.slice(-2)}`;
  return '***';
}

function isValidImageBuffer(buffer, ext) {
  if (ext === 'png') {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (ext === 'jpg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === 'webp') {
    return buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

function clientBookingVisibility(user, booking) {
  return booking.user_id === user.id;
}

async function handleApi(req, res, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/api';
  const query = url.searchParams;

  if (!sameOrigin(req)) {
    return fail(res, 403, 'Запрос отклонён: неверный источник');
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !isJsonRequest(req)) {
    return fail(res, 415, 'Ожидается application/json');
  }

  const method = req.method;

  // ---------- PUBLIC ----------
  if (method === 'GET' && p === '/api') {
    return send(res, 200, { name: 'LUMIÈRE API', version: '1.0.0' });
  }

  if (method === 'GET' && p === '/api/site') {
    return send(res, 200, sitePayload());
  }

  if (method === 'GET' && p === '/api/services') {
    const rows = db
      .prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id')
      .all()
      .map(rowToService);
    return send(res, 200, { services: rows });
  }

  if (method === 'GET' && p.startsWith('/api/services/')) {
    const slug = decodeURIComponent(p.slice('/api/services/'.length));
    const row = db.prepare('SELECT * FROM services WHERE slug = ? AND active = 1').get(slug);
    if (!row) return fail(res, 404, 'Услуга не найдена');
    return send(res, 200, { service: rowToService(row) });
  }

  if (method === 'GET' && p === '/api/masters') {
    const rows = db.prepare('SELECT * FROM masters WHERE active = 1 ORDER BY sort, id').all().map(rowToMaster);
    return send(res, 200, { masters: rows });
  }

  if (method === 'GET' && p === '/api/gallery') {
    const rows = db.prepare('SELECT * FROM gallery WHERE active = 1 ORDER BY sort, id').all().map(rowToGallery);
    return send(res, 200, { gallery: rows, categories: CATEGORIES });
  }

  if (method === 'GET' && p === '/api/reviews') {
    const rows = db
      .prepare("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC LIMIT 100")
      .all()
      .map(rowToReview);
    const avg = rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0;
    return send(res, 200, { reviews: rows, average: Number(avg.toFixed(1)), count: rows.length });
  }

  if (method === 'GET' && p === '/api/availability') {
    const service = bookings.getService(query.get('service'));
    const master = bookings.getMaster(query.get('master'));
    if (!service || !master) return fail(res, 400, 'Выберите услугу и мастера');
    const day = bookings.computeDay({ date: query.get('date'), service, master });
    return send(res, 200, day);
  }

  if (method === 'GET' && p === '/api/availability/calendar') {
    const service = bookings.getService(query.get('service'));
    const master = bookings.getMaster(query.get('master'));
    if (!service || !master) return fail(res, 400, 'Выберите услугу и мастера');
    const calendar = bookings.getCalendar({
      serviceSlug: service.slug,
      masterId: master.id,
      from: query.get('from') || todayISO(),
      days: query.get('days') || 14,
    });
    return send(res, 200, { calendar });
  }

  if (method === 'GET' && p.startsWith('/api/bookings/')) {
    const code = decodeURIComponent(p.slice('/api/bookings/'.length));
    const row = bookings.getBookingByCode(code);
    if (!row) return fail(res, 404, 'Запись не найдена');
    const booking = rowToBooking(row);
    return send(res, 200, {
      booking: {
        ...booking,
        phone: maskPhone(booking.phone),
        email: booking.email ? booking.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : '',
      },
    });
  }

  if (method === 'POST' && p === '/api/bookings') {
    const ip = clientIp(req);
    rateLimit(bookingRateLimiter, ip);
    const body = await readBody(req);
    const service = bookings.getService(body.serviceSlug);
    const master = bookings.getMaster(body.masterId);
    if (!service) return fail(res, 400, 'Услуга не найдена');
    if (!master) return fail(res, 400, 'Мастер не найден');
    const name = cleanText(body.name, 80);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const comment = cleanText(body.comment, 500);
    const fields = {};
    if (name.length < 2) fields.name = 'Укажите имя';
    if (!isValidPhone(phone)) fields.phone = 'Укажите корректный телефон';
    if (!isValidEmail(email)) fields.email = 'Укажите корректный email';
    if (!bookings.isValidSlotShape(body.date, body.time)) fields.time = 'Выберите дату и время';
    if (Object.keys(fields).length) return fail(res, 400, 'Проверьте заполнение формы', fields);
    const user = getClientUser(req);
    const booking = bookings.createBooking({
      service,
      master,
      date: body.date,
      time: body.time,
      name,
      phone,
      email,
      comment,
      userId: user ? user.id : null,
    });
    return send(res, 201, { booking: rowToBooking(booking) });
  }

  // ---------- AUTH ----------
  if (method === 'POST' && p === '/api/auth/register') {
    rateLimit(registerLimiter, clientIp(req));
    const body = await readBody(req);
    const name = cleanText(body.name, 80);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const fields = {};
    if (name.length < 2) fields.name = 'Укажите имя и фамилию';
    if (!isValidPhone(phone)) fields.phone = 'Укажите корректный телефон';
    if (!isValidEmail(email)) fields.email = 'Укажите корректный email';
    if (!isValidPassword(password)) fields.password = 'Минимум 8 символов, буквы и цифры';
    if (Object.keys(fields).length) return fail(res, 400, 'Проверьте заполнение формы', fields);
    const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
    if (exists) return fail(res, 409, 'Пользователь с таким email уже зарегистрирован', { email: 'Этот email уже используется' });
    const info = db.prepare(
      'INSERT INTO users(role, name, phone, email, password_hash, created_at) VALUES(?,?,?,?,?,?)'
    ).run('client', name, phone, email, hashPassword(password), nowISO());
    const userId = Number(info.lastInsertRowid);
    const token = createSession(userId, 'client');
    setSessionCookie(res, 'client', token);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return send(res, 201, { user: publicUser({ ...user, createdAt: user.created_at }) });
  }

  if (method === 'POST' && p === '/api/auth/login') {
    rateLimit(loginLimiter, clientIp(req));
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!isValidEmail(email) || !password) return fail(res, 400, 'Укажите email и пароль');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return fail(res, 401, 'Неверный email или пароль');
    }
    const token = createSession(user.id, 'client');
    setSessionCookie(res, 'client', token);
    return send(res, 200, { user: publicUser({ ...user, createdAt: user.created_at }) });
  }

  if (method === 'POST' && p === '/api/auth/logout') {
    destroySession(req, 'client');
    clearSessionCookie(res, 'client');
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && p === '/api/auth/me') {
    const user = getClientUser(req);
    if (user) return send(res, 200, { user: publicUser(user), adminAuthenticated: Boolean(getAdminUser(req)) });
    return send(res, 200, { user: null, adminAuthenticated: Boolean(getAdminUser(req)) });
  }

  if (method === 'POST' && p === '/api/auth/forgot') {
    rateLimit(resetLimiter, clientIp(req));
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const generic = { ok: true, message: 'Если email зарегистрирован, мы отправили ссылку для восстановления доступа.' };
    if (!isValidEmail(email)) return fail(res, 400, 'Укажите корректный email');
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'client'").get(email);
    if (!user) return send(res, 200, generic);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
    const token = randomToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_resets(token_hash, user_id, expires_at, used) VALUES(?,?,?,0)')
      .run(sha256(token), user.id, expires);
    console.log(`[auth] Ссылка восстановления для ${email}`);
    const payload = { ...generic };
    if (demoResetLinkEnabled()) {
      const origin = req.headers.origin && /^https?:\/\//.test(req.headers.origin) ? req.headers.origin : '';
      payload.demoResetUrl = `${origin}/account.html?reset=${token}`;
      payload.notice = 'Демо-режим: ссылка показана на экране. Подключите почтовую рассылку для production.';
    }
    return send(res, 200, payload);
  }

  if (method === 'POST' && p === '/api/auth/reset') {
    rateLimit(resetLimiter, clientIp(req));
    const body = await readBody(req);
    const token = String(body.token || '');
    const password = String(body.password || '');
    if (!isValidPassword(password)) return fail(res, 400, 'Пароль слишком простой', { password: 'Минимум 8 символов, буквы и цифры' });
    const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0').get(sha256(token));
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return fail(res, 400, 'Ссылка недействительна или истекла');
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE token_hash = ?').run(sha256(token));
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    return send(res, 200, { ok: true });
  }

  // ---------- ACCOUNT ----------
  const accountUser = getClientUser(req);

  if (method === 'GET' && p === '/api/account/bookings') {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const rows = bookings.listUserBookings(accountUser.id).map(rowToBooking);
    return send(res, 200, { bookings: rows });
  }

  if (method === 'POST' && p.startsWith('/api/account/bookings/') && p.endsWith('/cancel')) {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const id = Number(p.split('/')[4]);
    const row = bookings.getBookingById(id);
    if (!row) return fail(res, 404, 'Запись не найдена');
    if (!clientBookingVisibility(accountUser, row)) return fail(res, 403, 'Это не ваша запись');
    const rules = bookings.getBookingRules();
    if (!bookings.canCancel(row, rules)) {
      return fail(res, 400, `Отменить запись можно не позднее чем за ${rules.cancelHours} ч. Свяжитесь со студией по телефону.`);
    }
    const updated = bookings.updateBookingStatus(id, 'canceled');
    return send(res, 200, { booking: rowToBooking(updated) });
  }

  if (method === 'GET' && p === '/api/account/favorites') {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const rows = db.prepare(
      `SELECT s.* FROM favorites f JOIN services s ON s.id = f.service_id
       WHERE f.user_id = ? AND s.active = 1 ORDER BY f.created_at DESC`
    ).all(accountUser.id).map(rowToService);
    return send(res, 200, { favorites: rows });
  }

  if (method === 'POST' && p.startsWith('/api/account/favorites/')) {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const serviceId = Number(p.split('/')[4]);
    const service = bookings.getServiceById(serviceId);
    if (!service || !service.active) return fail(res, 404, 'Услуга не найдена');
    const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND service_id = ?')
      .get(accountUser.id, serviceId);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND service_id = ?').run(accountUser.id, serviceId);
      return send(res, 200, { favorite: false });
    }
    db.prepare('INSERT INTO favorites(user_id, service_id, created_at) VALUES(?,?,?)')
      .run(accountUser.id, serviceId, nowISO());
    return send(res, 200, { favorite: true });
  }

  if (method === 'PATCH' && p === '/api/account/profile') {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const body = await readBody(req);
    const name = cleanText(body.name, 80);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    const birthdate = body.birthdate ? String(body.birthdate).slice(0, 10) : '';
    const fields = {};
    if (name.length < 2) fields.name = 'Укажите имя';
    if (!isValidPhone(phone)) fields.phone = 'Укажите корректный телефон';
    if (!isValidEmail(email)) fields.email = 'Укажите корректный email';
    if (birthdate && !isValidDate(birthdate)) fields.birthdate = 'Некорректная дата';
    if (Object.keys(fields).length) return fail(res, 400, 'Проверьте данные', fields);
    const taken = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, accountUser.id);
    if (taken) return fail(res, 409, 'Этот email уже используется', { email: 'Этот email уже занят' });
    db.prepare('UPDATE users SET name = ?, phone = ?, email = ?, birthdate = ? WHERE id = ?')
      .run(name, phone, email, birthdate || null, accountUser.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(accountUser.id);
    return send(res, 200, { user: publicUser({ ...updated, createdAt: updated.created_at }) });
  }

  if (method === 'PATCH' && p === '/api/account/password') {
    if (!accountUser) return fail(res, 401, 'Нужна авторизация');
    const body = await readBody(req);
    const current = String(body.currentPassword || '');
    const next = String(body.password || '');
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(accountUser.id);
    if (!verifyPassword(current, row.password_hash)) {
      return fail(res, 400, 'Текущий пароль указан неверно', { currentPassword: 'Неверный пароль' });
    }
    if (!isValidPassword(next)) return fail(res, 400, 'Новый пароль слишком простой', { password: 'Минимум 8 символов, буквы и цифры' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), accountUser.id);
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && p === '/api/reviews') {
    if (!accountUser) return fail(res, 401, 'Войдите, чтобы оставить отзыв');
    rateLimit(reviewLimiter, String(accountUser.id));
    const body = await readBody(req);
    const rating = Number(body.rating);
    const text = cleanText(body.text, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(res, 400, 'Поставьте оценку от 1 до 5');
    if (text.length < 10) return fail(res, 400, 'Расскажите о впечатлении подробнее (минимум 10 символов)');
    db.prepare(
      `INSERT INTO reviews(user_id, name, rating, text, status, demo, created_at)
       VALUES(?,?,?,?, 'pending', 0, ?)`
    ).run(accountUser.id, accountUser.name, rating, text, nowISO());
    return send(res, 201, { ok: true, message: 'Спасибо! Отзыв отправлен на модерацию.' });
  }

  // ---------- ADMIN AUTH ----------
  if (method === 'POST' && p === '/api/admin/login') {
    rateLimit(adminLoginLimiter, clientIp(req));
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return fail(res, 401, 'Неверные данные администратора');
    }
    const token = createSession(user.id, 'admin');
    setSessionCookie(res, 'admin', token);
    return send(res, 200, { user: publicUser({ ...user, createdAt: user.created_at }) });
  }

  if (method === 'POST' && p === '/api/admin/logout') {
    destroySession(req, 'admin');
    clearSessionCookie(res, 'admin');
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && p === '/api/admin/me') {
    const admin = getAdminUser(req);
    return send(res, 200, { user: admin ? publicUser(admin) : null });
  }

  // ---------- ADMIN ----------
  const admin = getAdminUser(req);
  if (p.startsWith('/api/admin/') && !admin) {
    return fail(res, 401, 'Требуется авторизация администратора');
  }
  if (!p.startsWith('/api/admin/')) {
    return fail(res, 404, 'Метод API не найден');
  }

  if (method === 'GET' && p === '/api/admin/overview') {
    const recent = bookings.listAllBookings({});
    return send(res, 200, {
      stats: getAdminStats(),
      upcoming: bookings.getUpcomingBookings(8).map(rowToBooking),
      recent: recent.slice(0, 8).map(rowToBooking),
      meta: {
        presets: config.themePresets,
        headingFonts: config.headingFonts,
        bodyFonts: config.bodyFonts,
        categories: CATEGORIES,
        settings: getSettings(),
      },
    });
  }

  if (method === 'GET' && p === '/api/admin/bookings') {
    const rows = bookings.listAllBookings({
      status: query.get('status') || '',
      date: query.get('date') || '',
      search: query.get('search') || '',
    }).map(rowToBooking);
    return send(res, 200, { bookings: rows });
  }

  if (method === 'PATCH' && p.startsWith('/api/admin/bookings/')) {
    const id = Number(p.split('/')[4]);
    const body = await readBody(req);
    const updated = bookings.updateBookingStatus(id, String(body.status || ''));
    return send(res, 200, { booking: rowToBooking(updated) });
  }

  if (method === 'GET' && p === '/api/admin/services') {
    const rows = db.prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM bookings b WHERE b.service_id = s.id) AS bookings_count
       FROM services s ORDER BY s.sort, s.id`
    ).all().map((r) => ({ ...rowToService(r), bookingsCount: Number(r.bookings_count) }));
    return send(res, 200, { services: rows });
  }

  if (method === 'POST' && p === '/api/admin/services') {
    const body = await readBody(req);
    const input = getServiceInput(body);
    if (input.error) return fail(res, 400, 'Проверьте поля услуги', input.error);
    const base = uniqueSlug(slugify(input.value.title));
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM services').get().m;
    const info = db.prepare(
      `INSERT INTO services(slug, title, short, description, duration, price, category, image, active, sort)
       VALUES(?,?,?,?,?,?,?,?,?,?)`
    ).run(base, input.value.title, input.value.short, input.value.description, input.value.duration,
      input.value.price, input.value.category, input.value.image, input.value.active ? 1 : 0, Number(maxSort) + 1);
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(info.lastInsertRowid));
    return send(res, 201, { service: rowToService(row) });
  }

  if (method === 'PATCH' && p.startsWith('/api/admin/services/')) {
    const id = Number(p.split('/')[4]);
    const current = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!current) return fail(res, 404, 'Услуга не найдена');
    const body = await readBody(req);
    const input = getServiceInput(body, current);
    if (input.error) return fail(res, 400, 'Проверьте поля услуги', input.error);
    db.prepare(
      `UPDATE services SET title=?, short=?, description=?, duration=?, price=?, category=?, image=?, active=? WHERE id=?`
    ).run(input.value.title, input.value.short, input.value.description, input.value.duration,
      input.value.price, input.value.category, input.value.image, input.value.active ? 1 : 0, id);
    const row = db.prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM bookings b WHERE b.service_id = s.id) AS bookings_count
       FROM services s WHERE s.id = ?`
    ).get(id);
    return send(res, 200, { service: { ...rowToService(row), bookingsCount: Number(row.bookings_count) } });
  }

  if (method === 'DELETE' && p.startsWith('/api/admin/services/')) {
    const id = Number(p.split('/')[4]);
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!row) return fail(res, 404, 'Услуга не найдена');
    const used = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE service_id = ?').get(id).c;
    if (used > 0) {
      db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(id);
      return send(res, 200, { ok: true, archived: true, message: 'Услуга скрыта с сайта: по ней есть записи.' });
    }
    db.prepare('DELETE FROM favorites WHERE service_id = ?').run(id);
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    return send(res, 200, { ok: true, archived: false });
  }

  if (method === 'GET' && p === '/api/admin/gallery') {
    const rows = db.prepare('SELECT * FROM gallery ORDER BY sort, id').all().map(rowToGallery);
    return send(res, 200, { gallery: rows });
  }

  if (method === 'POST' && p === '/api/admin/gallery') {
    const body = await readBody(req);
    const title = cleanText(body.title, 100);
    const category = String(body.category || 'studio');
    const image = safeImage(body.image);
    if (!title) return fail(res, 400, 'Укажите название', { title: 'Обязательное поле' });
    if (!CATEGORIES[category]) return fail(res, 400, 'Некорректная категория', { category: 'Выберите категорию' });
    if (!image) return fail(res, 400, 'Добавьте фотографию', { image: 'Обязательное поле' });
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM gallery').get().m;
    const info = db.prepare('INSERT INTO gallery(title, category, image, sort, active) VALUES(?,?,?,?,1)')
      .run(title, category, image, Number(maxSort) + 1);
    const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(Number(info.lastInsertRowid));
    return send(res, 201, { item: rowToGallery(row) });
  }

  if (method === 'PATCH' && p.startsWith('/api/admin/gallery/')) {
    const id = Number(p.split('/')[4]);
    const current = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
    if (!current) return fail(res, 404, 'Фотография не найдена');
    const body = await readBody(req);
    const title = body.title !== undefined ? cleanText(body.title, 100) : current.title;
    const category = body.category !== undefined ? String(body.category) : current.category;
    const image = body.image !== undefined ? safeImage(body.image) : current.image;
    const active = body.active !== undefined ? (body.active ? 1 : 0) : current.active;
    if (!title || !image || !CATEGORIES[category]) return fail(res, 400, 'Проверьте поля фотографии');
    db.prepare('UPDATE gallery SET title=?, category=?, image=?, active=? WHERE id=?')
      .run(title, category, image, active, id);
    const row = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
    return send(res, 200, { item: rowToGallery(row) });
  }

  if (method === 'DELETE' && p.startsWith('/api/admin/gallery/')) {
    const id = Number(p.split('/')[4]);
    const info = db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
    if (!info.changes) return fail(res, 404, 'Фотография не найдена');
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && p === '/api/admin/reviews') {
    const status = query.get('status') || '';
    let sql = 'SELECT * FROM reviews';
    const params = [];
    if (REVIEW_STATUS.includes(status)) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 300';
    const rows = db.prepare(sql).all(...params).map(rowToReview);
    return send(res, 200, { reviews: rows });
  }

  if (method === 'PATCH' && p.startsWith('/api/admin/reviews/')) {
    const id = Number(p.split('/')[4]);
    const body = await readBody(req);
    const status = String(body.status || '');
    if (!REVIEW_STATUS.includes(status)) return fail(res, 400, 'Некорректный статус');
    const info = db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);
    if (!info.changes) return fail(res, 404, 'Отзыв не найден');
    return send(res, 200, { ok: true });
  }

  if (method === 'DELETE' && p.startsWith('/api/admin/reviews/')) {
    const id = Number(p.split('/')[4]);
    const info = db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
    if (!info.changes) return fail(res, 404, 'Отзыв не найден');
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && p === '/api/admin/clients') {
    const rows = db.prepare(
      `SELECT u.id, u.name, u.phone, u.email, u.created_at,
        (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id AND b.status != 'canceled') AS bookings_count,
        (SELECT COALESCE(SUM(price),0) FROM bookings b WHERE b.user_id = u.id AND b.status = 'completed') AS total_spent,
        (SELECT MAX(date) FROM bookings b WHERE b.user_id = u.id AND b.status IN ('completed','confirmed')) AS last_visit
       FROM users u WHERE u.role = 'client' ORDER BY u.created_at DESC`
    ).all().map((r) => ({
      ...r,
      bookingsCount: Number(r.bookings_count),
      totalSpent: Number(r.total_spent),
    }));
    return send(res, 200, { clients: rows });
  }

  if (method === 'GET' && p === '/api/admin/masters') {
    const rows = db.prepare('SELECT * FROM masters ORDER BY sort, id').all().map(rowToMaster);
    return send(res, 200, { masters: rows });
  }

  if (method === 'POST' && p === '/api/admin/masters') {
    const body = await readBody(req);
    const name = cleanText(body.name, 80);
    const role = cleanText(body.role, 120);
    const photo = safeImage(body.photo);
    const experience = cleanText(body.experience, 40);
    const bio = cleanText(body.bio, 700);
    if (!name || !role || !photo) return fail(res, 400, 'Заполните имя, роль и фотографию');
    const services = Array.isArray(body.services) ? body.services.map(String).slice(0, 30) : [];
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM masters').get().m;
    const info = db.prepare(
      'INSERT INTO masters(name, role, photo, experience, bio, services, active, sort) VALUES(?,?,?,?,?,?,?,?)'
    ).run(name, role, photo, experience, bio, JSON.stringify(services), 1, Number(maxSort) + 1);
    const row = db.prepare('SELECT * FROM masters WHERE id = ?').get(Number(info.lastInsertRowid));
    return send(res, 201, { master: rowToMaster(row) });
  }

  if (method === 'PATCH' && p.startsWith('/api/admin/masters/')) {
    const id = Number(p.split('/')[4]);
    const current = db.prepare('SELECT * FROM masters WHERE id = ?').get(id);
    if (!current) return fail(res, 404, 'Мастер не найден');
    const body = await readBody(req);
    const name = body.name !== undefined ? cleanText(body.name, 80) : current.name;
    const role = body.role !== undefined ? cleanText(body.role, 120) : current.role;
    const photo = body.photo !== undefined ? safeImage(body.photo) : current.photo;
    const experience = body.experience !== undefined ? cleanText(body.experience, 40) : current.experience;
    const bio = body.bio !== undefined ? cleanText(body.bio, 700) : current.bio;
    const active = body.active !== undefined ? (body.active ? 1 : 0) : current.active;
    const services = Array.isArray(body.services) ? JSON.stringify(body.services.map(String).slice(0, 30)) : current.services;
    if (!name || !role || !photo) return fail(res, 400, 'Заполните имя, роль и фотографию');
    db.prepare('UPDATE masters SET name=?, role=?, photo=?, experience=?, bio=?, services=?, active=? WHERE id=?')
      .run(name, role, photo, experience, bio, services, active, id);
    const row = db.prepare('SELECT * FROM masters WHERE id = ?').get(id);
    return send(res, 200, { master: rowToMaster(row) });
  }

  if (method === 'DELETE' && p.startsWith('/api/admin/masters/')) {
    const id = Number(p.split('/')[4]);
    const used = db.prepare(
      "SELECT COUNT(*) AS c FROM bookings WHERE master_id = ? AND status IN ('pending','confirmed')"
    ).get(id).c;
    if (used > 0) {
      db.prepare('UPDATE masters SET active = 0 WHERE id = ?').run(id);
      return send(res, 200, { ok: true, archived: true, message: 'Мастер скрыт: у него есть активные записи.' });
    }
    db.prepare('DELETE FROM masters WHERE id = ?').run(id);
    return send(res, 200, { ok: true, archived: false });
  }

  if (method === 'GET' && p === '/api/admin/blocks') {
    const rows = db.prepare('SELECT * FROM blocks WHERE date >= ? ORDER BY date, start LIMIT 200')
      .all(addDaysISO(todayISO(), -1));
    return send(res, 200, { blocks: rows });
  }

  if (method === 'POST' && p === '/api/admin/blocks') {
    const body = await readBody(req);
    const date = String(body.date || '');
    const start = body.start ? String(body.start) : null;
    const end = body.end ? String(body.end) : null;
    const reason = cleanText(body.reason, 200);
    if (!isValidDate(date)) return fail(res, 400, 'Укажите корректную дату');
    if ((start && !isValidTime(start)) || (end && !isValidTime(end))) return fail(res, 400, 'Укажите корректное время');
    if (start && end && timeToMinutes(start) >= timeToMinutes(end)) return fail(res, 400, 'Конец должен быть позже начала');
    if ((start && !end) || (!start && end)) return fail(res, 400, 'Укажите и начало, и конец — либо оставьте оба пустыми для выходного');
    const info = db.prepare('INSERT INTO blocks(date, start, end, reason, created_at) VALUES(?,?,?,?,?)')
      .run(date, start, end, reason, nowISO());
    return send(res, 201, { block: db.prepare('SELECT * FROM blocks WHERE id = ?').get(Number(info.lastInsertRowid)) });
  }

  if (method === 'DELETE' && p.startsWith('/api/admin/blocks/')) {
    const id = Number(p.split('/')[4]);
    const info = db.prepare('DELETE FROM blocks WHERE id = ?').run(id);
    if (!info.changes) return fail(res, 404, 'Блокировка не найдена');
    return send(res, 200, { ok: true });
  }

  if (method === 'GET' && p.startsWith('/api/admin/settings/')) {
    const key = p.slice('/api/admin/settings/'.length);
    if (!SETTINGS_KEYS.includes(key)) return fail(res, 404, 'Раздел не найден');
    return send(res, 200, { key, value: getSetting(key) });
  }

  if (method === 'PUT' && p.startsWith('/api/admin/settings/')) {
    const key = p.slice('/api/admin/settings/'.length);
    if (!SETTINGS_KEYS.includes(key)) return fail(res, 404, 'Раздел не найден');
    const body = await readBody(req);
    const value = validateSettings(key, body.value !== undefined ? body.value : body);
    setSetting(key, value);
    return send(res, 200, { key, value });
  }

  if (method === 'POST' && p === '/api/admin/upload') {
    const body = await readBody(req);
    const dataUrl = String(body.dataUrl || '');
    const match = /^data:image\/(png|jpe?g|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return fail(res, 400, 'Поддерживаются изображения PNG, JPG и WebP');
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 4 * 1024 * 1024) return fail(res, 413, 'Максимальный размер изображения — 4 МБ');
    if (!isValidImageBuffer(buffer, ext)) return fail(res, 400, 'Файл повреждён или не является изображением');
    const name = `${Date.now().toString(36)}-${randomToken(6).replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
    return send(res, 201, { url: `/uploads/${name}` });
  }

  return fail(res, 404, 'Метод API не найден');
}

const bookingRateLimiter = makeRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const reviewLimiter = makeRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 5 });
const adminLoginLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 8 });

module.exports = { handleApi };
