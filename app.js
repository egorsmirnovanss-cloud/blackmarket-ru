/* ===== Состояние каталога ===== */
/* Товары загружаются с сервера (API); если сервер недоступен —
   используется локальное хранилище браузера */
let accounts = [];

let currentCategory = 'all';
let currentServer = 'all';
let currentSort = 'popular';
let searchQuery = '';
let cart = [];

/* ===== Элементы ===== */
const catalogGrid = document.getElementById('catalogGrid');
const catalogEmpty = document.getElementById('catalogEmpty');
const searchInput = document.getElementById('searchInput');
const serverSelect = document.getElementById('serverSelect');
const sortSelect = document.getElementById('sortSelect');
const categoryFilters = document.getElementById('categoryFilters');

const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartEl = document.getElementById('cart');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalClose = document.getElementById('modalClose');

const formatPrice = (n) => Number(n).toLocaleString('ru-RU') + ' ₽';

/* ===== Фильтрация ===== */
function matchServer(acc, selected) {
  if (selected === 'all') return true;
  if (selected === 'color') {
    const m = acc.server.match(/№\s*(\d+)/);
    if (!m) return false;
    const n = Number(m[1]);
    return n >= 1 && n <= 22;
  }
  return acc.server === selected;
}

function getFilteredAccounts() {
  const q = searchQuery.toLowerCase();
  let list = accounts.filter((acc) => {
    if (acc.hidden) return false; // скрытые в админке товары не показываем
    const matchCategory = currentCategory === 'all' || acc.category === currentCategory;
    const matchServerOk = matchServer(acc, currentServer);
    const matchSearch = !q
      || acc.name.toLowerCase().includes(q)
      || acc.server.toLowerCase().includes(q);
    return matchCategory && matchServerOk && matchSearch;
  });

  switch (currentSort) {
    case 'price-asc':    list.sort((a, b) => a.price - b.price); break;
    case 'price-desc':   list.sort((a, b) => b.price - a.price); break;
    case 'level-desc':   list.sort((a, b) => b.level - a.level); break;
    case 'balance-desc': list.sort((a, b) => b.balance - a.balance); break;
    default:             list.sort((a, b) => b.popular - a.popular);
  }
  return list;
}

/* ===== Рендер каталога ===== */
function renderCatalog() {
  const list = getFilteredAccounts();
  catalogGrid.innerHTML = '';
  catalogEmpty.hidden = list.length > 0;

  list.forEach((acc) => {
    const inCart = cart.some((c) => c.id === acc.id);
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__media m-${acc.category}">
        <span class="card__cat c-${acc.category}">${CATEGORY_LABELS[acc.category]}</span>
        <span>${acc.icon}</span>
      </div>
      <div class="card__body">
        <div class="card__server">🏙 ${acc.server}</div>
        <h3 class="card__title">${acc.name}</h3>
        <div class="card__stats">
          <div class="card__stat"><b>${acc.level}</b><span>Уровень</span></div>
          <div class="card__stat"><b>${formatAmount(acc.balance)}</b><span>Баланс</span></div>
          <div class="card__stat"><b>${formatAmount(acc.property)}</b><span>Имущество</span></div>
        </div>
        <div class="card__features">
          ${acc.features.map((f) => `<span class="tag">${f}</span>`).join('')}
        </div>
        <div class="card__foot">
          <div class="card__price">
            <b>${formatPrice(acc.price)}</b>
            <s>${formatPrice(acc.oldPrice)}</s>
          </div>
          <button class="card__buy ${inCart ? 'card__buy--added' : ''}" data-id="${acc.id}">
            ${inCart ? '✓ В корзине' : 'В корзину'}
          </button>
        </div>
      </div>
    `;
    catalogGrid.appendChild(card);
  });
}

/* ===== Корзина ===== */
function renderCart() {
  cartCount.textContent = cart.length;
  checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart__empty">Корзина пуста 🛒<br>Добавьте аккаунт из каталога</p>';
    cartTotal.textContent = formatPrice(0);
    return;
  }

  cartItems.innerHTML = cart.map((acc) => `
    <div class="cart-item">
      <span class="cart-item__icon">${acc.icon}</span>
      <div class="cart-item__info">
        <div class="cart-item__name">${acc.name}</div>
        <div class="cart-item__price">${formatPrice(acc.price)}</div>
      </div>
      <button class="cart-item__del" data-id="${acc.id}" aria-label="Удалить">✕</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, acc) => sum + acc.price, 0);
  cartTotal.textContent = formatPrice(total);
}

function addToCart(id) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc || cart.some((c) => c.id === id)) return;
  cart.push(acc);
  renderCart();
  renderCatalog();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  renderCart();
  renderCatalog();
}

function openCart() {
  cartEl.classList.add('open');
  cartOverlay.hidden = false;
  requestAnimationFrame(() => cartOverlay.classList.add('visible'));
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartEl.classList.remove('open');
  cartOverlay.classList.remove('visible');
  document.body.style.overflow = '';
  setTimeout(() => { cartOverlay.hidden = true; }, 250);
}

/* ===== Модалка ===== */
function showModal(icon, title, text) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalOverlay.hidden = false;
}
function hideModal() {
  modalOverlay.hidden = true;
}

/* ===== События ===== */
catalogGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.card__buy');
  if (!btn) return;
  addToCart(Number(btn.dataset.id));
});

categoryFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  categoryFilters.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--active'));
  chip.classList.add('chip--active');
  currentCategory = chip.dataset.category;
  renderCatalog();
});

serverSelect.addEventListener('change', () => {
  currentServer = serverSelect.value;
  renderCatalog();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderCatalog();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderCatalog();
});

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

cartItems.addEventListener('click', (e) => {
  const del = e.target.closest('.cart-item__del');
  if (del) removeFromCart(Number(del.dataset.id));
});

checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  const total = cart.reduce((sum, acc) => sum + acc.price, 0);
  const count = cart.length;
  cart = [];
  renderCart();
  renderCatalog();
  closeCart();
  showModal(
    '🎉',
    'Заказ принят!',
    `Ваш заказ на ${count} акк. на сумму ${formatPrice(total)} оформлен. Менеджер свяжется с вами в течение 5 минут.`
  );
});

modalClose.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideModal();
    closeCart();
  }
});

/* ===== Бургер-меню ===== */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => nav.classList.toggle('open'));
nav.addEventListener('click', (e) => {
  if (e.target.classList.contains('nav__link')) nav.classList.remove('open');
});

/* ===== Загрузка товаров с сервера ===== */
async function refreshProducts() {
  const fresh = await loadProducts();
  const changed = JSON.stringify(fresh) !== JSON.stringify(accounts);
  accounts = fresh;
  if (!changed) return;
  cart = cart.map((c) => accounts.find((a) => a.id === c.id)).filter(Boolean);
  renderCatalog();
  renderCart();
}

/* Обновляем при возврате во вкладку — правки админки видны сразу */
window.addEventListener('focus', refreshProducts);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshProducts();
});

/* ===== Инициализация ===== */
refreshProducts();
