/* =========================================================
   admin.js — админ-панель BlackMarket (версия с сервером)
   Товары:  GET/PUT /api/products → data/products.json
   Вход:    POST /api/auth/login | /api/auth/setup
   Смена:   POST /api/auth/password
   Токен живёт в sessionStorage до закрытия вкладки.
   ========================================================= */
(function () {
  'use strict';

  const TOKEN_KEY = 'blackrussia_token';

  const $ = (id) => document.getElementById(id);

  const authScreen     = $('authScreen');
  const authTitle      = $('authTitle');
  const authHint       = $('authHint');
  const authForm       = $('authForm');
  const passInput      = $('passInput');
  const passInput2     = $('passInput2');
  const authSubmit     = $('authSubmit');
  const authError      = $('authError');

  const adminPanel     = $('adminPanel');
  const storageNotice  = $('storageNotice');
  const logoutBtn      = $('logoutBtn');
  const stats          = $('stats');
  const addBtn         = $('addBtn');
  const exportBtn      = $('exportBtn');
  const importInput    = $('importInput');
  const resetBtn       = $('resetBtn');
  const changePassBtn  = $('changePassBtn');
  const passBox        = $('passBox');
  const oldPass        = $('oldPass');
  const newPass        = $('newPass');
  const newPass2       = $('newPass2');
  const passSave       = $('passSave');
  const passCancel     = $('passCancel');
  const passError      = $('passError');
  const productsList   = $('productsList');
  const emptyMsg       = $('emptyMsg');
  const toastEl        = $('toast');

  let accounts  = [];
  let serverUp  = true;
  let token     = sessionStorage.getItem(TOKEN_KEY) || null;
  let authMode  = 'login';
  let saveTimer = null;

  /* ---------- утилиты ---------- */
  const fmt = (n) => Number(n).toLocaleString('ru-RU') + ' ₽';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  /* ---------- тост ---------- */
  let toastTimer;
  function toast(msg, danger) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('toast--danger', Boolean(danger));
    if (toastEl.hidden) {
      toastEl.hidden = false;
      requestAnimationFrame(() => toastEl.classList.add('show'));
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => { toastEl.hidden = true; }, 250);
    }, 1700);
  }

  /* ---------- API ---------- */
  async function api(path, options) {
    let res;
    try {
      res = await fetch(path, options);
    } catch (e) {
      const err = new Error('Сервер недоступен');
      err.status = 0;
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* пусто */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || ('Ошибка ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  });

  async function checkToken() {
    try {
      await api('/api/auth/me', { headers: authHeaders() });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- авторизация ---------- */
  function showAuth(mode) {
    authMode = mode;
    authScreen.hidden = false;
    adminPanel.hidden = true;
    authError.hidden = true;
    passInput.value = '';
    passInput2.value = '';
    if (mode === 'setup') {
      authTitle.textContent = 'Создание пароля';
      authHint.textContent = 'Первый запуск: придумайте пароль для входа в админку.';
      passInput2.hidden = false;
      authSubmit.textContent = 'Создать пароль и войти';
      passInput.setAttribute('autocomplete', 'new-password');
    } else {
      authTitle.textContent = 'Вход в админку';
      authHint.textContent = 'Введите пароль, чтобы управлять товарами.';
      passInput2.hidden = true;
      authSubmit.textContent = 'Войти';
      passInput.setAttribute('autocomplete', 'current-password');
    }
    passInput.focus();
  }

  function showAuthError(msg) {
    authError.textContent = msg;
    authError.hidden = false;
  }

  async function showPanel() {
    authScreen.hidden = true;
    adminPanel.hidden = false;
    storageNotice.hidden = serverUp;
    passBox.classList.remove('open');
    accounts = await loadProducts();
    renderAll();
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.hidden = true;
    const p1 = passInput.value;
    if (authMode === 'setup') {
      if (p1.length < 4) return showAuthError('Пароль должен содержать минимум 4 символа.');
      if (p1 !== passInput2.value) return showAuthError('Пароли не совпадают.');
    } else if (!p1) {
      return showAuthError('Введите пароль.');
    }
    try {
      const path = authMode === 'setup' ? '/api/auth/setup' : '/api/auth/login';
      const data = await api(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: p1 }),
      });
      token = data.token;
      sessionStorage.setItem(TOKEN_KEY, token);
      await showPanel();
    } catch (err) {
      showAuthError(err.message);
    }
  });

  logoutBtn.addEventListener('click', () => {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    showAuth('login');
  });

  /* ---------- статистика ---------- */
  function renderStats() {
    const prices = accounts.map((p) => p.price);
    const visible = accounts.filter((p) => !p.hidden).length;
    const cards = [
      { v: accounts.length, l: 'Товаров' },
      { v: visible, l: 'В каталоге' },
      { v: prices.length ? fmt(Math.min(...prices)) : '—', l: 'Цена от' },
      { v: prices.length ? fmt(Math.max(...prices)) : '—', l: 'Цена до' },
      { v: fmt(prices.reduce((s, n) => s + n, 0)), l: 'Сумма каталога' },
    ];
    stats.innerHTML = cards
      .map((c) => `<div class="stat"><b>${c.v}</b><span>${c.l}</span></div>`)
      .join('');
  }

  /* ---------- список товаров ---------- */
  function serverOptions(p) {
    const list = SERVERS.includes(p.server) ? SERVERS : [p.server, ...SERVERS];
    return list.map((s) =>
      `<option value="${esc(s)}"${p.server === s ? ' selected' : ''}>${esc(s)}</option>`).join('');
  }

  function renderProducts() {
    productsList.innerHTML = accounts.map((p) => `
      <article class="prod${p.hidden ? ' is-hidden' : ''}" data-id="${p.id}">
        <div class="prod__row">
          <input class="field prod__icon" maxlength="6" value="${esc(p.icon)}" title="Иконка (эмодзи)" aria-label="Иконка">
          <input class="field prod__name" value="${esc(p.name)}" placeholder="Название товара" aria-label="Название">
          <select class="field prod__cat" aria-label="Категория">
            ${Object.keys(CATEGORY_LABELS).map((k) =>
              `<option value="${k}"${p.category === k ? ' selected' : ''}>${CATEGORY_LABELS[k]}</option>`).join('')}
          </select>
          <select class="field prod__server" aria-label="Сервер">${serverOptions(p)}</select>
          <label class="switch"><input type="checkbox" class="prod__visible"${p.hidden ? '' : 'checked'}> В каталоге</label>
          <button class="icon-btn prod__del" title="Удалить товар" aria-label="Удалить">🗑</button>
        </div>
        <div class="prod__row prod__numbers">
          <label>Уровень<input class="field prod__level" type="number" min="1" value="${p.level}"></label>
          <label>Баланс, ₽<input class="field prod__balance" type="number" min="0" step="1000" value="${p.balance}"></label>
          <label>Имущество, ₽<input class="field prod__property" type="number" min="0" step="1000" value="${p.property}"></label>
          <label>Цена, ₽<input class="field prod__price" type="number" min="0" step="10" value="${p.price}"></label>
          <label>Старая цена, ₽<input class="field prod__old" type="number" min="0" step="10" value="${p.oldPrice}"></label>
          <label>Популярность<input class="field prod__pop" type="number" min="0" value="${p.popular}"></label>
        </div>
        <div class="prod__row">
          <label class="prod__features-wrap">Признаки (через запятую)
            <input class="field prod__features" value="${esc(p.features.join(', '))}" placeholder="Без привязок, Автовыдача">
          </label>
        </div>
      </article>`).join('');
  }

  function updateEmpty() {
    emptyMsg.hidden = accounts.length > 0;
  }

  function renderAll() {
    renderStats();
    renderProducts();
    updateEmpty();
  }

  /* ---------- сохранение на сервере ---------- */
  async function persist() {
    renderStats();
    try {
      await pushProductsToServer(accounts, token);
      serverUp = true;
      storageNotice.hidden = true;
      return true;
    } catch (err) {
      if (err.status === 401) {
        token = null;
        sessionStorage.removeItem(TOKEN_KEY);
        showAuth('login');
        toast('⚠ Сессия истекла — войдите снова', true);
      } else if (err.status === 0) {
        serverUp = false;
        storageNotice.hidden = false;
        toast('⚠ Сервер недоступен', true);
      } else {
        toast('⚠ ' + err.message, true);
      }
      return false;
    }
  }

  /* Автосохранение с задержкой — пока пользователь печатает */
  function save() {
    renderStats();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (await persist()) toast('✓ Сохранено');
    }, 400);
  }

  /* ---------- чтение формы товара ---------- */
  function readCard(card) {
    const id = Number(card.dataset.id);
    const p = accounts.find((x) => x.id === id);
    if (!p) return null;
    const q = (sel) => card.querySelector(sel);
    const num = (sel, min, fallback) => {
      const n = Number(q(sel).value);
      return Number.isFinite(n) && n >= min ? n : fallback;
    };
    const catVal = q('.prod__cat').value;

    p.icon     = q('.prod__icon').value.trim() || '🚗';
    p.name     = q('.prod__name').value.trim() || 'Без названия';
    p.category = CATEGORY_LABELS[catVal] ? catVal : 'start';
    p.server   = q('.prod__server').value;
    p.level    = num('.prod__level', 1, 1);
    p.balance  = num('.prod__balance', 0, 0);
    p.property = num('.prod__property', 0, 0);
    p.price    = num('.prod__price', 0, 0);
    p.oldPrice = num('.prod__old', 0, 0);
    p.popular  = num('.prod__pop', 0, 5);
    p.hidden   = !q('.prod__visible').checked;
    p.features = q('.prod__features').value.split(',').map((s) => s.trim()).filter(Boolean);

    card.classList.toggle('is-hidden', p.hidden);
    return p;
  }

  function onFieldEdit(e) {
    const card = e.target.closest('.prod');
    if (!card) return;
    if (readCard(card)) save();
  }

  productsList.addEventListener('input', onFieldEdit);
  productsList.addEventListener('change', onFieldEdit);

  productsList.addEventListener('click', async (e) => {
    const del = e.target.closest('.prod__del');
    if (!del) return;
    const card = del.closest('.prod');
    const id = Number(card.dataset.id);
    const p = accounts.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Удалить товар «${p.name}»?`)) return;
    accounts = accounts.filter((x) => x.id !== id);
    renderAll();
    if (await persist()) toast('🗑 Товар удалён');
  });

  /* ---------- добавление ---------- */
  addBtn.addEventListener('click', async () => {
    const p = normalizeProduct({
      id: nextProductId(accounts),
      name: 'Новый аккаунт',
      icon: '🚗',
      category: 'start',
      server: '№23 Moscow',
      level: 3,
      balance: 250000,
      property: 100000,
      price: 199,
      oldPrice: 499,
      features: ['Без привязок', 'Автовыдача'],
      popular: 5,
      hidden: false,
    });
    accounts.push(p);
    renderAll();

    const card = productsList.querySelector(`[data-id="${p.id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const nameInput = card.querySelector('.prod__name');
      nameInput.focus();
      nameInput.select();
    }
    if (await persist()) toast('＋ Товар добавлен — измените название и цену');
  });

  /* ---------- экспорт / импорт / сброс ---------- */
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blackmarket-products.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`⬇ Экспортировано: ${accounts.length} шт.`);
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('Ожидался список товаров');
        const cleaned = finalizeProducts(parsed);
        if (!cleaned.length) throw new Error('В файле нет товаров');
        accounts = cleaned;
        renderAll();
        if (await persist()) toast(`⬆ Импортировано: ${cleaned.length} шт.`);
      } catch (err) {
        toast('⚠ ' + err.message, true);
      }
      importInput.value = '';
    };
    reader.onerror = () => toast('⚠ Не удалось прочитать файл', true);
    reader.readAsText(file, 'utf-8');
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Сбросить каталог к товарам по умолчанию? Внесённые изменения будут потеряны.')) return;
    accounts = defaultProducts();
    renderAll();
    if (await persist()) toast('↺ Каталог сброшен');
  });

  /* ---------- смена пароля ---------- */
  function showPassError(msg) {
    passError.textContent = msg;
    passError.hidden = false;
  }

  changePassBtn.addEventListener('click', () => {
    const open = passBox.classList.toggle('open');
    passError.hidden = true;
    if (open) oldPass.focus();
  });

  passCancel.addEventListener('click', () => {
    passBox.classList.remove('open');
    passError.hidden = true;
    oldPass.value = newPass.value = newPass2.value = '';
  });

  passSave.addEventListener('click', async () => {
    passError.hidden = true;
    if (newPass.value.length < 4) return showPassError('Новый пароль — минимум 4 символа.');
    if (newPass.value !== newPass2.value) return showPassError('Новые пароли не совпадают.');
    try {
      await api('/api/auth/password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ oldPassword: oldPass.value, newPassword: newPass.value }),
      });
      oldPass.value = newPass.value = newPass2.value = '';
      passBox.classList.remove('open');
      toast('🔑 Пароль изменён');
    } catch (err) {
      showPassError(err.message);
    }
  });

  /* ---------- запуск ---------- */
  async function init() {
    let status;
    try {
      status = await api('/api/auth/status');
      serverUp = true;
    } catch (e) {
      // Сервер недоступен — показываем панель с предупреждением (только просмотр)
      serverUp = false;
      await showPanel();
      return;
    }

    if (token && (await checkToken())) {
      await showPanel();
      return;
    }
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    showAuth(status.hasPassword ? 'login' : 'setup');
  }

  init();
})();
