'use strict';

/* =========================================================
   LUMIÈRE — общий клиентский модуль
   Тема, шапка, подвал, авторизация, модальные окна, утилиты.
   ========================================================= */

(function () {
  const LS_THEME = 'lumiere:theme';

  const ICONS = {
    arrowRight: '<path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5"/>',
    arrowLeft: '<path d="M19.5 12h-15M11 5.5 4.5 12l6.5 6.5"/>',
    arrowUpRight: '<path d="M7 17 17 7M9 7h8v8"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    phone: '<path d="M7 3.8h3.1l1.5 3.9-2 1.4a13.4 13.4 0 0 0 5.3 5.3l1.4-2 3.9 1.5V17a2.3 2.3 0 0 1-2.5 2.3A17.6 17.6 0 0 1 4.7 6.3 2.3 2.3 0 0 1 7 3.8Z"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    pin: '<path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3.5v3M16 3.5v3"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c.7-3.6 3.5-5.6 7.2-5.6s6.5 2 7.2 5.6"/>',
    heart: '<path d="M12 20.3S4 15.2 4 9.6A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 8 2.2c0 5.6-8 10.7-8 10.7Z"/>',
    star: '<path d="m12 3.6 2.5 5.1 5.6.8-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    sparkle: '<path d="M12 3.5c.5 5 2.5 7 7.5 7.5-5 .5-7 2.5-7.5 7.5-.5-5-2.5-7-7.5-7.5 5-.5 7-2.5 7.5-7.5Z"/><path d="M19 16.5c.2 2 1 2.8 3 3-2 .2-2.8 1-3 3-.2-2-1-2.8-3-3 2-.2 2.8-1 3-3Z"/>',
    eye: '<path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="3"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17 6.8h.01"/>',
    telegram: '<path d="M21 4.5 2.9 11.4l5.6 1.9 2 5.9 3.1-3.8 4.2 3.1Z"/><path d="m8.5 13.3 9.2-7.1-6.7 8.2"/>',
    whatsapp: '<path d="M20.2 11.7a8.1 8.1 0 0 1-11.9 7.1L3.8 20l1.3-4.3a8.1 8.1 0 1 1 15.1-4Z"/><path d="M8.6 7.8c.4-.1.8 0 1 .4l.6 1.3c.1.3 0 .6-.2.8l-.5.6a6.4 6.4 0 0 0 3.3 3.2l.6-.6c.2-.2.5-.3.8-.2l1.4.6c.3.2.5.5.4.9-.2 1-1.1 1.7-2.2 1.6-3.1-.3-5.6-2.7-6.1-5.7-.1-1 .4-1.9 1-2.2Z"/>',
    vk: '<path d="M4 8.4h2.1c.2 3.2 1.9 5.4 3.2 5.8V8.4h2v3.3c1.2-.3 2.4-2 2.8-3.3h2c-.4 1.7-1.4 3.1-2.5 3.8 1 .6 2.3 2.1 2.8 3.8h-2.2c-.4-1.2-1.4-2.5-2.9-2.7v2.7h-.7c-3.4 0-6-2.8-6.2-7.6Z"/>',
    map: '<path d="M9 4 3.5 6.3v13.4L9 17.4l6 2.3 5.5-2.3V4L15 6.3Z"/><path d="M9 4v13.4M15 6.3v13.4"/>',
    trash: '<path d="M4.5 7h15M9 7V4.8h6V7M6.5 7l.8 13h9.4l.8-13"/><path d="M10 11v5M14 11v5"/>',
    edit: '<path d="M4.5 19.5 5 15.8 15.8 5a2.1 2.1 0 0 1 3 3L8 18.8Z"/><path d="m13.5 7.3 3.2 3.2"/>',
    upload: '<path d="M12 16V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
    logout: '<path d="M14.5 8V5.5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V16"/><path d="M9 12h11M17 8.5l3.5 3.5L17 15.5"/>',
    lock: '<rect x="5" y="10" width="14" height="10.5" rx="2.5"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.2" cy="6.5" r="1"/><circle cx="4.2" cy="12" r="1"/><circle cx="4.2" cy="17.5" r="1"/>',
    scissors: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.5 20 18M8 16.5 20 6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.8-4.4L20 19"/>',
    message: '<path d="M20.5 11.7c0 4-3.8 7.2-8.5 7.2-1 0-2-.1-2.9-.4L4.5 20l1.3-3.5A6.8 6.8 0 0 1 3.5 11.7c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><path d="M16 5.4a3.1 3.1 0 0 1 0 6M17.5 14.4c2.1.5 3.5 2 3.9 4.6"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.5 0 2-.9 2-1.8 0-.8-.5-1.2-.5-2 0-.9.7-1.5 1.7-1.5h1.6a3.7 3.7 0 0 0 3.7-3.7c0-4.4-3.8-8-8.5-8Z"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="6.8" r="1"/><circle cx="16" cy="9" r="1"/><circle cx="7" cy="13.5" r="1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5.5"/>',
  };

  const BRAND_MARK = `
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
      <path d="M4.5 27c6.2-7.3 12.4-10.7 19.5-10.7S37.3 19.7 43.5 27"/>
      <path d="M6.5 29.5c5.8 6.4 11.6 9.4 17.5 9.4s11.7-3 17.5-9.4"/>
      <circle cx="24" cy="27" r="5.2"/>
      <path d="M9.5 12.6 13 17.5M24 6.5v6.2M38.5 12.6 35 17.5"/>
    </svg>`;

  const state = {
    site: null,
    user: null,
    admin: null,
    favorites: new Set(),
    afterAuth: null,
    authMode: 'login',
    lightbox: null,
    lightboxIndex: 0,
  };

  const nf = new Intl.NumberFormat('ru-RU');

  function icon(name, cls = 'icon') {
    const body = ICONS[name] || ICONS.sparkle;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(value) {
    return `${nf.format(Number(value) || 0)} ₽`;
  }

  function formatDuration(minutes) {
    const total = Number(minutes) || 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h} ч ${m} мин`;
    if (h) return `${h} ч`;
    return `${m} мин`;
  }

  function formatDate(iso, { short = false, weekday = false } = {}) {
    if (!iso) return '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    const opts = { day: 'numeric', month: 'long' };
    if (!short) opts.year = 'numeric';
    if (weekday) opts.weekday = 'short';
    return date.toLocaleDateString('ru-RU', opts).replace(' г.', '');
  }

  function formatDateShort(iso) {
    return formatDate(iso, { short: true });
  }

  const STATUS_LABELS = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтверждена',
    completed: 'Завершена',
    canceled: 'Отменена',
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function statusBadge(status) {
    return `<span class="status status--${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
  }

  function initials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  function stars(rating, cls = 'stars') {
    const count = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let html = `<span class="${cls}" aria-label="Оценка ${count} из 5">`;
    for (let i = 0; i < 5; i++) {
      html += icon('star');
    }
    return `${html}</span>`;
  }

  function plural(count, one, few, many) {
    const n = Math.abs(Number(count) || 0) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  }

  async function api(path, { method = 'GET', body, signal } = {}) {
    const init = {
      method,
      credentials: 'same-origin',
      headers: {},
      signal,
    };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, init);
    } catch (error) {
      const err = new Error('Нет связи с сервером. Проверьте подключение.');
      err.cause = error;
      throw err;
    }
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Некорректный ответ сервера (${res.status})` };
      }
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Ошибка ${res.status}`);
      err.status = res.status;
      err.fields = (data && data.fields) || null;
      throw err;
    }
    return data || {};
  }

  /* ---------- theme ---------- */

  const COLOR_MAP = {
    bg: '--bg',
    surface: '--surface',
    card: '--card',
    ink: '--ink',
    muted: '--muted',
    line: '--line',
    accent: '--accent',
    accentSoft: '--accent-soft',
    accentDeep: '--accent-deep',
    dark: '--dark',
    onDark: '--on-dark',
  };

  const FONT_WEIGHTS = {
    'Cormorant Garamond': 'ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500',
    'Playfair Display': 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500',
    Prata: '400',
    Lora: 'ital,wght@0,400;0,500;0,600;1,400',
    Manrope: 'wght@300;400;500;600;700;800',
    Inter: 'wght@300;400;500;600;700',
    Jost: 'wght@300;400;500;600;700',
    Montserrat: 'wght@300;400;500;600;700',
  };

  const FALLBACKS = {
    heading: 'Georgia, serif',
    body: "'Segoe UI', sans-serif",
  };

  function fontHref(family) {
    const weights = FONT_WEIGHTS[family] || 'wght@400;500;600';
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:${weights}&display=swap`;
  }

  function ensureFontLink(family, id) {
    const selector = `link[data-font="${id}"]`;
    let link = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.font = id;
      document.head.appendChild(link);
    }
    const href = fontHref(family);
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  function applyTheme(theme) {
    if (!theme) return;
    const colors = theme.colors || {};
    for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
      if (colors[key]) document.documentElement.style.setProperty(cssVar, colors[key]);
    }
    const fonts = theme.fonts || {};
    const heading = fonts.heading || 'Cormorant Garamond';
    const body = fonts.body || 'Manrope';
    document.documentElement.style.setProperty('--font-heading', `'${heading}', ${FALLBACKS.heading}`);
    document.documentElement.style.setProperty('--font-body', `'${body}', ${FALLBACKS.body}`);
    ensureFontLink(heading, 'heading');
    ensureFontLink(body, 'body');
    document.documentElement.dataset.theme = theme.preset || 'custom';
    try {
      localStorage.setItem(LS_THEME, JSON.stringify(theme));
    } catch {}
  }

  function setMeta(name, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  function setBranding(site, page = 'landing') {
    const brand = site.brand || {};
    if (page === 'landing') {
      document.title = (site.seo && site.seo.title) || `${brand.name || 'LUMIÈRE'} — ${brand.suffix || 'студия красоты'}`;
    }
    if (site.seo) {
      setMeta('description', site.seo.description);
      setMeta('keywords', site.seo.keywords);
    }
    setMeta('theme-color', (site.theme && site.theme.colors && site.theme.colors.bg) || '#F6F1EA');
    const og = (prop, content) => {
      if (!content) return;
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    og('og:title', document.title);
    og('og:description', site.seo && site.seo.description);
    og('og:type', 'website');
    og('og:image', brand.heroImage);
  }

  function brandMarkup(brand) {
    if (brand && brand.logoImage) {
      return `<img class="brand-logo-img" src="${escapeHtml(brand.logoImage)}" alt="${escapeHtml(brand.name || '')}">`;
    }
    return `<span class="brand-mark">${BRAND_MARK}</span>`;
  }

  function brandBlock(site, { footer = false } = {}) {
    const brand = site.brand || {};
    return `<a class="brand" href="/" aria-label="${escapeHtml(brand.name || 'На главную')}">
      ${brandMarkup(brand)}
      <span class="brand-text">
        <span class="brand-word">${escapeHtml(brand.name || 'LUMIÈRE')}</span>
        <span class="brand-sub">${escapeHtml(brand.suffix || '')}</span>
      </span>
    </a>`;
  }

  /* ---------- header / footer ---------- */

  const NAV = [
    ['Главная', '', '01'],
    ['Услуги', 'services', '02'],
    ['Обо мне', 'about', '03'],
    ['Работы', 'works', '04'],
    ['Отзывы', 'reviews', '05'],
    ['Контакты', 'contacts', '06'],
  ];

  function navHref(hash, page) {
    if (!hash) return page === 'landing' ? '#top' : '/';
    return page === 'landing' ? `#${hash}` : `/#${hash}`;
  }

  function authSlotMarkup() {
    if (state.user) {
      const name = state.user.name || 'Профиль';
      return `<div class="user-menu" data-user-menu>
        <button class="user-menu__trigger" type="button" data-user-trigger aria-expanded="false" aria-haspopup="true">
          <span class="user-avatar">${escapeHtml(initials(name))}</span>
          <span class="user-menu__label">${escapeHtml(name.split(' ')[0])}</span>
        </button>
        <div class="user-menu__panel" role="menu">
          <div class="user-menu__name">${escapeHtml(name)}</div>
          <a href="/account" role="menuitem">${icon('calendar')}Мои записи</a>
          <a href="/account?panel=favorites" role="menuitem">${icon('heart')}Избранное</a>
          <a href="/account?panel=profile" role="menuitem">${icon('user')}Профиль</a>
          <button type="button" data-logout role="menuitem">${icon('logout')}Выйти</button>
        </div>
      </div>`;
    }
    return `<button class="header-login" type="button" data-open-auth="login">${icon('user')}<span>Войти</span></button>`;
  }

  function mountHeader(site, page) {
    const mount = document.querySelector('#site-header');
    if (!mount) return;
    const brand = site.brand || {};
    mount.outerHTML = `<header class="site-header" data-header>
      <div class="container header-inner">
        ${brandBlock(site)}
        <nav class="nav" aria-label="Основная навигация">
          ${NAV.map(([label, hash]) => `<a class="nav-link" href="${navHref(hash, page)}">${label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <a class="header-login" href="/account">${icon('user')}<span>Кабинет</span></a>
          <a class="btn btn--accent btn--book" href="/booking">Записаться</a>
          <div data-auth-slot>${authSlotMarkup()}</div>
          <button class="burger" type="button" data-burger aria-label="Открыть меню" aria-expanded="false"><span></span></button>
        </div>
      </div>
    </header>
    <div class="mobile-menu" data-mobile-menu aria-hidden="true">
      <nav class="mobile-nav" aria-label="Мобильное меню">
        ${NAV.map(([label, hash, num]) => `<a href="${navHref(hash, page)}"><span>${num}</span>${label}</a>`).join('')}
        <a href="/account"><span>07</span>Личный кабинет</a>
      </nav>
      <div class="mobile-menu__foot">
        <div class="mobile-menu__contacts">
          <a href="tel:${escapeHtml(site.contacts.phoneHref || '')}">${escapeHtml(site.contacts.phone || '')}</a>
          <span>${escapeHtml(site.contacts.address || '')}</span>
          <span>${escapeHtml(site.contacts.hours || '')}</span>
        </div>
        <a class="btn btn--accent btn--block" href="/booking">Записаться онлайн ${icon('arrowRight')}</a>
        <div data-mobile-auth>${state.user ? `<a class="btn btn--outline btn--block" href="/account">Личный кабинет</a>` : `<button class="btn btn--outline btn--block" data-open-auth="login">Войти в кабинет</button>`}</div>
      </div>
    </div>`;
    const brandName = brand.name || 'LUMIÈRE';
    const headTitle = document.querySelector('.brand');
    if (headTitle) headTitle.setAttribute('aria-label', `${brandName} — на главную`);
  }

  function updateAuthSlots() {
    document.querySelectorAll('[data-auth-slot]').forEach((el) => {
      el.innerHTML = authSlotMarkup();
    });
    document.querySelectorAll('[data-mobile-auth]').forEach((el) => {
      el.innerHTML = state.user
        ? `<a class="btn btn--outline btn--block" href="/account">Личный кабинет</a>`
        : `<button class="btn btn--outline btn--block" data-open-auth="login">Войти в кабинет</button>`;
    });
  }

  function footerMarkup(site) {
    const brand = site.brand || {};
    const contacts = site.contacts || {};
    const socials = contacts.socials || {};
    const year = new Date().getFullYear();
    const socialLinks = [
      ['instagram', 'Instagram'],
      ['telegram', 'Telegram'],
      ['whatsapp', 'WhatsApp'],
      ['vk', 'VK'],
    ]
      .filter(([key]) => socials[key])
      .map(([key, label]) => `<a class="social-link" href="${escapeHtml(socials[key])}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${icon(key)}</a>`)
      .join('');
    const topServices = (site.services || []).slice(0, 4)
      .map((s) => `<a href="/booking?service=${encodeURIComponent(s.slug)}">${escapeHtml(s.title)}</a>`)
      .join('');
    return `<footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            ${brandBlock(site, { footer: true })}
            <p>${escapeHtml(brand.description || '')}</p>
            <div class="footer-tagline">${escapeHtml(brand.tagline || '')}</div>
          </div>
          <div>
            <h4>Навигация</h4>
            <div class="footer-nav">
              ${NAV.map(([label, hash]) => `<a href="${navHref(hash, 'footer')}">${label}</a>`).join('')}
              <a href="/account">Личный кабинет</a>
            </div>
          </div>
          <div>
            <h4>Услуги</h4>
            <div class="footer-nav">
              ${topServices || '<span>Скоро</span>'}
              <a href="/booking">Онлайн-запись ${icon('arrowUpRight')}</a>
            </div>
          </div>
          <div>
            <h4>Контакты</h4>
            <div class="footer-contacts">
              <a class="footer-phone" href="tel:${escapeHtml(contacts.phoneHref || '')}">${escapeHtml(contacts.phone || '')}</a>
              <a href="mailto:${escapeHtml(contacts.email || '')}">${escapeHtml(contacts.email || '')}</a>
              <span>${escapeHtml(contacts.address || '')}</span>
              <span>${escapeHtml(contacts.hours || '')}</span>
            </div>
            <div class="footer-socials">${socialLinks}</div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ${escapeHtml(brand.legalName || brand.name || '')}. Демонстрационный проект.</span>
          <nav>
            <a href="/privacy">Политика конфиденциальности</a>
            <a href="/admin">Панель администратора</a>
          </nav>
        </div>
      </div>
    </footer>`;
  }

  function mountFooter(site) {
    const mount = document.querySelector('#site-footer');
    if (mount) mount.outerHTML = footerMarkup(site);
  }

  /* ---------- chrome ---------- */

  function mountChrome(site, page) {
    mountHeader(site, page);
    mountFooter(site);
    injectDialogs(site);
    injectMobileCta(site, page);
    bindGlobal();
    bindReveal();
  }

  function injectDialogs(site) {
    if (!document.getElementById('auth-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
      <dialog class="modal" id="auth-modal" aria-labelledby="auth-title">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <h3 class="modal-title" id="auth-title" data-auth-title>Личный кабинет</h3>
              <p class="modal-sub" data-auth-sub>Войдите, чтобы управлять записями и избранным</p>
            </div>
            <button class="modal-close" type="button" data-close-dialog aria-label="Закрыть">${icon('close')}</button>
          </div>
          <div class="auth-tabs" data-auth-tabs>
            <button class="auth-tab is-active" type="button" data-auth-tab="login">Вход</button>
            <button class="auth-tab" type="button" data-auth-tab="register">Регистрация</button>
          </div>
          <div class="modal-body">
            <form class="auth-form is-active" data-auth-form="login" novalidate>
              <div class="form-error" data-form-error></div>
              <div class="field"><label for="login-email">Email</label><input id="login-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
              <div class="field"><label for="login-password">Пароль</label><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
              <div class="form-foot">
                <button class="btn btn--accent btn--block" type="submit">Войти</button>
                <div class="form-alt"><button type="button" data-auth-tab="forgot">Забыли пароль?</button></div>
                <div class="form-hint">Демо-клиент: client@lumiere.studio / Client2026!</div>
              </div>
            </form>
            <form class="auth-form" data-auth-form="register" novalidate>
              <div class="form-error" data-form-error></div>
              <div class="field"><label for="reg-name">Имя и фамилия</label><input id="reg-name" name="name" autocomplete="name" placeholder="Анна Иванова" required></div>
              <div class="field"><label for="reg-phone">Телефон</label><input id="reg-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 (999) 000-00-00" required></div>
              <div class="field"><label for="reg-email">Email</label><input id="reg-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
              <div class="field"><label for="reg-password">Пароль</label><input id="reg-password" name="password" type="password" autocomplete="new-password" placeholder="Минимум 8 символов, буквы и цифры" required></div>
              <div class="form-foot">
                <label class="checkline"><input type="checkbox" name="consent" required><span>Согласен с <a href="/privacy" target="_blank" rel="noopener">политикой конфиденциальности</a> и обработкой персональных данных</span></label>
                <button class="btn btn--accent btn--block" type="submit">Создать аккаунт</button>
                <div class="form-alt">Уже есть аккаунт? <button type="button" data-auth-tab="login">Войти</button></div>
              </div>
            </form>
            <form class="auth-form" data-auth-form="forgot" novalidate>
              <div class="form-error" data-form-error></div>
              <div class="field"><label for="forgot-email">Email аккаунта</label><input id="forgot-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
              <p class="form-hint">Если аккаунт найден, мы отправим ссылку для сброса пароля на указанный email.</p>
              <div class="form-foot">
                <button class="btn btn--accent btn--block" type="submit">Отправить ссылку</button>
                <div class="form-alt"><button type="button" data-auth-tab="login">Вернуться ко входу</button></div>
              </div>
              <div class="form-error" data-reset-result></div>
            </form>
          </div>
        </div>
      </dialog>`);
    }

    if (!document.getElementById('review-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
      <dialog class="modal" id="review-modal" aria-labelledby="review-title">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <h3 class="modal-title" id="review-title">Ваш отзыв</h3>
              <p class="modal-sub">Отзыв появится на сайте после модерации</p>
            </div>
            <button class="modal-close" type="button" data-close-dialog aria-label="Закрыть">${icon('close')}</button>
          </div>
          <div class="modal-body">
            <form data-review-form>
              <div class="form-error" data-form-error></div>
              <div class="field" style="margin-bottom:14px">
                <label>Оценка</label>
                <div class="star-input">
                  <input id="star5" type="radio" name="rating" value="5" checked><label for="star5" aria-label="5">${icon('star', '')}</label>
                  <input id="star4" type="radio" name="rating" value="4"><label for="star4" aria-label="4">${icon('star', '')}</label>
                  <input id="star3" type="radio" name="rating" value="3"><label for="star3" aria-label="3">${icon('star', '')}</label>
                  <input id="star2" type="radio" name="rating" value="2"><label for="star2" aria-label="2">${icon('star', '')}</label>
                  <input id="star1" type="radio" name="rating" value="1"><label for="star1" aria-label="1">${icon('star', '')}</label>
                </div>
              </div>
              <div class="field"><label for="review-text">Впечатление</label><textarea id="review-text" name="text" placeholder="Расскажите, как прошла процедура и что понравилось" required minlength="10"></textarea></div>
              <div class="form-foot">
                <button class="btn btn--accent btn--block" type="submit">Отправить отзыв</button>
                <p class="form-hint">Отзывы публикуются после проверки администратором.</p>
              </div>
            </form>
          </div>
        </div>
      </dialog>`);
    }

    if (!document.getElementById('lightbox')) {
      document.body.insertAdjacentHTML('beforeend', `
      <dialog class="lightbox" id="lightbox" aria-label="Просмотр фотографии">
        <div class="lightbox-inner">
          <button class="lightbox-close" type="button" data-lightbox-close aria-label="Закрыть">${icon('close')}</button>
          <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="Предыдущая">${icon('arrowLeft')}</button>
          <div>
            <img class="lightbox-img" data-lightbox-img alt="">
            <div class="lightbox-caption" data-lightbox-caption></div>
          </div>
          <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Следующая">${icon('arrowRight')}</button>
        </div>
      </dialog>`);
    }

    if (!document.querySelector('.toasts')) {
      document.body.insertAdjacentHTML('beforeend', '<div class="toasts" aria-live="polite" aria-atomic="true"></div>');
    }
  }

  function injectMobileCta(site, page) {
    if (page !== 'landing' || document.querySelector('.mobile-cta') || !site) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mobile-cta">
        <a class="btn btn--accent" href="/booking">Записаться</a>
        <a class="mobile-cta__call" href="tel:${escapeHtml(site.contacts.phoneHref || '')}" aria-label="Позвонить">${icon('phone')}</a>
      </div>`);
  }

  /* ---------- global events ---------- */

  let globalsBound = false;

  function bindGlobal() {
    if (globalsBound) return;
    globalsBound = true;

    document.addEventListener('click', (event) => {
      const openAuth = event.target.closest('[data-open-auth]');
      if (openAuth) {
        event.preventDefault();
        if (document.body.classList.contains('menu-open')) closeMenu();
        openAuthModal(openAuth.dataset.openAuth || 'login');
        return;
      }

      const authTab = event.target.closest('[data-auth-tab]');
      if (authTab && document.getElementById('auth-modal')) {
        event.preventDefault();
        setAuthMode(authTab.dataset.authTab);
        return;
      }

      const closeBtn = event.target.closest('[data-close-dialog]');
      if (closeBtn) {
        const dialog = closeBtn.closest('dialog');
        if (dialog) dialog.close();
        return;
      }

      const logout = event.target.closest('[data-logout]');
      if (logout) {
        event.preventDefault();
        logoutUser();
        return;
      }

      const burger = event.target.closest('[data-burger]');
      if (burger) {
        toggleMenu();
        return;
      }

      const mobileLink = event.target.closest('.mobile-nav a, .mobile-menu__foot a');
      if (mobileLink) closeMenu();

      const trigger = event.target.closest('[data-user-trigger]');
      if (trigger) {
        event.preventDefault();
        const menu = trigger.closest('.user-menu');
        if (menu) {
          const open = menu.classList.toggle('is-open');
          trigger.setAttribute('aria-expanded', String(open));
        }
        return;
      }
      if (!event.target.closest('.user-menu')) {
        document.querySelectorAll('.user-menu.is-open').forEach((menu) => {
          menu.classList.remove('is-open');
          const btn = menu.querySelector('[data-user-trigger]');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });
      }

      const reviewBtn = event.target.closest('[data-open-review]');
      if (reviewBtn) {
        event.preventDefault();
        openReview();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (document.body.classList.contains('menu-open')) closeMenu();
      }
    });

    window.addEventListener('scroll', () => {
      const header = document.querySelector('[data-header]');
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }, { passive: true });

    document.addEventListener('click', (event) => {
      const dialog = event.target;
      if (dialog instanceof HTMLDialogElement && dialog.hasAttribute('open')) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom
        ) {
          dialog.close();
        }
      }
    });

    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.addEventListener('submit', handleAuthSubmit);
    }
    const reviewModal = document.getElementById('review-modal');
    if (reviewModal) {
      reviewModal.addEventListener('submit', handleReviewSubmit);
    }
    bindLightbox();
  }

  function toggleMenu() {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    const burger = document.querySelector('[data-burger]');
    if (burger) burger.setAttribute('aria-expanded', String(open));
    const menu = document.querySelector('[data-mobile-menu]');
    if (menu) menu.setAttribute('aria-hidden', String(!open));
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
    const burger = document.querySelector('[data-burger]');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    const menu = document.querySelector('[data-mobile-menu]');
    if (menu) menu.setAttribute('aria-hidden', 'true');
  }

  /* ---------- auth ---------- */

  function setAuthMode(mode) {
    state.authMode = mode;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    const isForgot = mode === 'forgot';
    modal.querySelector('[data-auth-tabs]').style.display = isForgot ? 'none' : '';
    modal.querySelectorAll('[data-auth-tab]').forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.authTab === mode);
    });
    modal.querySelectorAll('[data-auth-form]').forEach((form) => {
      form.classList.toggle('is-active', form.dataset.authForm === mode);
    });
    const title = modal.querySelector('[data-auth-title]');
    const sub = modal.querySelector('[data-auth-sub]');
    if (title) title.textContent = isForgot ? 'Восстановление доступа' : mode === 'register' ? 'Создание аккаунта' : 'Личный кабинет';
    if (sub) sub.textContent = isForgot
      ? 'Укажите email, привязанный к аккаунту'
      : mode === 'register'
        ? 'Регистрация занимает меньше минуты'
        : 'Войдите, чтобы управлять записями и избранным';
    modal.querySelectorAll('[data-form-error]').forEach((el) => {
      el.classList.remove('is-visible');
      el.textContent = '';
    });
    const first = modal.querySelector(`[data-auth-form="${mode}"] input`);
    setTimeout(() => first && first.focus(), 80);
  }

  function openAuthModal(mode = 'login', afterAuth = null) {
    state.afterAuth = afterAuth || state.afterAuth;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    setAuthMode(mode);
    if (!modal.open) modal.showModal();
  }

  function formError(form, message) {
    const box = form.querySelector('[data-form-error]');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('is-visible', Boolean(message));
  }

  function markFields(form, fields) {
    form.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
    if (!fields) return;
    for (const key of Object.keys(fields)) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.closest('.field')?.classList.add('has-error');
    }
  }

  async function handleAuthSubmit(event) {
    const form = event.target.closest('[data-auth-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.busy === '1') return;
    const mode = form.dataset.authForm;
    const data = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('button[type="submit"]');
    formError(form, '');
    markFields(form, null);

    if (mode === 'register') {
      if (!form.querySelector('[name="consent"]').checked) {
        formError(form, 'Подтвердите согласие на обработку персональных данных');
        return;
      }
      if (String(data.password || '').length < 8) {
        formError(form, 'Пароль должен содержать минимум 8 символов');
        return;
      }
    }

    form.dataset.busy = '1';
    const label = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Подождите…';
    }
    try {
      if (mode === 'login') {
        const result = await api('/api/auth/login', { method: 'POST', body: { email: data.email, password: data.password } });
        state.user = result.user;
        afterAuthSuccess(form, 'Вы вошли в личный кабинет');
      } else if (mode === 'register') {
        const result = await api('/api/auth/register', {
          method: 'POST',
          body: { name: data.name, phone: data.phone, email: data.email, password: data.password },
        });
        state.user = result.user;
        afterAuthSuccess(form, 'Аккаунт создан. Добро пожаловать!');
      } else if (mode === 'forgot') {
        const result = await api('/api/auth/forgot', { method: 'POST', body: { email: data.email } });
        const box = form.querySelector('[data-reset-result]');
        if (box) {
          box.innerHTML = `${escapeHtml(result.message || 'Готово')}${result.demoResetUrl ? `<br><br><a class="link-arrow" href="${escapeHtml(result.demoResetUrl)}">Открыть ссылку сброса ${icon('arrowRight')}</a><br><span class="form-hint">${escapeHtml(result.notice || '')}</span>` : ''}`;
          box.classList.add('is-visible');
        }
        toast(result.message || 'Ссылка отправлена', 'success');
      }
    } catch (error) {
      formError(form, error.message);
      markFields(form, error.fields);
      if (error.status === 0 || !error.status) toast(error.message, 'error');
    } finally {
      form.dataset.busy = '';
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  }

  function afterAuthSuccess(form, message) {
    const modal = document.getElementById('auth-modal');
    if (modal && modal.open) modal.close();
    updateAuthSlots();
    loadFavorites().catch(() => {});
    toast(message, 'success');
    document.dispatchEvent(new CustomEvent('app:auth', { detail: { user: state.user } }));
    const action = state.afterAuth;
    state.afterAuth = null;
    if (typeof action === 'function') setTimeout(action, 250);
    form.reset();
  }

  async function logoutUser() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    state.user = null;
    state.favorites = new Set();
    updateAuthSlots();
    toast('Вы вышли из аккаунта');
    document.dispatchEvent(new CustomEvent('app:auth', { detail: { user: null } }));
    document.dispatchEvent(new CustomEvent('app:favorites'));
    if (location.pathname.startsWith('/account')) {
      setTimeout(() => location.reload(), 300);
    }
  }

  async function loadFavorites() {
    state.favorites = new Set();
    if (!state.user) return state.favorites;
    const result = await api('/api/account/favorites');
    (result.favorites || []).forEach((service) => state.favorites.add(service.id));
    document.dispatchEvent(new CustomEvent('app:favorites'));
    return state.favorites;
  }

  function isFavorite(serviceId) {
    return state.favorites.has(Number(serviceId));
  }

  async function toggleFavorite(serviceId) {
    if (!state.user) {
      openAuthModal('login', () => toggleFavorite(serviceId));
      toast('Войдите, чтобы добавить услугу в избранное');
      return false;
    }
    try {
      const result = await api(`/api/account/favorites/${Number(serviceId)}`, { method: 'POST' });
      if (result.favorite) state.favorites.add(Number(serviceId));
      else state.favorites.delete(Number(serviceId));
      document.querySelectorAll(`[data-favorite="${Number(serviceId)}"]`).forEach((btn) => {
        btn.classList.toggle('is-active', Boolean(result.favorite));
        btn.setAttribute('aria-pressed', String(Boolean(result.favorite)));
      });
      toast(result.favorite ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
      document.dispatchEvent(new CustomEvent('app:favorites'));
      return Boolean(result.favorite);
    } catch (error) {
      toast(error.message, 'error');
      return false;
    }
  }

  /* ---------- reviews ---------- */

  function openReview() {
    if (!state.user) {
      openAuthModal('login', openReview);
      toast('Войдите, чтобы оставить отзыв');
      return;
    }
    const modal = document.getElementById('review-modal');
    if (!modal) return;
    formError(modal.querySelector('form'), '');
    if (!modal.open) modal.showModal();
  }

  async function handleReviewSubmit(event) {
    const form = event.target.closest('[data-review-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.busy === '1') return;
    formError(form, '');
    const data = new FormData(form);
    const rating = Number(data.get('rating'));
    const text = String(data.get('text') || '').trim();
    if (text.length < 10) {
      formError(form, 'Расскажите о впечатлении подробнее (минимум 10 символов)');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    form.dataset.busy = '1';
    if (button) {
      button.disabled = true;
      button.textContent = 'Отправляем…';
    }
    try {
      const result = await api('/api/reviews', { method: 'POST', body: { rating, text } });
      form.reset();
      const modal = document.getElementById('review-modal');
      if (modal && modal.open) modal.close();
      toast(result.message || 'Спасибо за отзыв!', 'success');
    } catch (error) {
      formError(form, error.message);
      if (error.status === 401) {
        const modal = document.getElementById('review-modal');
        if (modal && modal.open) modal.close();
        openAuthModal('login', openReview);
      }
    } finally {
      form.dataset.busy = '';
      if (button) {
        button.disabled = false;
        button.textContent = 'Отправить отзыв';
      }
    }
  }

  /* ---------- lightbox ---------- */

  function bindLightbox() {
    const box = document.getElementById('lightbox');
    if (!box) return;
    box.querySelector('[data-lightbox-close]').addEventListener('click', () => box.close());
    box.querySelector('[data-lightbox-prev]').addEventListener('click', () => moveLightbox(-1));
    box.querySelector('[data-lightbox-next]').addEventListener('click', () => moveLightbox(1));
    box.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      if (event.key === 'ArrowRight') moveLightbox(1);
    });
  }

  function openLightbox(items, index = 0) {
    if (!items || !items.length) return;
    state.lightbox = items;
    state.lightboxIndex = Math.max(0, Math.min(items.length - 1, index));
    renderLightbox();
    const box = document.getElementById('lightbox');
    if (box && !box.open) box.showModal();
  }

  function renderLightbox() {
    const items = state.lightbox || [];
    const current = items[state.lightboxIndex];
    if (!current) return;
    const box = document.getElementById('lightbox');
    if (!box) return;
    const img = box.querySelector('[data-lightbox-img]');
    const caption = box.querySelector('[data-lightbox-caption]');
    img.src = current.src;
    img.alt = current.title || '';
    caption.textContent = current.title || '';
    const single = items.length < 2;
    box.querySelector('.lightbox-prev').style.display = single ? 'none' : '';
    box.querySelector('.lightbox-next').style.display = single ? 'none' : '';
  }

  function moveLightbox(delta) {
    const items = state.lightbox || [];
    if (items.length < 2) return;
    state.lightboxIndex = (state.lightboxIndex + delta + items.length) % items.length;
    renderLightbox();
  }

  /* ---------- toasts ---------- */

  function toast(message, type = '', timeout = 4600) {
    if (!message) return;
    let host = document.querySelector('.toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast${type ? ` is-${type}` : ''}`;
    const iconName = type === 'error' ? 'info' : type === 'success' ? 'check' : 'sparkle';
    el.innerHTML = `${icon(iconName)}<span>${escapeHtml(message)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 280);
    }, timeout);
  }

  /* ---------- confirm dialog ---------- */

  function confirmAction({
    title = 'Подтвердите действие',
    text = '',
    confirmLabel = 'Подтвердить',
    cancelLabel = 'Отмена',
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'modal';
      dialog.style.width = 'min(94vw, 430px)';
      dialog.innerHTML = `<div class="modal-card">
        <div class="modal-head">
          <div><h3 class="modal-title" style="font-size:26px">${escapeHtml(title)}</h3>${text ? `<p class="modal-sub">${escapeHtml(text)}</p>` : ''}</div>
          <button class="modal-close" type="button" data-confirm-cancel aria-label="Закрыть">${icon('close')}</button>
        </div>
        <div class="modal-foot" style="padding-top:22px">
          <button class="btn ${danger ? 'btn--accent' : 'btn--accent'} btn--block" type="button" data-confirm-ok>${escapeHtml(confirmLabel)}</button>
          <button class="btn btn--outline btn--block" type="button" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>
        </div>
      </div>`;
      document.body.appendChild(dialog);
      const finish = (result) => {
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(result);
      };
      dialog.querySelectorAll('[data-confirm-cancel]').forEach((btn) => btn.addEventListener('click', () => finish(false)));
      dialog.querySelector('[data-confirm-ok]').addEventListener('click', () => finish(true));
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        finish(false);
      });
      dialog.showModal();
    });
  }

  /* ---------- reveal ---------- */

  function bindReveal() {
    const elements = document.querySelectorAll('[data-reveal]:not(.is-in)');
    if (!elements.length) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    elements.forEach((el, index) => {
      if (!el.style.getPropertyValue('--delay')) {
        el.style.setProperty('--delay', `${Math.min(index % 6, 5) * 60}ms`);
      }
      observer.observe(el);
    });
  }

  function observeNew(root = document) {
    root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el, index) => {
      setTimeout(() => el.classList.add('is-in'), 30 + index * 40);
    });
  }

  /* ---------- init ---------- */

  async function init({ page = 'landing', requireSite = true } = {}) {
    let site = null;
    let user = null;
    const [siteRes, meRes] = await Promise.allSettled([api('/api/site'), api('/api/auth/me')]);
    if (siteRes.status === 'fulfilled') site = siteRes.value;
    if (meRes.status === 'fulfilled') user = meRes.value.user;
    if (!site && requireSite) {
      toast('Не удалось загрузить данные сайта. Попробуйте обновить страницу.', 'error', 8000);
      site = {
        brand: { name: 'LUMIÈRE', suffix: 'lash & brow atelier', legalName: 'LUMIÈRE', description: '', tagline: '' },
        seo: { title: 'LUMIÈRE — студия реставрации ресниц и бровей', description: '' },
        theme: null,
        contacts: { phone: '', phoneHref: '', email: '', address: '', hours: '', socials: {} },
        about: {},
        schedule: [],
        booking: { slotStep: 30, leadHours: 2, cancelHours: 24, horizonDays: 45, daysStrip: 14 },
        categories: { lash: 'Ресницы', brow: 'Брови', care: 'Уход', studio: 'Студия' },
        services: [],
        masters: [],
        gallery: [],
      };
    }
    state.site = site;
    state.user = user;
    if (site.theme) applyTheme(site.theme);
    if (site) setBranding(site, page);
    if (site) mountChrome(site, page);
    if (user) {
      try {
        await loadFavorites();
      } catch {}
    }
    return { site, user, state };
  }

  async function refreshUser() {
    try {
      const result = await api('/api/auth/me');
      state.user = result.user;
      updateAuthSlots();
      return state.user;
    } catch {
      return state.user;
    }
  }

  function serviceLink(slug, params = {}) {
    const query = new URLSearchParams({ service: slug, ...params });
    return `/booking?${query.toString()}`;
  }

  window.App = {
    api,
    init,
    refreshUser,
    applyTheme,
    setBranding,
    mountChrome,
    updateAuthSlots,
    loadFavorites,
    isFavorite,
    toggleFavorite,
    openAuthModal,
    openReview,
    openLightbox,
    confirmAction,
    toast,
    icon,
    escapeHtml,
    money,
    formatDuration,
    formatDate,
    formatDateShort,
    statusLabel,
    statusBadge,
    initials,
    stars,
    plural,
    serviceLink,
    observeNew,
    state,
    brandMark: BRAND_MARK,
    setUser(user) {
      state.user = user;
      updateAuthSlots();
    },
  };
})();
