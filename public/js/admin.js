'use strict';

/* =========================================================
   LUMIÈRE — админ-панель
   Все разделы работают через /api/admin/*, сессия — HttpOnly.
   ========================================================= */

(async function () {
  const { site } = await App.init({ page: 'admin', requireSite: false });

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = App.escapeHtml;
  const modal = $('#admin-modal');
  const loginScreen = $('[data-login-screen]');
  const shell = $('[data-shell]');
  const content = $('[data-admin-content]');
  const nav = $('[data-admin-nav]');
  const titleEl = $('[data-admin-title]');
  const subEl = $('[data-admin-sub]');
  const nameEl = $('[data-admin-name]');
  const avatarEl = $('[data-admin-avatar]');
  const loginForm = $('[data-admin-login]');

  const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>';

  const STATUS_FLOW = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['completed', 'canceled'],
    canceled: ['pending'],
    completed: [],
  };

  const STATUS_ACTION_LABELS = {
    pending: 'Вернуть в ожидание',
    confirmed: 'Подтвердить запись',
    completed: 'Завершить визит',
    canceled: 'Отменить запись',
  };

  const REVIEW_STATUS = {
    pending: 'На модерации',
    approved: 'Опубликован',
    rejected: 'Отклонён',
  };

  const COLOR_LABELS = {
    bg: 'Фон',
    surface: 'Поверхность',
    card: 'Карточки',
    ink: 'Основной текст',
    muted: 'Вторичный текст',
    line: 'Линии',
    accent: 'Акцент',
    accentSoft: 'Мягкий акцент',
    accentDeep: 'Глубокий акцент',
    dark: 'Тёмный блок',
    onDark: 'Текст на тёмном',
  };

  const COLOR_ORDER = ['bg', 'surface', 'card', 'ink', 'muted', 'line', 'accent', 'accentSoft', 'accentDeep', 'dark', 'onDark'];

  const state = {
    admin: null,
    site: site || null,
    meta: null,
    stats: null,
    section: 'overview',
    filters: { status: '', date: '', search: '' },
    reviewFilter: '',
    clients: [],
    bookingMap: new Map(),
    currentTheme: null,
    themePreset: 'custom',
  };

  let routeToken = 0;

  const SECTIONS = {
    overview: { label: 'Обзор', sub: 'Ключевые показатели студии', icon: 'chart', render: renderOverview },
    bookings: { label: 'Записи', sub: 'Все заявки, статусы и контакты', icon: 'calendar', render: renderBookings },
    schedule: { label: 'Расписание', sub: 'Часы работы и блокировки', icon: 'clock', render: renderSchedule },
    services: { label: 'Услуги', sub: 'Карточки, цены и длительность', icon: 'scissors', render: renderServices },
    masters: { label: 'Мастера', sub: 'Специалисты и их услуги', icon: 'users', render: renderMasters },
    about: { label: 'Обо мне', sub: 'Тексты, фотографии и преимущества', icon: 'user', render: renderAbout },
    gallery: { label: 'Галерея', sub: 'Фотографии работ и студии', icon: 'image', render: renderGallery },
    reviews: { label: 'Отзывы', sub: 'Модерация и публикация', icon: 'message', render: renderReviews },
    clients: { label: 'Клиенты', sub: 'База клиентов и статистика', icon: 'users', render: renderClients },
    brand: { label: 'Бренд', sub: 'Название, тексты и изображения', icon: 'sparkle', render: renderBrand },
    contacts: { label: 'Контакты', sub: 'Адрес, телефон, карта и соцсети', icon: 'pin', render: renderContacts },
    theme: { label: 'Тема и шрифты', sub: 'Палитра и типографика сайта', icon: 'palette', render: renderTheme },
    booking: { label: 'Правила записи', sub: 'Слоты, горизонт и отмена', icon: 'settings', render: renderBookingRules },
    seo: { label: 'SEO', sub: 'Заголовок и описание для поиска', icon: 'list', render: renderSeo },
  };

  const NAV_GROUPS = [
    { label: 'Панель', items: ['overview', 'bookings'] },
    { label: 'Операции', items: ['schedule', 'services', 'masters'] },
    { label: 'Контент', items: ['about', 'gallery', 'reviews'] },
    { label: 'Клиенты', items: ['clients'] },
    { label: 'Настройки', items: ['brand', 'contacts', 'theme', 'booking', 'seo'] },
  ];

  /* ---------- utils ---------- */

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function currentHash() {
    const id = location.hash.replace(/^#\/?/, '');
    return SECTIONS[id] ? id : 'overview';
  }

  function categories() {
    return (state.meta && state.meta.categories) || (state.site && state.site.categories) || {
      lash: 'Ресницы', brow: 'Брови', care: 'Уход', studio: 'Студия',
    };
  }

  function categoryLabel(key) {
    const map = categories();
    return map[key] || key || '—';
  }

  function serviceLabel(slug) {
    const list = (state.services || []).find((s) => s.slug === slug);
    return list ? list.title : slug;
  }

  function brandMarkup() {
    const brand = (state.site && state.site.brand) || {};
    const name = brand.name || 'LUMIÈRE';
    const suffix = brand.suffix || 'lash & brow atelier';
    const mark = brand.logoImage
      ? `<img class="brand-logo-img" src="${esc(brand.logoImage)}" alt="${esc(name)}">`
      : `<span class="brand-mark">${App.brandMark}</span>`;
    return `<a class="brand" href="/" aria-label="${esc(name)} — на главную">
      ${mark}
      <span class="brand-text">
        <span class="brand-word">${esc(name)}</span>
        <span class="brand-sub">${esc(suffix)}</span>
      </span>
    </a>`;
  }

  function renderBrandMarks() {
    document.querySelectorAll('[data-login-brand], [data-admin-brand]').forEach((el) => {
      el.innerHTML = brandMarkup();
    });
  }

  function updateLoginAside() {
    if (!state.site) return;
    const quote = $('[data-login-aside] blockquote');
    const sign = $('.admin-login__sign');
    const about = state.site.about || {};
    const brand = state.site.brand || {};
    if (quote && about.quote) quote.textContent = about.quote;
    if (sign && about.name) sign.textContent = `${about.name} · основатель`;
    const eyebrow = $('.admin-login__aside .eyebrow');
    if (eyebrow && brand.name) eyebrow.innerHTML = `<span class="dot"></span>${esc(brand.name)} · atelier`;
  }

  async function api(path, options) {
    try {
      return await App.api(path, options);
    } catch (error) {
      if (error.status === 401 && state.admin) handleAuthLost();
      throw error;
    }
  }

  function handleAuthLost() {
    if (!state.admin) return;
    state.admin = null;
    showLogin();
    App.toast('Сессия администратора истекла. Войдите снова.', 'error', 6000);
  }

  function showLogin() {
    state.admin = null;
    loginScreen.hidden = false;
    shell.hidden = true;
    if (modal && modal.open) modal.close();
    document.body.classList.remove('side-open');
  }

  async function enterApp() {
    loginScreen.hidden = true;
    shell.hidden = false;
    if (state.admin) {
      if (nameEl) nameEl.textContent = state.admin.name || 'Администратор';
      if (avatarEl) avatarEl.textContent = App.initials(state.admin.name || 'А');
    }
    if (!state.site) {
      try {
        state.site = await App.api('/api/site');
        if (state.site.theme) App.applyTheme(state.site.theme);
        App.setBranding(state.site);
      } catch {}
    }
    renderBrandMarks();
    updateLoginAside();
    try {
      await ensureMeta();
    } catch (error) {
      if (error.status === 401) return;
    }
    buildNav();
    await setSection(currentHash(), { scroll: true });
  }

  function buildNav() {
    nav.innerHTML = NAV_GROUPS.map((group) => {
      const items = group.items.map((id) => {
        const section = SECTIONS[id];
        const badge = id === 'bookings' ? '<span class="admin-nav__badge" data-nav-badge hidden>0</span>' : '';
        return `<button class="admin-nav__item" type="button" data-nav="${id}">
          ${App.icon(section.icon)}<span>${esc(section.label)}</span>${badge}
        </button>`;
      }).join('');
      return `<div class="admin-nav__group">${esc(group.label)}</div>${items}`;
    }).join('');
    updateNav();
    updatePendingBadge();
  }

  function updateNav() {
    nav.querySelectorAll('[data-nav]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.nav === state.section);
    });
  }

  function updateTopbar() {
    const section = SECTIONS[state.section] || SECTIONS.overview;
    if (titleEl) titleEl.textContent = section.label;
    if (subEl) subEl.textContent = section.sub;
    const brand = (state.site && state.site.brand) || {};
    document.title = `${section.label} — Админ-панель ${brand.name || 'LUMIÈRE'}`;
  }

  function updatePendingBadge() {
    const badge = document.querySelector('[data-nav-badge]');
    if (!badge) return;
    const pending = Number(state.stats && state.stats.pending) || 0;
    badge.textContent = String(pending);
    badge.hidden = pending <= 0;
  }

  function go(section) {
    if (!state.admin || !SECTIONS[section]) return;
    if (location.hash.replace(/^#\/?/, '') === section) setSection(section, { scroll: true });
    else location.hash = section;
  }

  async function setSection(section, { scroll = true } = {}) {
    if (!state.admin) return;
    if (!SECTIONS[section]) section = 'overview';
    state.section = section;
    updateNav();
    updateTopbar();
    document.body.classList.remove('side-open');
    const token = ++routeToken;
    content.innerHTML = '<div class="admin-loading">Загружаем данные…</div>';
    try {
      await SECTIONS[section].render(token);
    } catch (error) {
      if (error.status === 401) return;
      if (token !== routeToken) return;
      renderRouteError(error);
      return;
    }
    if (token !== routeToken) return;
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async function refreshCurrent() {
    const y = window.scrollY;
    await setSection(state.section, { scroll: false });
    window.scrollTo({ top: y, behavior: 'auto' });
  }

  async function ensureMeta() {
    if (state.meta) return state.meta;
    const data = await api('/api/admin/overview');
    state.meta = data.meta;
    state.stats = data.stats;
    state.overview = data;
    updatePendingBadge();
    return state.meta;
  }

  async function refreshBadge() {
    try {
      const data = await api('/api/admin/overview');
      state.meta = data.meta;
      state.stats = data.stats;
      updatePendingBadge();
    } catch {}
  }

  function renderRouteError(error) {
    content.innerHTML = `<div class="admin-card"><div class="admin-card__body admin-empty-state">
      ${App.icon('info')}
      <p>${esc(error.message || 'Не удалось загрузить раздел')}</p>
      <button class="btn btn--outline btn--sm" type="button" data-retry>Повторить</button>
    </div></div>`;
  }

  /* ---------- modal / forms ---------- */

  function openModal({ title, sub = '', body, wide = false }) {
    modal.classList.toggle('modal--wide', Boolean(wide));
    modal.setAttribute('aria-label', title);
    modal.innerHTML = `<div class="modal-head">
        <div>
          <h3 class="modal-title">${esc(title)}</h3>
          ${sub ? `<p class="modal-sub">${esc(sub)}</p>` : ''}
        </div>
        <button class="modal-close" type="button" data-close-modal aria-label="Закрыть">${App.icon('close')}</button>
      </div>
      <div class="modal-body">${body}</div>`;
    if (!modal.open) modal.showModal();
    modal.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => modal.close());
    });
    setTimeout(() => {
      const first = modal.querySelector('input:not([type="checkbox"]):not([type="file"]), textarea, select');
      if (first && modal.open) first.focus();
    }, 80);
  }

  function formError(form, message, fields) {
    const box = form.querySelector('[data-form-error]');
    if (box) {
      box.textContent = message || '';
      box.classList.toggle('is-visible', Boolean(message));
    }
    form.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
    if (fields) {
      Object.keys(fields).forEach((name) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.closest('.field')?.classList.add('has-error');
      });
    }
  }

  async function submitForm(form, action, { success = 'Изменения сохранены', onSuccess = null, close = false } = {}) {
    const button = form.querySelector('button[type="submit"]');
    const label = button ? button.innerHTML : '';
    formError(form, '');
    if (button) {
      button.disabled = true;
      button.textContent = 'Сохраняем…';
    }
    try {
      const result = await action();
      if (close && modal.open) modal.close();
      if (success) App.toast(success, 'success');
      if (onSuccess) await onSuccess(result);
      return result;
    } catch (error) {
      if (error.status === 401) return null;
      formError(form, error.message, error.fields);
      App.toast(error.message, 'error', 6000);
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = label;
      }
    }
  }

  function option(value, label, current) {
    const selected = String(value) === String(current === undefined || current === null ? '' : current);
    return `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
  }

  function imageField(name, value, { label = 'Фотография', hint = 'PNG, JPG или WebP до 4 МБ. Можно вставить ссылку https://' } = {}) {
    const url = value ? String(value) : '';
    const style = url ? ` style="background-image:url(&quot;${esc(url.replace(/["\\\r\n]/g, ''))}&quot;)"` : '';
    return `<div class="field">
      <label>${esc(label)}</label>
      <div class="image-field" data-image-field>
        <div class="image-field__preview${url ? '' : ' is-empty'}" data-image-preview${style}></div>
        <div class="image-field__body">
          <input type="text" name="${esc(name)}" data-image-input value="${esc(url)}" placeholder="https://… или /uploads/…" autocomplete="off">
          <div class="image-field__actions">
            <label class="upload-btn">${App.icon('upload')}<span data-upload-label>Загрузить</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" data-image-file hidden>
            </label>
            <button class="upload-btn" type="button" data-image-clear>${App.icon('trash')}Убрать</button>
          </div>
          <span class="image-field__hint">${esc(hint)}</span>
        </div>
      </div>
    </div>`;
  }

  function setImagePreview(field, url) {
    const preview = field.querySelector('[data-image-preview]');
    if (!preview) return;
    preview.classList.toggle('is-empty', !url);
    preview.style.backgroundImage = url ? `url("${String(url).replace(/"/g, '%22')}")` : '';
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    if (!file) throw new Error('Выберите файл');
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Поддерживаются изображения PNG, JPG и WebP');
    if (file.size > 4 * 1024 * 1024) throw new Error('Максимальный размер изображения — 4 МБ');
    const dataUrl = await readFile(file);
    const result = await api('/api/admin/upload', { method: 'POST', body: { dataUrl } });
    return result.url;
  }

  /* ---------- global events ---------- */

  function bindGlobal() {
    nav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-nav]');
      if (button) go(button.dataset.nav);
    });

    const burger = $('[data-admin-burger]');
    if (burger) burger.addEventListener('click', () => document.body.classList.toggle('side-open'));

    const logout = $('[data-admin-logout]');
    if (logout) logout.addEventListener('click', handleLogout);

    document.addEventListener('click', (event) => {
      if (!document.body.classList.contains('side-open')) return;
      if (!event.target.closest('.admin-side') && !event.target.closest('[data-admin-burger]')) {
        document.body.classList.remove('side-open');
      }
    });

    document.addEventListener('click', async (event) => {
      const clear = event.target.closest('[data-image-clear]');
      if (clear) {
        const field = clear.closest('[data-image-field]');
        const input = field.querySelector('[data-image-input]');
        input.value = '';
        setImagePreview(field, '');
        return;
      }
      const goto = event.target.closest('[data-goto]');
      if (goto) {
        if (goto.dataset.gotoDate) state.filters.date = goto.dataset.gotoDate;
        if (goto.dataset.gotoStatus) state.filters.status = goto.dataset.gotoStatus;
        go(goto.dataset.goto);
        return;
      }
      const open = event.target.closest('[data-booking-open]');
      if (open) {
        openBookingDetails(Number(open.dataset.bookingOpen));
        return;
      }
      const retry = event.target.closest('[data-retry]');
      if (retry) setSection(state.section, { scroll: false });
    });

    document.addEventListener('input', (event) => {
      const input = event.target.closest('[data-image-input]');
      if (!input) return;
      const field = input.closest('[data-image-field]');
      setImagePreview(field, input.value.trim());
    });

    document.addEventListener('change', async (event) => {
      const input = event.target.closest('[data-image-file]');
      if (!input || !input.files || !input.files[0]) return;
      const field = input.closest('[data-image-field]');
      const label = field.querySelector('[data-upload-label]');
      const urlInput = field.querySelector('[data-image-input]');
      const original = label ? label.textContent : '';
      if (label) label.textContent = 'Загрузка…';
      try {
        const url = await uploadImage(input.files[0]);
        urlInput.value = url;
        setImagePreview(field, url);
        App.toast('Фотография загружена', 'success');
      } catch (error) {
        if (error.status !== 401) App.toast(error.message, 'error', 6000);
      } finally {
        if (label) label.textContent = original || 'Загрузить';
        input.value = '';
      }
    });

    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
      });
    }

    window.addEventListener('hashchange', () => {
      if (!state.admin) return;
      setSection(currentHash(), { scroll: true });
    });
  }

  /* ---------- login ---------- */

  function bindLogin() {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (loginForm.dataset.busy === '1') return;
      const data = new FormData(loginForm);
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '');
      const button = loginForm.querySelector('button[type="submit"]');
      const label = button.textContent;
      formError(loginForm, '');
      loginForm.dataset.busy = '1';
      button.disabled = true;
      button.textContent = 'Входим…';
      try {
        const result = await App.api('/api/admin/login', { method: 'POST', body: { email, password } });
        state.admin = result.user;
        loginForm.reset();
        await enterApp();
      } catch (error) {
        formError(loginForm, error.message, error.fields);
      } finally {
        loginForm.dataset.busy = '';
        button.disabled = false;
        button.textContent = label;
      }
    });

    const fill = $('[data-fill-demo]');
    if (fill) {
      fill.addEventListener('click', () => {
        loginForm.elements.email.value = 'admin@lumiere.studio';
        loginForm.elements.password.value = 'Lumiere2026!';
        formError(loginForm, '');
        loginForm.elements.password.focus();
      });
    }
  }

  async function handleLogout() {
    try {
      await App.api('/api/admin/logout', { method: 'POST' });
    } catch {}
    state.admin = null;
    state.meta = null;
    state.stats = null;
    showLogin();
    loginForm.reset();
    history.replaceState(null, '', location.pathname);
    App.toast('Вы вышли из панели');
  }

  /* ---------- bookings helpers ---------- */

  function cacheBookings(list) {
    (list || []).forEach((booking) => state.bookingMap.set(Number(booking.id), booking));
  }

  function statusSelect(booking) {
    const flow = STATUS_FLOW[booking.status] || [];
    const values = [booking.status, ...flow.filter((s) => s !== booking.status)];
    const options = values.map((status) =>
      `<option value="${status}"${status === booking.status ? ' selected' : ''}>${esc(App.statusLabel(status))}</option>`
    ).join('');
    return `<select class="status-select" data-booking-status="${booking.id}" aria-label="Статус записи ${esc(booking.code)}" ${flow.length ? '' : 'disabled'}>${options}</select>`;
  }

  function bookingRow(booking) {
    return `<tr>
      <td>
        <span class="cell-main">${esc(booking.name)}</span>
        <span class="cell-sub">${esc(booking.phone)}</span>
        <span class="cell-sub">№ ${esc(booking.code)}</span>
      </td>
      <td>
        <div class="table-service">
          <img class="table-thumb" src="${esc(booking.service.image)}" alt="" loading="lazy">
          <span><span class="cell-main">${esc(booking.service.title)}</span><span class="cell-sub">${esc(booking.master.name)}</span></span>
        </div>
      </td>
      <td class="cell-mono">
        ${esc(App.formatDateShort(booking.date))}
        <span class="cell-sub">${esc(booking.time)} · ${App.formatDuration(booking.duration)}</span>
      </td>
      <td class="cell-mono">${App.money(booking.price)}</td>
      <td>${statusSelect(booking)}</td>
      <td><div class="cell-actions">
        <button class="icon-btn" type="button" data-booking-open="${booking.id}" aria-label="Детали записи ${esc(booking.code)}">${App.icon('chevronRight')}</button>
      </div></td>
    </tr>`;
  }

  function statusActionButton(booking, status) {
    const primary = status === 'confirmed' || status === 'completed';
    return `<button class="btn ${primary ? 'btn--accent' : 'btn--outline'} btn--sm" type="button" data-modal-status="${status}">
      ${esc(STATUS_ACTION_LABELS[status] || status)}
    </button>`;
  }

  async function changeBookingStatus(id, status) {
    const result = await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { status } });
    App.toast(`Статус изменён: ${App.statusLabel(status)}`, 'success');
    await refreshBadge();
    return result.booking;
  }

  function openBookingDetails(id) {
    const booking = state.bookingMap.get(Number(id));
    if (!booking) {
      App.toast('Запись не найдена. Обновите список.', 'error');
      return;
    }
    const flow = STATUS_FLOW[booking.status] || [];
    openModal({
      title: `Запись ${booking.code}`,
      sub: `${App.formatDate(booking.date)} · ${booking.time} · ${App.statusLabel(booking.status)}`,
      wide: true,
      body: `<div class="summary-rows">
          <div class="summary-row"><span>Клиент</span><strong>${esc(booking.name)}</strong></div>
          <div class="summary-row"><span>Телефон</span><strong><a href="tel:${esc(booking.phone.replace(/[^\d+]/g, ''))}">${esc(booking.phone)}</a></strong></div>
          <div class="summary-row"><span>Email</span><strong><a href="mailto:${esc(booking.email)}">${esc(booking.email)}</a></strong></div>
          <div class="summary-row"><span>Услуга</span><strong>${esc(booking.service.title)}</strong></div>
          <div class="summary-row"><span>Мастер</span><strong>${esc(booking.master.name)}</strong></div>
          <div class="summary-row"><span>Дата и время</span><strong>${esc(App.formatDate(booking.date))}, ${esc(booking.time)}</strong></div>
          <div class="summary-row"><span>Длительность</span><strong>${App.formatDuration(booking.duration)}</strong></div>
          <div class="summary-row"><span>Стоимость</span><strong>${App.money(booking.price)}</strong></div>
          <div class="summary-row"><span>Создана</span><strong>${esc(new Date(booking.createdAt).toLocaleString('ru-RU'))}</strong></div>
        </div>
        ${booking.comment ? `<div class="admin-hint" style="margin-top:14px">${App.icon('message')}<span>${esc(booking.comment)}</span></div>` : ''}
        <div class="admin-actions" style="margin-top:20px">
          ${flow.map((status) => statusActionButton(booking, status)).join('')}
          <button class="btn btn--outline btn--sm" type="button" data-close-modal>Закрыть</button>
        </div>`,
    });
    modal.querySelectorAll('[data-modal-status]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await changeBookingStatus(booking.id, button.dataset.modalStatus);
          modal.close();
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error', 6000);
        }
      });
    });
  }

  /* ---------- overview ---------- */

  async function renderOverview(token) {
    const data = await api('/api/admin/overview');
    if (token !== routeToken) return;
    state.meta = data.meta;
    state.stats = data.stats;
    state.overview = data;
    updatePendingBadge();
    cacheBookings(data.upcoming);
    cacheBookings(data.recent);

    const stats = data.stats;
    const upcoming = data.upcoming || [];
    const recent = data.recent || [];
    const brand = (state.site && state.site.brand) || {};

    content.innerHTML = `
      <div class="stats-grid">
        <button class="stat-card" type="button" data-goto="bookings" data-goto-date="${todayISO()}">
          <span class="stat-card__label">Сегодня</span>
          <span class="stat-card__value">${stats.todayBookings}</span>
          <span class="stat-card__hint">${App.plural(stats.todayBookings, 'запись', 'записи', 'записей')} в студии</span>
        </button>
        <button class="stat-card" type="button" data-goto="bookings" data-goto-status="pending">
          <span class="stat-card__label">Ожидают подтверждения</span>
          <span class="stat-card__value">${stats.pending}</span>
          <span class="stat-card__hint">${stats.pending ? 'Нужно связаться с клиентом' : 'Все заявки обработаны'}</span>
        </button>
        <div class="stat-card">
          <span class="stat-card__label">Сумма записей</span>
          <span class="stat-card__value">${App.money(stats.weekRevenue)}</span>
          <span class="stat-card__hint">Подтверждённые и завершённые, включая предстоящие</span>
        </div>
        <button class="stat-card" type="button" data-goto="clients">
          <span class="stat-card__label">Клиенты</span>
          <span class="stat-card__value">${stats.clients}</span>
          <span class="stat-card__hint">Зарегистрированные аккаунты</span>
        </button>
        <button class="stat-card" type="button" data-goto="reviews">
          <span class="stat-card__label">Оценка студии</span>
          <span class="stat-card__value">${stats.rating ? stats.rating.toFixed(1).replace('.', ',') : '—'}<small> / 5</small></span>
          <span class="stat-card__hint">${App.plural(stats.reviews, 'отзыв', 'отзыва', 'отзывов')} опубликовано</span>
        </button>
      </div>

      <div class="admin-split">
        <div class="admin-card">
          <div class="admin-card__head">
            <div><h2>Ближайшие записи</h2><p>Подтверждённые и ожидающие визиты</p></div>
            <button class="btn btn--outline btn--sm" type="button" data-goto="bookings">Все записи</button>
          </div>
          ${upcoming.length ? `<div class="admin-table-wrap"><table class="admin-table">
            <thead><tr><th>Клиент</th><th>Услуга</th><th>Когда</th><th>Статус</th><th></th></tr></thead>
            <tbody>${upcoming.slice(0, 8).map((booking) => `<tr>
              <td><span class="cell-main">${esc(booking.name)}</span><span class="cell-sub">${esc(booking.phone)}</span></td>
              <td><span class="cell-main">${esc(booking.service.title)}</span><span class="cell-sub">${esc(booking.master.name)}</span></td>
              <td class="cell-mono">${esc(App.formatDateShort(booking.date))}<span class="cell-sub">${esc(booking.time)}</span></td>
              <td>${App.statusBadge(booking.status)}</td>
              <td><button class="icon-btn" type="button" data-booking-open="${booking.id}" aria-label="Открыть запись">${App.icon('chevronRight')}</button></td>
            </tr>`).join('')}</tbody>
          </table></div>` : `<div class="admin-empty-state">${App.icon('calendar')}<p>Предстоящих записей нет.</p></div>`}
        </div>

        <div class="admin-card">
          <div class="admin-card__head"><div><h3>Быстрые действия</h3><p>${esc(brand.name || 'Студия')} · панель управления</p></div></div>
          <div class="admin-card__body" style="display:grid;gap:10px">
            <button class="btn btn--accent btn--block btn--sm" type="button" data-goto="services">${App.icon('plus')}Добавить услугу</button>
            <button class="btn btn--outline btn--block btn--sm" type="button" data-goto="schedule">${App.icon('clock')}Закрыть время</button>
            <button class="btn btn--outline btn--block btn--sm" type="button" data-goto="theme">${App.icon('palette')}Настроить тему</button>
            <a class="btn btn--outline btn--block btn--sm" href="/" target="_blank" rel="noopener">${App.icon('external')}Открыть сайт</a>
          </div>
          <div class="admin-card__foot" style="justify-content:flex-start">
            <span class="admin-meta-line">${App.icon('info')}Демо-проект. Данные сохраняются локально.</span>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card__head">
          <div><h2>Последние заявки</h2><p>Новые и недавно изменённые записи</p></div>
          <button class="btn btn--outline btn--sm" type="button" data-goto="bookings">Открыть журнал</button>
        </div>
        ${recent.length ? `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr><th>Клиент</th><th>Услуга</th><th>Дата</th><th>Сумма</th><th>Статус</th><th></th></tr></thead>
          <tbody>${recent.slice(0, 8).map((booking) => `<tr>
            <td><span class="cell-main">${esc(booking.name)}</span><span class="cell-sub">№ ${esc(booking.code)}</span></td>
            <td>${esc(booking.service.title)}</td>
            <td class="cell-mono">${esc(App.formatDateShort(booking.date))}<span class="cell-sub">${esc(booking.time)}</span></td>
            <td class="cell-mono">${App.money(booking.price)}</td>
            <td>${App.statusBadge(booking.status)}</td>
            <td><button class="icon-btn" type="button" data-booking-open="${booking.id}" aria-label="Открыть запись">${App.icon('chevronRight')}</button></td>
          </tr>`).join('')}</tbody>
        </table></div>` : `<div class="admin-empty-state">${App.icon('list')}<p>Записей пока нет.</p></div>`}
      </div>`;
  }

  /* ---------- bookings ---------- */

  async function renderBookings(token) {
    content.innerHTML = `
      <div class="admin-card">
        <div class="admin-card__head">
          <div><h2>Все записи</h2><p data-bookings-caption>Загружаем…</p></div>
          <div class="admin-toolbar">
            <div class="admin-search">
              ${SEARCH_ICON}
              <input type="search" data-bookings-search placeholder="Имя, телефон, email или номер" value="${esc(state.filters.search)}" aria-label="Поиск записей">
            </div>
            <select class="admin-select" data-bookings-status aria-label="Фильтр по статусу">
              ${option('', 'Все статусы', state.filters.status)}
              ${option('pending', 'Ожидают', state.filters.status)}
              ${option('confirmed', 'Подтверждены', state.filters.status)}
              ${option('completed', 'Завершены', state.filters.status)}
              ${option('canceled', 'Отменены', state.filters.status)}
            </select>
            <input class="admin-input admin-date" type="date" data-bookings-date value="${esc(state.filters.date)}" aria-label="Фильтр по дате">
            <button class="icon-btn" type="button" data-bookings-reset aria-label="Сбросить фильтры">${App.icon('close')}</button>
          </div>
        </div>
        <div data-bookings-table><div class="admin-loading">Загружаем записи…</div></div>
      </div>`;

    const host = content.querySelector('[data-bookings-table]');
    const caption = content.querySelector('[data-bookings-caption]');
    const search = content.querySelector('[data-bookings-search]');
    const status = content.querySelector('[data-bookings-status]');
    const date = content.querySelector('[data-bookings-date]');
    const reset = content.querySelector('[data-bookings-reset]');
    let timer = null;

    async function loadTable() {
      if (token !== routeToken) return;
      host.innerHTML = '<div class="admin-loading">Загружаем записи…</div>';
      const params = new URLSearchParams();
      if (state.filters.status) params.set('status', state.filters.status);
      if (state.filters.date) params.set('date', state.filters.date);
      if (state.filters.search) params.set('search', state.filters.search);
      try {
        const data = await api(`/api/admin/bookings?${params.toString()}`);
        if (token !== routeToken) return;
        const list = data.bookings || [];
        cacheBookings(list);
        state.bookings = list;
        if (caption) {
          caption.textContent = `${list.length} ${App.plural(list.length, 'запись', 'записи', 'записей')}${state.filters.status ? ` · ${App.statusLabel(state.filters.status)}` : ''}`;
        }
        if (!list.length) {
          host.innerHTML = `<div class="admin-empty-state">${App.icon('calendar')}
            <p>По выбранным фильтрам записей нет.</p>
            <button class="btn btn--outline btn--sm" type="button" data-bookings-empty-reset>Сбросить фильтры</button>
          </div>`;
          const emptyReset = host.querySelector('[data-bookings-empty-reset]');
          if (emptyReset) {
            emptyReset.addEventListener('click', () => {
              state.filters = { status: '', date: '', search: '' };
              search.value = '';
              status.value = '';
              date.value = '';
              loadTable();
            });
          }
          return;
        }
        host.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr><th>Клиент</th><th>Услуга и мастер</th><th>Дата и время</th><th>Стоимость</th><th>Статус</th><th></th></tr></thead>
          <tbody>${list.map(bookingRow).join('')}</tbody>
        </table></div>`;
      } catch (error) {
        if (error.status === 401) return;
        if (token !== routeToken) return;
        host.innerHTML = `<div class="admin-empty-state">${App.icon('info')}<p>${esc(error.message)}</p>
          <button class="btn btn--outline btn--sm" type="button" data-bookings-retry>Повторить</button></div>`;
        const retry = host.querySelector('[data-bookings-retry]');
        if (retry) retry.addEventListener('click', loadTable);
      }
    }

    if (search) {
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          state.filters.search = search.value.trim();
          loadTable();
        }, 320);
      });
    }
    if (status) {
      status.addEventListener('change', () => {
        state.filters.status = status.value;
        loadTable();
      });
    }
    if (date) {
      date.addEventListener('change', () => {
        state.filters.date = date.value;
        loadTable();
      });
    }
    if (reset) {
      reset.addEventListener('click', () => {
        state.filters = { status: '', date: '', search: '' };
        search.value = '';
        status.value = '';
        date.value = '';
        loadTable();
      });
    }

    host.addEventListener('change', async (event) => {
      const select = event.target.closest('[data-booking-status]');
      if (!select) return;
      select.disabled = true;
      try {
        await changeBookingStatus(Number(select.dataset.bookingStatus), select.value);
        await refreshCurrent();
      } catch (error) {
        if (error.status !== 401) App.toast(error.message, 'error', 6000);
        await loadTable();
      }
    });

    await loadTable();
  }

  /* ---------- schedule ---------- */

  async function renderSchedule(token) {
    content.innerHTML = `
      <div class="admin-split">
        <div class="admin-card">
          <div class="admin-card__head">
            <div><h2>Часы работы</h2><p>Слоты записи строятся по этому расписанию</p></div>
          </div>
          <form data-schedule-form>
            <div class="admin-card__body">
              <div class="form-error" data-form-error></div>
              <div class="schedule-list" data-schedule-list><div class="admin-loading">Загружаем расписание…</div></div>
              <div class="admin-hint" style="margin-top:16px">${App.icon('info')}<span>Время указывается по часовому поясу сервера. Закрытый день полностью исключается из онлайн-записи.</span></div>
            </div>
            <div class="admin-card__foot">
              <button class="btn btn--accent btn--sm" type="submit">Сохранить расписание</button>
            </div>
          </form>
        </div>

        <div class="admin-card">
          <div class="admin-card__head">
            <div><h3>Блокировки</h3><p>Выходные и занятое время</p></div>
          </div>
          <form data-block-form>
            <div class="admin-card__body" style="display:grid;gap:12px">
              <div class="form-error" data-form-error></div>
              <div class="form-grid-2">
                <div class="field"><label>Дата</label><input type="date" name="date" value="${todayISO()}" required></div>
                <div class="field"><label>Причина</label><input type="text" name="reason" maxlength="200" placeholder="Выходной, обучение…"></div>
              </div>
              <div class="form-grid-2">
                <div class="field"><label>Начало</label><input type="time" name="start"></div>
                <div class="field"><label>Конец</label><input type="time" name="end"></div>
              </div>
              <span class="image-field__hint">Оставьте время пустым, чтобы закрыть весь день. Иначе укажите и начало, и конец.</span>
              <button class="btn btn--outline btn--sm" type="submit">Добавить блокировку</button>
            </div>
          </form>
          <div class="admin-card__head" style="border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
            <div><h3 style="font-size:18px">Ближайшие исключения</h3></div>
          </div>
          <div class="admin-card__body" data-blocks><div class="admin-loading">Загружаем…</div></div>
        </div>
      </div>`;

    const scheduleForm = content.querySelector('[data-schedule-form]');
    const scheduleList = content.querySelector('[data-schedule-list]');
    const blockForm = content.querySelector('[data-block-form]');
    const blocksHost = content.querySelector('[data-blocks]');

    const [settings, blocks] = await Promise.all([
      api('/api/admin/settings/schedule'),
      api('/api/admin/blocks'),
    ]);
    if (token !== routeToken) return;

    const rows = (Array.isArray(settings.value) ? settings.value : []).slice()
      .sort((a, b) => ((Number(a.weekday) || 7) - (Number(b.weekday) || 7)));
    scheduleList.innerHTML = rows.map((day) => `
      <div class="schedule-row${day.open ? '' : ' is-closed'}" data-schedule-row="${day.weekday}">
        <div class="schedule-row__day">${esc(day.label)}<small>${day.open ? 'рабочий день' : 'выходной'}</small></div>
        <label class="day-toggle">
          <input type="checkbox" data-day-open ${day.open ? 'checked' : ''}>
          <span data-day-state>${day.open ? 'Открыт' : 'Закрыт'}</span>
        </label>
        <input class="schedule-row__time" type="time" data-day-start value="${esc(day.start || '10:00')}" aria-label="Начало работы ${esc(day.label)}">
        <input class="schedule-row__time" type="time" data-day-end value="${esc(day.end || '20:00')}" aria-label="Конец работы ${esc(day.label)}">
      </div>`).join('');

    scheduleList.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-day-open]');
      if (!checkbox) return;
      const row = checkbox.closest('[data-schedule-row]');
      row.classList.toggle('is-closed', !checkbox.checked);
      const stateLabel = row.querySelector('[data-day-state]');
      if (stateLabel) stateLabel.textContent = checkbox.checked ? 'Открыт' : 'Закрыт';
      const day = row.querySelector('.schedule-row__day small');
      if (day) day.textContent = checkbox.checked ? 'рабочий день' : 'выходной';
    });

    scheduleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = [...scheduleList.querySelectorAll('[data-schedule-row]')].map((row) => ({
        weekday: Number(row.dataset.scheduleRow),
        open: row.querySelector('[data-day-open]').checked,
        start: row.querySelector('[data-day-start]').value,
        end: row.querySelector('[data-day-end]').value,
      }));
      submitForm(scheduleForm, () => api('/api/admin/settings/schedule', { method: 'PUT', body: { value } }), {
        success: 'Расписание сохранено',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.schedule = result.value;
          if (state.site) state.site.schedule = result.value;
        },
      });
    });

    function renderBlocks(list) {
      if (!list.length) {
        blocksHost.innerHTML = `<div class="admin-empty-state">${App.icon('calendar')}<p>Исключений нет — студия работает по обычному графику.</p></div>`;
        return;
      }
      blocksHost.innerHTML = `<div class="block-list">${list.map((block) => `
        <div class="block-row">
          <span class="block-row__date">${esc(App.formatDateShort(block.date))}</span>
          <span class="block-row__time">${block.start && block.end ? `${esc(block.start)}–${esc(block.end)}` : 'Весь день'}</span>
          <span class="block-row__reason">${esc(block.reason || 'Без комментария')}</span>
          <button class="icon-btn is-danger" type="button" data-block-delete="${block.id}" aria-label="Удалить блокировку">${App.icon('trash')}</button>
        </div>`).join('')}</div>`;
    }

    renderBlocks(blocks.blocks || []);

    async function loadBlocks() {
      try {
        const data = await api('/api/admin/blocks');
        if (token !== routeToken) return;
        renderBlocks(data.blocks || []);
      } catch (error) {
        if (error.status !== 401) App.toast(error.message, 'error');
      }
    }

    blocksHost.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-block-delete]');
      if (!button) return;
      const ok = await App.confirmAction({
        title: 'Удалить блокировку?',
        text: 'Время снова станет доступно для онлайн-записи.',
        confirmLabel: 'Удалить',
        danger: true,
      });
      if (!ok) return;
      button.disabled = true;
      try {
        await api(`/api/admin/blocks/${button.dataset.blockDelete}`, { method: 'DELETE' });
        App.toast('Блокировка удалена', 'success');
        await loadBlocks();
      } catch (error) {
        button.disabled = false;
        if (error.status !== 401) App.toast(error.message, 'error');
      }
    });

    blockForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(blockForm);
      const body = {
        date: String(data.get('date') || ''),
        start: String(data.get('start') || ''),
        end: String(data.get('end') || ''),
        reason: String(data.get('reason') || ''),
      };
      submitForm(blockForm, () => api('/api/admin/blocks', { method: 'POST', body }), {
        success: 'Блокировка добавлена',
        onSuccess: async () => {
          blockForm.reset();
          const dateInput = blockForm.querySelector('[name="date"]');
          if (dateInput) dateInput.value = todayISO();
          await loadBlocks();
        },
      });
    });
  }

  /* ---------- services ---------- */

  async function renderServices(token) {
    const data = await api('/api/admin/services');
    if (token !== routeToken) return;
    const list = data.services || [];
    state.services = list;

    const activeCount = list.filter((service) => service.active).length;
    content.innerHTML = `
      <div class="admin-toolbar" style="justify-content:space-between">
        <p class="admin-meta-line">${App.icon('scissors')}Всего услуг: ${list.length} · на сайте: ${activeCount}</p>
        <button class="btn btn--accent btn--sm" type="button" data-service-add>${App.icon('plus')}Добавить услугу</button>
      </div>
      ${list.length ? `<div class="admin-cards-grid">${list.map((service) => `
        <article class="admin-item-card">
          <div class="admin-item-card__media">
            <img src="${esc(service.image)}" alt="${esc(service.title)}" loading="lazy">
            <span class="admin-pill ${service.active ? 'is-on' : 'is-off'}">${service.active ? 'На сайте' : 'Скрыта'}</span>
          </div>
          <div class="admin-item-card__body">
            <h3>${esc(service.title)}</h3>
            <div class="admin-item-card__meta">
              <span>${esc(categoryLabel(service.category))}</span>
              <span>${App.formatDuration(service.duration)}</span>
              <span>${service.bookingsCount} ${App.plural(service.bookingsCount, 'запись', 'записи', 'записей')}</span>
            </div>
            <div class="admin-item-card__foot">
              <span class="admin-item-card__price">${App.money(service.price)}</span>
              <span class="admin-item-card__actions">
                <button class="icon-btn" type="button" data-service-edit="${service.id}" aria-label="Редактировать ${esc(service.title)}">${App.icon('edit')}</button>
                <button class="icon-btn is-danger" type="button" data-service-delete="${service.id}" aria-label="Удалить ${esc(service.title)}">${App.icon('trash')}</button>
              </span>
            </div>
          </div>
        </article>`).join('')}</div>` : `<div class="admin-card"><div class="admin-empty-state">${App.icon('scissors')}
          <p>Услуг пока нет. Добавьте первую, чтобы открыть онлайн-запись.</p>
          <button class="btn btn--accent btn--sm" type="button" data-service-add>Добавить услугу</button>
        </div></div>`}`;

    const addButton = content.querySelector('[data-service-add]');
    if (addButton) addButton.addEventListener('click', () => openServiceForm(null));

    content.querySelectorAll('[data-service-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const service = list.find((item) => Number(item.id) === Number(button.dataset.serviceEdit));
        if (service) openServiceForm(service);
      });
    });

    content.querySelectorAll('[data-service-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const service = list.find((item) => Number(item.id) === Number(button.dataset.serviceDelete));
        if (!service) return;
        const archived = service.bookingsCount > 0;
        const ok = await App.confirmAction({
          title: archived ? 'Скрыть услугу?' : 'Удалить услугу?',
          text: archived
            ? `«${service.title}» есть в записях, поэтому она будет скрыта с сайта, но останется в истории.`
            : `«${service.title}» будет удалена без возможности восстановления.`,
          confirmLabel: archived ? 'Скрыть' : 'Удалить',
          danger: true,
        });
        if (!ok) return;
        button.disabled = true;
        try {
          const result = await api(`/api/admin/services/${service.id}`, { method: 'DELETE' });
          App.toast(result.message || 'Услуга удалена', 'success');
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error');
        }
      });
    });
  }

  function openServiceForm(service) {
    const map = categories();
    const categoryKeys = Object.keys(map).filter((key) => key !== 'studio');
    openModal({
      title: service ? 'Редактировать услугу' : 'Новая услуга',
      sub: service ? service.slug : 'Появится в разделе услуг и онлайн-записи',
      wide: true,
      body: `<form class="admin-form" data-service-form>
        <div class="form-error" data-form-error></div>
        <div class="field"><label>Название</label><input type="text" name="title" maxlength="80" required value="${esc(service ? service.title : '')}" placeholder="Наращивание ресниц"></div>
        <div class="field"><label>Короткое описание</label><input type="text" name="short" maxlength="160" required value="${esc(service ? service.short : '')}" placeholder="Одна строка для карточки услуги"></div>
        <div class="form-grid-3">
          <div class="field"><label>Длительность, мин</label><input type="number" name="duration" min="15" max="600" step="5" required value="${service ? service.duration : 60}"></div>
          <div class="field"><label>Стоимость, ₽</label><input type="number" name="price" min="0" max="1000000" step="50" required value="${service ? service.price : 2500}"></div>
          <div class="field"><label>Категория</label><select name="category">
            ${categoryKeys.map((key) => option(key, map[key], service ? service.category : 'lash')).join('')}
          </select></div>
        </div>
        <div class="field"><label>Описание</label><textarea name="description" required minlength="20" placeholder="Что входит в процедуру, кому подходит, какой результат">${esc(service ? service.description : '')}</textarea></div>
        ${imageField('image', service ? service.image : '')}
        <label class="switchline"><input type="checkbox" name="active" ${!service || service.active ? 'checked' : ''}>
          <span>Показывать на сайте<small>Скрытые услуги недоступны для записи и не видны в каталоге</small></span>
        </label>
        <div class="admin-form__foot">
          <button class="btn btn--outline btn--sm" type="button" data-close-modal>Отмена</button>
          <button class="btn btn--accent btn--sm" type="submit">${service ? 'Сохранить' : 'Добавить услугу'}</button>
        </div>
      </form>`,
    });

    const form = modal.querySelector('[data-service-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        title: String(data.get('title') || ''),
        short: String(data.get('short') || ''),
        description: String(data.get('description') || ''),
        duration: Number(data.get('duration')),
        price: Number(data.get('price')),
        category: String(data.get('category') || 'lash'),
        image: String(data.get('image') || ''),
        active: form.elements.active.checked,
      };
      const request = service
        ? api(`/api/admin/services/${service.id}`, { method: 'PATCH', body: payload })
        : api('/api/admin/services', { method: 'POST', body: payload });
      submitForm(form, () => request, {
        success: service ? 'Услуга обновлена' : 'Услуга добавлена',
        close: true,
        onSuccess: refreshCurrent,
      });
    });
  }

  /* ---------- masters ---------- */

  async function renderMasters(token) {
    const [data, servicesData] = await Promise.all([
      api('/api/admin/masters'),
      api('/api/admin/services'),
    ]);
    if (token !== routeToken) return;
    const list = data.masters || [];
    const services = servicesData.services || [];
    state.services = services;

    content.innerHTML = `
      <div class="admin-toolbar" style="justify-content:space-between">
        <p class="admin-meta-line">${App.icon('users')}Мастеров: ${list.length} · на сайте: ${list.filter((m) => m.active).length}</p>
        <button class="btn btn--accent btn--sm" type="button" data-master-add>${App.icon('plus')}Добавить мастера</button>
      </div>
      ${list.length ? `<div class="admin-cards-grid">${list.map((master) => {
        const count = master.services.length ? master.services.length : services.length;
        return `<article class="admin-item-card">
          <div class="admin-item-card__media">
            <img src="${esc(master.photo)}" alt="${esc(master.name)}" loading="lazy">
            <span class="admin-pill ${master.active ? 'is-on' : 'is-off'}">${master.active ? 'Работает' : 'Скрыт'}</span>
          </div>
          <div class="admin-item-card__body">
            <h3>${esc(master.name)}</h3>
            <div class="admin-item-card__meta"><span>${esc(master.role)}</span><span>Опыт ${esc(master.experience || '—')}</span></div>
            <div class="admin-item-card__meta"><span>${master.services.length ? `${count} ${App.plural(count, 'услуга', 'услуги', 'услуг')}` : 'Все услуги'}</span></div>
            <div class="admin-item-card__foot">
              <span class="admin-pill">ID ${master.id}</span>
              <span class="admin-item-card__actions">
                <button class="icon-btn" type="button" data-master-edit="${master.id}" aria-label="Редактировать ${esc(master.name)}">${App.icon('edit')}</button>
                <button class="icon-btn is-danger" type="button" data-master-delete="${master.id}" aria-label="Удалить ${esc(master.name)}">${App.icon('trash')}</button>
              </span>
            </div>
          </div>
        </article>`;
      }).join('')}</div>` : `<div class="admin-card"><div class="admin-empty-state">${App.icon('users')}
        <p>Мастеров пока нет. Добавьте специалиста, чтобы принимать записи.</p>
        <button class="btn btn--accent btn--sm" type="button" data-master-add>Добавить мастера</button>
      </div></div>`}`;

    const addButton = content.querySelector('[data-master-add]');
    if (addButton) addButton.addEventListener('click', () => openMasterForm(null, services));

    content.querySelectorAll('[data-master-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const master = list.find((item) => Number(item.id) === Number(button.dataset.masterEdit));
        if (master) openMasterForm(master, services);
      });
    });

    content.querySelectorAll('[data-master-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const master = list.find((item) => Number(item.id) === Number(button.dataset.masterDelete));
        if (!master) return;
        const ok = await App.confirmAction({
          title: 'Удалить мастера?',
          text: `«${master.name}» будет удалён. Если у него есть активные записи, профиль будет только скрыт.`,
          confirmLabel: 'Удалить',
          danger: true,
        });
        if (!ok) return;
        button.disabled = true;
        try {
          const result = await api(`/api/admin/masters/${master.id}`, { method: 'DELETE' });
          App.toast(result.message || 'Мастер удалён', 'success');
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error');
        }
      });
    });
  }

  function openMasterForm(master, services) {
    openModal({
      title: master ? 'Редактировать мастера' : 'Новый мастер',
      sub: 'Профиль показывается в шаге выбора мастера и в блоке «Обо мне»',
      wide: true,
      body: `<form class="admin-form" data-master-form>
        <div class="form-error" data-form-error></div>
        <div class="form-grid-2">
          <div class="field"><label>Имя и фамилия</label><input type="text" name="name" maxlength="80" required value="${esc(master ? master.name : '')}" placeholder="Алина Ветрова"></div>
          <div class="field"><label>Роль</label><input type="text" name="role" maxlength="120" required value="${esc(master ? master.role : '')}" placeholder="Основатель · lash & brow эксперт"></div>
        </div>
        <div class="form-grid-2">
          <div class="field"><label>Опыт</label><input type="text" name="experience" maxlength="40" value="${esc(master ? master.experience : '')}" placeholder="8 лет"></div>
          <div class="field" style="align-content:end"><span class="image-field__hint">Короткая подпись под именем в карточке</span></div>
        </div>
        <div class="field"><label>О мастере</label><textarea name="bio" maxlength="700" placeholder="Специализация, подход, особенности">${esc(master ? master.bio : '')}</textarea></div>
        ${imageField('photo', master ? master.photo : '', { label: 'Портрет' })}
        <div class="field">
          <label>Услуги мастера</label>
          <div class="check-grid">
            ${services.map((service) => `<label class="check-card">
              <input type="checkbox" name="services" value="${esc(service.slug)}" ${master && master.services.includes(service.slug) ? 'checked' : ''}>
              <span>${esc(service.title)}<small>${esc(categoryLabel(service.category))}${service.active ? '' : ' · скрыта'}</small></span>
            </label>`).join('') || '<span class="image-field__hint">Сначала добавьте услуги.</span>'}
          </div>
          <span class="image-field__hint">Если не выбрать ни одной услуги, мастер будет доступен для всех услуг студии.</span>
        </div>
        <label class="switchline"><input type="checkbox" name="active" ${!master || master.active ? 'checked' : ''}>
          <span>Показывать на сайте<small>Скрытый мастер не участвует в онлайн-записи</small></span>
        </label>
        <div class="admin-form__foot">
          <button class="btn btn--outline btn--sm" type="button" data-close-modal>Отмена</button>
          <button class="btn btn--accent btn--sm" type="submit">${master ? 'Сохранить' : 'Добавить мастера'}</button>
        </div>
      </form>`,
    });

    const form = modal.querySelector('[data-master-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        name: String(data.get('name') || ''),
        role: String(data.get('role') || ''),
        experience: String(data.get('experience') || ''),
        bio: String(data.get('bio') || ''),
        photo: String(data.get('photo') || ''),
        active: form.elements.active.checked,
        services: [...form.querySelectorAll('input[name="services"]:checked')].map((input) => input.value),
      };
      const request = master
        ? api(`/api/admin/masters/${master.id}`, { method: 'PATCH', body: payload })
        : api('/api/admin/masters', { method: 'POST', body: payload });
      submitForm(form, () => request, {
        success: master ? 'Мастер обновлён' : 'Мастер добавлен',
        close: true,
        onSuccess: refreshCurrent,
      });
    });
  }

  /* ---------- gallery ---------- */

  async function renderGallery(token) {
    const data = await api('/api/admin/gallery');
    if (token !== routeToken) return;
    const list = data.gallery || [];

    content.innerHTML = `
      <div class="admin-toolbar" style="justify-content:space-between">
        <p class="admin-meta-line">${App.icon('image')}Фотографий: ${list.length} · на сайте: ${list.filter((item) => item.active).length}</p>
        <button class="btn btn--accent btn--sm" type="button" data-gallery-add>${App.icon('plus')}Добавить фото</button>
      </div>
      ${list.length ? `<div class="admin-cards-grid">${list.map((item) => `
        <article class="admin-item-card">
          <div class="admin-item-card__media">
            <img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy">
            <span class="admin-pill ${item.active ? 'is-on' : 'is-off'}">${item.active ? 'На сайте' : 'Скрыто'}</span>
          </div>
          <div class="admin-item-card__body">
            <h3>${esc(item.title)}</h3>
            <div class="admin-item-card__meta"><span>${esc(categoryLabel(item.category))}</span><span>ID ${item.id}</span></div>
            <div class="admin-item-card__foot">
              <span class="admin-pill">${esc(categoryLabel(item.category))}</span>
              <span class="admin-item-card__actions">
                <button class="icon-btn" type="button" data-gallery-edit="${item.id}" aria-label="Редактировать ${esc(item.title)}">${App.icon('edit')}</button>
                <button class="icon-btn is-danger" type="button" data-gallery-delete="${item.id}" aria-label="Удалить ${esc(item.title)}">${App.icon('trash')}</button>
              </span>
            </div>
          </div>
        </article>`).join('')}</div>` : `<div class="admin-card"><div class="admin-empty-state">${App.icon('image')}
          <p>В галерее пока нет фотографий.</p>
          <button class="btn btn--accent btn--sm" type="button" data-gallery-add>Добавить фото</button>
        </div></div>`}`;

    const addButton = content.querySelector('[data-gallery-add]');
    if (addButton) addButton.addEventListener('click', () => openGalleryForm(null));

    content.querySelectorAll('[data-gallery-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = list.find((entry) => Number(entry.id) === Number(button.dataset.galleryEdit));
        if (item) openGalleryForm(item);
      });
    });

    content.querySelectorAll('[data-gallery-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = list.find((entry) => Number(entry.id) === Number(button.dataset.galleryDelete));
        if (!item) return;
        const ok = await App.confirmAction({
          title: 'Удалить фотографию?',
          text: `«${item.title}» исчезнет из галереи. Действие нельзя отменить.`,
          confirmLabel: 'Удалить',
          danger: true,
        });
        if (!ok) return;
        button.disabled = true;
        try {
          await api(`/api/admin/gallery/${item.id}`, { method: 'DELETE' });
          App.toast('Фотография удалена', 'success');
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error');
        }
      });
    });
  }

  function openGalleryForm(item) {
    const map = categories();
    openModal({
      title: item ? 'Редактировать фотографию' : 'Новое фото',
      sub: 'Работы, детали и интерьер студии',
      body: `<form class="admin-form" data-gallery-form>
        <div class="form-error" data-form-error></div>
        <div class="field"><label>Название</label><input type="text" name="title" maxlength="100" required value="${esc(item ? item.title : '')}" placeholder="Естественный объём"></div>
        <div class="field"><label>Категория</label><select name="category">
          ${Object.keys(map).map((key) => option(key, map[key], item ? item.category : 'studio')).join('')}
        </select></div>
        ${imageField('image', item ? item.image : '')}
        <label class="switchline"><input type="checkbox" name="active" ${!item || item.active ? 'checked' : ''}>
          <span>Показывать в галерее<small>Скрытые фото не выводятся на сайте</small></span>
        </label>
        <div class="admin-form__foot">
          <button class="btn btn--outline btn--sm" type="button" data-close-modal>Отмена</button>
          <button class="btn btn--accent btn--sm" type="submit">${item ? 'Сохранить' : 'Добавить фото'}</button>
        </div>
      </form>`,
    });

    const form = modal.querySelector('[data-gallery-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        title: String(data.get('title') || ''),
        category: String(data.get('category') || 'studio'),
        image: String(data.get('image') || ''),
        active: form.elements.active.checked,
      };
      const request = item
        ? api(`/api/admin/gallery/${item.id}`, { method: 'PATCH', body: payload })
        : api('/api/admin/gallery', { method: 'POST', body: payload });
      submitForm(form, () => request, {
        success: item ? 'Фотография обновлена' : 'Фотография добавлена',
        close: true,
        onSuccess: refreshCurrent,
      });
    });
  }

  /* ---------- reviews ---------- */

  async function renderReviews(token) {
    const params = new URLSearchParams();
    if (state.reviewFilter) params.set('status', state.reviewFilter);
    const data = await api(`/api/admin/reviews?${params.toString()}`);
    if (token !== routeToken) return;
    const list = data.reviews || [];

    content.innerHTML = `
      <div class="admin-card">
        <div class="admin-card__head">
          <div><h2>Отзывы</h2><p>Новые отзывы появляются на сайте только после публикации</p></div>
          <div class="filters">
            ${[['', 'Все'], ['pending', 'На модерации'], ['approved', 'Опубликованные'], ['rejected', 'Отклонённые']]
              .map(([value, label]) => `<button class="filter-btn${state.reviewFilter === value ? ' is-active' : ''}" type="button" data-review-filter="${value}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="admin-card__body">
          ${list.length ? `<div class="admin-grid">${list.map((review) => `<div class="admin-col-6">
            <article class="review-admin-card">
              <div class="review-admin-card__head">
                <div class="review-admin-card__author">
                  <span class="admin-avatar" style="width:34px;height:34px;font-size:14px">${esc(App.initials(review.name))}</span>
                  <div><strong>${esc(review.name)}</strong><span>${esc(review.dateLabel || App.formatDate(review.date))} · ${esc(REVIEW_STATUS[review.status] || review.status)}</span></div>
                </div>
                ${App.stars(review.rating)}
              </div>
              <p>${esc(review.text)}</p>
              <div class="review-admin-card__foot">
                <span class="admin-pill ${review.demo ? 'is-demo' : review.status === 'approved' ? 'is-on' : ''}">${review.demo ? 'Демонстрационный' : (REVIEW_STATUS[review.status] || review.status)}</span>
                <div class="admin-actions">
                  ${review.status !== 'approved' ? `<button class="upload-btn" type="button" data-review-status="${review.id}" data-status="approved">Опубликовать</button>` : ''}
                  ${review.status !== 'rejected' ? `<button class="upload-btn" type="button" data-review-status="${review.id}" data-status="rejected">Отклонить</button>` : ''}
                  <button class="icon-btn is-danger" type="button" data-review-delete="${review.id}" aria-label="Удалить отзыв">${App.icon('trash')}</button>
                </div>
              </div>
            </article>
          </div>`).join('')}</div>` : `<div class="admin-empty-state">${App.icon('message')}<p>В этом разделе отзывов нет.</p></div>`}
        </div>
      </div>`;

    content.querySelectorAll('[data-review-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.reviewFilter = button.dataset.reviewFilter;
        renderReviews(token);
      });
    });

    content.querySelectorAll('[data-review-status]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await api(`/api/admin/reviews/${button.dataset.reviewStatus}`, {
            method: 'PATCH',
            body: { status: button.dataset.status },
          });
          App.toast(button.dataset.status === 'approved' ? 'Отзыв опубликован' : 'Отзыв отклонён', 'success');
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error');
        }
      });
    });

    content.querySelectorAll('[data-review-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const ok = await App.confirmAction({
          title: 'Удалить отзыв?',
          text: 'Отзыв будет удалён без возможности восстановления.',
          confirmLabel: 'Удалить',
          danger: true,
        });
        if (!ok) return;
        button.disabled = true;
        try {
          await api(`/api/admin/reviews/${button.dataset.reviewDelete}`, { method: 'DELETE' });
          App.toast('Отзыв удалён', 'success');
          await refreshCurrent();
        } catch (error) {
          button.disabled = false;
          if (error.status !== 401) App.toast(error.message, 'error');
        }
      });
    });
  }

  /* ---------- clients ---------- */

  async function renderClients(token) {
    const data = await api('/api/admin/clients');
    if (token !== routeToken) return;
    const list = data.clients || [];
    state.clients = list;
    const totalSpent = list.reduce((sum, client) => sum + Number(client.totalSpent || 0), 0);
    const withBookings = list.filter((client) => Number(client.bookingsCount) > 0).length;

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__label">Всего клиентов</span>
          <span class="stat-card__value">${list.length}</span>
          <span class="stat-card__hint">Зарегистрированные аккаунты</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">С записями</span>
          <span class="stat-card__value">${withBookings}</span>
          <span class="stat-card__hint">${App.plural(withBookings, 'клиент', 'клиента', 'клиентов')} уже были в студии</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Сумма завершённых визитов</span>
          <span class="stat-card__value">${App.money(totalSpent)}</span>
          <span class="stat-card__hint">По статусу «Завершена»</span>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card__head">
          <div><h2>База клиентов</h2><p data-clients-caption>${list.length} ${App.plural(list.length, 'клиент', 'клиента', 'клиентов')}</p></div>
          <div class="admin-search">
            ${SEARCH_ICON}
            <input type="search" data-clients-search placeholder="Имя, телефон или email" aria-label="Поиск клиентов">
          </div>
        </div>
        ${list.length ? `<div class="admin-table-wrap"><table class="admin-table">
          <thead><tr><th>Клиент</th><th>Телефон</th><th>Записей</th><th>Сумма</th><th>Последний визит</th><th>Регистрация</th></tr></thead>
          <tbody>
            ${list.map((client) => `<tr data-client-row data-search="${esc(`${client.name} ${client.phone} ${client.email}`.toLowerCase())}">
              <td><span class="cell-main">${esc(client.name)}</span><span class="cell-sub">${esc(client.email)}</span></td>
              <td class="cell-mono"><a href="tel:${esc(String(client.phone).replace(/[^\d+]/g, ''))}">${esc(client.phone)}</a></td>
              <td class="cell-mono">${client.bookingsCount}</td>
              <td class="cell-mono">${App.money(client.totalSpent)}</td>
              <td class="cell-mono">${client.last_visit ? esc(App.formatDateShort(client.last_visit)) : '—'}</td>
              <td class="cell-mono">${esc(App.formatDateShort(String(client.created_at).slice(0, 10)))}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : `<div class="admin-empty-state">${App.icon('users')}<p>Клиентов пока нет.</p></div>`}
      </div>`;

    const search = content.querySelector('[data-clients-search]');
    const rows = [...content.querySelectorAll('[data-client-row]')];
    const caption = content.querySelector('[data-clients-caption]');
    if (search) {
      search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;
        rows.forEach((row) => {
          const show = !query || row.dataset.search.includes(query);
          row.hidden = !show;
          if (show) visible += 1;
        });
        if (caption) caption.textContent = `${visible} ${App.plural(visible, 'клиент', 'клиента', 'клиентов')}`;
      });
    }
  }

  /* ---------- about ---------- */

  async function renderAbout(token) {
    const data = await api('/api/admin/settings/about');
    if (token !== routeToken) return;
    const about = data.value || (state.site && state.site.about) || {};
    const advantages = Array.isArray(about.advantages) ? about.advantages : [];
    const education = Array.isArray(about.education) ? about.education.join('\n') : '';

    content.innerHTML = `
      <form class="admin-card" data-about-form>
        <div class="admin-card__head">
          <div><h2>Обо мне</h2><p>Блок на главной странице: фотографии, текст и преимущества</p></div>
        </div>
        <div class="admin-card__body">
          <div class="form-error" data-form-error></div>
          <div class="admin-form">
            <div class="form-grid-2">
              <div class="field"><label>Имя</label><input type="text" name="name" maxlength="120" value="${esc(about.name || '')}" required></div>
              <div class="field"><label>Роль</label><input type="text" name="role" maxlength="150" value="${esc(about.role || '')}"></div>
            </div>
            <div class="form-grid-2">
              <div class="field"><label>Опыт</label><input type="text" name="experience" maxlength="80" value="${esc(about.experience || '')}" placeholder="8 лет"></div>
              <div class="field"><label>Клиентов</label><input type="text" name="clients" maxlength="80" value="${esc(about.clients || '')}" placeholder="2 400+"></div>
            </div>
            <div class="field"><label>Цитата</label><input type="text" name="quote" maxlength="300" value="${esc(about.quote || '')}"></div>
            <div class="field"><label>Биография</label><textarea name="bio" maxlength="1500">${esc(about.bio || '')}</textarea></div>
            <div class="field"><label>Подход к работе</label><textarea name="approach" maxlength="1500">${esc(about.approach || '')}</textarea></div>
            <div class="form-grid-2">
              ${imageField('photo', about.photo || '', { label: 'Основное фото' })}
              ${imageField('secondaryPhoto', about.secondaryPhoto || '', { label: 'Дополнительное фото' })}
            </div>
            <div class="field"><label>Образование и сертификаты — по одному в строке</label><textarea name="education" rows="5">${esc(education)}</textarea></div>
            <div class="field">
              <label>Преимущества</label>
              <div class="advantage-list" data-advantages>
                ${advantages.map((item) => advantageRow(item)).join('')}
              </div>
              <div style="margin-top:8px">
                <button class="upload-btn" type="button" data-add-advantage>${App.icon('plus')}Добавить преимущество</button>
              </div>
            </div>
          </div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--accent btn--sm" type="submit">Сохранить</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-about-form]');
    const advantagesBox = form.querySelector('[data-advantages]');

    form.querySelector('[data-add-advantage]').addEventListener('click', () => {
      if (advantagesBox.querySelectorAll('[data-advantage-row]').length >= 6) {
        App.toast('Можно добавить не более 6 преимуществ', 'error');
        return;
      }
      advantagesBox.insertAdjacentHTML('beforeend', advantageRow({}));
      const last = advantagesBox.lastElementChild;
      if (last) last.querySelector('input')?.focus();
    });

    advantagesBox.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-advantage]');
      if (remove) remove.closest('[data-advantage-row]')?.remove();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const items = [...advantagesBox.querySelectorAll('[data-advantage-row]')].map((row) => ({
        title: row.querySelector('[data-advantage-title]').value.trim(),
        text: row.querySelector('[data-advantage-text]').value.trim(),
      }));
      const incomplete = items.some((item) => (item.title && !item.text) || (!item.title && item.text));
      if (incomplete) {
        App.toast('Заполните и заголовок, и текст преимущества', 'error');
        return;
      }
      const payload = {
        name: String(data.get('name') || ''),
        role: String(data.get('role') || ''),
        experience: String(data.get('experience') || ''),
        clients: String(data.get('clients') || ''),
        quote: String(data.get('quote') || ''),
        bio: String(data.get('bio') || ''),
        approach: String(data.get('approach') || ''),
        photo: String(data.get('photo') || ''),
        secondaryPhoto: String(data.get('secondaryPhoto') || ''),
        education: String(data.get('education') || '').split('\n').map((line) => line.trim()).filter(Boolean),
        advantages: items.filter((item) => item.title && item.text),
      };
      submitForm(form, () => api('/api/admin/settings/about', { method: 'PUT', body: { value: payload } }), {
        success: 'Раздел «Обо мне» сохранён',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.about = result.value;
          if (state.site) state.site.about = result.value;
        },
      });
    });
  }

  function advantageRow(item = {}) {
    return `<div class="advantage-row" data-advantage-row>
      <div class="field"><label>Заголовок</label><input type="text" data-advantage-title maxlength="80" value="${esc(item.title || '')}" placeholder="Точная диагностика"></div>
      <div class="field"><label>Описание</label><input type="text" data-advantage-text maxlength="300" value="${esc(item.text || '')}" placeholder="Коротко о подходе"></div>
      <button class="icon-btn is-danger" type="button" data-remove-advantage aria-label="Удалить преимущество">${App.icon('trash')}</button>
    </div>`;
  }

  /* ---------- brand ---------- */

  async function renderBrand(token) {
    const data = await api('/api/admin/settings/brand');
    if (token !== routeToken) return;
    const brand = data.value || (state.site && state.site.brand) || {};

    content.innerHTML = `
      <form class="admin-card" data-brand-form>
        <div class="admin-card__head">
          <div><h2>Бренд</h2><p>Название, слоганы и главное изображение сайта</p></div>
        </div>
        <div class="admin-card__body admin-form">
          <div class="form-error" data-form-error></div>
          <div class="form-grid-2">
            <div class="field"><label>Название</label><input type="text" name="name" maxlength="120" required value="${esc(brand.name || '')}"></div>
            <div class="field"><label>Подпись под названием</label><input type="text" name="suffix" maxlength="120" value="${esc(brand.suffix || '')}" placeholder="lash & brow atelier"></div>
          </div>
          <div class="form-grid-2">
            <div class="field"><label>Слоган</label><input type="text" name="tagline" maxlength="120" value="${esc(brand.tagline || '')}"></div>
            <div class="field"><label>Юридическое название</label><input type="text" name="legalName" maxlength="120" value="${esc(brand.legalName || '')}"></div>
          </div>
          <div class="form-grid-2">
            <div class="field"><label>Год основания</label><input type="text" name="founded" maxlength="20" value="${esc(brand.founded || '')}" placeholder="2019"></div>
            <div class="field"><label>Город</label><input type="text" name="city" maxlength="80" value="${esc(brand.city || '')}" placeholder="Москва"></div>
          </div>
          <div class="field"><label>Описание бренда</label><textarea name="description" maxlength="500">${esc(brand.description || '')}</textarea></div>
          <div class="form-grid-2">
            <div class="field"><label>Заголовок на главной</label><input type="text" name="heroTitle" maxlength="120" value="${esc(brand.heroTitle || '')}"></div>
            <div class="field"><label>Продолжение заголовка</label><input type="text" name="heroAccent" maxlength="120" value="${esc(brand.heroAccent || '')}" placeholder="Выделяется курсивом"></div>
          </div>
          <div class="field"><label>Текст на главной</label><textarea name="heroText" maxlength="500">${esc(brand.heroText || '')}</textarea></div>
          <div class="form-grid-2">
            ${imageField('heroImage', brand.heroImage || '', { label: 'Главное фото', hint: 'Большое изображение в первом экране. Рекомендуется вертикальное.' })}
            ${imageField('logoImage', brand.logoImage || '', { label: 'Логотип', hint: 'Необязательно. Без логотипа используется фирменный знак.' })}
          </div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--accent btn--sm" type="submit">Сохранить бренд</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-brand-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {};
      ['name', 'suffix', 'tagline', 'legalName', 'founded', 'city', 'description', 'heroTitle', 'heroAccent', 'heroText', 'heroImage', 'logoImage']
        .forEach((field) => { payload[field] = String(data.get(field) || ''); });
      submitForm(form, () => api('/api/admin/settings/brand', { method: 'PUT', body: { value: payload } }), {
        success: 'Бренд обновлён',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.brand = result.value;
          if (state.site) state.site.brand = result.value;
          renderBrandMarks();
          updateLoginAside();
          App.setBranding(state.site);
        },
      });
    });
  }

  /* ---------- contacts ---------- */

  async function renderContacts(token) {
    const data = await api('/api/admin/settings/contacts');
    if (token !== routeToken) return;
    const contacts = data.value || (state.site && state.site.contacts) || {};
    const socials = contacts.socials || {};

    content.innerHTML = `
      <form class="admin-card" data-contacts-form>
        <div class="admin-card__head">
          <div><h2>Контакты</h2><p>Телефон, адрес, карта и социальные сети</p></div>
        </div>
        <div class="admin-card__body admin-form">
          <div class="form-error" data-form-error></div>
          <div class="form-grid-2">
            <div class="field"><label>Телефон</label><input type="text" name="phone" maxlength="200" value="${esc(contacts.phone || '')}" placeholder="+7 (495) 120-45-67"></div>
            <div class="field"><label>Телефон для ссылки tel:</label><input type="text" name="phoneHref" maxlength="200" value="${esc(contacts.phoneHref || '')}" placeholder="+74951204567"></div>
          </div>
          <div class="form-grid-2">
            <div class="field"><label>Email</label><input type="email" name="email" maxlength="200" value="${esc(contacts.email || '')}"></div>
            <div class="field"><label>Метро / ориентир</label><input type="text" name="metro" maxlength="200" value="${esc(contacts.metro || '')}"></div>
          </div>
          <div class="field"><label>Адрес</label><input type="text" name="address" maxlength="200" value="${esc(contacts.address || '')}"></div>
          <div class="form-grid-2">
            <div class="field"><label>График работы</label><input type="text" name="hours" maxlength="200" value="${esc(contacts.hours || '')}"></div>
            <div class="field"><label>Примечание к графику</label><input type="text" name="hoursNote" maxlength="200" value="${esc(contacts.hoursNote || '')}"></div>
          </div>
          <div class="field"><label>Ссылка на карту (открыть в картах)</label><input type="url" name="mapLink" maxlength="200" value="${esc(contacts.mapLink || '')}" placeholder="https://…"></div>
          <div class="field"><label>HTML-код или ссылка карты для iframe</label><textarea name="mapEmbed" maxlength="1000" placeholder="https://www.openstreetmap.org/export/embed.html?…">${esc(contacts.mapEmbed || '')}</textarea></div>
          <h3 class="admin-subhead">Социальные сети</h3>
          <div class="form-grid-2">
            <div class="field"><label>Instagram</label><input type="url" name="instagram" maxlength="300" value="${esc(socials.instagram || '')}" placeholder="https://instagram.com/…"></div>
            <div class="field"><label>Telegram</label><input type="url" name="telegram" maxlength="300" value="${esc(socials.telegram || '')}" placeholder="https://t.me/…"></div>
            <div class="field"><label>WhatsApp</label><input type="url" name="whatsapp" maxlength="300" value="${esc(socials.whatsapp || '')}" placeholder="https://wa.me/…"></div>
            <div class="field"><label>VK</label><input type="url" name="vk" maxlength="300" value="${esc(socials.vk || '')}" placeholder="https://vk.com/…"></div>
          </div>
          <div class="admin-hint">${App.icon('info')}<span>Пустые социальные сети не выводятся на сайте. Ссылки должны начинаться с https://</span></div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--accent btn--sm" type="submit">Сохранить контакты</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-contacts-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {};
      ['phone', 'phoneHref', 'email', 'metro', 'address', 'hours', 'hoursNote', 'mapLink', 'mapEmbed']
        .forEach((field) => { payload[field] = String(data.get(field) || ''); });
      payload.socials = {};
      ['instagram', 'telegram', 'whatsapp', 'vk'].forEach((network) => {
        payload.socials[network] = String(data.get(network) || '');
      });
      submitForm(form, () => api('/api/admin/settings/contacts', { method: 'PUT', body: { value: payload } }), {
        success: 'Контакты обновлены',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.contacts = result.value;
          if (state.site) state.site.contacts = result.value;
        },
      });
    });
  }

  /* ---------- theme ---------- */

  async function renderTheme(token) {
    const meta = await ensureMeta();
    const data = await api('/api/admin/settings/theme');
    if (token !== routeToken) return;
    const theme = data.value || (state.site && state.site.theme) || {};
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};
    const presets = meta.presets || {};
    const headingFonts = meta.headingFonts || ['Cormorant Garamond', 'Playfair Display', 'Prata', 'Lora'];
    const bodyFonts = meta.bodyFonts || ['Manrope', 'Inter', 'Jost', 'Montserrat'];
    state.currentTheme = theme;

    content.innerHTML = `
      <form class="admin-card" data-theme-form>
        <div class="admin-card__head">
          <div><h2>Тема и шрифты</h2><p>Изменения сразу видны в предпросмотре и на сайте после сохранения</p></div>
        </div>
        <div class="admin-card__body admin-form">
          <div class="form-error" data-form-error></div>
          <div>
            <h3 class="admin-subhead">Готовые палитры</h3>
            <div class="theme-presets">
              ${Object.entries(presets).map(([key, preset]) => `<button class="preset-btn" type="button" data-preset="${esc(key)}">
                <span class="preset-swatches">
                  <span style="background:${esc(preset.colors.bg)}"></span>
                  <span style="background:${esc(preset.colors.accent)}"></span>
                  <span style="background:${esc(preset.colors.dark)}"></span>
                </span>${esc(preset.label)}
              </button>`).join('')}
            </div>
          </div>
          <div>
            <h3 class="admin-subhead">Цвета</h3>
            <div class="color-grid">
              ${COLOR_ORDER.map((key) => {
                const value = colors[key] || '#000000';
                return `<div class="color-field">
                  <input type="color" data-color="${key}" value="${esc(value)}" aria-label="${esc(COLOR_LABELS[key])}">
                  <div class="color-field__meta">
                    <span>${esc(COLOR_LABELS[key])}</span>
                    <input type="text" data-color-text="${key}" maxlength="7" value="${esc(value)}" aria-label="Код цвета ${esc(COLOR_LABELS[key])}">
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
          <div>
            <h3 class="admin-subhead">Шрифты</h3>
            <div class="form-grid-2">
              <div class="field"><label>Заголовки</label><select name="headingFont">
                ${headingFonts.map((font) => option(font, font, fonts.heading || headingFonts[0])).join('')}
              </select></div>
              <div class="field"><label>Основной текст</label><select name="bodyFont">
                ${bodyFonts.map((font) => option(font, font, fonts.body || bodyFonts[0])).join('')}
              </select></div>
            </div>
          </div>
          <div>
            <h3 class="admin-subhead">Предпросмотр</h3>
            <div class="theme-preview">
              <div class="theme-preview__bar"><strong>${esc((state.site && state.site.brand && state.site.brand.name) || 'LUMIÈRE')}</strong><span>atelier</span></div>
              <div class="theme-preview__body">
                <h4>Взгляд, который <em>говорит за вас</em></h4>
                <p>Так будет выглядеть типографика и палитра сайта после сохранения темы.</p>
                <span class="theme-preview__btn">Записаться</span>
              </div>
            </div>
          </div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--outline btn--sm" type="button" data-theme-reset>Вернуть сохранённое</button>
          <button class="btn btn--accent btn--sm" type="submit">Сохранить тему</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-theme-form]');
    const colorInputs = [...form.querySelectorAll('[data-color]')];
    const textInputs = [...form.querySelectorAll('[data-color-text]')];

    function readTheme() {
      const nextColors = {};
      colorInputs.forEach((input) => {
        nextColors[input.dataset.color] = input.value.toUpperCase();
      });
      return {
        preset: state.themePreset,
        colors: nextColors,
        fonts: {
          heading: form.querySelector('[name="headingFont"]').value,
          body: form.querySelector('[name="bodyFont"]').value,
        },
      };
    }

    function applyPreview() {
      App.applyTheme(readTheme());
    }

    function syncPresetButtons() {
      form.querySelectorAll('[data-preset]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.preset === state.themePreset);
      });
    }

    function setPreset(key) {
      const preset = presets[key];
      if (!preset) return;
      state.themePreset = key;
      COLOR_ORDER.forEach((colorKey) => {
        const value = preset.colors[colorKey] || '#000000';
        const colorInput = form.querySelector(`[data-color="${colorKey}"]`);
        const textInput = form.querySelector(`[data-color-text="${colorKey}"]`);
        if (colorInput) colorInput.value = value;
        if (textInput) textInput.value = value.toUpperCase();
      });
      syncPresetButtons();
      applyPreview();
    }

    function markCustom() {
      if (state.themePreset === 'custom') return;
      state.themePreset = 'custom';
      syncPresetButtons();
    }

    form.querySelectorAll('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => setPreset(button.dataset.preset));
    });

    colorInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const text = form.querySelector(`[data-color-text="${input.dataset.color}"]`);
        if (text) text.value = input.value.toUpperCase();
        markCustom();
        applyPreview();
      });
    });

    textInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const value = input.value.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
        const color = form.querySelector(`[data-color="${input.dataset.colorText}"]`);
        if (color) color.value = value;
        markCustom();
        applyPreview();
      });
    });

    form.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', applyPreview);
    });

    form.querySelector('[data-theme-reset]').addEventListener('click', () => {
      const original = state.currentTheme || {};
      state.themePreset = original.preset || 'custom';
      COLOR_ORDER.forEach((colorKey) => {
        const value = (original.colors && original.colors[colorKey]) || '#000000';
        const colorInput = form.querySelector(`[data-color="${colorKey}"]`);
        const textInput = form.querySelector(`[data-color-text="${colorKey}"]`);
        if (colorInput) colorInput.value = value;
        if (textInput) textInput.value = String(value).toUpperCase();
      });
      const heading = form.querySelector('[name="headingFont"]');
      const body = form.querySelector('[name="bodyFont"]');
      if (heading && original.fonts) heading.value = original.fonts.heading;
      if (body && original.fonts) body.value = original.fonts.body;
      syncPresetButtons();
      applyPreview();
      App.toast('Возвращена сохранённая тема');
    });

    syncPresetButtons();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const next = readTheme();
      submitForm(form, () => api('/api/admin/settings/theme', { method: 'PUT', body: { value: next } }), {
        success: 'Тема сохранена',
        onSuccess: (result) => {
          state.currentTheme = result.value;
          state.themePreset = result.value.preset || 'custom';
          if (state.meta && state.meta.settings) state.meta.settings.theme = result.value;
          if (state.site) state.site.theme = result.value;
          App.applyTheme(result.value);
        },
      });
    });
  }

  /* ---------- booking rules ---------- */

  async function renderBookingRules(token) {
    const data = await api('/api/admin/settings/booking');
    if (token !== routeToken) return;
    const rules = data.value || (state.site && state.site.booking) || {};

    content.innerHTML = `
      <form class="admin-card" data-booking-rules-form>
        <div class="admin-card__head">
          <div><h2>Правила онлайн-записи</h2><p>Влияют на шаг слотов, доступные даты и отмену</p></div>
        </div>
        <div class="admin-card__body admin-form">
          <div class="form-error" data-form-error></div>
          <div class="form-grid-2">
            <div class="field"><label>Шаг слотов, минут</label><select name="slotStep">
              ${[15, 20, 30, 45, 60].map((value) => option(value, `${value} мин`, rules.slotStep)).join('')}
            </select></div>
            <div class="field"><label>Запись не позднее чем через, часов</label><input type="number" name="leadHours" min="0" max="72" step="1" required value="${Number(rules.leadHours) || 0}"></div>
          </div>
          <div class="form-grid-2">
            <div class="field"><label>Отмена клиентом не позднее чем за, часов</label><input type="number" name="cancelHours" min="0" max="168" step="1" required value="${Number(rules.cancelHours) || 0}"></div>
            <div class="field"><label>Горизонт записи, дней</label><input type="number" name="horizonDays" min="1" max="120" step="1" required value="${Number(rules.horizonDays) || 45}"></div>
          </div>
          <div class="admin-hint">${App.icon('info')}<span>Шаг 30 минут означает, что слоты начинаются каждые полчаса. Время работы задаётся в разделе «Расписание».</span></div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--accent btn--sm" type="submit">Сохранить правила</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-booking-rules-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        slotStep: Number(data.get('slotStep')),
        leadHours: Number(data.get('leadHours')),
        cancelHours: Number(data.get('cancelHours')),
        horizonDays: Number(data.get('horizonDays')),
      };
      submitForm(form, () => api('/api/admin/settings/booking', { method: 'PUT', body: { value: payload } }), {
        success: 'Правила записи сохранены',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.booking = result.value;
          if (state.site) state.site.booking = result.value;
        },
      });
    });
  }

  /* ---------- seo ---------- */

  async function renderSeo(token) {
    const data = await api('/api/admin/settings/seo');
    if (token !== routeToken) return;
    const seo = data.value || (state.site && state.site.seo) || {};

    content.innerHTML = `
      <form class="admin-card" data-seo-form>
        <div class="admin-card__head">
          <div><h2>SEO</h2><p>Заголовок и описание страницы в поисковой выдаче</p></div>
        </div>
        <div class="admin-card__body admin-form">
          <div class="form-error" data-form-error></div>
          <div class="field"><label>Title — до 160 символов</label><input type="text" name="title" maxlength="160" value="${esc(seo.title || '')}"></div>
          <div class="field"><label>Description — до 300 символов</label><textarea name="description" maxlength="300">${esc(seo.description || '')}</textarea></div>
          <div class="field"><label>Ключевые слова</label><input type="text" name="keywords" maxlength="300" value="${esc(seo.keywords || '')}" placeholder="наращивание ресниц, брови, студия красоты"></div>
          <div class="admin-hint">${App.icon('info')}<span>Title показывается во вкладке браузера и в результатах поиска. Описание не должно превышать 1–2 предложения.</span></div>
        </div>
        <div class="admin-card__foot">
          <button class="btn btn--accent btn--sm" type="submit">Сохранить SEO</button>
        </div>
      </form>`;

    const form = content.querySelector('[data-seo-form]');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const payload = {
        title: String(data.get('title') || ''),
        description: String(data.get('description') || ''),
        keywords: String(data.get('keywords') || ''),
      };
      submitForm(form, () => api('/api/admin/settings/seo', { method: 'PUT', body: { value: payload } }), {
        success: 'SEO обновлено',
        onSuccess: (result) => {
          if (state.meta && state.meta.settings) state.meta.settings.seo = result.value;
          if (state.site) {
            state.site.seo = result.value;
            App.setBranding(state.site);
          }
        },
      });
    });
  }

  /* ---------- boot ---------- */

  bindLogin();
  bindGlobal();
  renderBrandMarks();
  updateLoginAside();

  try {
    const me = await App.api('/api/admin/me');
    if (me.user) {
      state.admin = me.user;
      await enterApp();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
})();

