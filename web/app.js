/* ============================================================
   TA innovation — iOS e-scooter shopping app (frontend SPA)
   Vanilla JS · router with native push/pop + tab transitions
   ============================================================ */
(() => {
'use strict';

// ── API client ──────────────────────────────────────────────
const TOKEN_KEY = 'ta_cart_token';
let cartToken = localStorage.getItem(TOKEN_KEY);
if (!cartToken) {
  cartToken = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random()).replace(/-/g, '');
  localStorage.setItem(TOKEN_KEY, cartToken);
}
const API_BASE = (window.TA_CONFIG && window.TA_CONFIG.apiBase) || '';
async function api(path, opts = {}) {
  const r = await fetch(API_BASE + '/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Cart-Token': cartToken, ...(opts.headers || {}) },
  });
  if (!r.ok && r.status !== 201) throw new Error('API ' + r.status + ' ' + path);
  return r.status === 204 ? {} : r.json();
}

// ── App state ────────────────────────────────────────────────
const state = {
  catalog: null,          // {categories, counts, promo, products}
  catalogSeg: 'all',
  productCache: {},
  cart: { items: [], count: 0, subtotal: 0, discount: 0, shipping: 0, total: 0, promo: null },
  compare: JSON.parse(localStorage.getItem('ta_compare') || '[]'),
  promoSeen: false,
  checkoutPay: 'visa',
  checkout: { name: '', phone: '', cccd: '', dob: '', gender: '', address: '', email: '', images: [] },
  salesId: localStorage.getItem('ta_sales_id') || 'SA1',
  salesData: null,
};
const fmt = n => (n || 0).toLocaleString('vi-VN') + '₫';
const num = n => (n || 0).toLocaleString('vi-VN');
const vndShort = n => { n = n || 0; if (n >= 1e9) return (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ'; if (n >= 1e6) return (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr'; if (n >= 1e3) return Math.round(n / 1e3) + ' ng'; return String(n); };
const monthLabel = p => p ? 'T' + Number(p.slice(5)) + '/' + p.slice(2, 4) : '';
const initials = s => (s || '?').trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
const getPref = (k, def) => { const v = localStorage.getItem('ta_pref_' + k); return v === null ? def : v === '1'; };
const setPref = (k, v) => localStorage.setItem('ta_pref_' + k, v ? '1' : '0');
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const deliveryRange = () => { const a = new Date(); a.setDate(a.getDate() + 2); const b = new Date(); b.setDate(b.getDate() + 4); const d = n => n.getDate(); const m = n => 'tháng ' + (n.getMonth() + 1); return a.getMonth() === b.getMonth() ? `${d(a)}–${d(b)} ${m(a)}` : `${d(a)} ${m(a)}–${d(b)} ${m(b)}`; };
const curMonth = () => { const n = new Date(); return 'Tháng ' + (n.getMonth() + 1); };

// ── Parametric scooter illustration (from the design SVG) ────
let svgN = 0;
function shade(hex, p) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + (p < 0 ? v : 255 - v) * p)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function scooterSVG(hex) {
  const id = 'sg' + (svgN++);
  const dk = shade(hex, -0.45), lt = shade(hex, 0.12);
  return `<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${lt}"/><stop offset="100%" stop-color="${dk}"/></linearGradient></defs>
  <ellipse cx="200" cy="262" rx="160" ry="8" fill="#0a1a33" opacity=".12"/>
  <path d="M50 200 Q70 130 130 130 L260 130 Q330 130 350 180 L350 210 L300 210 Q290 170 240 170 L160 170 Q110 170 100 210 Z" fill="url(#${id})"/>
  <path d="M40 200 Q40 150 90 130 L150 130 Q120 140 110 175 L110 210 Z" fill="${dk}" opacity=".95"/>
  <path d="M120 130 L100 50 L150 50 L165 130 Z" fill="#1A1A1A"/>
  <rect x="80" y="42" width="90" height="14" rx="7" fill="#1A1A1A"/>
  <circle cx="78" cy="135" r="14" fill="#fff" opacity=".9"/><circle cx="78" cy="135" r="9" fill="#fde68a"/>
  <path d="M210 110 Q230 92 290 92 L310 92 Q330 92 332 110 L320 130 L218 130 Z" fill="#1A1A1A"/>
  <circle cx="80" cy="220" r="50" fill="#1A1A1A"/><circle cx="80" cy="220" r="20" fill="#cbd5e1"/>
  <circle cx="320" cy="220" r="50" fill="#1A1A1A"/><circle cx="320" cy="220" r="20" fill="#cbd5e1"/>
  <path d="M155 155 L300 155 L290 175 L165 175 Z" fill="#fff" opacity=".15"/></svg>`;
}
// image for a product/color: photo if available else colored scooter
function prodImg(p, ci = 0) {
  const c = (p.colors && p.colors[ci]) || (p.colors && p.colors[0]) || { hex: '#0a64b4' };
  return c.photo ? `<img src="/assets/${esc(c.photo)}" alt="${esc(p.name)}">` : scooterSVG(c.hex || '#0a64b4');
}

// ── Icons ────────────────────────────────────────────────────
const I = {
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bolt: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  back: '<svg width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M10 2 2 10l8 8" stroke="#0a1a33" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dots: '<svg width="20" height="6" viewBox="0 0 22 6"><circle cx="3" cy="3" r="2.5" fill="#0a1a33"/><circle cx="11" cy="3" r="2.5" fill="#0a1a33"/><circle cx="19" cy="3" r="2.5" fill="#0a1a33"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  truck: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  bigcheck: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  cartBig: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  qr: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7M14 21h3"/></svg>',
  camera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  idcard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M4 18c0-2 2-3 4-3s4 1 4 3M15 9h4M15 13h4M15 16h2"/></svg>',
  scan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
};
const TAB_ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  catalog: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  compare: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M6 8 3 11l3 3"/><path d="M18 8l3 3-3 3"/><path d="M3 11h6M15 11h6"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  account: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  orders: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h7M9 17h7M9 9h2"/></svg>',
};

// ── Router: screen stack with native transitions ─────────────
const views = document.getElementById('views');
const phone = document.getElementById('phone');
const TABS = ['home', 'catalog', 'compare', 'cart', 'orders'];
let stack = [];           // [{name, params, el, scroll}]
let animating = false;

function curTab() { return stack.length ? stack[0].name : 'home'; }
function afterAnim(node, cb) {
  let done = false; const fin = () => { if (done) return; done = true; cb(); };
  node.addEventListener('transitionend', fin, { once: true });
  setTimeout(fin, 480);
}

function buildScreen(name, params) {
  const fn = SCREENS[name];
  const entry = { name, params: params || {}, el: null, scroll: 0 };
  entry.el = fn(entry);
  return entry;
}

function navTab(name) {
  if (animating) return;
  if (stack.length === 1 && stack[0].name === name) {
    // tap active tab → scroll to top
    const sc = stack[0].el.querySelector('.screen-scroll'); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  // clear stack, cross-fade to new root
  const old = stack.map(s => s.el);
  const entry = buildScreen(name);
  entry.el.classList.add('tab-enter');
  views.appendChild(entry.el);
  stack = [entry];
  old.forEach(o => o.remove());
  setDark(name);
  renderTabbar();
  syncTabbar(name);
}

// Ẩn tab bar khi vào luồng đẩy (chi tiết/checkout/cài đặt…) để lộ thanh nút ở đáy
function syncTabbar(name) {
  phone.classList.toggle('in-flow', !TABS.includes(name));
}

function push(name, params) {
  if (animating) return;
  animating = true;
  const prev = stack[stack.length - 1];
  const entry = buildScreen(name, params);
  syncTabbar(name);
  entry.el.classList.add('push-enter');
  views.appendChild(entry.el);
  prev.el.classList.add('push-behind');
  void entry.el.offsetWidth;        // reflow
  requestAnimationFrame(() => {
    entry.el.classList.add('run');
    prev.el.classList.add('run');
  });
  afterAnim(entry.el, () => {
    entry.el.classList.remove('push-enter', 'run');
    stack.push(entry);
    setDark(name);
    animating = false;
  });
}

function pop() {
  if (animating || stack.length < 2) return;
  animating = true;
  const top = stack.pop();
  const prev = stack[stack.length - 1];
  syncTabbar(prev.name);
  prev.el.classList.add('pop-behind');
  top.el.classList.add('pop-leave');
  void top.el.offsetWidth;
  requestAnimationFrame(() => {
    top.el.classList.add('run');
    prev.el.classList.add('run');
  });
  afterAnim(top.el, () => {
    top.el.remove();
    prev.el.classList.remove('pop-behind', 'run');
    setDark(prev.name);
    animating = false;
  });
}

function setDark() { phone.classList.remove('dark'); } // all screens light-themed

// ── Tab bar ──────────────────────────────────────────────────
const tabbar = document.getElementById('tabbar');
function renderTabbar() {
  const labels = { home: 'Trang chủ', catalog: 'Danh mục', compare: 'So sánh', cart: 'Giỏ hàng', orders: 'Đơn hàng' };
  const active = curTab();
  tabbar.innerHTML = ['home', 'catalog', 'compare', 'cart', 'orders'].map(t => {
    const badge = t === 'cart' && state.cart.count ? `<i class="tab-badge">${state.cart.count}</i>` : '';
    const cmpBadge = t === 'compare' && state.compare.length ? `<i class="tab-badge" style="background:var(--brand)">${state.compare.length}</i>` : '';
    return `<button class="tab ${active === t ? 'active' : ''}" data-tab="${t}">${TAB_ICONS[t]}${badge}${cmpBadge}<span>${labels[t]}</span></button>`;
  }).join('');
}
tabbar.addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  navTab(b.dataset.tab);
});
// Mở Cài đặt / Thông báo từ header ở mọi màn
phone.addEventListener('click', e => {
  if (e.target.closest('[data-settings]')) push('settings');
  else if (e.target.closest('[data-notif]')) push('notifications');
});

// ── Shared header ────────────────────────────────────────────
function appHeader() {
  return `<div class="app-head"><div class="row">
    <img class="brand-logo" src="/assets/logo.png" alt="TA innovation">
    <div class="searchbox">${I.search}<span>Tìm xe điện…</span></div>
    <button class="icon-btn" data-settings title="Cài đặt">${I.gear}</button>
    <button class="icon-btn" data-notif title="Thông báo">${I.bell}<span class="dot-badge"></span></button>
  </div></div>`;
}

// ════════════════════════════════════════════════════════════
//  SCREENS
// ════════════════════════════════════════════════════════════
const SCREENS = {};

