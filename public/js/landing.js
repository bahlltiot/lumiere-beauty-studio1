'use strict';

/* Главная страница: контент из API и интерактив. */

(async function () {
  const { site } = await App.init({ page: 'landing' });
  if (!site) return;

  const brand = site.brand || {};
  const contacts = site.contacts || {};
  const about = site.about || {};
  const categories = site.categories || {};
  const services = site.services || [];
  const masters = site.masters || [];
  const $ = (selector) => document.querySelector(selector);

  let reviews = [];
  let reviewMeta = { average: 0, count: 0 };

  /* ---------- HERO ---------- */

  function renderHero() {
    const eyebrow = $('[data-hero-eyebrow]');
    if (eyebrow) eyebrow.textContent = `${brand.city || 'Москва'} · с ${brand.founded || '2019'} года`;
    const title = $('[data-hero-title]');
    if (title) {
      title.innerHTML = `${App.escapeHtml(brand.heroTitle || 'Взгляд, который')}<em>${App.escapeHtml(brand.heroAccent || 'говорит за вас')}</em>`;
    }
    const text = $('[data-hero-text]');
    if (text && brand.heroText) text.textContent = brand.heroText;
    const image = $('[data-hero-image]');
    if (image && brand.heroImage) {
      image.src = brand.heroImage;
      image.addEventListener('error', () => {
        image.removeAttribute('src');
        image.style.background = 'linear-gradient(160deg, #EBD8D0, #EFE6DA 60%, #DED3C5)';
      });
    }

    const master = masters[0];
    const photo = $('[data-hero-master-photo]');
    if (photo) {
      const src = about.photo || (master && master.photo);
      if (src) photo.src = src;
      photo.alt = about.name ? `Мастер ${about.name}` : 'Мастер студии';
    }
    const name = $('[data-hero-master-name]');
    if (name) name.textContent = about.name || (master && master.name) || 'Мастер студии';
    const role = $('[data-hero-master-role]');
    if (role) role.textContent = about.role || (master && master.role) || '';

    const stats = $('[data-hero-stats]');
    if (stats) {
      stats.innerHTML = `
        <div class="hero-stat"><strong>${App.escapeHtml(about.experience || '8 лет')}</strong><span>опыта в индустрии</span></div>
        <div class="hero-stat"><strong>${App.escapeHtml(about.clients || '2 400+')}</strong><span>довольных клиентов</span></div>
        <div class="hero-stat"><strong data-hero-rating>4.9</strong><span>средняя оценка</span></div>`;
    }
  }

  function renderMarquee() {
    const track = $('[data-marquee]');
    if (!track) return;
    const star = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3.5c.5 5 2.5 7 7.5 7.5-5 .5-7 2.5-7.5 7.5-.5-5-2.5-7-7.5-7.5 5-.5 7-2.5 7.5-7.5Z"/></svg>';
    const items = [
      ...services.slice(0, 4).map((s) => s.title),
      'Онлайн-запись 24/7',
      'Приватная атмосфера',
      'Премиальные материалы',
    ];
    const html = items.map((text) => `<span class="marquee__item">${App.escapeHtml(text)} ${star}</span>`).join('');
    track.innerHTML = html + html;
  }

  /* ---------- SERVICES ---------- */

  const categoryLabel = (key) => categories[key] || key;

  function renderServices() {
    const grid = $('[data-services]');
    if (!grid) return;
    if (!services.length) {
      grid.innerHTML = '<div class="empty-state"><h3>Услуги скоро появятся</h3><p>Загляните позже или свяжитесь со студией.</p></div>';
      return;
    }
    grid.innerHTML = services.map((service, index) => {
      const active = App.isFavorite(service.id);
      return `<article class="service-card" data-reveal>
        <div class="service-media">
          <img src="${App.escapeHtml(service.image)}" alt="${App.escapeHtml(service.title)}" loading="${index < 3 ? 'eager' : 'lazy'}">
          <div class="service-top">
            <span class="service-index">${String(index + 1).padStart(2, '0')}</span>
            <button class="favorite-btn${active ? ' is-active' : ''}" type="button" data-favorite="${service.id}" aria-label="Добавить в избранное" aria-pressed="${active}">${App.icon('heart')}</button>
          </div>
          <span class="service-cat">${App.escapeHtml(categoryLabel(service.category))}</span>
        </div>
        <div class="service-body">
          <div class="service-meta">
            <span class="meta-item">${App.icon('clock')}${App.formatDuration(service.duration)}</span>
            <span class="meta-item">${App.escapeHtml(categoryLabel(service.category))}</span>
          </div>
          <h3 class="service-title">${App.escapeHtml(service.title)}</h3>
          <p class="service-desc">${App.escapeHtml(service.short)}</p>
          <div class="service-foot">
            <div class="service-price"><span>Стоимость</span><strong>${App.money(service.price)}</strong></div>
            <div class="service-actions">
              <button class="service-more" type="button" data-service="${service.id}">Подробнее</button>
              <a class="service-book" href="${App.serviceLink(service.slug)}" aria-label="Записаться на ${App.escapeHtml(service.title)}">${App.icon('arrowUpRight')}</a>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
    App.observeNew(grid);
  }

  function buildServiceModal() {
    if (document.getElementById('service-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="modal modal--wide" id="service-modal">
        <div class="modal-card">
          <div class="service-modal-grid">
            <div class="service-modal-media"><img data-sm-image alt=""></div>
            <div class="service-modal-content">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">
                <span class="eyebrow"><span class="dot"></span><span data-sm-category>Услуга</span></span>
                <button class="modal-close" type="button" data-close-dialog aria-label="Закрыть">${App.icon('close')}</button>
              </div>
              <h3 class="service-modal-title" data-sm-title></h3>
              <div class="service-modal-meta">
                <span>${App.icon('clock')}<span data-sm-duration></span></span>
                <span>${App.icon('sparkle')}Индивидуальный подбор</span>
              </div>
              <p class="service-modal-desc" data-sm-description></p>
              <ul class="service-modal-list">
                <li>${App.icon('check')}<span>Диагностика и подбор формы перед процедурой</span></li>
                <li>${App.icon('check')}<span>Гипоаллергенные материалы премиального класса</span></li>
                <li>${App.icon('check')}<span>Рекомендации по домашнему уходу после</span></li>
              </ul>
              <div class="service-modal-price">
                <div><span>Стоимость</span><strong data-sm-price></strong></div>
                <span data-sm-meta></span>
              </div>
              <div class="service-modal-actions">
                <button class="btn btn--outline" type="button" data-sm-favorite>${App.icon('heart')}<span>В избранное</span></button>
                <a class="btn btn--accent" data-sm-book href="/booking">Записаться ${App.icon('arrowRight')}</a>
              </div>
            </div>
          </div>
        </div>
      </dialog>`);
  }

  function openServiceModal(service) {
    buildServiceModal();
    const modal = document.getElementById('service-modal');
    if (!modal) return;
    const set = (selector, value) => {
      const el = modal.querySelector(selector);
      if (el) el.textContent = value || '';
    };
    const img = modal.querySelector('[data-sm-image]');
    img.src = service.image;
    img.alt = service.title;
    set('[data-sm-category]', categoryLabel(service.category));
    set('[data-sm-title]', service.title);
    set('[data-sm-duration]', App.formatDuration(service.duration));
    set('[data-sm-description]', service.description);
    set('[data-sm-price]', App.money(service.price));
    set('[data-sm-meta]', `${App.formatDuration(service.duration)} · ${categoryLabel(service.category)}`);
    const book = modal.querySelector('[data-sm-book]');
    book.href = App.serviceLink(service.slug);
    book.setAttribute('aria-label', `Записаться на ${service.title}`);
    const fav = modal.querySelector('[data-sm-favorite]');
    const syncFav = () => {
      const active = App.isFavorite(service.id);
      fav.classList.toggle('btn--accent', active);
      fav.classList.toggle('btn--outline', !active);
      fav.querySelector('span').textContent = active ? 'В избранном' : 'В избранное';
    };
    syncFav();
    fav.onclick = async () => {
      await App.toggleFavorite(service.id);
      syncFav();
    };
    if (!modal.open) modal.showModal();
  }

  const servicesGrid = $('[data-services]');
  if (servicesGrid) {
    servicesGrid.addEventListener('click', (event) => {
      const fav = event.target.closest('[data-favorite]');
      if (fav) {
        event.preventDefault();
        App.toggleFavorite(Number(fav.dataset.favorite));
        return;
      }
      const more = event.target.closest('[data-service]');
      if (more) {
        const service = services.find((s) => String(s.id) === more.dataset.service);
        if (service) openServiceModal(service);
      }
    });
  }

  document.addEventListener('app:favorites', () => {
    document.querySelectorAll('[data-favorite]').forEach((btn) => {
      const active = App.isFavorite(Number(btn.dataset.favorite));
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  });

  /* ---------- ABOUT ---------- */

  function renderAbout() {
    const photo = $('[data-about-photo]');
    if (photo) {
      if (about.photo) photo.src = about.photo;
      photo.alt = about.name ? `${about.name} — основатель студии` : 'Основатель студии';
    }
    const mini = $('[data-about-mini]');
    if (mini && about.secondaryPhoto) {
      mini.src = about.secondaryPhoto;
      mini.alt = 'Интерьер студии';
    }
    const set = (selector, value) => {
      const el = $(selector);
      if (el && value) el.textContent = value;
    };
    set('[data-about-name]', about.name);
    set('[data-about-role]', about.role);
    set('[data-about-quote]', about.quote);
    set('[data-about-bio]', about.bio);
    set('[data-about-approach]', about.approach);
    set('[data-about-experience]', about.experience);
    const tag = $('.about-name-block .tag');
    if (tag && about.experience) tag.textContent = `${about.experience} опыта`;

    const advantages = $('[data-about-advantages]');
    if (advantages && Array.isArray(about.advantages) && about.advantages.length) {
      advantages.innerHTML = about.advantages.map((item, index) => `
        <div class="advantage-card">
          <span class="advantage-card__num">${String(index + 1).padStart(2, '0')}</span>
          <h4>${App.escapeHtml(item.title)}</h4>
          <p>${App.escapeHtml(item.text)}</p>
        </div>`).join('');
    }

    const education = $('[data-about-education]');
    if (education && Array.isArray(about.education) && about.education.length) {
      education.innerHTML = about.education.map((item) => `<div class="education-item">${App.escapeHtml(item)}</div>`).join('');
    }
  }

  /* ---------- GALLERY ---------- */

  function renderGallery() {
    const wrap = $('[data-gallery]');
    const filters = $('[data-gallery-filters]');
    if (!wrap) return;
    const items = site.gallery || [];
    if (!items.length) {
      wrap.innerHTML = '';
      const empty = $('[data-gallery-empty]');
      if (empty) empty.hidden = false;
      return;
    }
    const usedCategories = [...new Set(items.map((item) => item.category))];
    if (filters) {
      filters.innerHTML = `<button class="filter-btn is-active" type="button" data-filter="all">Все работы</button>` +
        usedCategories.map((key) => `<button class="filter-btn" type="button" data-filter="${App.escapeHtml(key)}">${App.escapeHtml(categoryLabel(key))}</button>`).join('');
    }
    wrap.innerHTML = items.map((item, index) => `
      <figure class="work-card" data-category="${App.escapeHtml(item.category)}" data-index="${index}" tabindex="0" role="button" aria-label="Открыть фото: ${App.escapeHtml(item.title)}" style="--delay:${(index % 5) * 40}ms">
        <img src="${App.escapeHtml(item.image)}" alt="${App.escapeHtml(item.title)}" loading="lazy">
        <figcaption class="work-overlay">
          <span class="work-caption"><span>${App.escapeHtml(item.title)}</span>${App.icon('plus')}</span>
        </figcaption>
      </figure>`).join('');

    const empty = $('[data-gallery-empty]');

    function visibleItems() {
      return [...wrap.querySelectorAll('.work-card:not(.is-hidden)')].map((card) => {
        const item = items[Number(card.dataset.index)];
        return { src: item.image, title: item.title };
      });
    }

    if (filters) {
      filters.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-filter]');
        if (!btn) return;
        filters.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const key = btn.dataset.filter;
        let visible = 0;
        wrap.querySelectorAll('.work-card').forEach((card) => {
          const show = key === 'all' || card.dataset.category === key;
          card.classList.toggle('is-hidden', !show);
          if (show) visible += 1;
        });
        if (empty) empty.hidden = visible > 0;
      });
    }

    function openCard(card) {
      const list = visibleItems();
      const item = items[Number(card.dataset.index)];
      const index = list.findIndex((entry) => entry.src === item.image);
      App.openLightbox(list, index < 0 ? 0 : index);
    }

    wrap.addEventListener('click', (event) => {
      const card = event.target.closest('.work-card');
      if (card) openCard(card);
    });
    wrap.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.work-card');
      if (card) {
        event.preventDefault();
        openCard(card);
      }
    });
  }

  /* ---------- REVIEWS ---------- */

  async function loadReviews() {
    try {
      const data = await App.api('/api/reviews');
      reviews = data.reviews || [];
      reviewMeta = { average: Number(data.average) || 0, count: Number(data.count) || 0 };
    } catch {
      reviews = [];
      reviewMeta = { average: 0, count: 0 };
    }
    renderReviews();
  }

  function renderReviews() {
    const score = $('[data-reviews-score]');
    if (score) {
      const avg = reviewMeta.count ? reviewMeta.average : 0;
      const countText = reviewMeta.count
        ? `по ${reviewMeta.count} ${App.plural(reviewMeta.count, 'отзыву', 'отзывам', 'отзывам')}`
        : 'пока нет отзывов';
      score.innerHTML = `<strong>${avg ? avg.toFixed(1).replace('.', ',') : '—'}</strong>
        <div class="score-meta">
          <span>Средняя оценка</span>
          ${App.stars(avg || 0)}
          <span>${countText}</span>
        </div>`;
    }
    const ratingEl = $('[data-hero-rating]');
    if (ratingEl && reviewMeta.count) ratingEl.textContent = reviewMeta.average.toFixed(1).replace('.', ',');

    const grid = $('[data-reviews]');
    if (!grid) return;
    if (!reviews.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.6)">
        <h3 style="color:var(--on-dark)">Пока нет отзывов</h3><p>Станьте первым, кто расскажет о студии.</p></div>`;
      return;
    }
    grid.innerHTML = reviews.slice(0, 6).map((review, index) => `
      <article class="review-card${index === 0 && reviews.length > 3 ? ' review-card--wide' : ''}" data-reveal>
        <div class="review-top">
          <div class="review-author">
            <span class="review-avatar">${App.escapeHtml(App.initials(review.name))}</span>
            <div><strong>${App.escapeHtml(review.name)}</strong><span>${review.demo ? 'Демонстрационный отзыв' : 'Клиент студии'}</span></div>
          </div>
          ${App.stars(review.rating)}
        </div>
        <p class="review-text">${App.escapeHtml(review.text)}</p>
        <div class="review-foot">
          ${review.demo ? '<span class="demo-tag">Демонстрационный отзыв</span>' : '<span class="demo-tag">Проверенный отзыв</span>'}
          <span class="review-date">${App.escapeHtml(review.dateLabel || App.formatDate(review.date))}</span>
        </div>
      </article>`).join('');
    App.observeNew(grid);
  }

  /* ---------- CONTACTS / CTA ---------- */

  function renderContacts() {
    const phone = $('[data-contact-phone]');
    if (phone) {
      phone.textContent = contacts.phone || '';
      phone.href = `tel:${contacts.phoneHref || ''}`;
    }
    const email = $('[data-contact-email]');
    if (email) {
      email.textContent = contacts.email || '';
      email.href = `mailto:${contacts.email || ''}`;
    }
    const set = (selector, value) => {
      const el = $(selector);
      if (el && value) el.textContent = value;
    };
    set('[data-contact-address]', contacts.address);
    set('[data-contact-metro]', contacts.metro);
    set('[data-contact-hours]', contacts.hours);
    set('[data-contact-hours-note]', contacts.hoursNote);

    const socials = $('[data-contacts-socials]');
    if (socials) {
      const links = contacts.socials || {};
      socials.innerHTML = [
        ['instagram', 'Instagram'],
        ['telegram', 'Telegram'],
        ['whatsapp', 'WhatsApp'],
        ['vk', 'VK'],
      ].filter(([key]) => links[key]).map(([key, label]) => `
        <a class="social-link" href="${App.escapeHtml(links[key])}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${App.icon(key)}</a>`).join('');
    }

    const map = $('[data-map]');
    if (map && contacts.mapEmbed) map.src = contacts.mapEmbed;
    const mapLink = $('[data-map-link]');
    if (mapLink && contacts.mapLink) mapLink.href = contacts.mapLink;

    const cta = $('[data-cta-bg]');
    if (cta) {
      const studioPhoto = (site.gallery || []).find((item) => item.category === 'studio');
      const url = (studioPhoto && studioPhoto.image) || brand.heroImage;
      if (url) cta.style.backgroundImage = `url("${String(url).replace(/"/g, '%22')}")`;
    }
  }

  /* ---------- NEAREST SLOT ---------- */

  async function loadNearestSlot() {
    const link = $('[data-hero-slot]');
    if (!link || !services.length || !masters.length) return;
    const service = services[0];
    const master = masters.find((m) => !m.services || !m.services.length || m.services.includes(service.slug));
    if (!master) return;
    try {
      const data = await App.api(`/api/availability/calendar?service=${encodeURIComponent(service.slug)}&master=${master.id}&days=21`);
      const day = (data.calendar || []).find((entry) => entry.open && entry.firstTime);
      if (!day) return;
      const text = link.querySelector('[data-hero-slot-text]');
      if (text) text.textContent = `Ближайшее окно · ${App.formatDateShort(day.date)}, ${day.firstTime}`;
      link.href = `/booking?service=${encodeURIComponent(service.slug)}&master=${master.id}&date=${day.date}&time=${day.firstTime}`;
      link.hidden = false;
    } catch {}
  }

  /* ---------- START ---------- */

  renderHero();
  renderMarquee();
  renderAbout();
  renderServices();
  renderGallery();
  renderContacts();
  loadReviews();
  loadNearestSlot();
})();
