/* =========================================================
   server.js — сервер BlackMarket (статика + API + админка)
   Запуск:  npm install && npm start
   Данные:  ./data/products.json  (товары)
            ./data/auth.json      (хеш пароля админа)
   API:
     GET    /api/products          — список товаров (публично)
     PUT    /api/products          — сохранить список (нужен токен)
     GET    /api/auth/status       — есть ли пароль админа
     POST   /api/auth/setup        — первый установить пароль
     POST   /api/auth/login        — войти, получить токен
     GET    /api/auth/me           — проверить токен
     POST   /api/auth/password     — сменить пароль (нужен токен)
   ========================================================= */
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { defaultProducts, finalizeProducts } = require('./store.js');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

const SESSION_TTL = 24 * 60 * 60 * 1000; // токен живёт 24 часа
const sessions = new Map();              // token -> срок действия

/* ===================== хранилище ===================== */
function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(defaultProducts(), null, 2));
    console.log('Создан data/products.json с товарами по умолчанию');
  }
}

function readProducts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    if (Array.isArray(parsed)) return finalizeProducts(parsed);
  } catch (e) {
    console.warn('Не удалось прочитать товары:', e.message);
  }
  return defaultProducts();
}

function writeProducts(list) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(finalizeProducts(list), null, 2));
}

function readAuth() {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch (e) {
    return {};
  }
}

function writeAuth(data) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

/* ===================== пароли и сессии ===================== */
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function verifyPassword(password) {
  const auth = readAuth();
  if (!auth.salt || !auth.hash || typeof password !== 'string') return false;
  const a = Buffer.from(hashPassword(password, auth.salt), 'hex');
  const b = Buffer.from(auth.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!isValidToken(token)) return res.status(401).json({ error: 'Не авторизован' });
  next();
}

/* ===================== middleware ===================== */
app.use(express.json({ limit: '1mb' }));

// Служебные файлы наружу не отдаём
app.use((req, res, next) => {
  const blocked = ['/data', '/server.js', '/package.json', '/package-lock.json', '/node_modules', '/.git'];
  const p = req.path;
  if (blocked.some((b) => p === b || p.startsWith(b + '/'))) {
    return res.status(404).end();
  }
  next();
});

/* ===================== API ===================== */
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/products', (req, res) => res.json(readProducts()));

app.put('/api/products', requireAuth, (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Ожидался массив товаров' });
  if (list.length > 500) return res.status(400).json({ error: 'Слишком много товаров' });
  const cleaned = finalizeProducts(list);
  writeProducts(cleaned);
  console.log(`Товаров сохранено: ${cleaned.length}`);
  res.json({ ok: true, count: cleaned.length });
});

app.get('/api/auth/status', (req, res) => res.json({ hasPassword: Boolean(readAuth().hash) }));

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ ok: true }));

app.post('/api/auth/setup', (req, res) => {
  if (readAuth().hash) return res.status(400).json({ error: 'Пароль уже установлен' });
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  writeAuth({ salt, hash: hashPassword(password, salt), createdAt: new Date().toISOString() });
  console.log('Пароль админа установлен');
  res.json({ token: createSession() });
});

app.post('/api/auth/login', (req, res) => {
  const password = req.body && req.body.password;
  if (!verifyPassword(password)) return res.status(401).json({ error: 'Неверный пароль' });
  res.json({ token: createSession() });
});

app.post('/api/auth/password', requireAuth, (req, res) => {
  const body = req.body || {};
  if (!verifyPassword(body.oldPassword)) {
    return res.status(401).json({ error: 'Текущий пароль указан неверно' });
  }
  if (typeof body.newPassword !== 'string' || body.newPassword.length < 4) {
    return res.status(400).json({ error: 'Новый пароль — минимум 4 символа' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  writeAuth({ salt, hash: hashPassword(body.newPassword, salt), createdAt: new Date().toISOString() });
  console.log('Пароль админа изменён');
  res.json({ ok: true });
});

/* ===================== статика сайта ===================== */
app.use(express.static(ROOT, { index: 'index.html', dotfiles: 'ignore' }));

/* ===================== запуск ===================== */
ensureData();
app.listen(PORT, () => {
  console.log(`BlackMarket запущен: http://localhost:${PORT}`);
});
