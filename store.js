/* =========================================================
   store.js — общие данные и хранилище товаров BlackMarket
   Магазин аккаунтов игры Black Russia (BlackHub Games)
   Используется и на сайте (app.js), и в админке (admin.js)
   Хранилище: localStorage ключ STORAGE_KEY
   ========================================================= */

const STORAGE_KEY = 'blackrussia_products_v1';

/* Сервера игры (по данным FunPay) */
const SERVERS = [
  '№01 Red', '№02 Green', '№03 Blue', '№04 Yellow', '№05 Orange', '№06 Purple',
  '№07 Lime', '№08 Pink', '№09 Cherry', '№10 Black', '№11 Indigo', '№12 White',
  '№13 Magenta', '№14 Crimson', '№15 Gold', '№16 Azure', '№17 Platinum', '№18 Aqua',
  '№19 Gray', '№20 Ice', '№21 Chilli', '№22 Choco',
  '№23 Moscow', '№24 SPB', '№25 UFA', '№26 Sochi', '№27 Kazan', '№28 Samara',
  '№29 Rostov', '№30 Anapa', '№31 EKB', '№32 Krasnodar', '№33 Arzamas', '№34 Novosibirsk',
  '№35 Grozny', '№36 Saratov', '№37 Omsk', '№38 Irkutsk', '№39 Volgograd', '№40 Voronezh',
  '№41 Belgorod', '№42 Makhachkala', '№43 Vladikavkaz', '№44 Vladivostok', '№45 Kaliningrad', '№46 Chelyabinsk',
  '№47 Krasnoyarsk', '№48 Cheboksary', '№49 Khabarovsk', '№50 Perm', '№51 Tula', '№52 Ryazan',
  '№53 Murmansk', '№54 Penza', '№55 Kursk', '№56 Arkhangelsk', '№57 Orenburg', '№58 Kirov',
  '№59 Kemerovo', '№60 Tyumen', '№61 Tolyatti', '№62 Ivanovo', '№63 Stavropol', '№64 Smolensk',
  '№65 Pskov', '№66 Bryansk', '№67 Orel', '№68 Yaroslavl', '№69 Barnaul', '№70 Lipetsk',
  '№71 Ulyanovsk', '№72 Yakutsk', '№73 Tambov', '№74 Bratsk', '№75 Astrakhan', '№76 Chita',
  '№77 Kostroma', '№78 Vladimir', '№79 Kaluga', '№80 N.Novgorod', '№81 Taganrog', '№82 Vologda',
  '№83 Tver', '№84 Tomsk', '№85 Izhevsk', '№86 Surgut', '№87 Podolsk', '№88 Magadan',
  '№89 Cherepovets', '№90 Norilsk', '№91 Astana', '№92 Tashkent', '№× Rio',
];

/* Категории аккаунтов */
const CATEGORY_LABELS = {
  start: 'Стартовый',
  mid:   'Развитый',
  top:   'Топовый',
  vip:   'VIP',
};

/* Миграция со старых данных (Black Rush / старый ключ) */
const LEGACY_CATEGORY = {
  common: 'start',
  rare: 'mid',
  epic: 'top',
  legendary: 'vip',
};

/* Товары по умолчанию (используются, если хранилище пустое) */
const DEFAULT_PRODUCTS = [
  { id: 1,  name: 'Старт с балансом 4 млн',    icon: '💰', category: 'start', server: '№90 Norilsk',      level: 3,  balance: 4000000,    property: 100000,    price: 99,     oldPrice: 399,    features: ['Без привязок', 'Автовыдача'],                popular: 9 },
  { id: 2,  name: 'Стартовый кейс + 100 BC',   icon: '🎁', category: 'start', server: '№23 Moscow',      level: 4,  balance: 250000,     property: 150000,    price: 199,    oldPrice: 499,    features: ['Стандартный кейс', '100 BC'],                 popular: 8 },
  { id: 3,  name: 'Новичок с ВАЗ 2115',        icon: '🚙', category: 'start', server: '№01 Red',         level: 4,  balance: 150000,     property: 90000,     price: 249,    oldPrice: 549,    features: ['Авто ВАЗ 2115', 'Без привязок'],              popular: 7 },
  { id: 4,  name: 'Особый кейс, 5 млн',        icon: '🎁', category: 'mid',   server: '№84 Tomsk',       level: 8,  balance: 5000000,    property: 600000,    price: 690,    oldPrice: 990,    features: ['Особый кейс', 'Автовыдача'],                  popular: 8 },
  { id: 5,  name: 'Приора + VIP Gold',         icon: '🚘', category: 'mid',   server: '№51 Tula',        level: 10, balance: 15000000,   property: 2500000,   price: 1290,   oldPrice: 1790,   features: ['Приора', 'VIP Gold на 8 ч'],                  popular: 9 },
  { id: 6,  name: '190 BC и билеты крана',     icon: '⭐', category: 'mid',   server: '№89 Cherepovets', level: 12, balance: 1000000,    property: 400000,    price: 1690,   oldPrice: 2290,   features: ['190 BC', '15 билетов крана'],                 popular: 7 },
  { id: 7,  name: 'BMW за 6 млн',              icon: '🏎', category: 'top',   server: '№02 Green',       level: 16, balance: 7000000,    property: 7000000,   price: 3490,   oldPrice: 4490,   features: ['BMW', 'Квартира высокого класса'],             popular: 10 },
  { id: 8,  name: 'Военный билет, 18 ур.',     icon: '🎖', category: 'top',   server: '№03 Blue',        level: 18, balance: 1000000,    property: 400000,    price: 2990,   oldPrice: 3990,   features: ['Военный билет', 'Автовыдача'],                 popular: 8 },
  { id: 9,  name: '670 пыли, 83 BC',           icon: '🛠', category: 'top',   server: '№40 Voronezh',    level: 20, balance: 25000000,   property: 14000000,  price: 4990,   oldPrice: 6490,   features: ['670 пыли', '83 BC', 'Без привязок'],           popular: 9 },
  { id: 10, name: 'VIP Platinum + 3 авто',     icon: '👑', category: 'vip',   server: '№12 White',       level: 17, balance: 1000000,    property: 10000000,  price: 7990,   oldPrice: 9990,   features: ['VIP Platinum', '3 автомобиля'],                popular: 8 },
  { id: 11, name: 'Хайроллер: 102 млн',        icon: '💎', category: 'vip',   server: '№32 Krasnodar',   level: 4,  balance: 102400000,  property: 103000000, price: 12990,  oldPrice: 15990,  features: ['102 млн на балансе', 'Без привязок'],          popular: 9 },
  { id: 12, name: 'Мега-баланс: 262 млн',      icon: '🏆', category: 'vip',   server: '№19 Gray',        level: 3,  balance: 262000000,  property: 265000000, price: 19990,  oldPrice: 24990,  features: ['262 млн на балансе', 'Рег. данные'],           popular: 7 },
];

