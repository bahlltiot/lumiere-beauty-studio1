'use strict';

/**
 * ВСЕ ДЕМО-ДАННЫЕ И НАСТРОЙКИ БРЕНДА — В ЭТОМ ФАЙЛЕ.
 * После первого запуска значения сохраняются в БД и редактируются в админ-панели.
 * Чтобы вернуть исходные настройки — удалите data/lumiere.sqlite и перезапустите сервер.
 */

const photo = (src, w = 1200, h = 1500) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${h}&fit=cover&output=jpg&q=82`;

const DEMO_PHOTOS = {
  hero: photo('images.pexels.com/photos/3373716/pexels-photo-3373716.jpeg', 1600, 2000),
  master: photo('images.unsplash.com/photo-1531746020798-e6953c6e8e04', 1000, 1250),
  master2: photo('images.unsplash.com/photo-1529626455594-4ff0802cfb7e', 1000, 1250),
  interior: photo('images.unsplash.com/photo-1521590832167-7bcbfaa6381f', 1600, 1100),
  lashes: photo('images.pexels.com/photos/3373716/pexels-photo-3373716.jpeg', 1200, 1500),
  lamination: photo('burst.shopifycdn.com/photos/blue-eyes-getting-makeup-close-up.jpg', 1200, 1500),
  brows: photo('burst.shopifycdn.com/photos/brushing-eyebrows.jpg', 1200, 1500),
  tint: photo('images.unsplash.com/photo-1544005313-94ddf0286df2', 1200, 1500),
  facial: photo('images.unsplash.com/photo-1570172619644-dfd03ed5d881', 1200, 1500),
  tools: photo('images.unsplash.com/photo-1596462502278-27bfdc403348', 1200, 1200),
  salonDark: photo('images.unsplash.com/photo-1600948836101-f9ffda59d250', 1200, 1500),
  care: photo('images.unsplash.com/photo-1552693673-1bf958298935', 1200, 1500),
  spa: photo('images.unsplash.com/photo-1571875257727-256c39da42af', 1200, 1500),
  portrait: photo('images.unsplash.com/photo-1494790108377-be9c29b29330', 1000, 1250),
  browsPortrait: photo('images.unsplash.com/photo-1531123897727-8f129e1688ce', 1200, 1500),
};

const brand = {
  name: 'LUMIÈRE',
  suffix: 'lash & brow atelier',
  tagline: 'Искусство взгляда',
  legalName: 'Студия ресниц и бровей LUMIÈRE',
  description:
    'Камерная студия ресниц и бровей в центре Москвы. Естественные линии, деликатный уход и внимание к деталям — без спешки и шаблонов.',
  heroTitle: 'Взгляд, который',
  heroAccent: 'говорит за вас',
  heroText:
    'Ресницы и брови, которые подчёркивают вашу природную красоту. Индивидуальный подбор, премиальные материалы и тишина на два часа только для вас.',
  heroImage: DEMO_PHOTOS.hero,
  logoImage: '',
  founded: '2019',
  city: 'Москва',
};

const seo = {
  title: 'LUMIÈRE — студия ресниц и бровей в Москве',
  description:
    'Премиальная студия ресниц и бровей LUMIÈRE: наращивание и ламинирование ресниц, оформление и окрашивание бровей, beauty-уход. Онлайн-запись.',
  keywords: 'наращивание ресниц, ламинирование ресниц, брови, студия красоты, Москва',
};

const theme = {
  preset: 'milk',
  colors: {
    bg: '#F6F1EA',
    surface: '#EFE6DA',
    card: '#FBF8F3',
    ink: '#23201C',
    muted: '#7C7369',
    line: '#DED3C5',
    accent: '#B98676',
    accentSoft: '#EBD8D0',
    accentDeep: '#8E5C4D',
    dark: '#201D1A',
    onDark: '#F4EEE5',
  },
  fonts: {
    heading: 'Cormorant Garamond',
    body: 'Manrope',
  },
};

const themePresets = {
  milk: {
    label: 'Молоко',
    colors: {
      bg: '#F6F1EA',
      surface: '#EFE6DA',
      card: '#FBF8F3',
      ink: '#23201C',
      muted: '#7C7369',
      line: '#DED3C5',
      accent: '#B98676',
      accentSoft: '#EBD8D0',
      accentDeep: '#8E5C4D',
      dark: '#201D1A',
      onDark: '#F4EEE5',
    },
  },
  rose: {
    label: 'Пудровая роза',
    colors: {
      bg: '#FAF3F1',
      surface: '#F2E3DF',
      card: '#FEFAF8',
      ink: '#2A2321',
      muted: '#85736D',
      line: '#E6D5CF',
      accent: '#B4706A',
      accentSoft: '#EED0CB',
      accentDeep: '#8B4C47',
      dark: '#241D1B',
      onDark: '#F8EFEA',
    },
  },
  olive: {
    label: 'Олива',
    colors: {
      bg: '#F3F1E8',
      surface: '#E6E3D4',
      card: '#FAF8F1',
      ink: '#25261F',
      muted: '#747568',
      line: '#D9D5C4',
      accent: '#8A9276',
      accentSoft: '#DDE2D0',
      accentDeep: '#636B50',
      dark: '#20211C',
      onDark: '#F2F0E6',
    },
  },
  espresso: {
    label: 'Эспрессо',
    colors: {
      bg: '#141210',
      surface: '#1E1A17',
      card: '#211D19',
      ink: '#F3EDE4',
      muted: '#A79C8F',
      line: '#352E27',
      accent: '#C99A78',
      accentSoft: '#3A2C24',
      accentDeep: '#E0B392',
      dark: '#0F0D0B',
      onDark: '#F5EFE6',
    },
  },
};

const headingFonts = ['Cormorant Garamond', 'Playfair Display', 'Prata', 'Lora'];
const bodyFonts = ['Manrope', 'Inter', 'Jost', 'Montserrat'];

const contacts = {
  phone: '+7 (495) 120-45-67',
  phoneHref: '+74951204567',
  email: 'hello@lumiere.studio',
  address: 'Москва, ул. Большая Никитская, 14/2',
  metro: 'м. Арбатская · 6 минут пешком',
  hours: 'Пн–Сб 10:00–20:00',
  hoursNote: 'Воскресенье — по предварительной записи',
  mapEmbed:
    'https://www.openstreetmap.org/export/embed.html?bbox=37.5960%2C55.7510%2C37.6140%2C55.7610&layer=mapnik&marker=55.7560%2C37.6050',
  mapLink: 'https://www.openstreetmap.org/?mlat=55.7560&mlon=37.6050#map=17/55.7560/37.6050',
  socials: {
    instagram: 'https://instagram.com/lumiere.studio',
    telegram: 'https://t.me/lumiere_studio',
    whatsapp: 'https://wa.me/74951204567',
    vk: 'https://vk.com/lumiere.studio',
  },
};

const about = {
  name: 'Алина Ветрова',
  role: 'Основатель студии · lash & brow эксперт',
  photo: DEMO_PHOTOS.master,
  secondaryPhoto: DEMO_PHOTOS.interior,
  experience: '8 лет',
  clients: '2 400+',
  quote: 'Красота не должна быть заметной — она должна быть вашей.',
  bio:
    'Я пришла в индустрию красоты из архитектуры, и этот взгляд остался: для меня важны пропорции, линия и воздух. В работе с ресницами и бровями нет мелочей — наклон кутикулы, направление роста, ширина лица. Поэтому каждая процедура начинается с разговора и заканчивается результатом, который хочется носить каждый день.',
  approach:
    'Я не делаю «одинаково красиво». Сначала мы обсуждаем ваш образ жизни, привычки и ожидания — затем я подбираю форму, длину и интенсивность. В студии всегда тихо, без спешки и посторонних разговоров: это время принадлежит только вам.',
  education: [
    'Школа лэшмейкеров Lash&Go, курс «Классика и объём», 2018',
    'Академия brow-дизайна ArchiStudio, «Архитектура бровей», 2020',
    'Международный сертификат Lash Master, уровень Advanced, 2022',
    'Курс «Ламинирование ресниц и бровей» от Beautiful Brows, 2024',
  ],
  advantages: [
    {
      title: 'Точная диагностика',
      text: 'Подбираю форму и длину под черты лица и привычный образ жизни — без сюрпризов после процедуры.',
    },
    {
      title: 'Бережные материалы',
      text: 'Гипоаллергенные клеи и уходы премиального класса. Делаю тест на переносимость перед первой процедурой.',
    },
    {
      title: 'Приватная атмосфера',
      text: 'Камерная студия на два рабочих места: меньше людей, больше тишины и внимания именно к вам.',
    },
  ],
};

const schedule = [
  { weekday: 1, label: 'Понедельник', open: true, start: '10:00', end: '20:00' },
  { weekday: 2, label: 'Вторник', open: true, start: '10:00', end: '20:00' },
  { weekday: 3, label: 'Среда', open: true, start: '10:00', end: '20:00' },
  { weekday: 4, label: 'Четверг', open: true, start: '10:00', end: '20:00' },
  { weekday: 5, label: 'Пятница', open: true, start: '10:00', end: '20:00' },
  { weekday: 6, label: 'Суббота', open: true, start: '10:00', end: '18:00' },
  { weekday: 0, label: 'Воскресенье', open: false, start: '10:00', end: '20:00' },
];

const booking = {
  slotStep: 30,
  leadHours: 2,
  cancelHours: 24,
  horizonDays: 45,
  daysStrip: 14,
  deposit: false,
};

const services = [
  {
    slug: 'narashchivanie-resnic',
    title: 'Наращивание ресниц',
    short: 'Классика, объём или гибрид — под вашу форму глаз',
    description:
      'Индивидуальный подбор схемы: от естественной классики до мягкого объёма 2D–3D. Работаю пинцетом по одной реснице, аккуратно изолируя каждую. Результат — распахнутый взгляд без эффекта «накладных» ресниц.',
    duration: 150,
    price: 3200,
    category: 'lash',
    image: DEMO_PHOTOS.lashes,
  },
  {
    slug: 'laminovanie-resnic',
    title: 'Ламинирование ресниц',
    short: 'Изгиб, питание и глубина цвета без наращивания',
    description:
      'Состав с кератином и пантенолом подкручивает натуральные ресницы, делает их визуально гуще и темнее. Подходит для отпуска, бассейна и тех, кто хочет просыпаться с открытым взглядом без макияжа.',
    duration: 60,
    price: 2200,
    category: 'lash',
    image: DEMO_PHOTOS.lamination,
  },
  {
    slug: 'oformlenie-brovej',
    title: 'Оформление бровей',
    short: 'Форма, линия и мягкая укладка',
    description:
      'Строю форму по золотым пропорциям лица, корректирую лишние волоски и укладываю брови так, чтобы они держали форму каждый день. Дополняю окрашиванием или ламинированием по желанию.',
    duration: 45,
    price: 1500,
    category: 'brow',
    image: DEMO_PHOTOS.brows,
  },
  {
    slug: 'korrekciya-brovej',
    title: 'Коррекция формы бровей',
    short: 'Аккуратная работа с вашей природной формой',
    description:
      'Без радикальных перемен: убираю лишнее, подчёркиваю то, что дано природой. Подходит для поддержания формы между окрашиваниями и для первого знакомства со студией.',
    duration: 30,
    price: 1000,
    category: 'brow',
    image: DEMO_PHOTOS.browsPortrait,
  },
  {
    slug: 'okrashivanie-brovej',
    title: 'Окрашивание бровей',
    short: 'Глубокий оттенок и видимая густота',
    description:
      'Подбираю тон под цвет кожи и волос: от тёплого коричневого до холодного графита. Краска мягкой формулы не сушит кожу, а цвет сохраняется до полутора месяцев.',
    duration: 40,
    price: 1200,
    category: 'brow',
    image: DEMO_PHOTOS.tint,
  },
  {
    slug: 'beauty-uhod',
    title: 'Beauty-уход для лица',
    short: 'Ритуал спокойствия для кожи и нервов',
    description:
      'Очищение, мягкий пилинг, массаж и питательная маска — 60 минут, после которых кожа выглядит отдохнувшей. Дополнение к основной процедуре или самостоятельный повод остановиться.',
    duration: 60,
    price: 2800,
    category: 'care',
    image: DEMO_PHOTOS.facial,
  },
];

const masters = [
  {
    name: 'Алина Ветрова',
    role: 'Основатель · lash & brow эксперт',
    photo: DEMO_PHOTOS.master,
    experience: '8 лет',
    bio: 'Специализируется на сложных схемах наращивания и архитектуре бровей. Работает с чувствительными глазами.',
    services: services.map((s) => s.slug),
    active: true,
  },
  {
    name: 'Ева Морозова',
    role: 'Brow artist · lash maker',
    photo: DEMO_PHOTOS.master2,
    experience: '5 лет',
    bio: 'Мягкие линии, естественные оттенки и деликатный уход. Помогает подобрать форму с нуля.',
    services: ['oformlenie-brovej', 'korrekciya-brovej', 'okrashivanie-brovej', 'laminovanie-resnic', 'beauty-uhod'],
    active: true,
  },
];

const gallery = [
  { title: 'Естественный объём', category: 'lash', image: DEMO_PHOTOS.lashes },
  { title: 'Ламинирование · изгиб', category: 'lash', image: DEMO_PHOTOS.lamination },
  { title: 'Оформление бровей', category: 'brow', image: DEMO_PHOTOS.brows },
  { title: 'Архитектура формы', category: 'brow', image: DEMO_PHOTOS.browsPortrait },
  { title: 'Тёплый взгляд', category: 'brow', image: DEMO_PHOTOS.tint },
  { title: 'Свет студии', category: 'studio', image: DEMO_PHOTOS.interior },
  { title: 'Приватный зал', category: 'studio', image: DEMO_PHOTOS.salonDark },
  { title: 'Тишина и забота', category: 'care', image: DEMO_PHOTOS.care },
  { title: 'Детали ритуала', category: 'studio', image: DEMO_PHOTOS.tools },
  { title: 'Спа-настроение', category: 'care', image: DEMO_PHOTOS.spa },
];

const reviews = [
  {
    name: 'Мария К.',
    rating: 5,
    date: '2026-10-12',
    text: 'Впервые вышла из студии без ощущения «слишком». Ресницы выглядят настолько естественно, что знакомые думают, что это мои. Алина подобрала длину под разрез глаз — в зеркало хочется смотреть.',
    demo: 1,
  },
  {
    name: 'Анна С.',
    rating: 5,
    date: '2026-09-28',
    text: 'Была на ламинировании и оформлении бровей. Очень бережно, подробно объяснили уход. Через месяц всё ещё отлично держится. Отдельное спасибо за тишину и уют.',
    demo: 1,
  },
  {
    name: 'Дарья Л.',
    rating: 4,
    date: '2026-09-05',
    text: 'Красивая студия, внимательный мастер. Брови получились именно такими, как просила — без резких экспериментов. Хотелось бы больше свободных слотов вечером, но это скорее к популярности.',
    demo: 1,
  },
  {
    name: 'Екатерина В.',
    rating: 5,
    date: '2026-08-19',
    text: 'Хожу на коррекцию уже полгода. Форма держится идеально, мастер всегда помнит мои пожелания. Очень ценю, что не навязывают лишние процедуры.',
    demo: 1,
  },
  {
    name: 'Ольга М.',
    rating: 5,
    date: '2026-07-30',
    text: 'Подарила себе уход перед отпуском — это было лучшее решение. Кожа сияла все две недели, и даже макияж почти не понадобился.',
    demo: 1,
  },
];

module.exports = {
  brand,
  seo,
  theme,
  themePresets,
  headingFonts,
  bodyFonts,
  contacts,
  about,
  schedule,
  booking,
  services,
  masters,
  gallery,
  reviews,
  DEMO_PHOTOS,
};