// ---- HOME ----
SCREENS.home = (entry) => {
  const s = el(`<section class="screen pinned">
    <div class="topbar">${appHeader()}</div>
    <div class="screen-scroll">
    <div class="section-pad" style="padding-bottom:2px">
      <div class="hero">
        <div style="flex:1">
          <p class="eyebrow">${curMonth()} · Khuyến mãi lớn</p>
          <h3>Giảm tới 16% xe học sinh</h3>
          <p>Không cần bằng lái · 3 cơ sở Hà Nội</p>
        </div>
        <div class="glyph">${I.bolt}</div>
      </div>
    </div>
    <div class="chips sticky" id="home-chips"></div>
    <div class="section-head"><h2>Đề xuất cho bạn</h2><a data-go-catalog>Xem tất cả →</a></div>
    <div class="h-scroll" id="home-featured"><div class="card" style="width:172px"><div class="thumb skel" style="aspect-ratio:1.18/1"></div><div class="body"><div class="skel" style="height:14px;width:70%"></div><div class="skel" style="height:11px;width:50%;margin-top:8px"></div></div></div></div>
    <div class="section-head"><h2>Bán chạy nhất</h2></div>
    <div class="prod-grid" id="home-best"></div>
  </div></section>`);

  s.querySelector('[data-go-catalog]').onclick = () => navTab('catalog');

  ensureCatalog().then(c => {
    // chips
    const chips = s.querySelector('#home-chips');
    chips.innerHTML = c.categories.map((cat, i) =>
      `<button class="chip ${i === 0 ? 'active' : ''}" data-seg="${cat.key}">${esc(cat.label)}</button>`).join('');
    chips.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; state.catalogSeg = b.dataset.seg; navTab('catalog'); };
    // featured (horizontal)
    const feat = c.products.filter(p => p.featured);
    s.querySelector('#home-featured').innerHTML = feat.map(p => cardHTML(p)).join('');
    // best (grid) — first 4
    s.querySelector('#home-best').innerHTML = c.products.slice(0, 4).map(p => cardHTML(p)).join('');
    bindCards(s);
    if (!state.promoSeen) { state.promoSeen = true; setTimeout(showPromoPopup, 550); }
  });
  return s;
};

// ---- product card ----
function cardHTML(p) {
  const badgeCls = p.segment === 'hoc_sinh' ? 'green' : p.badge === 'MỚI' ? 'new' : 'blue';
  const ci = p.colors.findIndex(c => c.photo); const imgIdx = ci >= 0 ? ci : 0;
  const cmpOn = state.compare.includes(p.slug);
  const priceBlock = p.promo_pct
    ? `<span class="price">${fmt(p.price_sale)}</span><span class="price-old">${fmt(p.price_base)}</span>`
    : `<span class="price">${fmt(p.price_base)}</span>${p.has_rent ? '<span class="spec-line">thuê pin</span>' : ''}`;
  const stk = p.stock;
  const out = stk != null && stk <= 0;
  const stockLine = stk == null ? '' :
    `<div class="stk ${out ? 'out' : stk <= 5 ? 'low' : ''}"><i></i>${out ? 'Hết hàng' : 'Còn ' + stk + ' xe'}</div>`;
  return `<div class="card ${out ? 'is-out' : ''}" data-slug="${p.slug}">
    <div class="thumb">
      <span class="badge ${badgeCls}">${esc(p.badge)}</span>
      <button class="cmp ${cmpOn ? 'on' : ''}" data-cmp="${p.slug}" title="So sánh">${cmpOn ? I.check : '+'}</button>
      ${out ? '<span class="out-tag">Hết hàng</span>' : ''}
      ${prodImg(p, imgIdx)}
    </div>
    <div class="body">
      <div class="nm">${esc(p.name)}</div>
      <div class="sp spec-line">${p.speed} km/h · ${p.range_km} km</div>
      ${stockLine}
      <div class="pr">${priceBlock}</div>
      ${out ? `<button class="card-buy off" disabled>Hết hàng</button>` : `<div style="display:flex;gap:6px;"><button class="card-buy" data-addcart="${p.slug}" style="flex:0 0 38px;background:#f8fafc;color:var(--brand);border:1.5px solid var(--brand);padding:0;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg></button><button class="card-buy" data-buy="${p.slug}" style="flex:1;">Mua ngay</button></div>`}
    </div></div>`;
}
function addonCardHTML(a) {
  return `<div class="addon-card cat">
    <div class="ac-ic">${a.icon || '📦'}</div>
    <div class="ac-nm">${esc(a.name)}</div>
    <div class="ac-tp">${a.type === 'service' ? 'Dịch vụ' : 'Phụ kiện'}</div>
    <div class="ac-pr">${fmt(a.price)}</div>
    <button class="ac-add" data-add-sku="${esc(a.sku)}">＋ Thêm</button>
  </div>`;
}
function bindCards(root) {
  root.querySelectorAll('.card[data-slug]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-cmp]') || e.target.closest('[data-buy]') || e.target.closest('[data-addcart]')) return;
      push('detail', { slug: card.dataset.slug });
    });
  });
  root.querySelectorAll('[data-cmp]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleCompare(btn.dataset.cmp); });
  });
  root.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); quickBuy(btn.dataset.buy); });
  });
  root.querySelectorAll('[data-addcart]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); quickAddCart(btn.dataset.addcart); });
  });
}
async function quickAddCart(slug) {
  const p = await loadProduct(slug);
  if (!p) return;
  const ci = p.colors.findIndex(c => c.photo); const imgIdx = ci >= 0 ? ci : 0;
  await addToCart(p.slug, p.colors[imgIdx].name, p.has_rent ? 'rent' : 'buy');
  toast('Đã thêm vào giỏ hàng');
}
async function quickBuy(slug) {
  const p = await loadProduct(slug);
  if (p.stock != null && p.stock <= 0) { toast('Xe tạm hết hàng'); return; }
  let ci = p.colors.findIndex(c => c.photo); if (ci < 0) ci = 0;
  const option = p.has_rent ? 'rent' : 'buy';
  await addToCart(p.slug, p.colors[ci].name, option);
  toast('Đã thêm — tới thanh toán');
  push('checkout');
}

// ---- CATALOG ----
SCREENS.catalog = (entry) => {
  const s = el(`<section class="screen pinned">
    <div class="topbar">
      ${appHeader()}
      <div class="nav-large"><h1 id="cat-title">Danh mục</h1><div class="sub" id="cat-sub"></div></div>
      <div class="chips" id="cat-chips"></div>
    </div>
    <div class="screen-scroll">
      <div class="prod-grid" id="cat-grid"></div>
      <div id="cat-vas-section">
        <div class="section-head" style="padding-top:10px"><h2>Dịch vụ & phụ kiện</h2><span style="font-size:11.5px;color:var(--faint);font-weight:700">Giá trị gia tăng</span></div>
        <div class="addon-grid" id="cat-addons"></div>
      </div>
      <div style="height:96px"></div>
    </div>
    <div class="cmp-bar" id="cat-cmpbar">
      <div class="txt"><div class="a"></div><div class="b"></div></div>
      <button id="cat-cmpgo">So sánh →</button>
      <div id="cat-cmpclear" style="position:absolute; top:-8px; right:-4px; width:28px; height:28px; background:#ef4444; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.3);">✕</div>
    </div></section>`);

  const renderSeg = (seg) => {
    state.catalogSeg = seg;
    const grid = s.querySelector('#cat-grid');
    const vas = s.querySelector('#cat-vas-section');
    const bar = s.querySelector('#cat-cmpbar');
    if (seg === 'addon') {
      s.querySelector('#cat-title').textContent = 'Dịch vụ & Phụ kiện';
      s.querySelector('#cat-sub').textContent = 'Linh kiện & dịch vụ giá trị gia tăng mua kèm';
      if (vas) vas.style.display = 'none';
      if (bar) bar.classList.remove('in');
      ensureAddons().then(addons => {
        grid.className = 'addon-grid';
        grid.innerHTML = addons.map(addonCardHTML).join('');
        grid.querySelectorAll('[data-add-sku]').forEach(b => b.onclick = () => addAddon(b.dataset.addSku));
      });
      return;
    }
    grid.className = 'prod-grid';
    if (vas) vas.style.display = '';
    ensureCatalog(seg).then(c => {
      const cat = c.categories.find(x => x.key === seg) || c.categories[0];
      s.querySelector('#cat-title').textContent = seg === 'hoc_sinh' ? 'Xe học sinh' : cat.label === 'Tất cả' ? 'Tất cả xe điện' : cat.label;
      s.querySelector('#cat-sub').textContent = cat.subtitle;
      grid.innerHTML = c.products.map(p => cardHTML(p)).join('');
      bindCards(s);
      updateCmpBar();
    });
  };

  ensureCatalog().then(c => {
    const chips = s.querySelector('#cat-chips');
    const counts = c.counts;
    chips.innerHTML = c.categories.map(cat => {
      const n = cat.key === 'all' ? '' : ` (${counts[cat.key] || 0})`;
      return `<button class="chip ${cat.key === state.catalogSeg ? 'active' : ''}" data-seg="${cat.key}">${esc(cat.label)}${n}</button>`;
    }).join('') + `<button class="chip chip-addon ${state.catalogSeg === 'addon' ? 'active' : ''}" data-seg="addon">🛠️ Dịch vụ & Phụ kiện</button>`;
    chips.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === b));
      renderSeg(b.dataset.seg);
    };
    renderSeg(state.catalogSeg);
  });

  // Teaser "Dịch vụ & phụ kiện" ở cuối các tab xe (4 mục đầu)
  ensureAddons().then(addons => {
    const box = s.querySelector('#cat-addons'); if (!box) return;
    box.innerHTML = addons.slice(0, 4).map(addonCardHTML).join('');
    box.querySelectorAll('[data-add-sku]').forEach(b => b.onclick = () => addAddon(b.dataset.addSku));
  }).catch(() => {});

  s.querySelector('#cat-cmpgo').onclick = () => { if (state.compare.length) navTab('compare'); };
  s.querySelector('#cat-cmpclear').onclick = () => clearCompare();
  entry._updateCmpBar = () => {
    const bar = s.querySelector('#cat-cmpbar'); const n = state.compare.length;
    bar.classList.toggle('in', n > 0);
    bar.querySelector('.a').textContent = `${n} / 3 đã chọn để so sánh`;
    bar.querySelector('.b').textContent = n >= 2 ? 'Đã đủ để so sánh' : `Tiếp tục chọn ${2 - n} mẫu nữa`;
    bar.querySelector('#cat-cmpgo').disabled = n < 2;
  };
  return s;
};

// ---- DETAIL ----
SCREENS.detail = (entry) => {
  const s = el(`<section class="screen no-tab">
    <div class="detail-top">
      <button class="glass-pill" data-back>${I.back}</button>
      <button class="glass-pill">${I.dots}</button>
    </div>
    <div class="screen-scroll" id="d-scroll"><div class="empty"><div class="ei skel" style="width:74px;height:74px"></div></div></div>
  </section>`);
  s.querySelector('[data-back]').onclick = pop;

  loadProduct(entry.params.slug).then(p => {
    let ci = p.colors.findIndex(c => c.photo); if (ci < 0) ci = 0;
    let option = p.has_rent ? 'rent' : 'buy';
    const scroll = s.querySelector('#d-scroll');

    const render = () => {
      const c = p.colors[ci];
      const badgeCls = p.segment === 'hoc_sinh' ? 'green' : p.badge === 'MỚI' ? 'new' : 'blue';
      const specRows = [
        ['Dung lượng pin', p.battery], ['Tốc độ tối đa', p.speed + ' km/h'],
        ['Quãng đường', p.range_km + ' km / sạc'], ['Thời gian sạc', p.charge],
        ['Bảo hành pin', p.battery_warranty], ['Cần bằng lái', p.needs_license],
      ];
      const priceBuy = p.promo_pct ? Math.round(p.price_buy * (100 - p.promo_pct) / 100) : p.price_buy;
      const optRow = p.has_rent
        ? `<div class="opt-row">
            <button class="opt ${option === 'rent' ? 'on' : ''}" data-opt="rent"><div class="k">Thuê pin</div><div class="v">${fmt(p.price_rent)}</div></button>
            <button class="opt ${option === 'buy' ? 'on' : ''}" data-opt="buy"><div class="k">Mua đứt</div><div class="v">${fmt(p.price_buy)}</div></button>
          </div>`
        : `<div class="opt-row"><button class="opt on" style="flex:1"><div class="k">${p.promo_pct ? 'Giá ưu đãi (-' + p.promo_pct + '%)' : 'Giá niêm yết'}</div><div class="v">${fmt(priceBuy)} ${p.promo_pct ? '<span class="price-old">' + fmt(p.price_buy) + '</span>' : ''}</div></button></div>`;

      scroll.innerHTML = `
        <div class="gallery"><div class="dot-grid"></div>${prodImg(p, ci)}
          <div class="pager">${p.colors.map((_, i) => `<i class="${i === ci ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="detail-body">
          <span class="badge ${badgeCls}">${esc(p.badge)}</span>
          <div class="ttl-row">
            <div><h1>${esc(p.name)}</h1><div class="meta">${esc(p.tagline)} · ${esc(c.name)}</div></div>
            <span class="rating">${I.star}${p.rating}</span>
          </div>
          ${p.stock != null ? `<div class="d-stock ${p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : ''}"><i></i>${p.stock <= 0 ? 'Tạm hết hàng — liên hệ đặt trước' : 'Còn ' + p.stock + ' xe sẵn giao · 3 cơ sở Hà Nội'}</div>` : ''}
          ${optRow}
          <div class="colors">${p.colors.map((col, i) => `<button class="swatch ${i === ci ? 'on' : ''}" data-ci="${i}" style="background:${col.hex}" title="${esc(col.name)}"></button>`).join('')}</div>
          <div class="block-title">Thông số kỹ thuật</div>
          <div class="spec-card">${specRows.map(r => `<div class="sr"><span class="lbl">${r[0]}</span><span class="val">${esc(r[1])}</span></div>`).join('')}</div>
          <div class="block-title">Điểm nổi bật</div>
          <div class="chips-soft">${p.highlights.map(h => `<span class="chip-soft">${esc(h)}</span>`).join('')}</div>
          <p style="font-size:13px;color:var(--muted);line-height:1.65;margin:14px 2px 0">${esc(p.description)}</p>
          <div style="height:96px"></div>
        </div>`;
      scroll.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { option = b.dataset.opt; render(); });
      scroll.querySelectorAll('[data-ci]').forEach(b => b.onclick = () => { ci = +b.dataset.ci; render(); });
    };
    render();

    // sticky action bar
    const out = p.stock != null && p.stock <= 0;
    const bar = el(`<div class="action-bar">
      <button class="btn btn-line btn-sm" style="flex:1" data-add ${out ? 'disabled' : ''}>Thêm vào giỏ</button>
      <button class="btn btn-primary btn-sm" style="flex:1" data-buy ${out ? 'disabled' : ''}>${out ? 'Tạm hết hàng' : 'Mua ngay →'}</button>
    </div>`);
    s.appendChild(bar);
    if (!out) {
      bar.querySelector('[data-add]').onclick = async () => {
        await addToCart(p.slug, p.colors[ci].name, option);
        showAddSheet(p, p.colors[ci].name, option);
      };
      bar.querySelector('[data-buy]').onclick = async () => {
        await addToCart(p.slug, p.colors[ci].name, option);
        navTab('cart');
      };
    }
  });
  return s;
};

