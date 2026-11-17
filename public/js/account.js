'use strict';

/* Личный кабинет клиента. */

(async function () {
  const { site, user } = await App.init({ page: 'account' });
  if (!site) return;

  const root = document.querySelector('[data-account-root]');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const resetToken = params.get('reset');
  let state = {
    user,
    bookings: [],
    favorites: [],
    panel: ['bookings', 'favorites', 'profile', 'password'].includes(params.get('panel')) ? params.get('panel') : 'bookings',
  };

  const $ = (selector) => root.querySelector(selector);
  const esc = App.escapeHtml;

  /* ---------- RESET PASSWORD ---------- */

  function renderReset(token) {
    root.innerHTML = `
      <div class="account-login-wall" style="grid-template-columns:1fr;max-width:560px">
        <div class="account-login-wall__body">
          <span class="eyebrow"><span class="dot"></span>Восстановление доступа</span>
          <h2>Новый пароль</h2>
          <p>Придумайте новый пароль: минимум 8 символов, буквы и цифры. После сохранения все активные сеансы будут завершены.</p>
          <form data-reset-form style="display:grid;gap:14px">
            <div class="form-error" data-form-error></div>
            <div class="field"><label for="reset-password">Новый пароль</label><input id="reset-password" name="password" type="password" autocomplete="new-password" placeholder="Минимум 8 символов" required></div>
            <div class="field"><label for="reset-password2">Повторите пароль</label><input id="reset-password2" name="password2" type="password" autocomplete="new-password" placeholder="Ещё раз" required></div>
            <button class="btn btn--accent btn--block" type="submit">Сохранить пароль</button>
            <div class="form-alt"><a href="/account">Вернуться ко входу</a></div>
          </form>
        </div>
      </div>`;
    const form = $('[data-reset-form]');
    const errorBox = form.querySelector('[data-form-error]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const password = String(data.get('password') || '');
      const password2 = String(data.get('password2') || '');
      errorBox.classList.remove('is-visible');
      if (password !== password2) {
        errorBox.textContent = 'Пароли не совпадают';
        errorBox.classList.add('is-visible');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Сохраняем…';
      try {
        await App.api('/api/auth/reset', { method: 'POST', body: { token, password } });
        history.replaceState(null, '', '/account');
        root.innerHTML = `
          <div class="account-login-wall" style="grid-template-columns:1fr;max-width:560px">
            <div class="account-login-wall__body" style="text-align:center">
              <div class="success-icon" style="margin-bottom:8px">${App.icon('check')}</div>
              <h2>Пароль обновлён</h2>
              <p>Теперь можно войти с новым паролем.</p>
              <button class="btn btn--accent btn--block" type="button" data-open-auth="login">Войти в кабинет</button>
            </div>
          </div>`;
        App.toast('Пароль обновлён', 'success');
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.add('is-visible');
        button.disabled = false;
        button.textContent = 'Сохранить пароль';
      }
    });
  }

  /* ---------- LOGIN WALL ---------- */

  function renderLoginWall() {
    const photo = site.about.secondaryPhoto || site.about.photo || site.brand.heroImage;
    root.innerHTML = `
      <div class="account-login-wall">
        <div class="account-login-wall__media">${photo ? `<img src="${esc(photo)}" alt="Интерьер студии">` : ''}</div>
        <div class="account-login-wall__body">
          <span class="eyebrow"><span class="dot"></span>Личный кабинет</span>
          <h2>Войдите, чтобы<br>управлять записями</h2>
          <p>История посещений, статусы записей и избранные услуги сохраняются в вашем аккаунте. Отменить запись можно онлайн по правилам студии.</p>
          <button class="btn btn--accent btn--block" type="button" data-open-auth="login">Войти</button>
          <button class="btn btn--outline btn--block" type="button" data-open-auth="register">Создать аккаунт</button>
          <p class="form-hint">Демо-клиент: client@lumiere.studio / Client2026!<br>Пароль хранится в виде стойкого хэша, сессии защищены HttpOnly-cookie.</p>
        </div>
      </div>`;
  }

  /* ---------- SHELL ---------- */

  function renderShell() {
    const u = state.user;
    root.innerHTML = `
      <div class="account-grid">
        <aside class="account-side">
          <div class="account-user">
            <span class="account-avatar">${esc(App.initials(u.name))}</span>
            <h3>${esc(u.name)}</h3>
            <p>${esc(u.email)}</p>
          </div>
          <nav class="account-nav" aria-label="Разделы кабинета">
            <button type="button" data-panel="bookings" class="${state.panel === 'bookings' ? 'is-active' : ''}">${App.icon('calendar')}<span>Мои записи</span></button>
            <button type="button" data-panel="favorites" class="${state.panel === 'favorites' ? 'is-active' : ''}">${App.icon('heart')}<span>Избранное</span></button>
            <button type="button" data-panel="profile" class="${state.panel === 'profile' ? 'is-active' : ''}">${App.icon('user')}<span>Профиль</span></button>
            <button type="button" data-panel="password" class="${state.panel === 'password' ? 'is-active' : ''}">${App.icon('lock')}<span>Безопасность</span></button>
            <a href="/booking">${App.icon('plus')}<span>Новая запись</span></a>
          </nav>
          <div class="account-side__foot">
            <button type="button" data-logout>${App.icon('logout')}Выйти из аккаунта</button>
          </div>
        </aside>
        <div class="account-content">
          <section class="account-panel ${state.panel === 'bookings' ? 'is-active' : ''}" data-panel-content="bookings">
            <div class="account-panel__head">
              <div><h2>Мои записи</h2><p data-bookings-caption>Загружаем записи…</p></div>
              <a class="btn btn--accent btn--sm" href="/booking">Новая запись</a>
            </div>
            <div data-bookings-upcoming><div class="panel-card" style="color:var(--muted)">Загрузка…</div></div>
            <div class="section-label">История посещений</div>
            <div data-bookings-history></div>
          </section>

          <section class="account-panel ${state.panel === 'favorites' ? 'is-active' : ''}" data-panel-content="favorites">
            <div class="account-panel__head">
              <div><h2>Избранное</h2><p>Услуги, к которым хочется вернуться.</p></div>
            </div>
            <div data-favorites-list><div class="panel-card" style="color:var(--muted)">Загрузка…</div></div>
          </section>

          <section class="account-panel ${state.panel === 'profile' ? 'is-active' : ''}" data-panel-content="profile">
            <div class="account-panel__head">
              <div><h2>Профиль</h2><p>Данные используются только для связи по записям.</p></div>
            </div>
            <div class="profile-grid">
              <div class="panel-card profile-card">
                <h3>Личные данные</h3>
                <p>Имя и контакты можно изменить в любой момент.</p>
                <form class="profile-form" data-profile-form novalidate>
                  <div class="form-error" data-form-error></div>
                  <div class="field"><label for="profile-name">Имя и фамилия</label><input id="profile-name" name="name" value="${esc(u.name)}" autocomplete="name" required></div>
                  <div class="form-row">
                    <div class="field"><label for="profile-phone">Телефон</label><input id="profile-phone" name="phone" value="${esc(u.phone)}" type="tel" autocomplete="tel" required></div>
                    <div class="field"><label for="profile-birthdate">Дата рождения</label><input id="profile-birthdate" name="birthdate" value="${esc(u.birthdate || '')}" type="date"></div>
                  </div>
                  <div class="field"><label for="profile-email">Email</label><input id="profile-email" name="email" value="${esc(u.email)}" type="email" autocomplete="email" required></div>
                  <button class="btn btn--accent" type="submit">Сохранить изменения</button>
                </form>
              </div>
              <div class="panel-card">
                <h3 style="font-size:23px;margin-bottom:10px">О студии</h3>
                <div class="security-note">
                  <strong>${esc(site.brand.name)}</strong><br>
                  ${esc(site.contacts.address)}<br><br>
                  ${esc(site.contacts.hours)}<br>
                  ${esc(site.contacts.phone)}
                </div>
                <div style="margin-top:16px;display:grid;gap:8px">
                  <a class="link-arrow" href="/booking">Записаться онлайн ${App.icon('arrowRight')}</a>
                  <a class="link-arrow" href="/#contacts">Контакты и карта ${App.icon('arrowRight')}</a>
                </div>
              </div>
            </div>
          </section>

          <section class="account-panel ${state.panel === 'password' ? 'is-active' : ''}" data-panel-content="password">
            <div class="account-panel__head">
              <div><h2>Безопасность</h2><p>Смена пароля и защита аккаунта.</p></div>
            </div>
            <div class="profile-grid">
              <div class="panel-card profile-card">
                <h3>Сменить пароль</h3>
                <p>После смены пароля остальные сеансы продолжают работать до истечения срока. Для полного выхода используйте кнопку «Выйти».</p>
                <form class="profile-form" data-password-form novalidate>
                  <div class="form-error" data-form-error></div>
                  <div class="field"><label for="password-current">Текущий пароль</label><input id="password-current" name="currentPassword" type="password" autocomplete="current-password" required></div>
                  <div class="field"><label for="password-new">Новый пароль</label><input id="password-new" name="password" type="password" autocomplete="new-password" placeholder="Минимум 8 символов, буквы и цифры" required></div>
                  <div class="field"><label for="password-new2">Повторите новый пароль</label><input id="password-new2" name="password2" type="password" autocomplete="new-password" required></div>
                  <button class="btn btn--accent" type="submit">Обновить пароль</button>
                </form>
              </div>
              <div class="panel-card">
                <h3 style="font-size:23px;margin-bottom:10px">Как защищён аккаунт</h3>
                <ul class="service-modal-list" style="gap:12px">
                  <li>${App.icon('check')}<span>Пароли хранятся в виде хэша scrypt с индивидуальной солью.</span></li>
                  <li>${App.icon('check')}<span>Сессия — в HttpOnly-cookie, недоступной JavaScript.</span></li>
                  <li>${App.icon('check')}<span>Формы защищены проверкой Origin и ограничением частоты попыток.</span></li>
                </ul>
                <div class="security-note" style="margin-top:16px">Если вы забыли пароль — выйдите из аккаунта и воспользуйтесь ссылкой «Забыли пароль?» в окне входа.</div>
              </div>
            </div>
          </section>
        </div>
      </div>`;
    bindAccountEvents();
  }

  function bindAccountEvents() {
    root.querySelectorAll('[data-panel]').forEach((button) => {
      button.addEventListener('click', () => setPanel(button.dataset.panel));
    });

    const profileForm = $('[data-profile-form]');
    if (profileForm) {
      profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (profileForm.dataset.busy === '1') return;
        const data = new FormData(profileForm);
        const errorBox = profileForm.querySelector('[data-form-error]');
        const button = profileForm.querySelector('button[type="submit"]');
        errorBox.classList.remove('is-visible');
        profileForm.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
        profileForm.dataset.busy = '1';
        button.disabled = true;
        button.textContent = 'Сохраняем…';
        try {
          const result = await App.api('/api/account/profile', {
            method: 'PATCH',
            body: {
              name: data.get('name'),
              phone: data.get('phone'),
              email: data.get('email'),
              birthdate: data.get('birthdate') || '',
            },
          });
          state.user = result.user;
          App.setUser(result.user);
          updateUserCard();
          App.toast('Профиль обновлён', 'success');
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.classList.add('is-visible');
          if (error.fields) {
            Object.keys(error.fields).forEach((name) => {
              const input = profileForm.querySelector(`[name="${name}"]`);
              input?.closest('.field')?.classList.add('has-error');
            });
          }
        } finally {
          profileForm.dataset.busy = '';
          button.disabled = false;
          button.textContent = 'Сохранить изменения';
        }
      });
    }

    const passwordForm = $('[data-password-form]');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (passwordForm.dataset.busy === '1') return;
        const data = new FormData(passwordForm);
        const errorBox = passwordForm.querySelector('[data-form-error]');
        const button = passwordForm.querySelector('button[type="submit"]');
        errorBox.classList.remove('is-visible');
        if (String(data.get('password')) !== String(data.get('password2'))) {
          errorBox.textContent = 'Новые пароли не совпадают';
          errorBox.classList.add('is-visible');
          return;
        }
        passwordForm.dataset.busy = '1';
        button.disabled = true;
        button.textContent = 'Обновляем…';
        try {
          await App.api('/api/account/password', {
            method: 'PATCH',
            body: { currentPassword: data.get('currentPassword'), password: data.get('password') },
          });
          passwordForm.reset();
          App.toast('Пароль обновлён', 'success');
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.classList.add('is-visible');
        } finally {
          passwordForm.dataset.busy = '';
          button.disabled = false;
          button.textContent = 'Обновить пароль';
        }
      });
    }

    root.addEventListener('click', async (event) => {
      const cancelBtn = event.target.closest('[data-cancel-booking]');
      if (cancelBtn) {
        const id = Number(cancelBtn.dataset.cancelBooking);
        const booking = state.bookings.find((b) => Number(b.id) === id);
        if (!booking) return;
        const ok = await App.confirmAction({
          title: 'Отменить запись?',
          text: `${booking.service.title} · ${App.formatDate(booking.date)}, ${booking.time}. Отмена освободит время для других клиентов.`,
          confirmLabel: 'Да, отменить',
          cancelLabel: 'Оставить запись',
          danger: true,
        });
        if (!ok) return;
        cancelBtn.disabled = true;
        try {
          const result = await App.api(`/api/account/bookings/${id}/cancel`, { method: 'POST' });
          const index = state.bookings.findIndex((b) => Number(b.id) === id);
          if (index >= 0) state.bookings[index] = result.booking;
          renderBookings();
          App.toast('Запись отменена', 'success');
        } catch (error) {
          App.toast(error.message, 'error', 6000);
          cancelBtn.disabled = false;
        }
        return;
      }

      const unfav = event.target.closest('[data-unfavorite]');
      if (unfav) {
        const id = Number(unfav.dataset.unfavorite);
        unfav.disabled = true;
        await App.toggleFavorite(id);
        state.favorites = state.favorites.filter((item) => Number(item.id) !== id);
        renderFavorites();
        return;
      }
    });
  }

  function setPanel(name) {
    if (!['bookings', 'favorites', 'profile', 'password'].includes(name)) name = 'bookings';
    state.panel = name;
    root.querySelectorAll('[data-panel]').forEach((button) => button.classList.toggle('is-active', button.dataset.panel === name));
    root.querySelectorAll('[data-panel-content]').forEach((section) => section.classList.toggle('is-active', section.dataset.panelContent === name));
    history.replaceState(null, '', name === 'bookings' ? '/account' : `/account?panel=${name}`);
    const y = root.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  function updateUserCard() {
    const card = root.querySelector('.account-user');
    if (!card) return;
    card.querySelector('.account-avatar').textContent = App.initials(state.user.name);
    card.querySelector('h3').textContent = state.user.name;
    card.querySelector('p').textContent = state.user.email;
  }

  /* ---------- BOOKINGS ---------- */

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function bookingCard(booking) {
    const active = ['pending', 'confirmed'].includes(booking.status);
    let action = '';
    if (active) {
      action = booking.canCancel
        ? `<button class="booking-cancel" type="button" data-cancel-booking="${booking.id}">Отменить запись</button>`
        : `<button class="booking-cancel" type="button" disabled title="Отмена доступна не позднее чем за ${Number(site.booking.cancelHours) || 0} ч">Отмена недоступна</button>`;
    } else if (booking.status === 'completed') {
      action = `<button class="service-more" type="button" data-open-review>Оставить отзыв</button>`;
    }
    return `<article class="booking-card">
      <img class="booking-thumb" src="${esc(booking.service.image)}" alt="${esc(booking.service.title)}" loading="lazy">
      <div class="booking-info">
        <div class="booking-info__top">
          <h4>${esc(booking.service.title)}</h4>
          ${App.statusBadge(booking.status)}
        </div>
        <div class="booking-meta">
          <span>${App.icon('calendar')}${esc(App.formatDate(booking.date))}, ${esc(booking.time)}</span>
          <span>${App.icon('user')}${esc(booking.master.name)}</span>
          <span>${App.icon('clock')}${App.formatDuration(booking.duration)}</span>
        </div>
        <span class="booking-code-small">Запись № ${esc(booking.code)}</span>
      </div>
      <div class="booking-actions">
        <span class="booking-price">${App.money(booking.price)}</span>
        ${action}
      </div>
    </article>`;
  }

  function renderBookings() {
    const upcomingBox = $('[data-bookings-upcoming]');
    const historyBox = $('[data-bookings-history]');
    const caption = $('[data-bookings-caption]');
    if (!upcomingBox || !historyBox) return;
    const today = todayISO();
    const upcoming = state.bookings
      .filter((b) => ['pending', 'confirmed'].includes(b.status) && b.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const history = state.bookings
      .filter((b) => !( ['pending', 'confirmed'].includes(b.status) && b.date >= today))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    if (caption) {
      caption.textContent = upcoming.length
        ? `${upcoming.length} ${App.plural(upcoming.length, 'активная запись', 'активные записи', 'активных записей')}`
        : 'Активных записей нет';
    }

    upcomingBox.innerHTML = upcoming.length
      ? `<div class="booking-list">${upcoming.map(bookingCard).join('')}</div>`
      : `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3.5v3M16 3.5v3"/></svg>
          <h3>Пока нет предстоящих визитов</h3>
          <p>Выберите услугу и удобное время — это займёт меньше минуты.</p>
          <a class="btn btn--accent" href="/booking">Записаться</a>
        </div>`;

    historyBox.innerHTML = history.length
      ? `<div class="booking-list">${history.map(bookingCard).join('')}</div>`
      : `<div class="panel-card" style="color:var(--muted);font-size:12.5px">История появится после первого завершённого визита.</div>`;
  }

  async function loadBookings() {
    try {
      const data = await App.api('/api/account/bookings');
      state.bookings = data.bookings || [];
    } catch (error) {
      App.toast(error.message, 'error');
      state.bookings = [];
    }
    renderBookings();
  }

  /* ---------- FAVORITES ---------- */

  function renderFavorites() {
    const box = $('[data-favorites-list]');
    if (!box) return;
    if (!state.favorites.length) {
      box.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.3S4 15.2 4 9.6A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 8 2.2c0 5.6-8 10.7-8 10.7Z"/></svg>
        <h3>В избранном пока пусто</h3>
        <p>Нажмите на сердечко в карточке услуги на главной странице.</p>
        <a class="btn btn--accent" href="/#services">Смотреть услуги</a>
      </div>`;
      return;
    }
    box.innerHTML = `<div class="favorites-grid">${state.favorites.map((service) => `
      <article class="fav-card">
        <img src="${esc(service.image)}" alt="${esc(service.title)}" loading="lazy">
        <div class="fav-card__body">
          <h4>${esc(service.title)}</h4>
          <div class="fav-card__meta"><span>${App.money(service.price)}</span><span>${App.formatDuration(service.duration)}</span></div>
        </div>
        <div class="fav-card__actions">
          <button class="fav-remove" type="button" data-unfavorite="${service.id}">${App.icon('trash')}Убрать</button>
          <a class="link-arrow" href="${App.serviceLink(service.slug)}">Записаться</a>
        </div>
      </article>`).join('')}</div>`;
  }

  async function loadFavorites() {
    try {
      const data = await App.api('/api/account/favorites');
      state.favorites = data.favorites || [];
    } catch {
      state.favorites = [];
    }
    renderFavorites();
  }

  /* ---------- INIT ---------- */

  if (resetToken) {
    renderReset(resetToken);
    return;
  }

  if (!state.user) {
    renderLoginWall();
    document.addEventListener('app:auth', (event) => {
      if (event.detail.user) setTimeout(() => location.reload(), 350);
    });
    return;
  }

  renderShell();
  renderFavorites();
  loadBookings();
  loadFavorites();

  document.addEventListener('app:auth', (event) => {
    if (!event.detail.user) {
      setTimeout(() => location.reload(), 300);
    }
  });
})();