/* Приведение товара к нужному виду (защита от кривого импорта) */
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const category = CATEGORY_LABELS[raw.category]
    ? raw.category
    : (LEGACY_CATEGORY[raw.category] || 'start');
  return {
    id:       Math.max(0, Math.trunc(num(raw.id, 0))),
    name:     String(raw.name ?? '').trim() || 'Без названия',
    icon:     String(raw.icon ?? '').trim() || '🚗',
    category,
    server:   String(raw.server ?? '').trim() || '№23 Moscow',
    level:    Math.max(1, Math.trunc(num(raw.level, 1))),
    balance:  Math.max(0, Math.trunc(num(raw.balance, 0))),
    property: Math.max(0, Math.trunc(num(raw.property, 0))),
    price:    Math.max(0, Math.trunc(num(raw.price, 0))),
    oldPrice: Math.max(0, Math.trunc(num(raw.oldPrice, 0))),
    features: Array.isArray(raw.features)
      ? raw.features.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 8)
      : [],
    popular:  Math.max(0, Math.trunc(num(raw.popular, 5))),
    hidden:   Boolean(raw.hidden),
  };
}

/* Нормализация списка + проставление недостающих id */
function finalizeProducts(list) {
  const cleaned = list.map(normalizeProduct).filter(Boolean);
  let maxId = cleaned.reduce((m, p) => Math.max(m, p.id), 0);
  cleaned.forEach((p) => { if (!p.id) p.id = ++maxId; });
  return cleaned;
}

/* Копия товаров по умолчанию */
function defaultProducts() {
  return finalizeProducts(DEFAULT_PRODUCTS.map((p) => ({ ...p, features: [...p.features] })));
}

/* Чтение товаров из localStorage (fallback, если сервер недоступен) */
function loadProductsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return finalizeProducts(parsed);
    }
  } catch (e) {
    console.warn('Хранилище недоступно, используются товары по умолчанию:', e);
  }
  return defaultProducts();
}

/* Запись товаров в localStorage; true — успех */
function saveProductsLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn('Не удалось сохранить товары:', e);
    return false;
  }
}

/* Свободный id для нового товара */
function nextProductId(list) {
  return list.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
}

/* Доступен ли localStorage */
function isStorageAvailable() {
  try {
    const k = '__blackrush_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}

/* =========================================================
   API сервера — основной источник товаров
   GET /api/products  → читаем список
   PUT /api/products  → сохраняем (нужен токен админа)
   ========================================================= */

async function loadProducts() {
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Некорректный ответ сервера');
    return finalizeProducts(data);
  } catch (e) {
    console.warn('Сервер недоступен, используем локальные данные:', e);
    return loadProductsLocal();
  }
}

async function pushProductsToServer(list, token) {
  let res;
  try {
    res = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(list),
    });
  } catch (e) {
    const err = new Error('Сервер недоступен');
    err.status = 0;
    throw err;
  }
  if (!res.ok) {
    let msg = 'Ошибка ' + res.status;
    try {
      const body = await res.json();
      if (body && body.error) msg = body.error;
    } catch (e) { /* тело не JSON — оставляем сообщение */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return true;
}

/* Форматирование больших сумм: 250000 → «250 тыс.», 102400000 → «102,4 млн» */
function formatAmount(n) {
  const val = Number(n) || 0;
  const trim = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  if (val >= 1e9) return trim(val / 1e9) + ' млрд';
  if (val >= 1e6) return trim(val / 1e6) + ' млн';
  if (val >= 1e3) return trim(val / 1e3) + ' тыс.';
  return String(Math.round(val));
}

/* Экспорт для сервера Node.js (в браузере не используется) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEY,
    SERVERS,
    CATEGORY_LABELS,
    DEFAULT_PRODUCTS,
    normalizeProduct,
    finalizeProducts,
    defaultProducts,
    loadProductsLocal,
    saveProductsLocal,
    formatAmount,
  };
}