// ---- COMPARE ----
SCREENS.compare = (entry) => {
  const s = el(`<section class="screen"><div class="screen-scroll">
    <div class="nav-large" style="display:flex; justify-content:space-between; align-items:flex-end">
      <div><h1>So sánh</h1><div class="sub" id="cmp-sub"></div></div>
      <button id="cmp-clear-btn" style="background:transparent; border:none; color:var(--red); font-weight:600; font-size:14px; padding:0 14px 14px; display:none;">Xóa tất cả</button>
    </div>
    <div id="cmp-body"></div>
  </div></section>`);
  const body = s.querySelector('#cmp-body');

  const renderEmpty = () => {
    body.innerHTML = `<div class="empty" style="padding-top:30px"><div class="ei">${I.cartBig.replace('cx="9" cy="21"', 'cx="12" cy="12"')}</div><h3>Chưa có xe để so sánh</h3><p>Thêm xe từ Danh mục để so sánh thông số cạnh nhau.</p><button class="btn btn-primary" style="max-width:220px;margin-top:18px" id="cmp-empty-go">Tới danh mục</button></div>`;
    s.querySelector('#cmp-empty-go').onclick = () => navTab('catalog');
    s.querySelector('#cmp-sub').textContent = '0 mẫu xe đã chọn';
    s.querySelector('#cmp-clear-btn').style.display = 'none';
  };

  if (!state.compare.length) {
    renderEmpty();
    return s;
  }

  s.querySelector('#cmp-clear-btn').style.display = 'block';
  s.querySelector('#cmp-clear-btn').onclick = () => {
    clearCompare();
    renderEmpty();
  };

  Promise.all(state.compare.map(loadProduct)).then(list => {
    s.querySelector('#cmp-sub').textContent = `${list.length} mẫu xe đã chọn`;
    const rowDef = [
      ['GIÁ', p => p.promo_pct ? `${fmt(p.price_sale)}<div class="muted" style="font-weight:600;font-size:11px">${fmt(p.price_base)}</div>` : (p.has_rent ? `${fmt(p.price_rent)}<div class="muted" style="font-weight:600;font-size:11px">thuê pin</div>` : fmt(p.price_buy))],
      ['TỐC ĐỘ TỐI ĐA', p => p.speed + ' km/h', p => p.speed],
      ['QUÃNG ĐƯỜNG / SẠC', p => p.range_km + ' km', p => p.range_km],
      ['DUNG LƯỢNG PIN', p => p.battery],
      ['THỜI GIAN SẠC', p => p.charge],
      ['CẦN BẰNG LÁI', p => p.needs_license],
    ];
    const cols = list.map((p, idx) => {
      const ci = p.colors.findIndex(c => c.photo); const ii = ci >= 0 ? ci : 0;
      const you = idx === 0;
      const out = p.stock != null && p.stock <= 0;
      const buy = out ? `<button class="cmp-buy off" disabled>Hết hàng</button>` : `<button class="cmp-buy" data-buy="${p.slug}">Mua ngay</button>`;
      return `<div class="cmp-col ${you ? 'you' : ''}"><div class="pic">${prodImg(p, ii)}</div>
        <div class="nm">${esc(p.name)}</div><div class="tag">${you ? 'Của bạn' : esc(p.colors[0].name)}</div>${buy}</div>`;
    }).join('');
    const addCol = list.length < 3 ? `<button class="cmp-add" id="cmp-add"><span class="plus">+</span>Thêm xe</button>` : '';

    const rows = rowDef.map(def => {
      const [label, fn, bestFn] = def;
      let bestIdx = -1;
      if (bestFn) { let bv = -1; list.forEach((p, i) => { const v = bestFn(p); if (v > bv) { bv = v; bestIdx = i; } }); }
      const cells = list.map((p, i) => `<div class="${bestIdx === i ? 'best' : ''}">${fn(p)}</div>`).join('');
      return `<div class="cmp-row"><div class="rk">${label}</div><div class="rv">${cells}</div></div>`;
    }).join('');

    body.innerHTML = `<div class="cmp-cols">${cols}${addCol}</div><div class="cmp-rows">${rows}
      <div class="section-pad"><button class="btn btn-primary" id="cmp-pick">Chọn ${esc(list[0].name)} →</button></div></div>`;
    const add = body.querySelector('#cmp-add'); if (add) add.onclick = () => navTab('catalog');
    body.querySelector('#cmp-pick').onclick = () => push('detail', { slug: list[0].slug });
    body.querySelectorAll('[data-buy]').forEach(btn => btn.onclick = () => quickBuy(btn.dataset.buy));
  });
  return s;
};

