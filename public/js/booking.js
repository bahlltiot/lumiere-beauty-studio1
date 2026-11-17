'use strict';

/* Онлайн-запись: 4 шага, календарь и слоты из API. */

(async function () {
  const { site, user } = await App.init({ page: 'booking' });
  if (!site) return;

  const $ = (selector) => document.querySelector(selector);
  const services = site.services || [];
  const masters = site.masters || [];
  const rules = site.booking || {};

  const state = {
    step: 1,
    serviceSlug: null,
    masterId: null,
    date: null,
    time: null,
    calendar: [],
    slots: [],
    user,
    loadingCalendar: false,
    loadingSlots: false,
    submitted: false,
  };

  const serviceChoices = $('[data-service-choices]');
  const masterChoices = $('[data-master-choices]');
  const masterEmpty = $('[data-master-empty]');
  const dateStrip = $('[data-date-strip]');
  const slotsGrid = $('[data-slots]');
  const slotsEmpty = $('[data-slots-empty]');
  const slotsDate = $('[data-slots-date]');
  const slotsSub = $('[data-slots-sub]');
  const moreDatesBtn = $('[data-more-dates]');
  const summary = $('[data-summary]');
  const form = $('[data-booking-form]');
  const formErrorBox = form ? form.querySelector('[data-form-error]') : null;
  const accountHint = $('[data-account-hint]');

  const service = () => services.find((s) => s.slug === state.serviceSlug) || null;
  const master = () => masters.find((m) => Number(m.id) === Number(state.masterId)) || null;

  function mastersFor(target) {
    if (!target) return [];
    return masters.filter((m) => {
      if (m.active === false) return false;
      if (!Array.isArray(m.services) || m.services.length === 0) return true;
      return m.services.includes(target.slug);
    });
  }

  /* ---------- URL ---------- */

  function updateQuery() {
    if (state.submitted) return;
    const params = new URLSearchParams();
    if (state.serviceSlug) params.set('service', state.serviceSlug);
    if (state.masterId) params.set('master', String(state.masterId));
    if (state.date) params.set('date', state.date);
    if (state.time) params.set('time', state.time);
    const query = params.toString();
    history.replaceState(null, '', query ? `/booking?${query}` : '/booking');
  }

  /* ---------- STEP 1 ---------- */

  function renderServiceChoices() {
    if (!serviceChoices) return;
    if (!services.length) {
      serviceChoices.innerHTML = '<div class="slots-empty">Онлайн-запись временно недоступна. Позвоните в студию.</div>';
      return;
    }
    serviceChoices.innerHTML = services.map((s) => `
      <label class="choice-card${s.slug === state.serviceSlug ? ' is-selected' : ''}" data-service-card="${s.id}">
        <input type="radio" name="service" value="${s.slug}" ${s.slug === state.serviceSlug ? 'checked' : ''}>
        <img class="choice-thumb" src="${App.escapeHtml(s.image)}" alt="" loading="lazy">
        <span class="choice-body">
          <strong>${App.escapeHtml(s.title)}</strong>
          <span>${App.escapeHtml(s.short)}</span>
          <span>${App.formatDuration(s.duration)} · ${App.escapeHtml((site.categories || {})[s.category] || s.category)}</span>
        </span>
        <span class="choice-price">${App.money(s.price)}</span>
        <span class="choice-radio" aria-hidden="true"></span>
      </label>`).join('');
  }

  function selectService(slug) {
    const next = services.find((s) => s.slug === slug);
    if (!next) return;
    const changed = state.serviceSlug !== slug;
    state.serviceSlug = slug;
    if (changed) {
      state.masterId = null;
      state.date = null;
      state.time = null;
      state.calendar = [];
      state.slots = [];
    }
    serviceChoices.querySelectorAll('.choice-card').forEach((card) => {
      const isActive = card.dataset.serviceCard === String(next.id);
      card.classList.toggle('is-selected', isActive);
      const input = card.querySelector('input');
      if (input) input.checked = isActive;
    });
    renderMasterChoices();
    updateNextButtons();
    renderSummary();
    updateQuery();
  }

  /* ---------- STEP 2 ---------- */

  function renderMasterChoices() {
    if (!masterChoices) return;
    const target = service();
    const available = mastersFor(target);
    if (masterEmpty) masterEmpty.hidden = available.length > 0;
    masterChoices.hidden = available.length === 0;
    if (!available.length) {
      masterChoices.innerHTML = '';
      state.masterId = null;
      updateNextButtons();
      return;
    }

    if (state.masterId && !available.some((m) => Number(m.id) === Number(state.masterId))) {
      state.masterId = null;
      state.date = null;
      state.time = null;
    }

    masterChoices.innerHTML = available.map((m, index) => `
      <label class="master-card${Number(m.id) === Number(state.masterId) ? ' is-selected' : ''}" data-master-card="${m.id}">
        <input type="radio" name="master" value="${m.id}" ${Number(m.id) === Number(state.masterId) ? 'checked' : ''}>
        ${index === 0 ? '<span class="master-badge">Основатель</span>' : ''}
        <img class="master-photo" src="${App.escapeHtml(m.photo)}" alt="${App.escapeHtml(m.name)}" loading="lazy">
        <span class="master-body">
          <strong>${App.escapeHtml(m.name)}</strong>
          <span>${App.escapeHtml(m.role)}</span>
          <span>Опыт ${App.escapeHtml(m.experience || '—')}</span>
        </span>
      </label>`).join('');

    if (!state.masterId && available.length === 1) {
      selectMaster(available[0].id);
    }
  }

  function selectMaster(id) {
    const next = masters.find((m) => Number(m.id) === Number(id));
    if (!next) return;
    const changed = Number(state.masterId) !== Number(id);
    state.masterId = Number(id);
    if (changed) {
      state.date = null;
      state.time = null;
      state.calendar = [];
      state.slots = [];
    }
    masterChoices.querySelectorAll('.master-card').forEach((card) => {
      const isActive = Number(card.dataset.masterCard) === Number(id);
      card.classList.toggle('is-selected', isActive);
      const input = card.querySelector('input');
      if (input) input.checked = isActive;
    });
    updateNextButtons();
    renderSummary();
    updateQuery();
  }

  /* ---------- STEP 3 ---------- */

  const isoToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function addDays(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateParts(iso) {
    const d = new Date(`${iso}T12:00:00`);
    return {
      dow: d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '').toUpperCase(),
      day: d.getDate(),
      mon: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '').toUpperCase(),
      full: d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  }

  async function loadCalendar({ append = false } = {}) {
    if (!service() || !master() || state.loadingCalendar) return;
    state.loadingCalendar = true;
    if (!append) {
      state.calendar = [];
      if (dateStrip) dateStrip.innerHTML = '<span class="form-hint">Загружаем даты…</span>';
    }
    try {
      let from = isoToday();
      if (append && state.calendar.length) from = addDays(state.calendar[state.calendar.length - 1].date, 1);
      const data = await App.api(`/api/availability/calendar?service=${encodeURIComponent(state.serviceSlug)}&master=${state.masterId}&from=${from}&days=14`);
      const chunk = data.calendar || [];
      state.calendar = append ? [...state.calendar, ...chunk] : chunk;
      renderCalendar();

      const stillValid = state.date && state.calendar.some((day) => day.date === state.date && day.open);
      if (!stillValid) {
        state.date = null;
        state.time = null;
        const firstOpen = state.calendar.find((day) => day.open);
        if (firstOpen) selectDate(firstOpen.date);
        else {
          renderSlotsEmpty('На ближайшие дни свободных окон нет. Позвоните нам — подберём время вручную.');
          updateNextButtons();
          renderSummary();
        }
      } else {
        await loadSlots(state.date);
      }
      updateQuery();
    } catch (error) {
      App.toast(error.message, 'error');
      if (dateStrip) dateStrip.innerHTML = '<span class="form-hint">Не удалось загрузить календарь.</span>';
    } finally {
      state.loadingCalendar = false;
      updateMoreDates();
    }
  }

  function renderCalendar() {
    if (!dateStrip) return;
    if (!state.calendar.length) {
      dateStrip.innerHTML = '<span class="form-hint">Нет доступных дат.</span>';
      return;
    }
    dateStrip.innerHTML = state.calendar.map((day) => {
      const parts = dateParts(day.date);
      return `<button class="date-chip${state.date === day.date ? ' is-active' : ''}" type="button" data-date="${day.date}" ${day.open ? '' : 'disabled'} title="${App.escapeHtml(day.open ? 'Свободно окон: ' + day.slotsCount : day.reason || 'Нет свободных окон')}" aria-pressed="${state.date === day.date}">
        <span class="dow">${parts.dow}</span>
        <span class="day">${parts.day}</span>
        <span class="mon">${parts.mon}</span>
        <span class="avail-dot" style="${day.open ? '' : 'opacity:0'}"></span>
      </button>`;
    }).join('');
  }

  function updateMoreDates() {
    if (!moreDatesBtn) return;
    const horizon = Number(rules.horizonDays) || 45;
    const maxDate = addDays(isoToday(), horizon);
    const last = state.calendar.length ? state.calendar[state.calendar.length - 1].date : null;
    moreDatesBtn.hidden = !last || last >= maxDate;
  }

  function renderSlotsEmpty(message) {
    if (slotsGrid) slotsGrid.innerHTML = '';
    if (slotsEmpty) {
      slotsEmpty.hidden = false;
      slotsEmpty.textContent = message;
    }
    if (slotsDate) slotsDate.textContent = '';
  }

  async function loadSlots(date) {
    if (!service() || !master() || !date) return;
    state.loadingSlots = true;
    if (slotsEmpty) slotsEmpty.hidden = true;
    if (slotsGrid) slotsGrid.innerHTML = '<div class="form-hint">Загружаем свободное время…</div>';
    if (slotsDate) slotsDate.textContent = App.formatDate(date, { weekday: true });
    try {
      const data = await App.api(`/api/availability?service=${encodeURIComponent(state.serviceSlug)}&master=${state.masterId}&date=${date}`);
      state.slots = data.slots || [];
      if (state.time && !state.slots.includes(state.time)) state.time = null;
      if (!state.slots.length) {
        renderSlotsEmpty(data.reason || 'На этот день свободных окон нет.');
      } else if (slotsGrid) {
        slotsGrid.innerHTML = state.slots.map((time) => `
          <button class="slot${state.time === time ? ' is-active' : ''}" type="button" data-time="${time}" aria-pressed="${state.time === time}">${time}</button>`).join('');
        if (slotsEmpty) slotsEmpty.hidden = true;
      }
    } catch (error) {
      App.toast(error.message, 'error');
      renderSlotsEmpty('Не удалось загрузить время. Попробуйте ещё раз.');
    } finally {
      state.loadingSlots = false;
      updateNextButtons();
      renderSummary();
      updateQuery();
    }
  }

  function selectDate(date) {
    if (!date) return;
    state.date = date;
    state.time = null;
    dateStrip.querySelectorAll('[data-date]').forEach((btn) => {
      const active = btn.dataset.date === date;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    loadSlots(date);
  }

  function selectTime(time) {
    state.time = time;
    if (slotsGrid) {
      slotsGrid.querySelectorAll('[data-time]').forEach((btn) => {
        const active = btn.dataset.time === time;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }
    updateNextButtons();
    renderSummary();
    updateQuery();
  }

  if (dateStrip) {
    dateStrip.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-date]');
      if (btn && !btn.disabled) selectDate(btn.dataset.date);
    });
  }
  if (slotsGrid) {
    slotsGrid.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-time]');
      if (btn) selectTime(btn.dataset.time);
    });
  }
  if (moreDatesBtn) {
    moreDatesBtn.addEventListener('click', () => loadCalendar({ append: true }));
  }

  /* ---------- STEP 4 / SUMMARY ---------- */

  function renderSummary() {
    if (!summary) return;
    const target = service();
    if (!target) {
      summary.innerHTML = `<div class="summary-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3.5v3M16 3.5v3"/></svg>
        <p>Выберите услугу, мастера и время — здесь появятся детали записи.</p>
      </div>`;
      return;
    }
    const m = master();
    const masterPhoto = m ? m.photo : null;
    const cancelHours = Number(rules.cancelHours) || 0;
    summary.innerHTML = `
      <div class="summary-media">
        <img src="${App.escapeHtml(target.image)}" alt="${App.escapeHtml(target.title)}">
        <span class="summary-media__label">Ваша запись</span>
      </div>
      <div class="summary-body">
        <h3 class="summary-title">${App.escapeHtml(target.title)}</h3>
        <p class="summary-sub">${App.escapeHtml(target.short)}</p>
        <div class="summary-rows">
          <div class="summary-row"><span>Мастер</span><strong>${m ? App.escapeHtml(m.name) : 'Выберите мастера'}</strong></div>
          <div class="summary-row"><span>Дата</span><strong>${state.date ? App.escapeHtml(App.formatDate(state.date)) : '—'}</strong></div>
          <div class="summary-row"><span>Время</span><strong>${state.time || '—'}</strong></div>
          <div class="summary-row"><span>Длительность</span><strong>${App.formatDuration(target.duration)}</strong></div>
        </div>
        <div class="summary-total">
          <span>Итого</span>
          <strong>${App.money(target.price)}</strong>
        </div>
        <div class="summary-policy">
          <strong>Статус:</strong> запись создаётся как «Ожидает подтверждения».${
            cancelHours ? ` Отменить онлайн можно не позднее чем за ${cancelHours} ч.` : ''
          }${m ? '' : ` ${App.escapeHtml(masterPhoto ? '' : '')}`}
        </div>
      </div>`;
  }

  function updateNextButtons() {
    const next1 = document.querySelector('[data-next="2"]');
    const next2 = document.querySelector('[data-next="3"]');
    const next3 = document.querySelector('[data-next="4"]');
    if (next1) next1.disabled = !service();
    if (next2) next2.disabled = !master();
    if (next3) next3.disabled = !state.time;
  }

  function showStep(step) {
    state.step = step;
    document.querySelectorAll('[data-step-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', Number(panel.dataset.stepPanel) === step);
    });
    document.querySelectorAll('[data-step-indicator]').forEach((indicator) => {
      const num = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('is-active', num === step);
      indicator.classList.toggle('is-done', num < step);
    });
    if (step === 3) {
      if (state.calendar.length) renderCalendar();
      loadCalendar();
    }
    if (step === 4) {
      fillContactForm();
      renderAccountHint();
    }
    const panel = document.querySelector(`[data-step-panel="${step}"]`);
    if (panel) {
      const y = panel.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }

  function fillContactForm() {
    if (!state.user || !form) return;
    const name = form.querySelector('[name="name"]');
    const phone = form.querySelector('[name="phone"]');
    const email = form.querySelector('[name="email"]');
    if (name && !name.value) name.value = state.user.name || '';
    if (phone && !phone.value) phone.value = state.user.phone || '';
    if (email && !email.value) email.value = state.user.email || '';
  }

  function renderAccountHint() {
    if (!accountHint) return;
    if (state.user) {
      accountHint.hidden = false;
      accountHint.className = 'form-hint';
      accountHint.style.cssText = 'padding:10px 12px;background:var(--surface);border-radius:9px;margin-bottom:14px';
      accountHint.innerHTML = `Вы вошли как <strong>${App.escapeHtml(state.user.name)}</strong>. Запись появится в личном кабинете.`;
    } else {
      accountHint.hidden = false;
      accountHint.className = 'form-hint';
      accountHint.style.cssText = 'padding:10px 12px;background:var(--surface);border-radius:9px;margin-bottom:14px';
      accountHint.innerHTML = `Уже есть аккаунт? <button type="button" class="form-alt" data-open-auth="login" style="text-decoration:underline">Войдите</button>, чтобы запись сохранилась в личном кабинете. Можно записаться и без регистрации.`;
    }
  }

  /* ---------- FORM ---------- */

  function formError(message) {
    if (!formErrorBox) return;
    formErrorBox.textContent = message || '';
    formErrorBox.classList.toggle('is-visible', Boolean(message));
  }

  function markError(name, on) {
    if (!form) return;
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.closest('.field')?.classList.toggle('has-error', Boolean(on));
  }

  if (form) {
    form.addEventListener('input', (event) => {
      if (event.target.matches('input, textarea')) {
        event.target.closest('.field')?.classList.remove('has-error');
      }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.busy === '1') return;
      formError('');
      ['name', 'phone', 'email'].forEach((field) => markError(field, false));

      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const email = String(data.get('email') || '').trim();
      const comment = String(data.get('comment') || '').trim();
      const consent = form.querySelector('[name="consent"]')?.checked;
      const digits = phone.replace(/\D/g, '');

      let hasError = false;
      if (name.length < 2) { markError('name', true); hasError = true; }
      if (digits.length < 10) { markError('phone', true); hasError = true; }
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(email)) { markError('email', true); hasError = true; }
      if (hasError) { formError('Проверьте имя, телефон и email.'); return; }
      if (!consent) { formError('Подтвердите согласие на обработку персональных данных.'); return; }
      if (!service() || !master() || !state.date || !state.time) {
        formError('Вернитесь на предыдущие шаги и выберите услугу, мастера и время.');
        return;
      }

      const button = form.querySelector('[data-booking-submit]');
      form.dataset.busy = '1';
      if (button) { button.disabled = true; button.textContent = 'Создаём запись…'; }
      try {
        const result = await App.api('/api/bookings', {
          method: 'POST',
          body: {
            serviceSlug: state.serviceSlug,
            masterId: state.masterId,
            date: state.date,
            time: state.time,
            name,
            phone,
            email,
            comment,
          },
        });
        showSuccess(result.booking);
      } catch (error) {
        formError(error.message);
        if (error.fields) {
          Object.keys(error.fields).forEach((field) => {
            if (['name', 'phone', 'email'].includes(field)) markError(field, true);
          });
        }
        if (error.status === 409) {
          state.time = null;
          updateNextButtons();
          App.toast('Выбранное время только что заняли. Выберите другое окно.', 'error', 6000);
          setTimeout(() => showStep(3), 500);
        }
      } finally {
        form.dataset.busy = '';
        if (button) { button.disabled = false; button.textContent = 'Подтвердить запись'; }
      }
    });
  }

  /* ---------- SUCCESS ---------- */

  function showSuccess(booking) {
    state.submitted = true;
    const grid = $('[data-booking-grid]');
    const success = $('[data-booking-success]');
    if (grid) grid.hidden = true;
    if (!success) return;
    const userNote = booking.user_id || state.user
      ? 'Запись сохранена в личном кабинете — там можно проверить статус и отменить её по правилам студии.'
      : 'Сохраните номер записи: по нему администратор найдёт вашу запись. Чтобы управлять записями онлайн, создайте личный кабинет.';
    success.hidden = false;
    success.innerHTML = `
      <div class="booking-panel" style="max-width:760px;margin:0 auto">
        <div class="success-wrap">
          <div class="success-icon">${App.icon('check')}</div>
          <h2 class="success-title">Запись создана</h2>
          <p class="success-text">Спасибо! Мы получили заявку и свяжемся с вами для подтверждения. ${userNote}</p>
          <div class="success-card">
            <div class="summary-rows" style="margin-top:0;border-top:0">
              <div class="summary-row"><span>Услуга</span><strong>${App.escapeHtml(booking.service.title)}</strong></div>
              <div class="summary-row"><span>Мастер</span><strong>${App.escapeHtml(booking.master.name)}</strong></div>
              <div class="summary-row"><span>Дата и время</span><strong>${App.escapeHtml(App.formatDate(booking.date))}, ${App.escapeHtml(booking.time)}</strong></div>
              <div class="summary-row"><span>Стоимость</span><strong>${App.money(booking.price)}</strong></div>
              <div class="summary-row"><span>Статус</span><strong>${App.statusBadge(booking.status)}</strong></div>
              <div class="summary-row"><span>Номер записи</span><strong>${App.escapeHtml(booking.code)}</strong></div>
            </div>
            <div class="booking-code" style="margin-top:14px">Запись № <strong>${App.escapeHtml(booking.code)}</strong></div>
          </div>
          <div class="success-actions">
            ${state.user ? '<a class="btn btn--accent" href="/account">Мои записи</a>' : '<button class="btn btn--accent" type="button" data-open-auth="register">Создать аккаунт</button>'}
            <a class="btn btn--outline" href="/">На главную</a>
            <a class="btn btn--ghost" href="/booking">Записать ещё</a>
          </div>
        </div>
      </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    App.toast('Запись создана. Ожидайте подтверждения администратора.', 'success', 6000);
  }

  /* ---------- INIT ---------- */

  renderServiceChoices();

  const params = new URLSearchParams(location.search);
  const initialService = params.get('service');
  if (initialService && services.some((s) => s.slug === initialService)) selectService(initialService);

  const initialMaster = Number(params.get('master'));
  if (state.serviceSlug && initialMaster) {
    const available = mastersFor(service());
    if (available.some((m) => Number(m.id) === initialMaster)) selectMaster(initialMaster);
  }

  const initialDate = params.get('date');
  const initialTime = params.get('time');
  if (state.serviceSlug && state.masterId && initialDate) {
    state.date = initialDate;
    state.time = initialTime || null;
  }

  updateNextButtons();
  renderSummary();
  updateQuery();

  if (state.serviceSlug && state.masterId) {
    showStep(3);
  } else if (state.serviceSlug) {
    showStep(2);
  }

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.next);
      if (target === 2 && !service()) { App.toast('Выберите услугу'); return; }
      if (target === 3 && !master()) { App.toast('Выберите мастера'); return; }
      if (target === 4 && !state.time) { App.toast('Выберите время'); return; }
      showStep(target);
    });
  });

  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.back)));
  });

  if (serviceChoices) {
    serviceChoices.addEventListener('change', (event) => {
      const input = event.target.closest('input[name="service"]');
      if (input) selectService(input.value);
    });
  }

  if (masterChoices) {
    masterChoices.addEventListener('change', (event) => {
      const input = event.target.closest('input[name="master"]');
      if (input) selectMaster(Number(input.value));
    });
  }

  document.addEventListener('app:auth', (event) => {
    state.user = event.detail.user;
    if (state.step === 4) {
      fillContactForm();
      renderAccountHint();
    }
  });
})();
