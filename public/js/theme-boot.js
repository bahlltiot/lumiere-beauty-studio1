'use strict';

// Применяем закэшированную тему до загрузки основных стилей,
// чтобы не было вспышки стандартной палитры.
(function () {
  try {
    var raw = localStorage.getItem('lumiere:theme');
    if (!raw) return;
    var theme = JSON.parse(raw);
    if (!theme || typeof theme !== 'object') return;
    var map = {
      bg: '--bg', surface: '--surface', card: '--card', ink: '--ink',
      muted: '--muted', line: '--line', accent: '--accent',
      accentSoft: '--accent-soft', accentDeep: '--accent-deep',
      dark: '--dark', onDark: '--on-dark'
    };
    var colors = theme.colors || {};
    Object.keys(map).forEach(function (key) {
      if (colors[key]) document.documentElement.style.setProperty(map[key], colors[key]);
    });
    var fonts = theme.fonts || {};
    if (fonts.heading) {
      document.documentElement.style.setProperty('--font-heading', "'" + fonts.heading + "', Georgia, serif");
    }
    if (fonts.body) {
      document.documentElement.style.setProperty('--font-body', "'" + fonts.body + "', 'Segoe UI', sans-serif");
    }
  } catch (error) {
    /* тихо игнорируем повреждённый кэш */
  }
})();