// ---- CART ----
SCREENS.cart = (entry) => {
  const s = el(`<section class="screen pinned">
    <div class="topbar">${appHeader()}</div>
    <div class="screen-scroll">
    <div class="nav-large"><h1>Giỏ hàng</h1><div class="sub" id="cart-sub"></div></div>
    <div class="section-pad" id="cart-body" style="padding-top:6px"></div>
  </div></section>`);
  renderCartScreen(s);
  return s;
};
function renderCartScreen(s) {
  const c = state.cart;
  const addons = c.addons || [];
  s.querySelector('#cart-sub').textContent = c.count
    ? `${c.count} xe${addons.length ? ' · ' + addons.length + ' mục kèm' : ''}`
    : (addons.length ? `${addons.length} mục mua kèm` : 'Chưa có sản phẩm');
  const body = s.querySelector('#cart-body');
  if (!c.items.length && !addons.length) {
    body.innerHTML = `<div class="empty" style="padding:50px 30px"><div class="ei">${I.cartBig}</div><h3>Giỏ hàng trống</h3><p>Khám phá các dòng xe điện và thêm vào giỏ.</p><button class="btn btn-primary" style="max-width:220px;margin-top:18px" id="cart-go">Mua sắm ngay</button></div>`;
    body.querySelector('#cart-go').onclick = () => navTab('home');
    const ab = s.querySelector('.action-bar'); if (ab) ab.remove();
    return;
  }
  const promo = c.promo ? `<div class="promo-strip"><div class="pc">-16%</div><div style="flex:1"><div class="a">${esc(c.promo.code)} · −16% xe không bằng lái</div><div class="b">Tự động áp dụng cho xe học sinh</div></div></div>` : '';
  const items = c.items.map(it => {
    const col = (it.colors || []).find(x => x.name === it.color) || (it.colors || [])[0] || { hex: '#0a64b4' };
    const img = col.photo ? `<img src="/assets/${esc(col.photo)}" alt="">` : scooterSVG(col.hex);
    const badge = it.promo_pct ? `<span class="badge green">-${it.promo_pct}%</span>` : '';
    const pr = it.promo_pct
      ? `<span class="price" style="font-size:14px">${fmt(it.unit_sale)}</span><span class="price-old">${fmt(it.unit_base)}</span>`
      : `<span class="price" style="font-size:14px">${fmt(it.unit_base)}</span>`;
    return `<div class="line-item" data-id="${it.id}">
      <div class="lpic">${badge}${img}</div>
      <div class="linfo">
        <div class="nm">${esc(it.name)}</div>
        <div class="opt">${esc(it.color)} · ${esc(it.option_label)}</div>
        <div class="pr">${pr}</div>
        <div class="qty"><button data-dec>−</button><span class="n">${it.qty}</span><button data-inc>+</button></div>
      </div>
      <button class="rm" data-rm title="Xoá">${I.trash}</button>
    </div>`;
  }).join('');
  const addonLines = addons.map(a => `<div class="addon-line" data-sku="${esc(a.sku)}">
    <span class="ai">${a.icon || (a.type === 'service' ? '🔧' : '📦')}</span>
    <div style="flex:1;min-width:0"><div class="nm">${esc(a.name)}</div><div class="opt">${a.type === 'service' ? 'Dịch vụ' : 'Phụ kiện'} · SL ${a.qty}</div></div>
    <span class="price" style="font-size:13px">${fmt(a.line_total)}</span>
    <button class="rm" data-rm-addon="${esc(a.sku)}" title="Xoá">${I.trash}</button>
  </div>`).join('');
  const promoRow = c.applied_promo
    ? `<div class="promo-applied"><div class="pc2">${I.check}</div><div style="flex:1;min-width:0"><div class="a">${esc(c.applied_promo.code)} · ${esc(c.applied_promo.name)}</div><div class="b">−${fmt(c.applied_promo.discount)}</div></div><button class="rm-promo" id="promo-rm">×</button></div>`
    : `<div class="promo-row"><input id="promo-input" placeholder="Nhập mã ưu đãi" autocapitalize="characters"><button class="btn btn-line btn-sm" id="promo-apply">Áp dụng</button></div><button class="promo-link" id="promo-list">Xem danh sách mã ưu đãi →</button>`;
  body.innerHTML = `${promo}${items}
    ${addons.length ? `<div class="block-title" style="margin:14px 2px 8px">Linh kiện / dịch vụ kèm theo</div>${addonLines}` : ''}
    <button class="buy-more" id="cart-more">＋ Mua thêm xe / phụ kiện</button>
    <div class="block-title" style="margin:18px 2px 8px">Gợi ý mua kèm</div>
    <div class="h-scroll addon-scroll" id="cart-suggest"></div>
    <div class="block-title" style="margin:18px 2px 8px">Mã ưu đãi</div>
    ${promoRow}
    <div class="delivery" style="margin-top:14px"><div class="di">${I.truck}</div><div style="flex:1"><div class="a">Giao tận nhà · Hà Nội</div><div class="b">Miễn phí · ${deliveryRange()}</div></div></div>
    <div class="summary">
      <h3>Tóm tắt đơn hàng</h3>
      <div class="sr"><span>Tạm tính</span><span class="v">${fmt(c.veh_subtotal != null ? c.veh_subtotal : c.subtotal)}</span></div>
      ${c.addon_total ? `<div class="sr"><span>Linh kiện / dịch vụ</span><span class="v">${fmt(c.addon_total)}</span></div>` : ''}
      ${c.product_discount ? `<div class="sr disc"><span>Ưu đãi học sinh (-16%)</span><span class="v">−${fmt(c.product_discount)}</span></div>` : ''}
      ${c.promo_discount ? `<div class="sr disc"><span>Mã ${esc((c.applied_promo || {}).code || 'ưu đãi')}</span><span class="v">−${fmt(c.promo_discount)}</span></div>` : ''}
      <div class="sr"><span>Phí giao hàng</span><span class="v">Miễn phí</span></div>
      <div class="sr total"><span>Tổng cộng</span><span class="v">${fmt(c.total)}</span></div>
    </div>
    <div style="height:96px"></div>`;

  body.querySelectorAll('.line-item').forEach(li => {
    const id = +li.dataset.id;
    const it = c.items.find(x => x.id === id);
    li.querySelector('[data-inc]').onclick = () => updateQty(id, it.qty + 1);
    li.querySelector('[data-dec]').onclick = () => updateQty(id, it.qty - 1);
    li.querySelector('[data-rm]').onclick = () => removeItem(id);
  });
  body.querySelectorAll('[data-rm-addon]').forEach(b => b.onclick = () => removeAddon(b.dataset.rmAddon));
  body.querySelector('#cart-more').onclick = () => navTab('catalog');
  if (c.applied_promo) {
    body.querySelector('#promo-rm').onclick = () => removePromo();
  } else {
    const apply = () => { const v = body.querySelector('#promo-input').value.trim(); if (v) applyPromo(v); };
    body.querySelector('#promo-apply').onclick = apply;
    body.querySelector('#promo-input').addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    body.querySelector('#promo-list').onclick = () => openPromoSheet();
  }
  renderCartSuggest(body.querySelector('#cart-suggest'));

  // sticky bar: Mua thêm + Thanh toán
  let bar = s.querySelector('.action-bar');
  if (!bar) { bar = el('<div class="action-bar"></div>'); s.appendChild(bar); }
  bar.innerHTML = `<button class="btn btn-line" style="flex:1" id="cart-more2">Mua thêm</button>
    <button class="btn btn-primary" style="flex:1.6" id="cart-checkout"><span class="cta-sub">${fmt(c.total)}</span>Thanh toán →</button>`;
  bar.querySelector('#cart-checkout').onclick = () => push('checkout');
  bar.querySelector('#cart-more2').onclick = () => navTab('catalog');
}
async function renderCartSuggest(container) {
  if (!container) return;
  let addons;
  try { addons = await ensureAddons(); } catch (e) { container.innerHTML = ''; return; }
  const inCart = new Set((state.cart.addons || []).map(a => a.sku));
  const sug = addons.filter(a => !inCart.has(a.sku)).slice(0, 8);
  container.innerHTML = sug.map(a => `<div class="addon-card">
    <div class="ac-ic">${a.icon || '📦'}</div>
    <div class="ac-nm">${esc(a.name)}</div>
    <div class="ac-pr">${fmt(a.price)}</div>
    <button class="ac-add" data-add-sku="${esc(a.sku)}">＋ Thêm</button>
  </div>`).join('');
  container.querySelectorAll('[data-add-sku]').forEach(b => b.onclick = () => addAddon(b.dataset.addSku));
}
async function openPromoSheet() {
  let promos;
  try { promos = await ensurePromos(); } catch (e) { toast('Không tải được mã ưu đãi'); return; }
  const scopeLabel = { all: 'Mọi dòng xe', doi_pin: 'Dòng Đổi pin', kem_pin: 'Dòng Kèm pin', hoc_sinh: 'Xe học sinh', addon: 'Phụ kiện / Dịch vụ' };
  const inner = `<div class="promo-sheet">
    <div class="ps-head"><h3>Danh sách mã ưu đãi</h3><p>Chọn một mã để áp dụng vào đơn</p></div>
    <div class="ps-list">${promos.map(p => `<button class="ps-item" data-code="${esc(p.code)}">
      <div class="ps-tag ${p.kind}">${p.kind === 'percent' ? '-' + p.value + '%' : '-' + (p.value / 1e6).toLocaleString('vi-VN') + 'tr'}</div>
      <div style="flex:1;text-align:left;min-width:0"><div class="a">${esc(p.name)}</div><div class="b">${esc(p.code)} · ${scopeLabel[p.scope] || p.scope}</div></div>
      <span class="ps-go">Áp dụng</span>
    </button>`).join('')}</div></div>`;
  const close = openSheet(inner, (root) => {
    root.querySelectorAll('[data-code]').forEach(b => b.onclick = async () => {
      if (await applyPromo(b.dataset.code)) close();
    });
  });
}

// ---- MY ORDERS (Đơn hàng của tôi) ----
const OSTATUS = {
  pending: ['amber', 'Chờ duyệt'], vin_verified: ['blue', 'Đã đối soát VIN'],
  completed: ['green', 'Hoàn tất'], cancelled: ['off', 'Đã hủy'],
};
SCREENS.orders = (entry) => {
  const s = el(`<section class="screen pinned">
    <div class="topbar">${appHeader()}</div>
    <div class="screen-scroll">
    <div class="nav-large"><h1>Đơn hàng của tôi</h1><div class="sub" id="ord-sub">Đang tải…</div></div>
    <div class="section-pad" id="ord-body" style="padding-top:6px"></div>
  </div></section>`);
  renderOrders(s);
  return s;
};
async function renderOrders(s) {
  const body = s.querySelector('#ord-body');
  const sub = s.querySelector('#ord-sub');
  const phone = localStorage.getItem('ta_phone') || '';
  const emptyHTML = (msg) => `<div class="empty" style="padding:50px 30px"><div class="ei">${I.cartBig}</div><h3>Chưa có đơn hàng</h3><p>${msg}</p><button class="btn btn-primary" style="max-width:220px;margin-top:18px" id="ord-go">Mua sắm ngay</button></div>`;
  if (!phone) {
    sub.textContent = 'Chưa có đơn';
    body.innerHTML = emptyHTML('Đặt mua một chiếc xe để theo dõi đơn tại đây.');
    body.querySelector('#ord-go').onclick = () => navTab('home');
    return;
  }
  let data;
  try { data = await api('/orders/mine?phone=' + encodeURIComponent(phone)); }
  catch (e) { sub.textContent = 'Lỗi tải đơn'; body.innerHTML = `<div class="empty" style="padding:40px"><p>Không tải được đơn hàng. Thử lại sau.</p></div>`; return; }
  const orders = (data && data.orders) || [];
  if (!orders.length) {
    sub.textContent = 'Chưa có đơn';
    body.innerHTML = emptyHTML('Đặt mua để theo dõi đơn tại đây.');
    body.querySelector('#ord-go').onclick = () => navTab('home');
    return;
  }
  sub.textContent = `${orders.length} đơn · ${esc(phone)}`;
  body.innerHTML = orders.map(o => {
    const [cls, lbl] = OSTATUS[o.status] || ['blue', o.status_label || o.status];
    return `<div class="order-item order-item-clickable" data-ono="${o.order_no}" data-status="${esc(o.status_label || lbl)}" data-vin="${esc(o.vin || '')}" data-model="${esc(o.model || 'Xe điện')}" data-store="${esc(o.store || '')}">
      <div class="oi-top"><span class="ono-tag">${esc(o.order_no)}</span><span class="ostatus ${cls}">${esc(o.status_label || lbl)}</span></div>
      <div class="oi-mid">
        <div class="oi-pic">${scooterSVG('#0a64b4')}</div>
        <div style="flex:1;min-width:0">
          <div class="oi-model">${esc(o.model || 'Xe điện')}</div>
          <div class="oi-vin">${esc(o.vin || '')}</div>
        </div>
        <div class="oi-total">${fmt(o.total)}</div>
      </div>
      <div class="oi-bot"><span>${esc(o.store || '')}</span><span>${esc(o.date_label || (o.date || '').slice(0, 10))}</span></div>
    </div>`;
  }).join('') + '<div style="height:24px"></div>';

  body.querySelectorAll('.order-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      push('order_detail', {
        ono: item.dataset.ono,
        status: item.dataset.status,
        vin: item.dataset.vin,
        model: item.dataset.model,
        store: item.dataset.store
      });
    });
  });
}

SCREENS.order_detail = (entry) => {
  const p = entry.params || {};
  const s = el(`<section class="screen no-tab">
    <div class="detail-top" style="position:static;padding:54px 14px 0;background:var(--bg)">
      <button class="glass-pill" data-back style="background:#fff">${I.back}</button><div style="flex:1"></div>
    </div>
    <div class="screen-scroll" style="padding-top:6px">
      <div class="nav-large"><h1>Chi tiết đơn hàng</h1><div class="sub">${esc(p.ono)}</div></div>
      <div class="section-pad" id="od-body" style="padding-top:14px">Đang tải...</div>
    </div></section>`);
  s.querySelector('[data-back]').onclick = pop;
  api('/orders/' + p.ono).then(d => {
    if (!d || d.error) { s.querySelector('#od-body').innerHTML = '<div class="empty">Không tìm thấy đơn hàng cục bộ</div>'; return; }
    s.querySelector('#od-body').innerHTML = `
      <div class="block-title">Trạng thái</div>
      <div style="background:#fff;border-radius:var(--r-md);padding:14px;margin-bottom:20px;box-shadow:var(--shadow-sm)">
        <div style="font-weight:600;color:var(--brand)">${esc(p.status)}</div>
        ${p.vin ? `<div style="font-size:13px;color:var(--muted);margin-top:4px">Số khung (VIN): ${esc(p.vin)}</div>` : ''}
        ${p.store ? `<div style="font-size:13px;color:var(--muted);margin-top:2px">Đại lý: ${esc(p.store)}</div>` : ''}
      </div>
      <div class="block-title">Sản phẩm (${d.items ? d.items.length : 0})</div>
      <div style="background:#fff;border-radius:var(--r-md);padding:14px;margin-bottom:20px;box-shadow:var(--shadow-sm)">
        ${(d.items||[]).map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div><div style="font-weight:600">${esc(i.name)}</div><div style="font-size:13px;color:var(--muted)">${esc(i.color||'')} · SL: ${i.qty}</div></div>
          <div style="font-weight:600">${fmt(i.unit_sale * i.qty)}</div>
        </div>`).join('')}
      </div>
      <div class="block-title">Thông tin giao hàng</div>
      <div style="background:#fff;border-radius:var(--r-md);padding:14px;margin-bottom:20px;box-shadow:var(--shadow-sm)">
        <div><strong>Người nhận:</strong> ${esc(d.name)}</div>
        <div style="margin-top:6px"><strong>SĐT:</strong> ${esc(d.phone)}</div>
        <div style="margin-top:6px"><strong>Địa chỉ:</strong> ${esc(d.address)}</div>
        <div style="margin-top:6px"><strong>Phương thức:</strong> ${esc(d.payment)}</div>
      </div>
      <div class="block-title">Thanh toán</div>
      <div style="background:#fff;border-radius:var(--r-md);padding:14px;margin-bottom:40px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Tạm tính</span><span>${fmt(d.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Phí giao hàng</span><span>${d.shipping ? fmt(d.shipping) : 'Miễn phí'}</span></div>
        ${d.discount ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--green)"><span>Khuyến mãi</span><span>-${fmt(d.discount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-weight:700;font-size:16px">
          <span>Tổng cộng</span><span style="color:var(--brand)">${fmt(d.total)}</span>
        </div>
      </div>
    `;
  }).catch(() => {
    s.querySelector('#od-body').innerHTML = '<div class="empty">Lỗi kết nối</div>';
  });
  return s;
}

// ---- SETTINGS (Cài đặt) ----
SCREENS.settings = (entry) => {
  const s = el(`<section class="screen no-tab">
    <div class="detail-top" style="position:static;padding:54px 14px 0;background:var(--bg)">
      <button class="glass-pill" data-back style="background:#fff">${I.back}</button><div style="flex:1"></div>
    </div>
    <div class="screen-scroll" style="padding-top:6px">
      <div class="nav-large"><h1>Cài đặt</h1></div>
      <div class="section-pad" id="set-body" style="padding-top:6px"></div>
    </div></section>`);
  s.querySelector('[data-back]').onclick = pop;
  renderSettings(s);
  return s;
};
async function renderSettings(s) {
  const body = s.querySelector('#set-body');
  let cur = null;
  try { cur = await getCurrentSales(); } catch (e) {}
  const prof = cur
    ? `<button class="profile-card" id="set-profile">
        <div class="pc-av">${initials(cur.name)}</div>
        <div style="flex:1;min-width:0;text-align:left"><div class="pc-nm">${esc(cur.name)}</div><div class="pc-sub">${esc(cur.role)} · ${esc(cur.unit_name)}</div></div>
        <span class="pc-go">Hồ sơ →</span></button>`
    : `<div class="profile-card"><div class="pc-av">?</div><div style="flex:1"><div class="pc-nm">Chưa chọn nhân viên</div></div></div>`;
  const sw = (id, on) => `<span class="sw ${on ? 'on' : ''}" data-toggle="${id}"><i></i></span>`;
  body.innerHTML = `${prof}
    <div class="set-group">
      <div class="set-row" id="set-switch"><span class="si">👥</span><div class="st">Đổi nhân viên sales</div><span class="sv">${cur ? esc(cur.id) : ''} ›</span></div>
    </div>
    <div class="set-label">Ứng dụng</div>
    <div class="set-group">
      <div class="set-row"><span class="si">🔔</span><div class="st">Thông báo đơn mới</div>${sw('noti', getPref('noti', true))}</div>
      <div class="set-row"><span class="si">🔁</span><div class="st">Tự đồng bộ Website</div>${sw('sync', getPref('sync', true))}</div>
      <div class="set-row"><span class="si">🌙</span><div class="st">Giao diện tối (sắp có)</div>${sw('dark', false)}</div>
    </div>
    <div class="set-label">Hệ thống</div>
    <div class="set-group">
      <div class="set-row"><span class="si">🌐</span><div class="st">Máy chủ API</div><span class="sv">${esc(API_BASE || 'cùng máy chủ')}</span></div>
      <div class="set-row" id="set-about"><span class="si">ℹ️</span><div class="st">Giới thiệu</div><span class="sv">TA innovation v2 ›</span></div>
      <div class="set-row danger" id="set-reset"><span class="si">🗑️</span><div class="st">Xoá dữ liệu cục bộ</div></div>
    </div>
    <div style="text-align:center;color:var(--faint);font-size:11.5px;margin-top:18px">VinFast Thu Anh · Sales App · build 2026.06</div>
    <div style="height:30px"></div>`;
  const pf = body.querySelector('#set-profile'); if (pf) pf.onclick = () => push('profile');
  body.querySelector('#set-switch').onclick = () => openSalesSheet(() => renderSettings(s));
  body.querySelectorAll('[data-toggle]').forEach(t => t.onclick = () => {
    const id = t.dataset.toggle;
    if (id === 'dark') { toast('Giao diện tối sắp có'); return; }
    const v = !getPref(id, true); setPref(id, v); t.classList.toggle('on', v);
  });
  body.querySelector('#set-about').onclick = () => toast('TA innovation — Sales App đồng bộ Website QLBH');
  body.querySelector('#set-reset').onclick = () => { localStorage.clear(); toast('Đã xoá dữ liệu cục bộ'); setTimeout(() => location.reload(), 700); };
}

// ---- PROFILE (Hồ sơ nhân viên) ----
const PSTAT = { completed: ['green', 'Hoàn tất'], pending: ['amber', 'Chờ duyệt'], vin_verified: ['blue', 'Đã đối soát'] };
SCREENS.profile = (entry) => {
  const s = el(`<section class="screen no-tab">
    <div class="detail-top"><button class="glass-pill" data-back>${I.back}</button><button class="glass-pill" data-switch title="Đổi nhân viên">${I.gear}</button></div>
    <div class="screen-scroll" id="prof-scroll"><div class="empty"><div class="ei skel" style="width:70px;height:70px"></div></div></div>
  </section>`);
  s.querySelector('[data-back]').onclick = pop;
  s.querySelector('[data-switch]').onclick = () => openSalesSheet(() => renderProfile(s));
  renderProfile(s);
  return s;
};
async function renderProfile(s) {
  const scroll = s.querySelector('#prof-scroll');
  let d;
  try { d = await api('/sales/' + state.salesId + '/stats'); } catch (e) { scroll.innerHTML = '<div class="empty" style="padding-top:60px">Không tải được hồ sơ.</div>'; return; }
  const sp = d.sales;
  const pct = Math.min(100, Math.round((d.month_orders / (d.target || 30)) * 100));
  scroll.innerHTML = `
    <div class="prof-hero">
      <div class="prof-av">${initials(sp.name)}</div>
      <h1>${esc(sp.name)}</h1>
      <div class="prof-role">${esc(sp.role)}</div>
      <div class="prof-badges"><span class="badge blue">${esc(sp.unit_name)}</span><span class="badge green">${esc(sp.store_name)}</span><span class="badge new">Mã ${esc(sp.id)}</span></div>
    </div>
    <div class="section-pad" style="padding-top:4px">
      <div class="prof-stats">
        <div class="ps"><div class="v">${num(d.orders)}</div><div class="k">Đơn đã bán</div></div>
        <div class="ps"><div class="v">${vndShort(d.revenue)}</div><div class="k">Doanh thu</div></div>
        <div class="ps"><div class="v">${num(d.pending)}</div><div class="k">Đang xử lý</div></div>
      </div>
      <div class="prof-target">
        <div class="pt-top"><span>Chỉ tiêu tháng ${d.month ? monthLabel(d.month) : ''}</span><b>${d.month_orders}/${d.target} xe</b></div>
        <div class="bar-track" style="height:9px"><div class="bar-fill" style="width:${pct}%;background:${pct >= 100 ? 'var(--green)' : 'var(--brand)'}"></div></div>
        <div class="pt-sub">Doanh thu tháng ${fmt(d.month_revenue)} · Dòng bán chạy: <b>${esc(d.top_model || '—')}</b></div>
      </div>
      <div class="block-title" style="margin:18px 2px 8px">Liên hệ</div>
      <div class="prof-contact">
        <div class="pr-row"><span>📞 Điện thoại</span><b>${esc(sp.phone)}</b></div>
        <div class="pr-row"><span>✉️ Email</span><b>${esc(sp.email)}</b></div>
      </div>
      <div class="block-title" style="margin:18px 2px 8px">Đơn gần đây</div>
      ${d.recent.length ? d.recent.map(o => {
        const st = PSTAT[o.status] || ['blue', o.status_label];
        return `<div class="order-item" style="margin-bottom:9px">
          <div class="oi-top"><span class="ono-tag">${esc(o.order_no)}</span><span class="ostatus ${st[0]}">${esc(o.status_label || st[1])}</span></div>
          <div class="oi-bot" style="border:none;margin:0;padding-top:7px"><span>${esc(o.customer)} · ${esc(o.model || '')}</span><b style="color:var(--brand)">${fmt(o.total)}</b></div>
        </div>`;
      }).join('') : '<div class="empty" style="padding:20px">Chưa có đơn.</div>'}
      <div style="height:30px"></div>
    </div>`;
}

// ---- Sales helpers ----
async function ensureSales() { if (!state.salesData) state.salesData = await api('/sales'); return state.salesData; }
async function getCurrentSales() { const d = await ensureSales(); return d.sales.find(x => x.id === state.salesId) || d.sales[0]; }
function setSales(id) { state.salesId = id; localStorage.setItem('ta_sales_id', id); }
async function openSalesSheet(onPick) {
  let data;
  try { data = await ensureSales(); } catch (e) { toast('Không tải được nhân viên'); return; }

  let GoogleAuth = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins.GoogleAuth : null;
  if (GoogleAuth) {
    try {
      if (!window.__googleAuthInit) {
        GoogleAuth.initialize();
        window.__googleAuthInit = true;
      }
      const user = await GoogleAuth.signIn();
      if (user && user.email) {
        let match = data.sales.find(s => s.email.toLowerCase() === user.email.toLowerCase());
        if (!match) {
          toast('LỖI: Email ' + user.email + ' chưa được cấp quyền truy cập hệ thống!');
          await GoogleAuth.signOut(); // Đăng xuất luôn để họ có thể chọn tài khoản khác
          return;
        }
        toast('Đăng nhập thành công: ' + match.name);
        setSales(match.id);
        if (onPick) onPick();
        return;
      }
    } catch (err) {
      console.log('Google Auth Error', err);
      toast('Lỗi Đăng nhập Google, quay lại cách thủ công.');
    }
  }

  // Fallback / Cách thủ công
  const inner = `<div class="sales-sheet">
    <div class="ps-head"><h3>Đăng nhập / Chọn nhân viên</h3><p>Google Login hoặc chọn thủ công bên dưới</p></div>
    <div class="su-list">${data.units.map(u => `<div class="su-group"><div class="su-label">${esc(u.name)} · ${esc(u.store_name)}</div>
      ${data.sales.filter(x => x.unit === u.code).map(x => `<button class="su-item ${x.id === state.salesId ? 'on' : ''}" data-sid="${esc(x.id)}">
        <div class="su-av">${initials(x.name)}</div>
        <div style="flex:1;text-align:left;min-width:0"><div class="a">Sales ${x.seq} · ${esc(x.name)}</div><div class="b">${esc(x.role)}</div></div>
        ${x.id === state.salesId ? '<span class="su-on">' + I.check + '</span>' : '<span class="su-pick">Chọn</span>'}
      </button>`).join('')}</div>`).join('')}</div>
  </div>`;
  const close = openSheet(inner, (root) => {
    root.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { setSales(b.dataset.sid); close(); toast('Đã chuyển sang ' + b.querySelector('.a').textContent.split('·')[1].trim()); if (onPick) onPick(); });
  });
}

// ---- NOTIFICATIONS (Thông báo) ----
const NTONE = { new: ['amber', '#f59e0b'], verified: ['blue', '#0a64b4'], done: ['green', '#10b981'], cancel: ['off', '#dc2626'], info: ['gray', '#64748b'] };
SCREENS.notifications = (entry) => {
  const s = el(`<section class="screen no-tab">
    <div class="detail-top" style="position:static;padding:54px 14px 0;background:var(--bg)">
      <button class="glass-pill" data-back style="background:#fff">${I.back}</button><div style="flex:1"></div>
    </div>
    <div class="screen-scroll" style="padding-top:6px">
      <div class="nav-large"><h1>Thông báo</h1><div class="sub" id="nt-sub">Cập nhật đơn hàng</div></div>
      <div class="section-pad" id="nt-body" style="padding-top:6px"></div>
    </div></section>`);
  s.querySelector('[data-back]').onclick = pop;
  renderNotifications(s);
  return s;
};
async function renderNotifications(s) {
  const body = s.querySelector('#nt-body');
  const sub = s.querySelector('#nt-sub');
  let items;
  try { items = (await api('/notifications?sales_id=' + encodeURIComponent(state.salesId))).items; }
  catch (e) { body.innerHTML = '<div class="empty" style="padding:40px">Không tải được thông báo.</div>'; return; }
  if (!items.length) {
    sub.textContent = 'Chưa có';
    body.innerHTML = `<div class="empty" style="padding:50px 30px"><div class="ei">${I.cartBig}</div><h3>Chưa có thông báo</h3><p>Thông báo về đơn được mở, được duyệt, hoàn tất sẽ hiện ở đây.</p></div>`;
    return;
  }
  const dt = t => { if (!t) return ''; const [d, tm] = t.split('T'); const p = d.split('-'); return `${p[2]}/${p[1]} ${tm ? tm.slice(0, 5) : ''}`.trim(); };
  sub.textContent = `${items.length} cập nhật · ${esc(state.salesId)}`;
  body.innerHTML = `<div class="nt-legend">
      <span><i style="background:#f59e0b"></i>Đơn mở</span>
      <span><i style="background:#0a64b4"></i>Được duyệt</span>
      <span><i style="background:#10b981"></i>Hoàn tất</span></div>
    <div class="nt-list">${items.map(n => {
      const tone = NTONE[n.type] || NTONE.info;
      const [, lbl] = OSTATUS[n.status] || ['', n.status];
      return `<div class="nt-item nt-item-clickable" data-ono="${n.order_no}" data-status="${esc(lbl)}" data-vin="${esc(n.vin || '')}" data-model="${esc(n.model || 'Xe điện')}" data-store="${esc(n.store || '')}">
        <div class="nt-ic" style="background:${tone[1]}22">${n.icon}</div>
        <div class="nt-tx">
          <div class="nt-title">${esc(n.title)} <span class="ostatus ${tone[0]}">${esc(n.order_no)}</span></div>
          <div class="nt-csub">${esc(n.customer)} · ${esc(n.model || '')}${n.sub ? ' — ' + esc(n.sub) : ''}</div>
          <div class="nt-meta">${fmt(n.total)} · ${dt(n.time)}</div>
        </div></div>`;
    }).join('')}</div><div style="height:30px"></div>`;

  body.querySelectorAll('.nt-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      push('order_detail', {
        ono: item.dataset.ono,
        status: item.dataset.status,
        vin: item.dataset.vin,
        model: item.dataset.model,
        store: item.dataset.store
      });
    });
  });
}

// ---- CHECKOUT ----
SCREENS.checkout = (entry) => {
  const c = state.cart;
  const pays = [
    ['visa', '#1a1f71', 'VISA', 'Thẻ Visa •••• 4242', 'Hết hạn 09/28 · TPBank'],
    ['vnpay', '#0a64b4', 'QR', 'VNPay QR', 'Quét bằng app ngân hàng'],
    ['installment', '#10b981', '0%', 'Trả góp 0%', '6 tháng · ' + fmt(Math.round(c.total / 6)) + '/tháng'],
  ];
  const s = el(`<section class="screen no-tab">
    <div class="detail-top" style="position:static;padding:54px 14px 0;background:var(--bg)">
      <button class="glass-pill" data-back style="background:#fff">${I.back}</button>
      <div style="flex:1"></div>
    </div>
    <div class="screen-scroll" style="padding-top:6px">
      <div class="steps">
        <div class="st done"><div class="n">${I.check}</div>Giỏ hàng</div><div class="bar"></div>
        <div class="st on"><div class="n">2</div>Thanh toán</div><div class="bar"></div>
        <div class="st"><div class="n">3</div>Hoàn tất</div>
      </div>
      <div class="nav-large" style="padding-top:4px"><h1>Thông tin đặt hàng</h1></div>
      <div class="section-pad" style="padding-top:6px">
        <div class="co-card">
          <div class="ch"><h3>Thông tin khách hàng</h3>
            <button class="qr-btn" id="co-qr">${I.qr}<span>Quét CCCD</span></button></div>
          <div class="co-progress" id="co-progress"><div class="cp-bar"><i id="cp-fill"></i></div><span id="cp-txt"></span></div>
          <div class="cform">
            <label class="fld"><span>Họ và tên *</span><input id="f-name" value="${esc(state.checkout.name)}" placeholder="Nguyễn Văn A" autocomplete="name"></label>
            <div class="frow">
              <label class="fld"><span>Số điện thoại *</span><input id="f-phone" value="${esc(state.checkout.phone)}" inputmode="tel" placeholder="09xx xxx xxx"></label>
              <label class="fld"><span>Số CCCD</span><input id="f-cccd" value="${esc(state.checkout.cccd)}" inputmode="numeric" placeholder="12 số trên thẻ"></label>
            </div>
            <div class="frow">
              <label class="fld"><span>Ngày sinh</span><input id="f-dob" type="date" value="${esc(state.checkout.dob)}"></label>
              <label class="fld"><span>Giới tính</span><select id="f-gender"><option value="">—</option><option ${state.checkout.gender === 'Nam' ? 'selected' : ''}>Nam</option><option ${state.checkout.gender === 'Nữ' ? 'selected' : ''}>Nữ</option></select></label>
            </div>
            <label class="fld"><span>Địa chỉ giao *</span><input id="f-address" value="${esc(state.checkout.address)}" placeholder="Số nhà, đường, quận, thành phố"></label>
            <label class="fld"><span>Email (không bắt buộc)</span><input id="f-email" type="email" value="${esc(state.checkout.email)}" placeholder="email@example.com"></label>
          </div>
        </div>
        <div class="co-card">
          <div class="ch"><h3>Ảnh đính kèm</h3><span class="hint" id="img-hint">${state.checkout.images.length} ảnh</span></div>
          <div class="photo-grid" id="photo-grid"></div>
          <div class="photo-add-row">
            <label class="ph-add">${I.camera}<span>CCCD</span><input type="file" accept="image/*" capture="environment" data-grp="CCCD" hidden></label>
            <label class="ph-add">${I.camera}<span>Ảnh xe</span><input type="file" accept="image/*" capture="environment" data-grp="Xe" hidden></label>
            <label class="ph-add">${I.camera}<span>Khác</span><input type="file" accept="image/*" capture="environment" data-grp="Khac" hidden></label>
          </div>
        </div>
        <div class="co-card">
          <div class="ch"><h3>Phương thức thanh toán</h3></div>
          ${pays.map(p => `<div class="pay ${p[0] === state.checkoutPay ? 'on' : ''}" data-pay="${p[0]}">
            <div class="pi" style="background:${p[1]}">${p[2]}</div>
            <div class="pinfo"><div class="a">${esc(p[3])}</div><div class="b">${esc(p[4])}</div></div>
            <div class="radio"></div></div>`).join('')}
        </div>
        <div class="summary">
          <h3>Tóm tắt</h3>
          <div class="sr"><span>Tạm tính (${c.count})</span><span class="v">${fmt(c.subtotal)}</span></div>
          ${c.discount ? `<div class="sr disc"><span>${esc(c.promo ? c.promo.code : 'Ưu đãi')}</span><span class="v">−${fmt(c.discount)}</span></div>` : ''}
          <div class="sr"><span>Phí giao hàng</span><span class="v">Miễn phí</span></div>
          <div class="sr total"><span>Tổng cộng</span><span class="v">${fmt(c.total)}</span></div>
        </div>
        <div style="height:96px"></div>
      </div>
    </div>
    <div class="action-bar">
      <div style="flex:1"><div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--faint)">PHẢI TRẢ</div><div style="font-size:18px;font-weight:800;color:var(--ink-strong)">${fmt(c.total)}</div></div>
      <button class="btn btn-primary" style="flex:1.7" id="co-place"><span class="cta-sub">Bước 3 · Hoàn tất</span>Đặt hàng →</button>
    </div>
  </section>`);
  s.querySelector('[data-back]').onclick = pop;
  s.querySelectorAll('[data-pay]').forEach(p => p.onclick = () => {
    state.checkoutPay = p.dataset.pay;
    s.querySelectorAll('[data-pay]').forEach(x => x.classList.toggle('on', x === p));
  });
  // form ↔ state.checkout
  CO_FIELDS.forEach(k => {
    const inp = s.querySelector('#f-' + k);
    if (inp) inp.addEventListener('input', () => { state.checkout[k] = inp.value; updateCheckoutProgress(s); });
  });
  renderCoPhotos(s);
  bindCoPhotos(s);
  updateCheckoutProgress(s);
  s.querySelector('#co-qr').onclick = () => openCCCDScanner(data => {
    Object.assign(state.checkout, data);
    fillCheckoutForm(s);
    updateCheckoutProgress(s);
    toast('Đã điền thông tin từ CCCD');
  });
  s.querySelector('#co-place').onclick = () => placeOrder(s);
  return s;
};

const CO_FIELDS = ['name', 'phone', 'cccd', 'dob', 'gender', 'address', 'email'];
function updateCheckoutProgress(s) {
  const co = state.checkout;
  const fields = ['name', 'phone', 'address', 'cccd', 'dob', 'gender', 'email'];
  let done = fields.filter(k => (co[k] || '').toString().trim()).length;
  if (co.images.length) done++;
  const pct = Math.round(done / (fields.length + 1) * 100);
  const fill = s.querySelector('#cp-fill'); const txt = s.querySelector('#cp-txt');
  if (fill) { fill.style.transform = 'scaleX(' + (pct / 100) + ')'; fill.style.background = pct >= 100 ? 'var(--green)' : 'var(--brand)'; }
  if (txt) txt.textContent = `Hồ sơ ${pct}% · ${co.images.length} ảnh${pct >= 100 ? ' · đầy đủ ✓' : ''}`;
}
function fillCheckoutForm(s) {
  CO_FIELDS.forEach(k => { const inp = s.querySelector('#f-' + k); if (inp && state.checkout[k] != null) inp.value = state.checkout[k]; });
}
function renderCoPhotos(s) {
  const grid = s.querySelector('#photo-grid'); if (!grid) return;
  const imgs = state.checkout.images;
  grid.innerHTML = imgs.map((im, i) => `<div class="ph-thumb"><img src="${im.data_url}" alt=""><span class="ph-grp">${esc(im.group)}</span><button class="ph-rm" data-i="${i}">×</button></div>`).join('');
  grid.querySelectorAll('.ph-rm').forEach(b => b.onclick = () => {
    imgs.splice(+b.dataset.i, 1); renderCoPhotos(s);
    s.querySelector('#img-hint').textContent = imgs.length + ' ảnh';
  });
  updateCheckoutProgress(s);
}
function bindCoPhotos(s) {
  s.querySelectorAll('.ph-add input[type=file]').forEach(inp => {
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        state.checkout.images.push({ group: inp.dataset.grp, filename: f.name || (inp.dataset.grp + '.jpg'), data_url: r.result });
        renderCoPhotos(s);
        s.querySelector('#img-hint').textContent = state.checkout.images.length + ' ảnh';
        toast('Đã thêm ảnh ' + inp.dataset.grp);
      };
      r.readAsDataURL(f); inp.value = '';
    };
  });
}

// ---- CCCD QR: parse + scanner ----
function parseCCCD(raw) {
  const parts = (raw || '').trim().split('|');
  if (parts.length < 3) return null;
  const dob = (s => /^\d{8}$/.test(s) ? `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}` : '')((parts[3] || '').trim());
  return {
    cccd: (parts[0] || '').trim(), name: (parts[2] || '').trim(),
    dob, gender: (parts[4] || '').trim(), address: (parts[5] || '').trim(),
  };
}
function openCCCDScanner(onResult) {
  const inner = `<div class="qr-sheet">
    <div class="qr-head"><h3>${I.scan}Quét QR trên CCCD</h3><p>Đưa mã QR ở mặt trước thẻ căn cước vào khung</p></div>
    <div class="qr-stage" id="qr-stage">
      <video id="qr-video" playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
      <canvas id="qr-canvas" hidden></canvas>
      <div class="qr-frame"></div>
      <div class="qr-status" id="qr-status">Đang mở camera…</div>
    </div>
    <div class="qr-alts">
      <label class="btn btn-line btn-sm" style="flex:1">Tải ảnh QR<input id="qr-file" type="file" accept="image/*" hidden></label>
      <button class="btn btn-line btn-sm" id="qr-paste" style="flex:1">Dán nội dung</button>
      <button class="btn btn-primary btn-sm" id="qr-demo" style="flex:1">Dữ liệu mẫu</button>
    </div></div>`;
  let stream = null, raf = null, closed = false;
  const cleanup = () => { closed = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); };
  const closeSheet = openSheet(inner, (root) => {
    const video = root.querySelector('#qr-video');
    const canvasElement = root.querySelector('#qr-canvas');
    const canvas = canvasElement.getContext('2d', { willReadFrequently: true });
    const status = root.querySelector('#qr-status');
    const finish = raw => {
      const data = parseCCCD(raw);
      if (!data || !data.cccd) { status.textContent = 'Mã QR không đúng định dạng CCCD.'; return; }
      cleanup(); closeSheet(); onResult(data);
    };
    root.querySelector('.backdrop').addEventListener('click', cleanup, { once: true });
    
    if (typeof jsQR !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(st => {
        stream = st; video.srcObject = st; video.play(); status.textContent = 'Đang quét…';
        const loop = () => {
          if (closed) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) return finish(code.data);
          }
          raf = requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }).catch(() => { status.textContent = 'Không mở được camera — dùng nút bên dưới.'; root.querySelector('#qr-stage').classList.add('nocam'); });
    } else {
      status.textContent = 'Dùng "Tải ảnh QR" / "Dán nội dung" / "Dữ liệu mẫu" bên dưới.';
      root.querySelector('#qr-stage').classList.add('nocam');
    }

    root.querySelector('#qr-file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      status.textContent = 'Đang đọc ảnh…';
      try {
        if (typeof jsQR === 'undefined') return (status.textContent = 'Hệ thống chưa tải xong jsQR.');
        const bmp = await createImageBitmap(f);
        canvasElement.width = bmp.width;
        canvasElement.height = bmp.height;
        canvas.drawImage(bmp, 0, 0);
        const imageData = canvas.getImageData(0, 0, bmp.width, bmp.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) finish(code.data); else status.textContent = 'Không tìm thấy QR trong ảnh.';
      } catch (er) { status.textContent = 'Không đọc được ảnh.'; }
    };
    root.querySelector('#qr-paste').onclick = () => {
      const raw = prompt('Dán nội dung mã QR CCCD\n(CCCD|CMND|Họ tên|DDMMYYYY|Giới tính|Địa chỉ|Ngày cấp):');
      if (raw) finish(raw);
    };
    root.querySelector('#qr-demo').onclick = () =>
      finish('001099012345|161234567|Trần Thị Hương|15081999|Nữ|Số 12 ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội|10072021');
  });
}

// ---- SUCCESS overlay ----
function showSuccess(order) {
  const sync = order.sync || {};
  const synced = sync.orders || [];
  const syncBlock = synced.length
    ? `<div class="suc-sync"><div class="sl"><span>Mã đơn đại lý</span><b>${synced.map(o => esc(o.order_no)).join(', ')}</b></div>
        <div class="sl"><span>Đã khóa xe (VIN)</span><b>${esc(synced[0].vin)}${synced.length > 1 ? ' +' + (synced.length - 1) : ''}</b></div>
        ${sync.images_saved ? `<div class="sl"><span>Ảnh đính kèm</span><b>${sync.images_saved} ảnh</b></div>` : ''}
        <div class="suc-note">✓ Đã đồng bộ về hệ thống đại lý · đang chờ duyệt số khung</div></div>`
    : '';
  const ov = el(`<div class="success">
    <div class="suc-step">Bước 3/3 · Hoàn tất</div>
    <div class="check">${I.bigcheck}</div>
    <h2>Đặt hàng thành công!</h2>
    <p>Cảm ơn bạn đã mua sắm tại TA innovation.<br>Đơn hàng đang được xử lý — giao ${deliveryRange()}.</p>
    <div class="ono">Mã đơn: ${esc(order.order_no)}</div>
    ${syncBlock}
    <div class="suc-actions">
      <button class="btn" id="suc-orders">Xem đơn của tôi</button>
      <button class="btn ghost" id="suc-home">Về trang chủ</button>
    </div>
  </div>`);
  phone.appendChild(ov);
  void ov.offsetWidth; ov.classList.add('in');
  const dismiss = (tab) => { ov.classList.remove('in'); afterAnim(ov, () => ov.remove()); navTab(tab); };
  ov.querySelector('#suc-home').onclick = () => dismiss('home');
  ov.querySelector('#suc-orders').onclick = () => dismiss('orders');
}

// ════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════
const overlay = document.getElementById('overlay');
function openSheet(innerHTML, onMount) {
  overlay.innerHTML = `<div class="backdrop"></div><div class="sheet">${innerHTML}</div>`;
  overlay.classList.add('show');
  const bd = overlay.querySelector('.backdrop'), sh = overlay.querySelector('.sheet');
  void sh.offsetWidth; bd.classList.add('in'); sh.classList.add('in');
  const close = () => {
    bd.classList.remove('in'); sh.classList.remove('in');
    afterAnim(sh, () => { overlay.classList.remove('show'); overlay.innerHTML = ''; });
  };
  bd.onclick = close;
  if (onMount) onMount(overlay, close);
  return close;
}

let promoTimer = null;
function showPromoPopup() {
  const promo = state.catalog && state.catalog.promo; if (!promo) return;
  const amio = state.catalog.products.find(p => p.slug === 'amio');
  const saveEx = amio ? Math.round(amio.price_base * promo.pct / 100) : 2224000;
  const close = openSheet(`<div class="promo-pop">
    <div class="grab"></div>
    <span class="live"><i class="blink"></i>LIVE · CHỈ HÔM NAY</span>
    <div class="pct">-16<span>%</span></div>
    <div style="font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--brand)">TOÀN BỘ DÒNG XE KHÔNG CẦN BẰNG LÁI</div>
    <h2>${esc(promo.title)}</h2>
    <p class="desc">${esc(promo.detail)}</p>
    <div class="meta">
      <div class="box"><div class="k">Còn lại</div><div class="v" id="promo-cd">--:--:--</div></div>
      <div class="box save"><div class="k">Tiết kiệm</div><div class="v">~${fmt(saveEx)}</div></div>
    </div>
    <div class="code">Mã: <b>${esc(promo.code)}</b> · Áp dụng tự động khi thanh toán</div>
    <button class="btn btn-primary" style="margin-top:16px" id="promo-cta">Nhận ưu đãi ngay →</button>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" id="promo-close">Để sau</button>
  </div>`, (root, close) => {
    const cd = root.querySelector('#promo-cd');
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      let d = Math.max(0, Math.floor((end - now) / 1000));
      const h = String(Math.floor(d / 3600)).padStart(2, '0');
      const m = String(Math.floor((d % 3600) / 60)).padStart(2, '0');
      const sec = String(d % 60).padStart(2, '0');
      cd.textContent = `${h} : ${m} : ${sec}`;
    };
    tick(); clearInterval(promoTimer); promoTimer = setInterval(tick, 1000);
    root.querySelector('#promo-close').onclick = () => { clearInterval(promoTimer); close(); };
    root.querySelector('#promo-cta').onclick = () => {
      clearInterval(promoTimer); close(); state.catalogSeg = 'hoc_sinh'; navTab('catalog');
    };
  });
}

function showAddSheet(p, color, option) {
  openSheet(`<div style="text-align:center">
    <div class="grab"></div>
    <div style="width:60px;height:60px;border-radius:50%;background:var(--green-l);color:var(--green-d);display:flex;align-items:center;justify-content:center;margin:4px auto 12px">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    <h2 style="font-size:18px;font-weight:800;color:var(--ink-strong)">Đã thêm vào giỏ</h2>
    <p style="font-size:13px;color:var(--muted);margin-top:6px">${esc(p.name)} · ${esc(color)} · ${option === 'rent' ? 'thuê pin' : 'mua đứt'}</p>
    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="btn btn-line" id="as-cont">Tiếp tục xem</button>
      <button class="btn btn-primary" id="as-cart">Tới giỏ hàng →</button>
    </div></div>`, (root, close) => {
    root.querySelector('#as-cont').onclick = close;
    root.querySelector('#as-cart').onclick = () => { close(); navTab('cart'); };
  });
}

// ── Toast ────────────────────────────────────────────────────
let toastT = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = el('<div id="toast" style="position:absolute;left:50%;bottom:calc(var(--tab-h) + 18px);transform:translateX(-50%) translateY(10px);background:rgba(15,23,42,.92);color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;z-index:90;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;white-space:nowrap;backdrop-filter:blur(8px)"></div>'); phone.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)'; }, 1800);
}

// ════════════════════════════════════════════════════════════
//  DATA ACTIONS
// ════════════════════════════════════════════════════════════
async function ensureCatalog(seg = 'all') {
  // 'all' fetch caches the full set with counts/categories/promo
  if (seg === 'all') {
    if (!state.catalog) state.catalog = await api('/catalog?segment=all');
    return state.catalog;
  }
  const full = await ensureCatalog('all');
  return { ...full, products: full.products.filter(p => p.segment === seg) };
}
async function loadProduct(slug) {
  if (!state.productCache[slug]) state.productCache[slug] = await api('/products/' + slug);
  return state.productCache[slug];
}
async function ensureAddons() { if (!state.addons) state.addons = (await api('/addons')).addons; return state.addons; }
async function ensurePromos() { if (!state.promos) state.promos = (await api('/promos')).promos; return state.promos; }
function reRenderCart() {
  renderTabbar();
  const top = stack[stack.length - 1];
  if (top && top.name === 'cart') renderCartScreen(top.el);
}
async function addAddon(sku) {
  state.cart = await api('/cart/addons', { method: 'POST', body: JSON.stringify({ sku, qty: 1 }) });
  reRenderCart(); toast('Đã thêm vào giỏ');
}
async function removeAddon(sku) {
  state.cart = await api('/cart/addons/' + sku, { method: 'DELETE' });
  reRenderCart();
}
async function applyPromo(code) {
  try {
    state.cart = await api('/cart/promo', { method: 'POST', body: JSON.stringify({ code }) });
    reRenderCart(); toast('Đã áp mã ' + code.toUpperCase());
    return true;
  } catch (e) {
    toast('Mã không hợp lệ hoặc chưa đủ điều kiện');
    return false;
  }
}
async function removePromo() {
  state.cart = await api('/cart/promo', { method: 'DELETE' });
  reRenderCart();
}
async function refreshCart() {
  state.cart = await api('/cart');
  renderTabbar();
  // re-render cart screen if visible
  const top = stack[stack.length - 1];
  if (top && top.name === 'cart') renderCartScreen(top.el);
}
async function addToCart(slug, color, option) {
  state.cart = await api('/cart/items', { method: 'POST', body: JSON.stringify({ slug, color, option, qty: 1 }) });
  renderTabbar();
}
async function updateQty(id, qty) {
  state.cart = await api('/cart/items/' + id, { method: 'PATCH', body: JSON.stringify({ qty }) });
  renderTabbar();
  const top = stack[stack.length - 1]; if (top && top.name === 'cart') renderCartScreen(top.el);
}
async function removeItem(id) {
  state.cart = await api('/cart/items/' + id, { method: 'DELETE' });
  renderTabbar();
  const top = stack[stack.length - 1]; if (top && top.name === 'cart') renderCartScreen(top.el);
}
async function placeOrder(scope) {
  const co = state.checkout;
  CO_FIELDS.forEach(k => { const inp = scope.querySelector('#f-' + k); if (inp) co[k] = inp.value.trim(); });
  if (!co.name || !co.phone || !co.address) {
    toast('Nhập đủ Họ tên, SĐT và Địa chỉ');
    const miss = !co.name ? 'name' : !co.phone ? 'phone' : 'address';
    const inp = scope.querySelector('#f-' + miss); if (inp) { inp.focus(); inp.classList.add('err'); setTimeout(() => inp.classList.remove('err'), 1500); }
    return;
  }
  const btn = scope.querySelector('#co-place'); btn.disabled = true; btn.textContent = 'Đang xử lý…';
  try {
    const order = await api('/orders', { method: 'POST', body: JSON.stringify({
      name: co.name, phone: co.phone, cccd: co.cccd, dob: co.dob, gender: co.gender,
      address: co.address, email: co.email, payment: state.checkoutPay, images: co.images,
      sales_id: state.salesId,
    }) });
    if (co.phone) localStorage.setItem('ta_phone', co.phone);
    await refreshCart();
    if (typeof closeSheet === 'function') closeSheet();
    showSuccess(order);
    state.checkout = { name: '', phone: '', cccd: '', dob: '', gender: '', address: '', email: '', images: [] };
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Đặt hàng'; toast(e.message || 'Có lỗi, thử lại');
  }
}

// compare toggle
function toggleCompare(slug) {
  const i = state.compare.indexOf(slug);
  if (i >= 0) state.compare.splice(i, 1);
  else { if (state.compare.length >= 3) { toast('Tối đa 3 xe để so sánh'); return; } state.compare.push(slug); }
  localStorage.setItem('ta_compare', JSON.stringify(state.compare));
  renderTabbar();
  // update any visible compare buttons
  document.querySelectorAll('[data-cmp]').forEach(b => {
    const on = state.compare.includes(b.dataset.cmp);
    b.classList.toggle('on', on);
    b.innerHTML = on ? I.check : '+';
  });
  updateCmpBar();
}
function updateCmpBar() {
  const root = stack[stack.length - 1];
  if (root && root._updateCmpBar) root._updateCmpBar();
}
function clearCompare() {
  if (!state.compare.length) return;
  state.compare = [];
  localStorage.setItem('ta_compare', '[]');
  renderTabbar();
  document.querySelectorAll('[data-cmp]').forEach(b => { b.classList.remove('on'); b.innerHTML = '+'; });
  updateCmpBar();
  toast('Đã xoá danh sách so sánh');
}

// ── Edge-swipe back gesture ──────────────────────────────────
let swipe = null;
views.addEventListener('touchstart', e => {
  if (stack.length < 2 || animating) return;
  const t = e.touches[0];
  if (t.clientX <= 26) swipe = { x: t.clientX, y: t.clientY };
}, { passive: true });
views.addEventListener('touchmove', e => {
  if (!swipe) return;
  const t = e.touches[0];
  if (t.clientX - swipe.x > 70 && Math.abs(t.clientY - swipe.y) < 60) { pop(); swipe = null; }
}, { passive: true });
views.addEventListener('touchend', () => { swipe = null; });

// ── Fit phone frame to window (keep true iPhone aspect) ──────
function fitPhone() {
  if (window.innerWidth < 520) { phone.style.transform = ''; return; }
  const margin = 24;
  const s = Math.min(1, (window.innerHeight - margin) / 874, (window.innerWidth - margin) / 402);
  phone.style.transform = 'scale(' + s.toFixed(4) + ')';
}
window.addEventListener('resize', fitPhone);
window.addEventListener('orientationchange', fitPhone);

// Đoạn code nhúng vào cuối app.js
SCREENS.login = (entry) => {
  const s = el(`<section class="screen login-screen" style="background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px;text-align:center;">
    <div style="background:#fff;padding:36px 24px;border-radius:24px;width:100%;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,.2);">
      <img src="assets/icon.png" style="width:72px;height:72px;margin-bottom:16px;border-radius:18px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Đăng nhập hệ thống</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">Dành riêng cho nhân sự VinFast Thu Anh</p>
      
      <div id="gg-btn-wrap" style="display:flex;justify-content:center;margin-bottom:20px;min-height:44px;">
        <button class="btn btn-primary" id="btn-mock-login" style="display:none;width:100%;">Đăng nhập (Mock)</button>
      </div>

      <div style="font-size:12px;color:#94a3b8;line-height:1.5;">
        * Hệ thống yêu cầu tài khoản Google nội bộ.<br>
        Vui lòng sử dụng email công ty đã được cấp quyền.
      </div>
    </div>
  </section>`);

  const wrap = s.querySelector('#gg-btn-wrap');
  const initGG = () => {
    let GoogleAuth = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins.GoogleAuth : null;
    if (GoogleAuth) {
      if (!window.__googleAuthInit) { GoogleAuth.initialize(); window.__googleAuthInit = true; }
      const btn = el(`<button class="btn btn-primary" style="width:100%;background:#fff;color:#334155;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="https://www.google.com/favicon.ico" width="18"> Đăng nhập bằng Google
      </button>`);
      wrap.innerHTML = ''; wrap.appendChild(btn);
      btn.onclick = async () => {
        try {
          const user = await GoogleAuth.signIn();
          if (user && user.authentication && user.authentication.idToken) {
            await handleLoginToken(user.authentication.idToken);
          }
        } catch (e) { toast('Lỗi đăng nhập: ' + e); }
      };
    } else if (window.google && google.accounts) {
      google.accounts.id.initialize({
        client_id: document.querySelector('meta[name="google-signin-client_id"]').content,
        callback: async (res) => { await handleLoginToken(res.credential); }
      });
      google.accounts.id.renderButton(wrap, { theme: 'outline', size: 'large', width: 280, shape: 'pill' });
    } else {
      setTimeout(initGG, 500); // Retry if library not loaded
    }
  };
  
  // Call init
  requestAnimationFrame(initGG);
  
  return s;
};

async function handleLoginToken(token) {
  try {
    const res = await fetch(API_BASE + '/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Xác thực thất bại');
    
    localStorage.setItem('ta_token', data.access_token);
    localStorage.setItem('ta_user', JSON.stringify(data.user));
    toast('Đăng nhập thành công: ' + data.user.name);
    navTab('catalog'); // Vào trang chính
  } catch (e) {
    toast('Lỗi: ' + e.message);
  }
}
// ── Boot ─────────────────────────────────────────────────────
async function boot() {
  fitPhone();
  try { await refreshCart(); } catch (e) {}
  
  const token = localStorage.getItem('ta_token');
  if (token) {
    navTab('home');
  } else {
    navTab('login');
  }
}
boot();

})();
