/* Kelola Bot Topup — portal penyewa (Baramarket).
 * Semua data lewat /api/portal (Cloudflare Functions). Teks wording selalu dirender sebagai TEKS (textContent),
 * tidak pernah sebagai HTML, jadi wording apa pun aman ditampilkan. */
(() => {
  'use strict';
  const API = '/api/portal';
  const MAIN_BOT = '0812-6642-6608';               // nomor bot topup utama Baramarket (pengirim kode OTP)
  const PAGES_URL = 'https://baramarket.my.id/portal/';
  const GROUP_URL = 'https://chat.whatsapp.com/DL37Hg46ecsGfXAF4qsaTl';   // grup diskusi penyewa bot topup
  const READMORE = '‎'.repeat(4001);
  const LS_PHONE = 'bmp-phone', LS_BOT = 'bmp-bot';

  // ───────────────────────── ikon (konstan, aman) ─────────────────────────
  const P = {
    bot: '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    tap: '<path d="M9 11V5a2 2 0 0 1 4 0v5"/><path d="M13 10a2 2 0 0 1 4 0v1"/><path d="M17 11a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-4.6-2.2L4 14.5a2 2 0 0 1 3-2.6L9 14"/>',
    menu: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3"/><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 12h-4a2 2 0 0 0 0 4h4z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    spark: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    burger: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/><path d="m15.5 10-2 2 2 2"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    swap: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    dash: '<path d="M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-4H3z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 7v10M19 12v5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
  };
  const icon = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

  // ───────────────────────── DOM ─────────────────────────
  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'icon') e.insertAdjacentHTML('afterbegin', icon(v));   // hanya ikon konstan di atas
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (k === 'style') e.style.cssText = v;   // CSSOM (diizinkan CSP), bukan atribut style
      else e.setAttribute(k, v === true ? '' : String(v));
    }
    add(e, kids);
    return e;
  }
  function add(e, kids) {
    if (kids === null || kids === undefined || kids === false) return;
    if (Array.isArray(kids)) { kids.forEach((k) => add(e, k)); return; }
    e.appendChild(typeof kids === 'string' || typeof kids === 'number' ? document.createTextNode(String(kids)) : kids);
  }
  const chevI = () => { const c = I('chev'); c.classList.add('chev'); return c; };
  const I = (n) => { const s = document.createElement('span'); s.style.display = 'contents'; s.insertAdjacentHTML('afterbegin', icon(n)); return s.firstChild; };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => document.getElementById('app');
  /** Posisi geser (layar, menu samping, tabel, jendela) disimpan & dikembalikan saat tampilan digambar ulang,
   *  supaya tidak loncat ke awal setiap kali tombol ditekan. */
  const KEEP_SEL = '#groups,.side,.tbl-wrap,.modal-body,.wa-mini,.items,.pitems';
  function keepScroll(fn) {
    const x = window.scrollX, y = window.scrollY, saved = {};
    const key = (n, i) => `${n.id || n.className}|${i}`;
    document.querySelectorAll(KEEP_SEL).forEach((n, i) => { if (n.scrollLeft || n.scrollTop) saved[key(n, i)] = [n.scrollLeft, n.scrollTop]; });
    fn();
    try { liven(); } catch (e) { /* animasi tidak boleh merusak halaman */ }
    document.querySelectorAll(KEEP_SEL).forEach((n, i) => { const v = saved[key(n, i)]; if (v) { n.scrollLeft = v[0]; n.scrollTop = v[1]; } });
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
  }
  function mount(node) { keepScroll(() => { const a = app(); a.textContent = ''; a.appendChild(node); }); }
  // ───────────────────────── ANIMASI HIDUP ─────────────────────────
  const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionOn = () => !RM.matches;
  const SEG = new Map();   // posisi pilihan terakhir per kelompok tab (tetap diingat walau sempat hilang saat memuat)
  const SW = new Map();    // keadaan saklar terakhir
  const segKey = (t) => [...t.querySelectorAll('button')].map((b) => b.textContent.trim()).join('|');
  /** Tab pilihan: satu "bantalan" yang meluncur ke tombol yang dipilih. Saklar: bulatan meluncur dari keadaan lama. */
  function liven(root) {
    (root || document).querySelectorAll('.pv-tabs').forEach((t) => {
      const bs = [...t.querySelectorAll(':scope > button')]; const on = bs.find((b) => b.classList.contains('on'));
      if (!on || !t.offsetWidth) return;
      const key = segKey(t); const prev = SEG.get(key);
      let th = t.querySelector(':scope > .pv-thumb'); if (!th) { th = h('i', { class: 'pv-thumb', 'aria-hidden': 'true' }); t.prepend(th); }
      t.classList.add('thumbed');
      const to = { x: on.offsetLeft, w: on.offsetWidth };
      SEG.set(key, to);
      const place = (v) => { th.style.width = `${v.w}px`; th.style.transform = `translateX(${v.x}px)`; };
      if (prev && motionOn() && (prev.x !== to.x || prev.w !== to.w)) {
        th.style.transition = 'none'; place(prev); void th.offsetWidth; th.style.transition = ''; place(to);
        on.classList.add('pv-pop'); setTimeout(() => on.classList.remove('pv-pop'), 420);
      } else place(to);
    });
    (root || document).querySelectorAll('.switch[aria-label]').forEach((w) => {
      const key = w.getAttribute('aria-label'); const on = w.classList.contains('on'); const was = SW.get(key); SW.set(key, on);
      if (was === undefined || was === on || !motionOn()) return;
      w.classList.add('sw-from'); w.classList.toggle('on', was); void w.offsetWidth;
      w.classList.remove('sw-from'); w.classList.toggle('on', on); w.classList.add('sw-boing'); setTimeout(() => w.classList.remove('sw-boing'), 520);
    });
  }
  /** Isi halaman masuk berurutan (dari bawah kalau turun di menu, dari atas kalau naik). */
  function pageIn(dir) {
    const m = $('#main'); if (!m || !motionOn()) return;
    m.classList.remove('norise', 'pg-in'); m.style.setProperty('--pgy', dir < 0 ? '-14px' : '14px');
    [...m.children].slice(0, 10).forEach((c, i) => c.style.setProperty('--k', i));
    m.querySelectorAll('.items > *, .dgrid > *, .tiles > *, .setrow, .pcat').forEach((c, i) => { if (i < 18) c.style.setProperty('--j', i); });
    void m.offsetWidth; m.classList.add('pg-in'); pageIn.at = performance.now(); pageIn.dir = dir;
    clearTimeout(pageIn.t); pageIn.t = setTimeout(() => m.classList.remove('pg-in'), 900);
  }
  /** Sorotan menu samping meluncur dari tombol lama ke tombol baru. */
  function flipSide(prev) {
    const nb = document.querySelector('#groups .gbtn.on'); const g = $('#groups');
    if (!prev || !nb || !g || !motionOn() || !nb.offsetHeight) return;
    const nr = nb.getBoundingClientRect(); if (Math.abs(prev.top - nr.top) < 2) return;
    const ind = h('i', { class: 'gind', 'aria-hidden': 'true' });
    ind.style.cssText = `top:${nb.offsetTop}px;left:${nb.offsetLeft}px;width:${nb.offsetWidth}px;height:${nb.offsetHeight}px;transform:translateY(${prev.top - nr.top}px)`;
    g.appendChild(ind); g.classList.add('flip'); void ind.offsetWidth;
    ind.style.transform = 'none';
    const done = () => { g.classList.remove('flip'); ind.remove(); };
    ind.addEventListener('transitionend', done, { once: true }); setTimeout(done, 600);
  }
  /** Pindah ke halaman lain di menu: menu samping tetap di posisinya, isi baru terlihat dari atas. */
  function goGroup(k, sel) {
    const changed = S.group !== k || S.q;
    const ob = document.querySelector('#groups .gbtn.on'); const prev = ob ? ob.getBoundingClientRect() : null;
    const order = [...document.querySelectorAll('#groups .gbtn')]; const oi = order.indexOf(ob);
    closeDrawer(true); S.mq = false;
    S.group = k; S.q = ''; if (sel !== undefined) S.sel = sel;
    renderApp();
    if (!changed) return;
    const nb = document.querySelector('#groups .gbtn.on'); const ni = [...document.querySelectorAll('#groups .gbtn')].indexOf(nb);
    flipSide(prev); pageIn(oi >= 0 && ni >= 0 && ni < oi ? -1 : 1);
    const on = document.querySelector('.gbtn.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const m = $('#main'); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ block: 'start' });
  }

  // ───────────────────────── keadaan ─────────────────────────
  const S = {
    phone: '', to: '', cooldownUntil: 0, me: null, botId: '', cat: null, byKey: {}, state: null, draft: {}, hostAlive: true,
    group: '', sel: '', q: '', saveState: '', saveAt: 0, saveTimer: null, pv: 'new', modal: null, menu: false, booted: false,
    v: {}, pair: null, chartM: 'omset', mini: false, mq: false,
  };
  const ls = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } } };

  // ───────────────────────── API ─────────────────────────
  async function api(path, body, opt = {}) {
    let r;
    try {
      r = await fetch(API + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { return { ok: false, error: 'Tidak bisa terhubung. Cek koneksi internet kamu.', _status: 0 }; }
    let d;
    try { d = await r.json(); } catch (e) { d = { ok: false, error: `Server tidak merespons dengan benar (${r.status}).`, _bad: true }; }
    d._status = r.status;
    if (r.status === 401 && d.login && !opt.quiet) { toLogin('Sesi login sudah habis. Masuk lagi ya.'); }
    return d;
  }

  // ───────────────────────── mesin render (SAMA dengan app/lib/wordingCatalog.js → renderText) ─────────────────────────
  function renderText(tpl, vars, opt) {
    const optSet = new Set(opt || []);
    const has = (k) => Object.prototype.hasOwnProperty.call(vars, k);
    const empty = (k) => !has(k) || vars[k] === null || vars[k] === undefined || vars[k] === '';
    const lines = String(tpl == null ? '' : tpl).split('\n');
    const out = [];
    let skipBlank = false;
    for (const line of lines) {
      let drop = false;
      const re = /@([a-zA-Z][a-zA-Z0-9]*)/g;
      let m;
      while ((m = re.exec(line))) { const k = m[1].toLowerCase(); if (optSet.has(k) && empty(k)) { drop = true; break; } }
      if (drop) { if (out.length && out[out.length - 1] === '') skipBlank = true; continue; }
      if (skipBlank && line === '') { skipBlank = false; continue; }
      skipBlank = false;
      out.push(line.replace(/@([a-zA-Z][a-zA-Z0-9]*)/g, (s, k) => {
        const key = k.toLowerCase();
        if (key === 'readmore' && !has('readmore')) return READMORE;
        return has(key) && vars[key] !== null && vars[key] !== undefined ? String(vars[key]) : s;
      }));
    }
    return out.join('\n');
  }
  /** Validasi (SAMA dengan wordingCatalog.clean). */
  function cleanText(item, raw) {
    let v = String(raw == null ? '' : raw).replace(/\r/g, '');
    v = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
    if (item.kind === 'short') v = v.replace(/\s+/g, ' ').trim();
    else v = v.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
    const len = [...v].length;
    const min = item.min || 1;
    if (len < min) throw new Error(min > 1 ? `Minimal ${min} karakter.` : 'Tidak boleh kosong.');
    if (len > item.max) throw new Error(`Terlalu panjang: ${len}/${item.max} karakter.`);
    for (const t of item.req || []) if (!new RegExp(`@${t}(?![a-zA-Z0-9])`, 'i').test(v)) throw new Error(`Wajib memuat @${t}.`);
    return v;
  }

  // ───────────────────────── nilai wording ─────────────────────────
  /** Wording get2 (Digiflazz) / get3 (PPOB) disembunyikan bila fiturnya tidak aktif di bot ini. */
  const featureOn = (it) => { const f = S.state && S.state.features; return !it.need || !f || f[it.need] !== false; };
  const items = () => (S.cat ? S.cat.items.filter(featureOn) : []);
  const DASH = '__dash';
  const isProfile = (it) => it.g === 'profil';
  function liveCustom(it) {
    const st = S.state || {};
    if (isProfile(it)) { const p = st.profile || {}; return (p.custom || []).includes(it.key) ? (p[it.key] || '') : null; }
    const v = (st.values || {})[it.key];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  function liveText(it) {
    if (isProfile(it)) { const p = (S.state && S.state.profile) || {}; return typeof p[it.key] === 'string' && p[it.key] ? p[it.key] : it.def; }
    const c = liveCustom(it);
    return c !== null ? c : it.def;
  }
  const hasDraft = (k) => Object.prototype.hasOwnProperty.call(S.draft, k);
  function editText(it) {
    if (!hasDraft(it.key)) return liveText(it);
    return S.draft[it.key] === null ? it.def : S.draft[it.key];
  }
  const norm = (it, v) => { try { return cleanText({ ...it, min: 0, max: 1e9, req: [] }, v); } catch (e) { return String(v); } };
  /** Perubahan yang akan diluncurkan: teks baru, null (= kembali ke bawaan), atau undefined (tidak berubah). */
  function changeOf(it) {
    if (!hasDraft(it.key)) return undefined;
    const d = S.draft[it.key];
    const custom = liveCustom(it);
    if (d === null) return custom !== null ? null : undefined;
    if (norm(it, d) === norm(it, liveText(it))) return undefined;
    if (!isProfile(it) && norm(it, d) === norm(it, it.def)) return custom !== null ? null : undefined;
    return d;
  }
  const changedItems = () => items().filter((it) => changeOf(it) !== undefined);
  function statusOf(it) {
    const ch = changeOf(it);
    if (ch !== undefined) return problems(it, editText(it)).errors.length ? 'err' : 'draft';
    return liveCustom(it) !== null ? 'custom' : 'def';
  }
  const STATUS_LABEL = { def: 'Bawaan', custom: 'Kustom', draft: 'Belum diluncurkan', err: 'Perlu diperbaiki' };

  function knownTags(it) {
    const own = (it.tags || []).map((t) => t[0]);
    return it.glob ? [...own, ...(S.cat.globals || []).map((t) => t[0])] : own;
  }
  function problems(it, text) {
    const errors = [], warns = [];
    try { cleanText(it, text); } catch (e) { errors.push(e.message); }
    if (it.key === 'emoji' && text && !/^\p{Extended_Pictographic}/u.test(text.trim())) errors.push('Isi dengan satu emoji, mis. 💎');
    if (it.key === 'invPrefix' && text && !/^[A-Za-z0-9-]{2,12}$/.test(text.trim())) errors.push('Hanya huruf, angka, atau tanda - (2–12 karakter).');
    if (!isProfile(it)) {
      const known = new Set(knownTags(it));
      const unknown = new Set();
      const re = /(^|[^A-Za-z0-9._%+-])@([a-zA-Z][a-zA-Z0-9]*)/g;
      let m;
      while ((m = re.exec(text))) { const k = m[2].toLowerCase(); if (!known.has(k)) unknown.add('@' + m[2]); }
      if (unknown.size) warns.push(`Kode ${[...unknown].slice(0, 4).join(', ')} tidak dikenal — akan tampil apa adanya. Klik kode di atas untuk memakai yang benar.`);
    }
    return { errors, warns };
  }

  // ───────────────────────── pratinjau ─────────────────────────
  const curOf = (key) => { const it = S.byKey[key]; return it ? editText(it) : ''; };
  function nowWib() {
    const d = new Date();
    const f = (o) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...o }).format(d);
    return { hari: f({ weekday: 'long' }), tanggal: f({ day: 'numeric', month: 'long', year: 'numeric' }), jam: f({ hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') };
  }
  function varsOf(it) {
    const v = {};
    const toko = curOf('storeName') || 'TOKO KAMU';
    if (it.glob) {
      for (const [k, , s] of S.cat.globals || []) v[k] = s;
      Object.assign(v, nowWib(), { toko, bot: curOf('botName') || 'BOT TOPUP' });
      delete v.readmore;
    }
    for (const [k, , s] of it.tags || []) v[k] = s;
    if ('toko' in v) v.toko = toko;
    if ('emoji' in v) v.emoji = curOf('emoji') || '🔥';
    if ('invoice' in v) v.invoice = `${(curOf('invPrefix') || 'TRX-').replace(/-?$/, '-')}1730000000-AB12`;
    if ('penutup' in v) v.penutup = (curOf('suksesText') || '_Terima kasih!_ ✨').replace(/@toko/gi, toko);
    return v;
  }
  function listPreview() {
    const head = S.byKey.listHead, item = S.byKey.listItem, foot = S.byKey.katalogText;
    const hv = varsOf(head);
    const rows = [
      { no: '01', nama: 'Weekly Diamond Pass', harga: 'Rp 28.560', kode: 'MLWP', status: '✅' },
      { no: '02', nama: '86 Diamonds', harga: 'Rp 21.150', kode: 'ML86', status: '✅' },
    ];
    let out = renderText(curOf('listHead'), hv).replace(/\n*$/, '\n\n');
    for (const r of rows) out += renderText(curOf('listItem'), { ...varsOf(item), ...r }).replace(/\n*$/, '\n\n');
    const f = curOf('katalogText');
    if (f && f.trim()) out += `${f.replace(/@toko/gi, curOf('storeName') || 'TOKO KAMU')}\n`;
    void foot;
    return out.replace(/\n+$/, '');
  }
  function groupPreview() {
    const g = S.byKey.getGroup, gi = S.byKey.getGroupItem;
    const daftar = (g.combo.rows || []).map((r) => renderText(curOf('getGroupItem'), { ...varsOf(gi), ...r })).join('\n');
    return renderText(curOf('getGroup'), { ...varsOf(g), daftar, jumlah: String((g.combo.rows || []).length) }, g.opt);
  }
  function profilePreview(it, text) {
    const toko = curOf('storeName') || 'TOKO KAMU';
    if (it.key === 'storeName' || it.key === 'botName') return renderText(curOf('menuText'), { ...varsOf(S.byKey.menuText) }, S.byKey.menuText.opt).split('\n').slice(0, 6).join('\n');
    if (it.key === 'ownerName') return `👑 *OWNER ${toko}*\n\nHubungi owner untuk deposit, kendala order, atau bantuan:\n\n› Nama: ${text || '-'}\n› 0812xxxxxxx`;
    if (it.key === 'emoji') return listPreview();
    if (it.key === 'invPrefix') return renderText(curOf('orderProses'), varsOf(S.byKey.orderProses), S.byKey.orderProses.opt);
    return text;
  }
  /** Nama tombol: tulisan bawaan → tulisan pilihan penyewa (draf / di bot). */
  function btnText(t, live) {
    const it = S.btnByText && S.btnByText[t];
    if (!it) return t;
    const v = live ? liveText(it) : editText(it);
    return String(v || '').replace(/\s+/g, ' ').trim() || t;
  }
  /** Pesan contoh tempat tombol muncul (pratinjau item Nama Tombol). */
  const BTN_CTX = { menu: 'menuText', produk: 'produkText', saldo: 'saldoProfil', daftar: 'daftarSukses', get: 'menuGame', get2: 'menuLain',
    'TPO MLWP 173059364 2890': 'orderKonfirmasi', 'depo 25000': 'depoQris', cekml: 'nickAsk', '(tekan) FREE FIRE 🔥': 'getGroup' };
  const btnCtx = (it) => (it.key === 'btnDaftar' ? 'belumDaftar' : it.key === 'btnBatalTpo' ? 'orderKonfirmasi' : BTN_CTX[it.btn.trig]);
  function previewOf(it, text) {
    if (it.btn) { const k = btnCtx(it); const ctx = k && S.byKey[k]; return ctx && featureOn(ctx) ? previewOf(ctx, curOf(k)) : 'Pilih salah satu tombol di bawah 👇'; }
    if (isProfile(it)) return profilePreview(it, text);
    const target = it.previewOf ? S.byKey[it.previewOf] : it;
    if (target && target.combo && target.combo.list) return listPreview();
    if (target && target.key === 'getGroup') return groupPreview();
    if (target && target !== it) return renderText(curOf(target.key), varsOf(target), target.opt);
    return renderText(text, varsOf(it), it.opt);
  }
  const TRIGGER = {
    menuText: 'menu', storeName: 'menu', botName: 'menu', ownerName: 'owner', produkText: 'produk', menuGame: 'get',
    getGroup: '(tekan tombol) FREE FIRE 🔥', getGroupItem: '(tekan tombol) FREE FIRE 🔥', menuLain: 'get2', menuLainLayanan: '(tekan) PULSA',
    menuLainProduk: '(tekan) TELKOMSEL', menuPpob: 'get3', menuPpobOperator: '(tekan) KUOTA', menuPpobLayanan: '(tekan) E-WALLET',
    listHead: 'get ml', listItem: 'get ml', katalogText: 'get ml', emoji: 'get ml', nickMenu: 'ceknickmenu', nickAsk: 'cekml', nickRobloxAsk: 'cekroblox',
    nickLoading: 'cekml 173059364 2890', nickML: 'cekml 173059364 2890', nickFF: 'cekff 12345678', nickGame: 'cekgenshinimpact 812345678 os_asia',
    nickRoblox: 'cekroblox Builderman', nickGagal: 'cekml 1 1', orderKonfirmasi: 'TPO MLWP 173059364 2890', orderSaldoKurang: 'TP MLWP 173059364 2890',
    orderProdukTidakAda: 'TP MLWPX 173059364 2890', orderQris: '(tekan) ✅ Konfirmasi', orderProses: '(tekan) ✅ Konfirmasi', invPrefix: '(tekan) ✅ Konfirmasi',
    orderBatal: '(tekan) ❌ Batalkan', tpoBatal: 'BATALTPO', saldoProfil: 'saldo', daftarSukses: 'daftar', belumDaftar: 'saldo', depoTanya: 'depo',
    depoQris: 'depo 25000', depoBatal: 'BATALDEPO', openText: 'open', closeText: 'close', doneText: 's  (reply pesan pembeli)', pendingText: 'p  (reply pesan pembeli)', botReply: 'bot',
  };
  const IMAGE = { produkText: 'Banner toko', orderQris: 'Gambar QRIS', depoQris: 'Gambar QRIS', nickRoblox: 'Foto avatar Roblox' };
  const BUTTONS = {
    menuText: ['Produk 🎮', 'Saldo 💰', 'Deposit 💳', 'Cek Nick 🔎'], storeName: ['Produk 🎮', 'Saldo 💰', 'Deposit 💳'], botName: ['Produk 🎮', 'Saldo 💰', 'Deposit 💳'],
    produkText: ['Game Topup', 'List Manual', 'Saldo', 'Deposit'], menuGame: ['FREE FIRE 🔥', 'MOBA ⚔️', 'SHOOTER 🔫', 'Cek Nick Game 🔎'],
    getGroup: ['Free Fire', 'Free Fire Max', '« Kembali'], getGroupItem: ['Free Fire', 'Free Fire Max', '« Kembali'],
    menuLain: ['Pulsa', 'Data', 'PLN', '« Kembali'], menuLainLayanan: ['Telkomsel', 'Indosat', '« Kembali'], menuLainProduk: ['Umum', 'Transfer', '« Kembali'],
    menuPpob: ['PULSA', 'KUOTA', 'E-WALLET', '« Kembali'], menuPpobOperator: ['Telkomsel', 'XL', '« Kembali'], menuPpobLayanan: ['Dana', 'OVO', '« Kembali'],
    listHead: ['« Kembali'], listItem: ['« Kembali'], katalogText: ['« Kembali'], emoji: ['« Kembali'],
    nickMenu: ['Mobile Legends', 'Free Fire', 'Roblox'], nickAsk: ['❌ Batal'], nickRobloxAsk: ['❌ Batal'], depoTanya: ['❌ Batal'],
    orderKonfirmasi: ['✅ Konfirmasi', '❌ Batalkan'], orderQris: ['❌ Batalkan'], depoQris: ['❌ Batalkan'], belumDaftar: ['📝 Daftar'],
    saldoProfil: ['Depobot', 'Riwayat Transaksi', 'Riwayat Deposit'], daftarSukses: ['Produk', 'Saldo', 'Deposit'],
  };

  /** Format WhatsApp → elemen DOM (tebal, miring, coret, mono, kutipan, mention, baca selengkapnya). Selalu teks, bukan HTML. */
  function waFormat(text) {
    const frag = document.createDocumentFragment();
    const rmAt = text.search(/‎{200,}/);
    if (rmAt >= 0) {
      const rest = text.slice(rmAt).replace(/^‎+/, '');
      frag.appendChild(waFormat(text.slice(0, rmAt)));
      const more = h('span', { hidden: true });
      more.appendChild(waFormat(rest));
      const link = h('span', { class: 'rm', role: 'button', tabindex: '0', text: 'Baca selengkapnya', onclick: () => { more.hidden = false; link.remove(); } });
      frag.appendChild(link); frag.appendChild(more);
      return frag;
    }
    const parts = text.split('```');
    parts.forEach((part, i) => {
      if (i % 2 === 1 && i < parts.length - 1) { frag.appendChild(h('span', { class: 'mono', text: part.replace(/^\n|\n$/g, '') })); return; }
      if (i % 2 === 1) part = '```' + part;   // pagar tidak berpasangan
      const lines = part.split('\n');
      lines.forEach((ln, j) => {
        if (/^> /.test(ln)) { const q = h('span', { class: 'quote' }); inline(ln.slice(2), q); frag.appendChild(q); }
        else { inline(ln, frag); if (j < lines.length - 1) frag.appendChild(document.createTextNode('\n')); }
      });
    });
    return frag;
  }
  function inline(str, parent) {
    const re = /([*_~`])([^\n]*?)\1|@\d{6,15}/g;
    let last = 0, m;
    const wordy = (ch) => /[A-Za-z0-9]/.test(ch || '');
    while ((m = re.exec(str))) {
      if (m[0][0] === '@') {
        if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
        parent.appendChild(h('span', { class: 'mention', text: m[0] }));
        last = re.lastIndex; continue;
      }
      const inner = m[2];
      const before = str[m.index - 1], after = str[re.lastIndex];
      if (!inner || /^\s|\s$/.test(inner) || wordy(before) || wordy(after)) { re.lastIndex = m.index + 1; continue; }
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      const tag = { '*': 'b', _: 'i', '~': 's', '`': 'code' }[m[1]];
      const el = document.createElement(tag);
      if (tag === 'code') el.textContent = inner; else inline(inner, el);
      parent.appendChild(el);
      last = re.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }
  function waPhone(it, rendered, live) {
    const nm = curOf('botName') || 'BOT TOPUP';
    const chat = h('div', { class: 'wa-chat' });
    const ctxKey = it.btn ? btnCtx(it) : null;
    const trig = it.btn ? it.btn.trig : TRIGGER[it.key];
    const tm = nowWib().jam;
    if (trig) chat.appendChild(h('div', { class: 'bub out' }, [trig, h('span', { class: 'tm', text: tm + ' ✓✓' })]));
    const b = h('div', { class: 'bub in' });
    const img = IMAGE[ctxKey || it.key];
    if (img) b.appendChild(h('div', { class: 'img' }, [I('image'), img]));
    b.appendChild(waFormat(rendered || ' '));
    b.appendChild(h('span', { class: 'tm', text: tm }));
    chat.appendChild(b);
    const btns = it.btn ? it.btn.sib : BUTTONS[it.key];
    if (btns) chat.appendChild(h('div', { class: 'wa-btns' }, btns.map((x) => h('span', { class: it.btn && x === it.def ? 'hl' : null, text: btnText(x, live) }))));
    return h('div', { class: 'wa', 'aria-label': 'Pratinjau pesan WhatsApp' }, [
      h('div', { class: 'wa-head' }, [h('span', { class: 'av', text: (nm[0] || 'B').toUpperCase() }), h('div', null, [h('b', { text: nm }), h('small', { text: 'online' })])]),
      chat,
    ]);
  }

  // ───────────────────────── notifikasi kecil ─────────────────────────
  let toastT = null;
  function toast(text, kind = 'ok') {
    const old = $('.toast'); if (old) old.remove();
    const t = h('div', { class: `toast ${kind}`, role: 'status' }, [I(kind === 'ok' ? 'check' : 'alert'), text]);
    document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3600);
  }
  const msg = (kind, text) => h('div', { class: `msg ${kind}`, role: kind === 'err' ? 'alert' : null }, [I(kind === 'ok' ? 'check' : kind === 'info' ? 'info' : 'alert'), h('span', { text })]);
  const fmtPhone = (p) => String(p || '').replace(/^62/, '0');
  const dateID = (ms) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms));

  // ───────────────────────── LOGIN ─────────────────────────
  function brand(sub) {
    return h('div', { class: 'brand' }, [h('span', { class: 'mark', icon: 'bot' }), h('div', { class: 'tx' }, [h('b', { text: 'Kelola Bot Topup' }), h('span', { text: sub || 'BARAMARKET.ID' })])]);
  }
  /** Tombol kembali ke website Baramarket. Kalau datang dari website, kembali ke halaman sebelumnya (mis. #sewa). */
  const HOME_URL = '/';
  function backLink(cls) {
    return h('a', { class: `back${cls ? ' ' + cls : ''}`, href: HOME_URL, 'aria-label': 'Kembali ke website Baramarket', onclick: (e) => {
      if (S.modal && S.modal.kind === 'progress') { e.preventDefault(); return; }   // draf belum tersimpan → dicegah beforeunload
      let same = false; try { same = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin && !/\/portal\/?/.test(new URL(document.referrer).pathname); } catch (er) { same = false; }
      if (same && history.length > 1) { e.preventDefault(); history.back(); }
    } }, [I('back'), h('span', { text: 'Kembali' })]);
  }
  function authShell(step, kids) {
    return h('main', { class: 'auth' }, h('div', { class: 'auth-card' }, [backLink('in-card'), brand(), h('div', { class: 'steps', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('i', { class: i <= step ? 'on' : '' }))), kids]));
  }
  function toLogin(note) {
    S.me = null; S.botId = ''; S.cat = null; S.modal = null;
    renderPhone(note ? { info: note } : null);
  }
  function renderPhone(flash) {
    const saved = S.phone || ls.get(LS_PHONE);
    const inp = h('input', { id: 'ph', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', placeholder: '81234567890', value: saved ? fmtPhone(saved).replace(/^0/, '') : '', 'aria-describedby': 'ph-hint', required: true, maxlength: '16' });
    const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'Kirim kode OTP');
    const err = h('div');
    if (flash && flash.info) err.appendChild(msg('info', flash.info));
    if (flash && flash.err) err.appendChild(msg('err', flash.err));
    const form = h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      let p = inp.value.replace(/\D/g, '');
      if (p.startsWith('0')) p = '62' + p.slice(1); else if (p.startsWith('8')) p = '62' + p;
      err.textContent = '';
      if (!/^62\d{8,13}$/.test(p)) { err.appendChild(msg('err', 'Nomor belum benar. Contoh: 81234567890')); inp.focus(); return; }
      btn.disabled = true; btn.textContent = ''; btn.append(h('span', { class: 'spin' }), 'Mengirim kode…');
      const d = await api('/otp', { phone: p });
      btn.disabled = false; btn.textContent = 'Kirim kode OTP';
      if (!d.ok) { err.appendChild(msg('err', d.error || 'Gagal mengirim kode.')); if (d.wait) { S.phone = p; S.cooldownUntil = Date.now() + d.wait * 1000; } return; }
      S.phone = p; ls.set(LS_PHONE, p); S.to = d.to || fmtPhone(p); S.cooldownUntil = Date.now() + (d.cooldown || 60) * 1000;
      renderOtp();
    } }, [
      h('h1', { text: 'Masuk ke bot topup-mu' }),
      h('p', { class: 'lead', text: 'Atur wording dan profil bot langsung dari sini. Masukkan nomor WhatsApp OWNER bot (bukan nomor bot).' }),
      err,
      h('div', { class: 'field' }, [h('label', { for: 'ph', text: 'Nomor owner' }), h('div', { class: 'phone' }, [h('span', { text: '+62' }), inp]), h('p', { class: 'hint', id: 'ph-hint', text: 'Nomor yang terdaftar saat sewa bot topup.' })]),
      btn,
      h('div', { class: 'trust' }, [I('shield'), h('span', { text: `Kode 8 digit dikirim lewat WhatsApp dari bot Baramarket (${MAIN_BOT}). Kami tidak pernah meminta kode ini lewat chat atau telepon.` })]),
    ]);
    mount(authShell(1, form));
    setTimeout(() => inp.focus(), 50);
  }

  let cdTimer = null;
  function renderOtp(flash) {
    const boxes = [];
    const wrap = h('div', { class: 'otp', role: 'group', 'aria-label': 'Kode OTP 8 digit' });
    const err = h('div');
    if (flash) err.appendChild(msg(flash.kind || 'err', flash.text));
    const submit = h('button', { class: 'btn primary block', type: 'submit', disabled: true }, 'Masuk');
    const code = () => boxes.map((b) => b.value).join('');
    const sync = () => { submit.disabled = code().length !== 8; };
    const fill = (from, digits) => { for (let i = 0; i < digits.length && from + i < 8; i++) boxes[from + i].value = digits[i]; const n = Math.min(7, from + digits.length); boxes[n].focus(); sync(); if (code().length === 8) form.requestSubmit(); };
    for (let i = 0; i < 8; i++) {
      const b = h('input', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: '8', autocomplete: i === 0 ? 'one-time-code' : 'off', 'aria-label': `Digit ${i + 1}` });
      b.addEventListener('input', () => { wrap.classList.remove('bad'); const d = b.value.replace(/\D/g, ''); b.value = ''; if (d) fill(i, d); else sync(); });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); sync(); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 7) boxes[i + 1].focus();
      });
      b.addEventListener('paste', (e) => { const d = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, ''); if (d) { e.preventDefault(); fill(0, d.slice(0, 8)); } });
      b.addEventListener('focus', () => b.select());
      boxes.push(b); wrap.appendChild(b);
    }
    const resend = h('button', { class: 'linkbtn', type: 'button', onclick: async () => {
      resend.disabled = true;
      const d = await api('/otp', { phone: S.phone });
      err.textContent = '';
      if (!d.ok) { err.appendChild(msg('err', d.error || 'Gagal mengirim ulang.')); if (d.wait) S.cooldownUntil = Date.now() + d.wait * 1000; tick(); return; }
      S.cooldownUntil = Date.now() + (d.cooldown || 60) * 1000; err.appendChild(msg('ok', 'Kode baru sudah dikirim.')); boxes.forEach((x) => { x.value = ''; }); boxes[0].focus(); sync(); tick();
    } }, 'Kirim ulang kode');
    function tick() {
      clearInterval(cdTimer);
      const step = () => {
        const left = Math.ceil((S.cooldownUntil - Date.now()) / 1000);
        if (!document.body.contains(resend)) { clearInterval(cdTimer); return; }
        if (left > 0) { resend.disabled = true; resend.textContent = `Kirim ulang (${left} dtk)`; } else { resend.disabled = false; resend.textContent = 'Kirim ulang kode'; clearInterval(cdTimer); }
      };
      step(); cdTimer = setInterval(step, 1000);
    }
    const form = h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      if (code().length !== 8) return;
      submit.disabled = true; submit.textContent = ''; submit.append(h('span', { class: 'spin' }), 'Memeriksa…');
      const d = await api('/verify', { phone: S.phone, code: code() }, { quiet: true });
      submit.textContent = 'Masuk';
      err.textContent = '';
      if (!d.ok) {
        err.appendChild(msg('err', d.error || 'Kode salah.'));
        wrap.classList.remove('bad'); void wrap.offsetWidth; wrap.classList.add('bad');
        boxes.forEach((x) => { x.value = ''; }); boxes[0].focus(); sync();
        return;
      }
      await loadMe();
    } }, [
      h('h1', { text: 'Masukkan kode OTP' }),
      h('p', { class: 'lead' }, ['Kode 8 digit sudah dikirim ke WhatsApp ', h('b', { text: S.to || fmtPhone(S.phone) }), ` dari bot Baramarket (${MAIN_BOT}). Berlaku 5 menit.`]),
      err, wrap, submit,
      h('div', { class: 'row between', style: 'margin-top:14px' }, [h('button', { class: 'linkbtn', type: 'button', onclick: () => renderPhone() }, '← Ganti nomor'), resend]),
      h('p', { class: 'hint', style: 'margin-top:14px' }, 'Belum masuk dalam 1 menit? Pastikan nomor yang dimasukkan adalah nomor OWNER yang terdaftar saat sewa, lalu kirim ulang.'),
    ]);
    mount(authShell(2, form));
    tick();
    setTimeout(() => boxes[0].focus(), 50);
  }

  async function loadMe() {
    const d = await api('/me', null, { quiet: true });
    if (!d.ok) { if (d._status === 401) return renderPhone(); return renderFatal(d.error); }
    S.me = d;
    if (!d.bots.length) return renderFatal('Nomor ini belum punya bot topup aktif. Kalau baru sewa, tunggu sampai bot selesai dipasang.', true);
    const last = ls.get(LS_BOT);
    if (d.bots.length === 1) return selectBot(d.bots[0].id);
    if (last && d.bots.some((b) => b.id === last) && S.booted) return selectBot(last);
    return renderPicker();
  }
  function botMeta(b) {
    const exp = b.expiredAt ? (b.expiredAt > Date.now() ? `Aktif s/d ${dateID(b.expiredAt)}` : 'Masa sewa habis') : '';
    return [b.botNumber ? fmtPhone(b.botNumber) : 'Belum dipairing', exp].filter(Boolean).join(' · ');
  }
  function renderPicker() {
    mount(authShell(3, h('div', null, [
      h('h1', { text: 'Pilih bot' }),
      h('p', { class: 'lead', text: 'Nomor ini memiliki beberapa bot topup. Pilih yang mau diatur.' }),
      h('div', { class: 'picker' }, S.me.bots.map((b) => h('button', { class: 'botcard', type: 'button', onclick: () => selectBot(b.id) }, [
        h('span', { class: 'av', text: (b.storeName || 'B')[0].toUpperCase() }),
        h('span', null, [h('b', { text: b.storeName || 'Bot topup' }), h('small', { text: botMeta(b) })]),
      ]))),
    ])));
  }
  function renderFatal(text, withLogout) {
    mount(h('main', { class: 'auth' }, h('div', { class: 'auth-card' }, [backLink('in-card'), brand(), msg('err', text || 'Terjadi kesalahan.'),
      h('div', { class: 'row' }, [h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Muat ulang'), withLogout ? h('button', { class: 'btn ghost', type: 'button', onclick: logout }, 'Keluar') : null])])));
  }

  async function selectBot(id) {
    mount(h('div', { class: 'boot' }, loaderEl('Memuat pengaturan bot', true)));
    const d = await api(`/data?tenant=${encodeURIComponent(id)}`);
    if (!d.ok) { if (d._status === 401) return; return renderFatal(d.error, true); }
    S.botId = id; ls.set(LS_BOT, id);
    S.cat = d.catalog; S.byKey = Object.fromEntries(d.catalog.items.map((i) => [i.key, i])); S.btnByText = Object.fromEntries(d.catalog.items.filter((i) => i.btn).map((i) => [i.def, i]));
    S.state = d.state; S.hostAlive = d.hostAlive;
    S.draft = {};
    for (const [k, v] of Object.entries((d.draft && d.draft.values) || {})) if (S.byKey[k] && (v === null || typeof v === 'string')) S.draft[k] = v;
    for (const it of items()) if (hasDraft(it.key) && changeOf(it) === undefined) delete S.draft[it.key];
    S.saveAt = (d.draft && d.draft.updatedAt) || 0;
    S.group = S.group && (S.group === DASH || (VIEWS[S.group] && viewOn(S.group)) || S.cat.groups.some((g) => g.id === S.group)) ? S.group : DASH;
    if (S.dashFor !== id) { S.dash = null; S.dashFor = id; S.v = {}; S.pair = null; }
    const inGroup = items().filter((x) => x.g === S.group);
    S.sel = inGroup.some((x) => x.key === S.sel) ? S.sel : (inGroup[0] || {}).key;
    renderApp();
  }

  // ───────────────────────── APLIKASI ─────────────────────────
  const bot = () => (S.me && S.me.bots.find((b) => b.id === S.botId)) || {};
  function renderApp() {
    const root = h('div', { class: 'app' });
    root.appendChild(renderTop());
    const notes = h('div', { class: 'banner', id: 'banners' });
    if (!S.hostAlive) notes.appendChild(msg('warn', 'Server bot sedang offline atau restart. Kamu tetap bisa mengedit — perubahan tersimpan sebagai draf dan bisa diluncurkan setelah server online.'));
    if (!S.state) notes.appendChild(msg('warn', 'Bot ini belum menyalin pengaturannya ke website, jadi yang tampil adalah wording bawaan. Kalau kamu pernah mengubah wording lewat chat, tunggu bot online lalu muat ulang.'));
    const nt = S.me && S.me.notice;
    if (nt && ls.get('bmp-notice') !== String(nt.at)) {
      const box = h('div', { class: `msg ${nt.level === 'warn' ? 'warn' : 'info'} notice` }, [I(nt.level === 'warn' ? 'alert' : 'info'), h('span', null, [h('b', { text: 'Info dari admin Baramarket: ' }), nt.text]),
        h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Tutup info', onclick: () => { ls.set('bmp-notice', String(nt.at)); box.remove(); } }, I('x'))]);
      notes.appendChild(box);
    }
    if (notes.childNodes.length) root.appendChild(notes);
    root.appendChild(renderMnav());
    const shell = h('div', { class: `shell${S.mini ? ' mini' : ''}` }, [renderSide(), h('div', { class: 'side-scrim', onclick: () => closeDrawer() }), h('div', { class: 'main', id: 'main' }, renderMain())]);
    root.appendChild(shell);
    root.appendChild(h('div', { id: 'dock-slot' }));
    mount(root);
    const tp = $('.top'); if (tp) document.documentElement.style.setProperty('--toph', tp.offsetHeight + 'px');
    renderDock();
    if (S.modal) renderModal();
  }

  // ───────────────────────── MENU SAMPING: bisa diperkecil (PC) · laci geser (HP) ─────────────────────────
  S.mini = ls.get('bmp-side-mini') === '1';
  function setMini(v) {
    S.mini = v; ls.set('bmp-side-mini', v ? '1' : '0'); hideTip();
    const sh = $('.shell'); if (!sh) return;
    sh.classList.add('tog'); sh.classList.toggle('mini', v);
    clearTimeout(setMini.t); setMini.t = setTimeout(() => sh.classList.remove('tog'), 450);
    const b = $('.side-tog'); if (b) { b.setAttribute('aria-expanded', String(!v)); b.setAttribute('aria-label', v ? 'Perbesar menu' : 'Perkecil menu'); b.dataset.tip = v ? 'Perbesar menu' : 'Perkecil menu'; }
  }
  const isPhone = () => window.matchMedia('(max-width:860px)').matches;
  function openDrawer() {
    document.documentElement.classList.add('drw');
    const b = $('.mnav-menu'); if (b) b.setAttribute('aria-expanded', 'true');
    setTimeout(() => { const on = $('.side .gbtn.on') || $('.side .gbtn'); if (on) { on.scrollIntoView({ block: 'center' }); on.focus({ preventScroll: true }); } }, 60);
  }
  function closeDrawer(quiet) {
    if (!document.documentElement.classList.contains('drw')) return;
    document.documentElement.classList.remove('drw');
    const b = $('.mnav-menu'); if (b) { b.setAttribute('aria-expanded', 'false'); if (!quiet) b.focus({ preventScroll: true }); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.documentElement.classList.contains('drw')) closeDrawer(); });
  window.addEventListener('resize', () => { if (!isPhone()) closeDrawer(true); });
  // geser laci ke kiri untuk menutup
  (() => { let x0 = null, y0 = 0;
    document.addEventListener('touchstart', (e) => { if (!document.documentElement.classList.contains('drw') || !e.target.closest('.side,.side-scrim')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => { if (x0 === null) return; const t = e.changedTouches[0]; if (x0 - t.clientX > 60 && Math.abs(t.clientY - y0) < 60) closeDrawer(true); x0 = null; }, { passive: true });
  })();
  /** judul & ikon halaman yang sedang dibuka (untuk bar menu HP) */
  function curPage() {
    if (S.q.trim()) return { icon: 'search', label: `Cari: "${S.q.trim()}"` };
    if (S.group === DASH) return { icon: 'dash', label: 'Dashboard' };
    if (VIEWS[S.group]) return { icon: VIEWS[S.group].icon, label: VIEWS[S.group].label };
    const g = S.cat.groups.find((x) => x.id === S.group) || {};
    return { icon: g.icon || 'list', label: g.label || 'Menu' };
  }
  function renderMnav() {
    const c = curPage();
    const q = h('input', { type: 'search', class: 'mnav-in', placeholder: 'Cari: cekml, sukses, deposit…', value: S.q, 'aria-label': 'Cari pengaturan', enterkeyhint: 'search' });
    q.addEventListener('input', () => { S.q = q.value; refreshMain(); const l = $('.mnav-menu .ml'); if (l) l.textContent = curPage().label; });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') q.blur(); if (e.key === 'Escape') closeQ(); });
    const closeQ = () => { S.mq = false; const had = S.q; S.q = ''; nav.classList.remove('sq'); if (had) renderApp(); };
    const nav = h('div', { class: `mnav${S.mq ? ' sq' : ''}` }, [h('div', { class: 'mnav-in-wrap' }, [
      h('button', { class: 'mnav-menu', type: 'button', 'aria-expanded': 'false', 'aria-haspopup': 'true', onclick: openDrawer }, [
        h('span', { class: 'mi' }, I('burger')), h('span', { class: 'mt' }, [h('small', { text: 'Menu' }), h('b', { class: 'ml', text: c.label })]), h('span', { class: 'mc' }, I('chev')),
      ]),
      h('button', { class: 'mnav-q', type: 'button', 'aria-label': 'Cari pengaturan', onclick: () => { S.mq = true; nav.classList.add('sq'); q.focus(); } }, I('search')),
      h('div', { class: 'mnav-search' }, [I('search'), q, h('button', { class: 'mnav-x', type: 'button', 'aria-label': 'Tutup pencarian', onclick: closeQ }, I('x'))]),
    ])]);
    if (S.mq) setTimeout(() => { if (document.activeElement !== q && S.mq && !S.q) q.focus(); }, 0);
    return nav;
  }
  // tooltip nama menu saat sidebar diperkecil
  let tipEl = null;
  function hideTip() { if (tipEl) tipEl.classList.remove('on'); }
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.shell.mini .side [data-tip], .side-tog[data-tip]');
    if (!t) { hideTip(); return; }
    if (!tipEl) { tipEl = h('div', { class: 'stip', role: 'tooltip' }); document.body.appendChild(tipEl); }
    const r = t.getBoundingClientRect();
    tipEl.textContent = t.dataset.tip; tipEl.style.left = `${r.right + 12}px`; tipEl.style.top = `${r.top + r.height / 2}px`; tipEl.classList.add('on');
  });
  document.addEventListener('scroll', hideTip, true);


  function renderTop() {
    const b = bot();
    const connected = b.connection === 'connected';
    const chip = h(S.me.bots.length > 1 ? 'button' : 'div', { class: 'botchip', type: S.me.bots.length > 1 ? 'button' : null, onclick: S.me.bots.length > 1 ? () => { if (confirmLeave()) renderPicker(); } : null, title: S.me.bots.length > 1 ? 'Ganti bot' : null }, [
      h('span', { class: 'av', text: (curOf('storeName') || b.storeName || 'B')[0].toUpperCase() }),
      h('span', { class: 't' }, [h('b', { text: curOf('storeName') || b.storeName || 'Bot topup' }), h('small', null, [h('span', { class: `dot ${connected ? 'on' : 'off'}` }), connected ? 'Bot online' : 'Bot offline', b.expiredAt ? ` · ${b.expiredAt > Date.now() ? 's/d ' + dateID(b.expiredAt) : 'sewa habis'}` : ''])]),
    ]);
    const pop = h('div', { class: 'menu-pop', role: 'menu', hidden: !S.menu }, [
      h('div', { class: 'who', text: `Masuk sebagai ${S.me.phone}` }),
      S.me.bots.length > 1 ? h('button', { type: 'button', role: 'menuitem', onclick: () => { S.menu = false; if (confirmLeave()) renderPicker(); } }, [I('swap'), 'Ganti bot']) : null,
      h('button', { type: 'button', role: 'menuitem', onclick: () => { S.menu = false; window.open(GROUP_URL, '_blank', 'noopener'); } }, [I('chat'), 'Grup diskusi penyewa']),
      h('button', { type: 'button', role: 'menuitem', onclick: () => { S.menu = false; discardAll(); } }, [I('trash'), 'Buang semua draf']),
      h('hr'),
      h('button', { type: 'button', role: 'menuitem', onclick: logout }, [I('logout'), 'Keluar']),
      h('button', { type: 'button', role: 'menuitem', class: 'danger', onclick: logoutAll }, [I('lock'), 'Keluar dari semua perangkat']),
    ]);
    const more = h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Menu akun', 'aria-expanded': String(S.menu), onclick: (e) => { e.stopPropagation(); S.menu = !S.menu; pop.hidden = !S.menu; more.setAttribute('aria-expanded', String(S.menu)); } }, I('more'));
    return h('header', { class: 'top' }, h('div', { class: 'top-in' }, [backLink('in-top'), brand(), h('div', { class: 'botsel' }, [chip, h('div', { class: 'menu' }, [more, pop])])]));
  }
  document.addEventListener('click', (e) => { if (S.menu && !e.target.closest('.menu')) { S.menu = false; const p = $('.menu-pop'); if (p) p.hidden = true; } });

  function groupCounts(gid) {
    const list = items().filter((i) => i.g === gid);
    let draft = 0, err = 0, custom = 0;
    for (const it of list) { const s = statusOf(it); if (s === 'draft') draft++; else if (s === 'err') err++; else if (s === 'custom') custom++; }
    return { draft, err, custom, n: list.length };
  }
  function groupBadge(gid) {
    const c = groupCounts(gid);
    if (c.err) return h('span', { class: 'badge err', title: 'Perlu diperbaiki', text: String(c.err) });
    if (c.draft) return h('span', { class: 'badge draft', title: 'Belum diluncurkan', text: String(c.draft) });
    return h('span', { class: 'badge', title: `${c.n} pengaturan`, text: String(c.n) });
  }
  function renderSide() {
    const q = h('input', { type: 'search', placeholder: 'Cari: cekml, sukses, deposit…', value: S.q, 'aria-label': 'Cari pengaturan' });
    q.addEventListener('input', () => { S.q = q.value; refreshMain(); });
    const tog = h('button', { class: 'side-tog', type: 'button', 'aria-expanded': String(!S.mini), 'aria-label': S.mini ? 'Perbesar menu' : 'Perkecil menu', 'data-tip': S.mini ? 'Perbesar menu' : 'Perkecil menu', onclick: () => setMini(!S.mini) }, I('panel'));
    const search = h('div', { class: 'search', 'data-tip': 'Cari pengaturan', onclick: () => { if (S.mini) { setMini(false); setTimeout(() => q.focus(), 120); } } }, [I('search'), q]);
    setTimeout(() => document.querySelectorAll('#groups > *').forEach((c, i) => c.style.setProperty('--j', Math.min(i, 24))), 0);
    return h('aside', { class: 'side', id: 'side', 'aria-label': 'Menu' }, [
      h('div', { class: 'side-head' }, [h('span', { class: 'sh-t', text: 'Menu' }), tog, h('button', { class: 'side-x', type: 'button', 'aria-label': 'Tutup menu', onclick: () => closeDrawer() }, I('x'))]),
      search,
      h('nav', { class: 'groups', id: 'groups', 'aria-label': 'Kelompok pengaturan' }, [h('button', {
        class: `gbtn${S.group === DASH && !S.q ? ' on' : ''}`, type: 'button', 'aria-current': S.group === DASH && !S.q ? 'true' : null,
        onclick: () => goGroup(DASH), 'data-tip': 'Dashboard',
      }, [h('span', { class: 'gi', icon: 'dash' }), h('span', { class: 'gl', text: 'Dashboard' })]),
      h('div', { class: 'gsep', text: 'Toko & bot' }), ...['__bot', '__profit', '__users', '__hist', '__banner', '__saluran', '__bara', '__digi', '__ppob'].filter(viewOn).map(viewBtn),
      h('div', { class: 'gsep', text: 'Wording & profil' }), ...S.cat.groups.filter((g) => items().some((i) => i.g === g.id)).map((g) => h('button', {
        class: `gbtn${g.id === S.group && !S.q ? ' on' : ''}`, type: 'button', 'data-g': g.id, 'aria-current': g.id === S.group && !S.q ? 'true' : null,
        onclick: () => { const first = items().find((x) => x.g === g.id); goGroup(g.id, first ? first.key : ''); }, 'data-tip': g.label,
      }, [h('span', { class: 'gi', icon: g.icon }), h('span', { class: 'gl', text: g.label }), groupBadge(g.id)])), h('div', { class: 'gsep', text: 'Bantuan' }), viewBtn('__help')]),
      h('p', { class: 'side-note', text: 'Perubahan tersimpan otomatis sebagai draf. Bot baru berubah setelah kamu menekan Luncurkan.' }),
      h('a', { class: 'side-link', href: GROUP_URL, target: '_blank', rel: 'noopener noreferrer', 'data-tip': 'Grup diskusi penyewa' }, [I('chat'), h('span', { class: 'gl', text: 'Grup diskusi penyewa' })]),
    ]);
  }
  function viewBtn(k) {
    const on = S.group === k && !S.q;
    return h('button', { class: `gbtn${on ? ' on' : ''}`, type: 'button', 'aria-current': on ? 'true' : null, onclick: () => goGroup(k), 'data-tip': VIEWS[k].label }, [h('span', { class: 'gi', icon: VIEWS[k].icon }), h('span', { class: 'gl', text: VIEWS[k].label })]);
  }
  function refreshSide() {
    const nav = $('#groups'); if (!nav) return;
    nav.querySelectorAll('.gbtn[data-g]').forEach((b) => { const old = b.querySelector('.badge'); if (old) old.replaceWith(groupBadge(b.getAttribute('data-g'))); });
  }

  function visibleItems() {
    if (S.q.trim()) {
      const q = S.q.trim().toLowerCase();
      return items().filter((i) => [i.label, i.where, i.key, i.desc].join(' ').toLowerCase().includes(q));
    }
    return items().filter((i) => i.g === S.group);
  }
  function renderMain() {
    if (S.group === DASH && !S.q.trim()) return renderDash();
    if (VIEWS[S.group] && !S.q.trim()) {
      if (!viewOn(S.group)) { S.group = DASH; return renderDash(); }
      return ({ __bot: renderBot, __profit: renderProfit, __users: renderUsers, __hist: renderHist, __banner: renderBanner, __saluran: renderSaluran, __digi: renderDigi, __bara: renderBara, __ppob: renderPpob, __help: renderHelp })[S.group]();
    }
    const g = S.cat.groups.find((x) => x.id === S.group) || {};
    if (!S.q.trim() && items().some((i) => i.g === g.id && i.btn)) return renderBtnSets(g);   // Nama Tombol: per kelompok
    const list = visibleItems();
    const head = S.q.trim()
      ? h('div', { class: 'ghead' }, [h('h2', { text: `Hasil pencarian "${S.q.trim()}"` }), h('p', { text: `${list.length} pengaturan ditemukan.` })])
      : h('div', { class: 'ghead' }, [h('h2', { text: g.label }), h('p', { text: g.desc })]);
    if (!list.length) return [head, h('div', { class: 'empty' }, [I('search'), h('h3', { text: 'Tidak ada yang cocok' }), h('p', { text: 'Coba kata lain, mis. "nickname", "QRIS", atau "grup".' })])];
    const grid = h('div', { class: 'items', id: 'items' }, list.map((it, i) => itemCard(it, i)));
    const sel = list.find((x) => x.key === S.sel) || (S.q.trim() ? null : list[0]);
    return [head, S.group === 'grup' && !S.q.trim() ? welcomePanel() : null, grid, sel ? renderEditor(sel) : h('div', { class: 'empty' }, [I('eye'), h('h3', { text: 'Pilih salah satu' }), h('p', { text: 'Klik pengaturan di atas untuk mulai mengedit.' })])];
  }
  // ───────────────────────── NAMA TOMBOL: diatur per kelompok (satu layar = semua tombolnya) ─────────────────────────
  function btnSetsOf(gid) {
    const map = new Map();
    items().filter((i) => i.g === gid && i.btn).forEach((i) => {
      const st = i.btn.set || { id: i.key, label: i.label, desc: i.where, order: 999 };
      if (!map.has(st.id)) map.set(st.id, { ...st, items: [] });
      map.get(st.id).items.push(i);
    });
    const sets = [...map.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
    sets.forEach((x) => x.items.sort((a, b) => ((a.btn.set && a.btn.set.pos) || 0) - ((b.btn.set && b.btn.set.pos) || 0)));
    return sets;
  }
  function setStatusOf(st) {
    const all = st.items.map(statusOf);
    return all.includes('err') ? 'err' : all.includes('draft') ? 'draft' : all.includes('custom') ? 'custom' : 'def';
  }
  function setSummary(st) { const n = st.items.length; return `${n} tombol · ${st.items.slice(0, 4).map((it) => btnText(it.def)).join(' · ')}${n > 4 ? ' …' : ''}`; }
  function renderBtnSets(g) {
    const sets = btnSetsOf(g.id);
    S.selSet = S.selSet || {};
    const cur = sets.find((x) => x.id === S.selSet[g.id]) || sets[0];
    const head = h('div', { class: 'ghead' }, [h('h2', { text: g.label }), h('p', { text: g.desc })]);
    const grid = h('div', { class: 'items', id: 'items' }, sets.map((st, i) => {
      const ss = setStatusOf(st);
      return h('button', { class: `item${st === cur ? ' on' : ''}`, type: 'button', 'data-set': st.id, style: `animation-delay:${Math.min(i, 12) * 25}ms`, onclick: () => {
        S.selSet[g.id] = st.id; refreshMain();
        const ed = $('#editor'); if (ed && window.innerWidth < 1060) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } }, [h('span', { class: 'it' }, [h('b', { text: st.label }), h('span', { class: `chip ${ss}`, text: STATUS_LABEL[ss] })]), h('small', { text: setSummary(st) })]);
    }));
    return [head, grid, cur ? renderBtnSetEditor(cur) : null];
  }
  function renderBtnSetEditor(st) {
    const pvWrap = h('div', { id: 'ed-pv' });
    const fake = { key: `set_${st.id}`, def: '', label: st.label, btn: { trig: st.trig || st.items[0].btn.trig, sib: st.items.map((i) => i.def) } };
    const refreshCardSet = () => {
      const card = document.querySelector(`.item[data-set="${st.id}"]`); if (!card) return;
      const c = card.querySelector('.chip'), sm = card.querySelector('small'), ss = setStatusOf(st);
      if (c) { c.className = `chip ${ss}`; c.textContent = STATUS_LABEL[ss]; }
      if (sm) sm.textContent = setSummary(st);
    };
    const updatePv = () => { pvWrap.textContent = ''; const live = S.pv === 'live'; pvWrap.appendChild(waPhone(fake, live ? previewLive(fake) : previewOf(fake, ''), live)); refreshCardSet(); refreshSide(); renderDock(); };
    const rows = st.items.map((it) => {
      const inp = h('input', { class: 'ta', type: 'text', value: editText(it), maxlength: String(it.max + 20), 'aria-label': `Tulisan tombol ${it.def}`, spellcheck: 'false' });
      const cnt = h('span', { class: 'counter' }), probs = h('div', { class: 'probs' });
      const upd = () => {
        const v = inp.value, len = [...v].length;
        cnt.textContent = `${len}/${it.max}`; cnt.className = `counter${len > it.max ? ' bad' : ''}`;
        const pr = problems(it, v); probs.textContent = '';
        pr.errors.forEach((e) => probs.appendChild(msg('err', e)));
        inp.classList.toggle('bad', pr.errors.length > 0);
      };
      inp.addEventListener('input', () => { onEdit(it, inp.value); upd(); updatePv(); });
      const reset = h('button', { class: 'btn sm ghost', type: 'button', title: 'Kembalikan bawaan', 'aria-label': `Kembalikan bawaan ${it.def}`, onclick: () => {
        if (liveCustom(it) !== null) S.draft[it.key] = null; else delete S.draft[it.key];
        inp.value = it.def; scheduleSave(); upd(); updatePv();
      } }, I('undo'));
      upd();
      return h('div', { class: 'btnrow' }, [
        h('div', { class: 'bl' }, [h('b', { text: it.def }), h('small', { text: it.where })]),
        h('div', { class: 'bi' }, [inp, cnt, reset]),
        probs,
      ]);
    });
    const pvTabs = h('div', { class: 'pv-tabs', role: 'tablist' }, [
      h('button', { type: 'button', role: 'tab', class: S.pv === 'new' ? 'on' : '', 'aria-selected': String(S.pv === 'new'), onclick: () => { S.pv = 'new'; refreshMain(); } }, 'Nama baru'),
      h('button', { type: 'button', role: 'tab', class: S.pv === 'live' ? 'on' : '', 'aria-selected': String(S.pv === 'live'), onclick: () => { S.pv = 'live'; refreshMain(); } }, 'Di bot sekarang'),
    ]);
    const resetAll = h('button', { class: 'btn sm', type: 'button', onclick: () => {
      st.items.forEach((it) => { if (liveCustom(it) !== null) S.draft[it.key] = null; else delete S.draft[it.key]; });
      scheduleSave(); refreshMain(); toast(`Semua tombol "${st.label}" dikembalikan ke bawaan (belum diluncurkan).`);
    } }, [I('undo'), 'Kembalikan semua bawaan']);
    const ed = h('section', { class: 'editor', id: 'editor', 'aria-label': `Nama tombol ${st.label}` }, [
      h('div', { class: 'ed-head' }, [h('div', { class: 'tt' }, [h('h3', { text: `Tombol ${st.label}` }), h('p', { text: st.desc || '' })])]),
      h('div', { class: 'ed-body btnset' }, [
        h('div', { class: 'ed-left' }, [
          h('div', { class: 'lbl' }, [h('span', { text: 'Tulisan tombol · fungsinya tetap sama' }), h('span', { class: 'hint', text: `${st.items.length} tombol` })]),
          ...rows,
          h('div', { class: 'row' }, [resetAll]),
          h('p', { class: 'hint', text: 'Boleh pakai emoji. Maksimal 30 karakter, sebaiknya ≤ 20 supaya tidak terpotong di HP. Kosongkan lalu tekan ↺ untuk kembali ke tulisan bawaan.' }),
        ]),
        h('div', { class: 'ed-right' }, [
          h('div', { class: 'lbl' }, [h('span', { text: 'Pratinjau WhatsApp' }), pvTabs]),
          pvWrap,
          h('p', { class: 'pv-note', text: 'Pesan di pratinjau hanya contoh. Tombol tampil dengan nama yang sedang kamu ketik.' }),
        ]),
      ]),
    ]);
    updatePv();
    return ed;
  }

  /** Saklar welcome / left untuk SEMUA grup (di halaman wording "Pesan di Grup"). */
  function welcomePanel() {
    const v = V('__guard');
    if (!v.data && !v.busy && !v.err) setTimeout(() => loadView('__guard', 'guard.get'), 0);
    const d = v.data;
    const row = (kind, title, sub) => {
      const on = d ? Boolean(kind === 'welcome' ? d.welcomeAll : d.leftAll) : false;
      const custom = d ? (kind === 'welcome' ? d.welcomeCustom : d.leftCustom) : 0;
      const busy = v.saving === kind;
      return h('div', { class: 'setrow' }, [
        h('div', { class: 'tx' }, [h('b', { text: title }), h('small', { text: sub + (custom ? ` · ${custom} grup diatur sendiri oleh admin grup` : '') })]),
        !d || busy ? h('span', { class: 'spin' }) : h('button', { type: 'button', role: 'switch', class: `switch${on ? ' on' : ''}`, 'aria-checked': String(on), 'aria-label': title, onclick: async () => {
          v.saving = kind; refreshMain();
          const r = await callFn('guard.setAll', { kind, on: !on }, 30000);
          v.saving = '';
          if (r.ok) { v.data = r.result; toast(`${title} ${!on ? 'dinyalakan' : 'dimatikan'} untuk semua grup.`); } else toast(r.error, 'err');
          refreshMain();
        } }, h('span')),
      ]);
    };
    return h('section', { class: 'dsec welcome-panel' }, [
      h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Welcome & Left' }), h('span', { class: 'hint', text: 'Berlaku untuk semua grup yang ada bot-nya' })]),
      v.err && !d ? msg('err', v.err) : null,
      row('welcome', 'Sambutan member baru (welcome)', 'Bot menyapa member yang baru masuk grup.'),
      row('left', 'Pesan member keluar (left)', 'Bot mengirim pesan saat member keluar / dikeluarkan.'),
      h('p', { class: 'hint', text: 'Teksnya diatur di bawah (Sambutan member baru & Pesan member keluar). Admin grup tetap bisa menyalakan / mematikan per grup: ketik welcome on/off atau left on/off di grup itu. Penjaga lain (antilink, antilink2, antispam, dll.) diatur per grup lewat WhatsApp — ketik menuotomatis.' }),
    ]);
  }
  /** Perbarui isi halaman yang sama (tanpa animasi masuk lagi, jadi tidak terasa seperti dimuat ulang). */
  function refreshMain() {
    const m = $('#main'); if (!m) return;
    const wasLoading = !!m.querySelector(':scope > .ldr-wrap, :scope > .dsec > .ldr');
    const justIn = m.classList.contains('pg-in') && performance.now() - (pageIn.at || 0) < 220;   // baru saja pindah halaman → lanjutkan animasinya
    m.classList.add('norise'); m.classList.remove('pg-in');
    keepScroll(() => { m.textContent = ''; add(m, renderMain()); }); refreshSide();
    if (justIn) pageIn(pageIn.dir || 1);
    else if (wasLoading && !m.querySelector('.ldr')) pageIn(1);
  }
  function itemCard(it, i) {
    const st = statusOf(it);
    return h('button', { class: `item${it.key === S.sel ? ' on' : ''}`, type: 'button', 'data-k': it.key, style: `animation-delay:${Math.min(i, 12) * 25}ms`, onclick: () => {
      S.sel = it.key; refreshMain();
      const ed = $('#editor'); if (ed && window.innerWidth < 1060) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } }, [h('span', { class: 'it' }, [h('b', { text: it.label }), h('span', { class: `chip ${st}`, text: STATUS_LABEL[st] })]), h('small', { text: it.where })]);
  }
  function refreshCard(it) {
    const c = document.querySelector(`.item[data-k="${it.key}"] .chip`);
    if (c) { const st = statusOf(it); c.className = `chip ${st}`; c.textContent = STATUS_LABEL[st]; }
    const ch = $('#ed-chip'); if (ch) { const st = statusOf(it); ch.className = `chip ${st}`; ch.textContent = STATUS_LABEL[st]; }
  }


  // ───────────────────────── DASHBOARD ─────────────────────────
  const rpx = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
  const timeID = (ms) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const dayID = (d) => { const [y, m, dd] = String(d).split('-').map(Number); return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, dd))); };
  /** Jalankan perintah host lewat API, tunggu hasilnya (maks waitMs). */
  async function hostRun(path, body, waitMs = 45000) {
    const d = await api(path, body);
    if (!d.ok) return d;
    const t0 = Date.now();
    let delay = 700;
    while (Date.now() - t0 < waitMs) {
      await new Promise((r) => setTimeout(r, delay)); delay = Math.min(2000, delay + 300);
      const st = await api(`/cmd?tenant=${encodeURIComponent(S.botId)}&id=${encodeURIComponent(d.id)}`);
      if (!st.ok) return st;
      if (st.status === 'done') return { ok: true, result: st.result };
      if (st.status === 'error') return { ok: false, error: st.error };
    }
    return { ok: false, error: 'Bot belum merespons. Coba lagi sebentar lagi.' };
  }
  async function loadDash(force) {
    if (S.dashBusy) return;
    S.dashBusy = true; S.dashErr = '';
    if (S.group === DASH) refreshMain();
    const id = S.botId;
    const r = await hostRun('/dashboard', { tenant: id, force: Boolean(force) });
    if (id !== S.botId) { S.dashBusy = false; return; }
    S.dashBusy = false;
    if (r.ok) { S.dash = r.result; S.dashAt = Date.now(); } else S.dashErr = r.error || 'Gagal memuat dashboard.';
    if (S.group === DASH && !S.q.trim()) refreshMain();
  }
  const card = (cls, kids) => h('div', { class: `dcard ${cls || ''}` }, kids);
  function balCard(title, sub, b, extra) {
    if (!b) return null;
    if (!b.ok) return card('bad', [h('div', { class: 'dl', text: title }), h('div', { class: 'dbig muted', text: 'Gagal dicek' }), h('div', { class: 'dsub bad', text: b.error || 'error' }), extra || null]);
    return card('', [h('div', { class: 'dl', text: title }), h('div', { class: 'dbig', text: rpx(b.balance) }), sub ? h('div', { class: 'dsub', text: sub }) : null, extra || null]);
  }
  function renderDash() {
    const d = S.dash;
    const head = h('div', { class: 'ghead row between' }, [
      h('div', null, [h('h2', { text: 'Dashboard' }), h('p', { text: 'Saldo, rekap, dan pencairan QRIS bot kamu — langsung dari bot.' })]),
      h('div', { class: 'row' }, [
        S.dashAt ? h('span', { class: 'hint', text: `Diperbarui ${timeID(S.dashAt)} WIB` }) : null,
        h('button', { class: 'btn sm', type: 'button', disabled: S.dashBusy ? true : null, onclick: () => loadDash(true) }, [S.dashBusy ? h('span', { class: 'spin' }) : I('refresh'), S.dashBusy ? 'Memuat…' : 'Segarkan']),
      ]),
    ]);
    if (!d && !S.dashBusy && !S.dashErr) { setTimeout(() => loadDash(false), 0); }
    if (!d) {
      if (S.dashErr) return [head, msg('err', S.dashErr), h('div', null, h('button', { class: 'btn', type: 'button', onclick: () => loadDash(true) }, 'Coba lagi'))];
      return [head, h('div', { class: 'dgrid' }, [1, 2, 3].map(() => card('skel', [h('div', { class: 'sk w40' }), h('div', { class: 'sk w70 big' }), h('div', { class: 'sk w55' })]))), h('p', { class: 'hint', text: 'Mengambil saldo provider & rekap dari bot… (beberapa detik)' })];
    }
    const out = [head];
    if (S.dashErr) out.push(msg('warn', `Gagal memperbarui: ${S.dashErr}. Menampilkan data terakhir.`));
    // ── saldo ──
    const f = d.features || {};
    const b = d.balances || {};
    const depoBtn = f.depoweb ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => openModal({ kind: 'depo', step: 'form' }) }, [I('plus'), 'Deposit Saldo Web']) : null;
    const u = d.users || {};
    const usersCard = u.error ? card('bad', [h('div', { class: 'dl', text: 'Saldo semua user' }), h('div', { class: 'dsub bad', text: u.error })]) : card('', [
      h('div', { class: 'dl', text: 'Saldo semua user' }), h('div', { class: 'dbig', text: rpx(u.total) }), h('div', { class: 'dsub', text: `${u.count || 0} user terdaftar · kewajiban toko` }),
      d.providerTotal !== null && d.providerTotal !== undefined
        ? (d.providerTotal >= (u.total || 0) ? h('span', { class: 'chip custom', text: '✓ Aman: saldo provider cukup' }) : h('span', { class: 'chip err', text: `Waspada: kurang ${rpx((u.total || 0) - d.providerTotal)}` }))
        : null,
    ]);
    // ── pengaturan bot ──
    const og = d.settings ? Boolean(d.settings.orderGroupOnly) : null;
    if (og !== null) {
      const pick = (mode) => {
        if ((mode === 'grup') === og) return;
        openModal({ kind: 'confirm', title: mode === 'grup' ? 'Order hanya di grup?' : 'Order di grup & chat pribadi?',
          text: mode === 'grup' ? 'Pembeli hanya bisa order TP/TPO & deposit di grup. Di chat pribadi, bot akan membalas "Fitur ini khusus di grup".' : 'Pembeli bisa order TP/TPO & deposit di grup maupun chat pribadi dengan bot.',
          ok: 'Ya, ubah', onOk: async () => {
            closeModal(); S.ordBusy = true; refreshMain();
            const r = await hostRun('/setting', { tenant: S.botId, key: 'orderMode', value: mode }, 30000);
            S.ordBusy = false;
            if (r.ok) { if (S.dash && S.dash.settings) S.dash.settings.orderGroupOnly = Boolean(r.result && r.result.orderGroupOnly); toast(mode === 'grup' ? 'Mode order: hanya di grup.' : 'Mode order: grup & chat pribadi.'); }
            else toast(r.error || 'Gagal mengubah mode order', 'err');
            refreshMain();
          } });
      };
      const segO = h('div', { class: 'pv-tabs', role: 'radiogroup', 'aria-label': 'Mode order' }, [['grup', 'Hanya di grup'], ['semua', 'Grup & chat pribadi']].map(([k, l]) => {
        const on = (k === 'grup') === og;
        return h('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: on ? 'on' : '', disabled: S.ordBusy ? true : null, onclick: () => pick(k) }, l);
      }));
      out.push(h('section', { class: 'dsec' }, [
        h('h3', { class: 'dh', text: 'Pengaturan bot' }),
        h('div', { class: 'setrow' }, [
          h('div', { class: 'tx' }, [h('b', { text: 'Mode order' }), h('small', { text: 'Di mana pembeli boleh order TP / TPO dan deposit saldo.' })]),
          S.ordBusy ? h('span', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: 'Menyimpan…' })]) : segO,
        ]),
        d.settings.rekapHarian !== undefined ? h('div', { class: 'setrow' }, [
          h('div', { class: 'tx' }, [h('b', { text: 'Rekap harian otomatis' }), h('small', { text: 'Setiap pagi bot mengirim rekap omset & profit kemarin ke WhatsApp owner.' })]),
          S.rkBusy ? h('span', { class: 'spin' }) : h('button', { type: 'button', role: 'switch', class: `switch${d.settings.rekapHarian ? ' on' : ''}`, 'aria-checked': String(Boolean(d.settings.rekapHarian)), 'aria-label': 'Rekap harian otomatis', onclick: async () => {
            const on = !d.settings.rekapHarian; S.rkBusy = true; refreshMain();
            const r = await callFn('prefs.setRekap', { on }, 30000);
            S.rkBusy = false;
            if (r.ok) { d.settings.rekapHarian = Boolean(r.result && r.result.rekapHarian); toast(on ? 'Rekap harian dinyalakan.' : 'Rekap harian dimatikan.'); } else toast(r.error || 'Gagal menyimpan', 'err');
            refreshMain();
          } }, h('span')),
        ]) : null,
      ]));
    }
    out.push(h('section', { class: 'dsec' }, [
      h('h3', { class: 'dh', text: 'Saldo' }),
      h('div', { class: 'dgrid' }, [
        balCard('Saldo Baramarket.id', b.bara && b.bara.ok ? [b.bara.name, b.bara.membership].filter((x) => x && x !== '-').join(' · ') + (b.bara.email && b.bara.email !== '-' ? ` · ${b.bara.email}` : '') : '', b.bara, depoBtn),
        f.digi ? balCard('Saldo Digiflazz', b.digi && b.digi.ok ? b.digi.username : '', b.digi) : null,
        f.oke ? balCard('Saldo OkeConnect (PPOB)', '', b.oke) : null,
        usersCard,
      ]),
    ]));
    // ── rekap ──
    const per = S.dashPer || 'today';
    const seg = h('div', { class: 'pv-tabs', role: 'tablist' }, [['today', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini']].map(([k, l]) => h('button', { type: 'button', role: 'tab', class: per === k ? 'on' : '', 'aria-selected': String(per === k), onclick: () => { S.dashPer = k; refreshMain(); } }, l)));
    const tile = (label, val, cls) => h('div', { class: `tile ${cls || ''}` }, [h('span', { text: label }), h('b', { text: val })]);
    let rekapBody;
    if (d.rekap) {
      const o = d.rekap.omset[per], p = d.rekap.pay[per];
      rekapBody = [
        h('div', { class: 'tiles' }, [tile('Transaksi sukses', String(o.count)), tile('Omset', rpx(o.omset)), tile('Modal', rpx(o.modal)), tile('Profit', rpx(o.profit), 'good')]),
        h('div', { class: 'dl', style: 'margin-top:14px', text: 'Pembayaran QRIS diterima' }),
        h('div', { class: 'tiles' }, [tile('Jumlah bayar', `${p.count}x`), tile('Dibayar pembeli', rpx(p.dibayar)), tile('Biaya layanan 0,3%', rpx(p.biaya)), tile('Bisa dicairkan', rpx(p.cair), 'good')]),
      ];
    } else rekapBody = [msg('warn', `Rekap belum bisa dihitung${d.rekapError ? ': ' + d.rekapError : ''}.`)];
    out.push(h('section', { class: 'dsec' }, [h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Rekap omset & profit' }), seg]), ...rekapBody]));
    out.push(chartSection(d));
    // ── pencairan ──
    const po = d.payouts;
    const ST = { Kosong: ['def', 'Belum dicairkan'], Proses: ['draft', 'Diproses'], Sukses: ['custom', 'Sudah dicairkan'] };
    let poBody;
    if (!po) poBody = [msg('info', 'Status pencairan belum tersedia.')];
    else if (!po.rows.length) poBody = [h('p', { class: 'hint', text: 'Belum ada pembayaran QRIS yang masuk.' })];
    else poBody = [
      h('div', { class: 'tiles' }, [tile('Belum dicairkan', rpx(po.belumTotal), po.belumTotal ? 'warn' : ''), tile('Hari belum dicairkan', String(po.belumHari))]),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [
        h('thead', null, h('tr', null, ['Tanggal', 'Trx', 'Bisa dicairkan', 'Status', ''].map((x) => h('th', { text: x })))),
        h('tbody', null, po.rows.map((r) => h('tr', null, [
          h('td', { text: dayID(r.day) }), h('td', { text: String(r.count) }), h('td', { text: rpx(r.cair) }),
          h('td', null, h('span', { class: `chip ${(ST[r.status] || ST.Kosong)[0]}`, text: (ST[r.status] || ST.Kosong)[1] })),
          h('td', null, r.proof ? h('a', { href: r.proof, target: '_blank', rel: 'noopener noreferrer', text: 'Bukti' }) : r.proofSent ? h('span', { class: 'hint', text: 'Bukti via WA' }) : null),
        ]))),
      ])),
    ];
    out.push(h('section', { class: 'dsec' }, [h('h3', { class: 'dh', text: 'Pencairan QRIS' }), ...poBody]));
    // ── sheet ──
    const sh = d.sheet || {};
    const link = (url, t, s2) => h('a', { class: 'slink', href: url, target: '_blank', rel: 'noopener noreferrer' }, [h('span', { class: 'gi', icon: 'sheet' }), h('span', { class: 'tx' }, [h('b', { text: t }), h('small', { text: s2 })]), I('ext')]);
    // Google Sheet + grup diskusi: berdampingan (di HP bertumpuk)
    out.push(h('div', { class: 'dpair' }, [
      h('section', { class: 'dsec' }, [
        h('h3', { class: 'dh', text: 'Google Sheet' }),
        sh.enabled && /^https:\/\/docs\.google\.com\//.test(sh.url || '')
          ? link(sh.url, 'Buka Google Sheet Rekap', 'Omset & profit, pembayaran QRIS, status pencairan, data transaksi & user')
          : msg('info', 'Google Sheet rekap belum dipasang untuk bot ini. Hubungi admin Baramarket untuk memasangnya.'),
      ]),
      h('section', { class: 'dsec' }, [
        h('h3', { class: 'dh', text: 'Grup diskusi penyewa' }),
        h('a', { class: 'slink grp', href: GROUP_URL, target: '_blank', rel: 'noopener noreferrer' }, [h('span', { class: 'gi', icon: 'chat' }), h('span', { class: 'tx' }, [h('b', { text: 'Gabung Grup Diskusi Sewa Bot Topup' }), h('small', { text: 'Tanya jawab, info update fitur & tips jualan bareng penyewa lain' })]), I('ext')]),
      ]),
    ]));
    if (d.bot && !d.bot.running) out.push(msg('warn', 'Bot kamu sedang tidak tersambung ke WhatsApp. Saldo & rekap tetap tampil, tapi deposit dari website butuh bot yang aktif.'));
    return out;
  }

  // ── deposit saldo web (modal) ──
  let depoTimer = null, depoTick = null;
  function stopDepo() { clearTimeout(depoTimer); clearInterval(depoTick); depoTimer = null; depoTick = null; }
  async function depoCreate(nominal) {
    S.modal = { kind: 'depo', step: 'creating', nominal }; renderModal();
    const r = await hostRun('/depoweb', { tenant: S.botId, nominal });
    if (!S.modal || S.modal.kind !== 'depo') return;
    if (!r.ok) { S.modal = { kind: 'depo', step: 'form', nominal, error: r.error }; renderModal(); return; }
    S.modal = { kind: 'depo', step: 'qris', q: r.result, status: 'Menunggu Bayar' }; renderModal(); pollDepo();
  }
  function pollDepo() {
    clearTimeout(depoTimer);
    depoTimer = setTimeout(async () => {
      const m = S.modal; if (!m || m.kind !== 'depo' || m.step !== 'qris') return;
      const st = await api(`/depo?tenant=${encodeURIComponent(S.botId)}&ref=${encodeURIComponent(m.q.ref)}`);
      if (!S.modal || S.modal !== m) return;
      if (st.ok && st.status && st.status !== m.status) {
        m.status = st.status; m.info = st;
        if (['Sukses', 'Expired', 'Dibatalkan', 'Perlu Cek Manual'].includes(st.status)) { m.step = 'end'; stopDepo(); renderModal(); if (st.status === 'Sukses') { S.dash = null; loadDash(true); } return; }
        renderModal();
      }
      if (Date.now() > Number(m.q.expireAt) + 60000) { m.step = 'end'; m.status = 'Expired'; stopDepo(); renderModal(); return; }
      pollDepo();
    }, 4000);
  }
  function depoCard(m) {
    const close = () => { stopDepo(); closeModal(); };
    if (m.step === 'form' || m.step === 'creating') {
      const inp = h('input', { class: 'input', id: 'depo-n', inputmode: 'numeric', placeholder: 'mis. 100000', value: m.nominal ? String(m.nominal) : '', 'aria-label': 'Nominal deposit' });
      const go = () => { const n = Number(String(inp.value).replace(/\D/g, '')); if (!n || n < 1000) { inp.focus(); inp.classList.add('bad'); return; } depoCreate(n); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      const chips = [50000, 100000, 250000, 500000, 1000000].map((v) => h('button', { type: 'button', class: 'tag', onclick: () => { inp.value = String(v); inp.focus(); } }, rpx(v)));
      return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: 'Deposit Saldo Web Baramarket' }), h('p', { text: 'Isi saldo akun web Baramarket milik bot kamu lewat QRIS. Saldo masuk otomatis setelah dibayar, sebesar total yang dibayar.' })]),
        h('div', { class: 'modal-body' }, [
          m.error ? msg('err', m.error) : null,
          h('div', { class: 'field' }, [h('label', { for: 'depo-n', text: 'Nominal (Rp)' }), inp, h('p', { class: 'hint', text: 'Minimal Rp 1.000, maksimal Rp 10.000.000.' })]),
          h('div', { class: 'tags' }, chips),
        ]),
        h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Batal'), h('button', { class: 'btn primary', type: 'button', disabled: m.step === 'creating' ? true : null, onclick: go }, m.step === 'creating' ? [h('span', { class: 'spin' }), 'Membuat QRIS…'] : [I('qr'), 'Buat QRIS'])]),
      ]);
    }
    if (m.step === 'qris') {
      const q = m.q;
      const left = h('b', { id: 'depo-left' });
      const tick = () => { const s2 = Math.max(0, Math.round((Number(q.expireAt) - Date.now()) / 1000)); left.textContent = `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`; };
      clearInterval(depoTick); depoTick = setInterval(tick, 1000); tick();
      const img = q.png ? h('img', { class: 'qris', alt: 'QRIS deposit saldo web', src: `data:image/png;base64,${String(q.png).replace(/[^A-Za-z0-9+/=]/g, '')}` }) : msg('info', 'QRIS untuk deposit ini sudah dibuat sebelumnya. Tunggu sampai kedaluwarsa atau batalkan untuk membuat yang baru.');
      return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: 'Scan QRIS untuk membayar' }), h('p', { text: m.status === 'Diproses' ? 'Pembayaran diterima — sedang menambah saldo web…' : 'Bayar pakai aplikasi bank / e-wallet apa saja. Halaman ini otomatis berubah setelah dibayar.' })]),
        h('div', { class: 'modal-body' }, [
          h('div', { class: 'qris-wrap' }, [img]),
          h('div', { class: 'tiles' }, [tile2('Total bayar', rpx(q.total), 'good'), tile2('Saldo masuk', rpx(q.kredit || q.total)), tile2('Berlaku', null, '', left)]),
          h('p', { class: 'hint', text: `Akun: ${q.email} · Ref ${q.ref}${q.kodeUnik ? ` · termasuk kode unik ${rpx(q.kodeUnik)}` : ''}` }),
          h('div', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: m.status === 'Diproses' ? 'Memproses…' : 'Menunggu pembayaran…' })]),
        ]),
        h('footer', null, [
          h('button', { class: 'btn ghost danger', type: 'button', onclick: async () => {
            const r = await hostRun('/depoweb-cancel', { tenant: S.botId, ref: q.ref }, 20000);
            if (!r.ok) { toast(r.error || 'Gagal membatalkan', 'err'); return; }
            stopDepo(); closeModal(); toast('Deposit dibatalkan. Kalau terlanjur dibayar, saldo tetap masuk.');
          } }, 'Batalkan'),
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Tutup (lanjut di latar)'),
        ]),
      ]);
    }
    const st = m.status, info = m.info || {};
    const okk = st === 'Sukses';
    return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: okk ? 'Deposit berhasil' : st === 'Perlu Cek Manual' ? 'Perlu dicek admin' : st === 'Dibatalkan' ? 'Deposit dibatalkan' : 'QRIS kedaluwarsa' })]),
      h('div', { class: 'modal-body' }, okk
        ? [h('div', { class: 'big-ok' }, [h('span', { class: 'c' }, I('check')), h('b', { text: `Saldo web bertambah ${rpx(info.kredit || info.total)}` }), info.saldoSesudah !== undefined ? h('p', { class: 'hint', text: `Saldo sekarang ${rpx(info.saldoSesudah)} (sebelumnya ${rpx(info.saldoSebelum)})` }) : null])]
        : [msg(st === 'Perlu Cek Manual' ? 'err' : 'info', st === 'Perlu Cek Manual' ? `Pembayaran sudah diterima tapi saldo web belum masuk${info.message ? ` (${info.message})` : ''}. Admin sudah diberi tahu — hubungi admin Baramarket bila perlu.` : 'Tidak ada saldo yang terpotong. Buat deposit baru bila masih perlu.')]),
      h('footer', null, [h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Selesai')]),
    ]);
  }
  function tile2(label, val, cls, node) { return h('div', { class: `tile ${cls || ''}` }, [h('span', { text: label }), node || h('b', { text: val })]); }


  // ───────────────────────── HALAMAN TOKO & BOT (fitur portal) ─────────────────────────
  const VIEWS = {
    __bot: { label: 'Bot & Sewa', icon: 'phone', desc: 'Status WhatsApp bot, pairing / putuskan nomor, dan perpanjang masa sewa.' },
    __profit: { label: 'Profit per Role', icon: 'chart', desc: 'Atur untung per role. Harga jual = harga modal + persen profit.' },
    __users: { label: 'User', icon: 'users', desc: 'Daftar pembeli terdaftar: cari, ubah role, tambah / kurangi saldo.' },
    __hist: { label: 'Riwayat', icon: 'list', desc: 'Transaksi & deposit 7 hari terakhir. Cari pakai nomor, invoice, tujuan, atau produk.' },
    __banner: { label: 'Banner Toko', icon: 'image', desc: 'Gambar yang tampil di atas halaman produk (ketik produk / list).' },
    __saluran: { label: 'Saluran Testimoni', icon: 'chat', desc: 'Transaksi sukses otomatis diposting ke saluran WhatsApp milikmu (setsaluran / ceksaluran / setteksaluran).' },
    __digi: { label: 'Layanan Lainnya', icon: 'spark', desc: 'Menu Digiflazz (addcode / listcode / delcode): pilih brand Digiflazz yang tampil di get2, atur type, dan lihat produk + harga.', need: 'digi' },
    __bara: { label: 'Produk Baramarket', icon: 'eye', desc: 'Sembunyikan / nonaktifkan game atau produk topup Baramarket di tokomu. Yang disembunyikan tidak tampil di get dan tidak bisa diorder.' },
    __ppob: { label: 'Produk PPOB', icon: 'eye', desc: 'Sembunyikan / tampilkan kategori, layanan, atau produk PPOB di tokomu.', need: 'oke' },
    __help: { label: 'Panduan', icon: 'book', desc: 'Jawaban singkat untuk pertanyaan yang paling sering muncul.' },
  };
  const viewOn = (k) => { const v = VIEWS[k]; const f = S.state && S.state.features; return v && (!v.need || !f || f[v.need] !== false); };
  const V = (k) => (S.v[k] = S.v[k] || {});
  const callFn = (fn, args, waitMs) => hostRun('/call', { tenant: S.botId, fn, args: args || {} }, waitMs || 45000);
  async function loadView(k, fn, args, force) {
    const v = V(k);
    if (v.busy || (v.data && !force)) return;
    v.busy = true; v.err = '';
    const id = S.botId;
    const r = await callFn(fn, args);
    if (id !== S.botId) return;
    v.busy = false;
    if (r.ok) v.data = r.result; else v.err = r.error || 'Gagal memuat.';
    if (S.group === k || (k === '__guard' && S.group === 'grup') || (k === '__digiCat' && S.group === '__digi')) refreshMain();
  }
  const viewHead = (k, extra) => h('div', { class: 'ghead row between' }, [h('div', null, [h('h2', { text: VIEWS[k].label }), h('p', { text: VIEWS[k].desc })]), extra ? h('div', { class: 'row' }, extra) : null]);
  const refreshBtn = (onclick, busy) => h('button', { class: 'btn sm', type: 'button', disabled: busy ? true : null, onclick }, [busy ? h('span', { class: 'spin' }) : I('refresh'), busy ? 'Memuat…' : 'Muat ulang']);
  /** Loader: cincin emas & oranye berputar mengelilingi logo bot, teks langkah berganti sendiri, garis progres berjalan. */
  function loaderEl(text, big) {
    const steps = ['Menghubungi bot…', 'Mengambil data…', 'Menyusun tampilan…', 'Hampir selesai…'];
    const orb = h('div', { class: 'ldr-orb', 'aria-hidden': 'true' });
    orb.innerHTML = '<svg viewBox="0 0 64 64"><circle class="trk" cx="32" cy="32" r="28"/><circle class="a1" cx="32" cy="32" r="28" pathLength="100"/><circle class="a2" cx="32" cy="32" r="20" pathLength="100"/></svg>';
    orb.appendChild(h('span', { class: 'ldr-core' }, I('bot')));
    return h('div', { class: `ldr${big ? ' big' : ''}`, role: 'status', 'aria-live': 'polite' }, [
      orb,
      h('div', { class: 'ldr-tx' }, [
        h('b', null, [h('span', { text: text || 'Mengambil data dari bot' }), h('span', { class: 'ldr-dots', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')])]),
        h('span', { class: 'ldr-steps', 'aria-hidden': 'true' }, steps.map((t) => h('small', { text: t }))),
      ]),
      h('div', { class: 'ldr-bar', 'aria-hidden': 'true' }, h('i')),
    ]);
  }
  const loading = (text) => h('div', { class: 'dsec ldr-wrap' }, [loaderEl(String(text || 'Mengambil data dari bot').replace(/[….]+$/, '')),
    h('div', { class: 'ldr-sk', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('div', { class: 'ldr-skrow', style: `--j:${i}` }, [h('span', { class: 'sk-i' }), h('span', { class: 'sk-l' }, [h('i'), h('i')])])))]);
  function viewGuard(k, fn, args) {
    const v = V(k);
    if (!v.data && !v.busy && !v.err) setTimeout(() => loadView(k, fn, args), 0);
    if (v.err && !v.data) return [msg('err', v.err), h('div', null, h('button', { class: 'btn', type: 'button', onclick: () => { v.err = ''; loadView(k, fn, args, true); refreshMain(); } }, 'Coba lagi'))];
    if (!v.data) return [loading()];
    return null;
  }
  const dateTimeID = (ms) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const roleChip = (r) => h('span', { class: `chip ${r === 'owner' ? 'err' : r === 'platinum' ? 'custom' : r === 'gold' ? 'draft' : 'def'}`, text: r.toUpperCase() });
  const STC = (st) => (/sukses/i.test(st) ? 'custom' : /gagal|expired|dibatalkan/i.test(st) ? 'err' : /cek manual/i.test(st) ? 'err' : 'draft');

  // ── 1+2. BOT & SEWA ──
  async function refreshMe() {
    const d = await api('/me', null, { quiet: true });
    if (d.ok) { S.me = d; if (S.group === '__bot') refreshMain(); }
  }
  function renderBot() {
    const b = bot();
    const conn = b.connection || '';
    const left = b.expiredAt ? Math.ceil((b.expiredAt - Date.now()) / 86400000) : 0;
    const active = b.expiredAt > Date.now();
    const p = S.me.pricing;
    const connChip = conn === 'connected' ? h('span', { class: 'chip custom', text: '● Tersambung' }) : conn === 'pairing' ? h('span', { class: 'chip draft', text: 'Sedang pairing' }) : h('span', { class: 'chip err', text: 'Terputus' });
    const st = S.pair || {};
    let pairBox;
    if (st.code) {
      pairBox = h('div', { class: 'paircode' }, [
        h('div', { class: 'dl', text: 'Kode pairing' }), h('div', { class: 'code', text: st.code.replace(/(.{4})(?=.)/, '$1-') }),
        h('ol', { class: 'steps-list' }, ['Buka WhatsApp di HP nomor bot', 'Ketuk ⋮ / Setelan → Perangkat tertaut → Tautkan perangkat', 'Pilih "Tautkan dengan nomor telepon saja"', 'Masukkan kode di atas'].map((x) => h('li', { text: x }))),
        h('div', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: 'Menunggu kamu memasukkan kode… (kode berlaku singkat)' })]),
      ]);
    } else if (st.busy) pairBox = h('div', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: 'Meminta kode pairing ke server…' })]);
    else if (!b.realBot) {
      const inp = h('input', { class: 'input', id: 'pair-n', inputmode: 'numeric', placeholder: 'mis. 081234567890', value: st.num || b.pendingBot ? fmtPhone(st.num || b.pendingBot) : '', 'aria-label': 'Nomor WhatsApp bot' });
      pairBox = h('div', { class: 'col' }, [
        st.err ? msg('err', st.err) : null, st.ok ? msg('ok', st.ok) : null,
        h('div', { class: 'field' }, [h('label', { for: 'pair-n', text: 'Nomor WhatsApp untuk bot' }), inp, h('p', { class: 'hint', text: 'Pakai nomor yang BERBEDA dengan nomor owner. Siapkan HP nomor itu — kode pairing dimasukkan di sana.' })]),
        h('div', null, h('button', { class: 'btn primary', type: 'button', disabled: !active ? true : null, onclick: () => startPair(inp.value) }, [I('phone'), 'Minta kode pairing'])),
        !active ? h('p', { class: 'hint', text: 'Masa sewa habis — perpanjang dulu sebelum pairing.' }) : null,
      ]);
    } else {
      pairBox = h('div', { class: 'col' }, [
        st.ok ? msg('ok', st.ok) : null, st.err ? msg('err', st.err) : null,
        h('p', { class: 'hint', text: 'Mau ganti nomor bot atau pairing ulang? Putuskan dulu, lalu minta kode pairing baru. Data user, saldo & pengaturan tetap aman.' }),
        h('div', null, h('button', { class: 'btn danger', type: 'button', onclick: () => openModal({ kind: 'confirm', title: 'Putuskan nomor bot?', text: `Bot ${fmtPhone(b.realBot)} akan keluar dari WhatsApp dan berhenti melayani pembeli sampai dipairing lagi. Data tetap tersimpan.`, ok: 'Ya, putuskan', danger: true, onOk: doDisconnect }) }, [I('x'), 'Putuskan nomor bot'])),
      ]);
    }
    const renewBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => openModal({ kind: 'renew', step: 'form' }) }, [I('rocket'), p ? `Perpanjang ${p.days} hari — ${rpx(p.price)}` : 'Perpanjang sewa']);
    return [
      viewHead('__bot', [refreshBtn(() => refreshMe(), false)]),
      h('div', { class: 'dpair' }, [
        h('section', { class: 'dsec' }, [
          h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'WhatsApp bot' }), connChip]),
          h('div', { class: 'tiles' }, [tile2('Nomor bot', b.realBot ? fmtPhone(b.realBot) : '—'), tile2('Status', conn === 'connected' ? 'Melayani pembeli' : conn === 'pairing' ? 'Menunggu kode' : 'Tidak aktif')]),
          pairBox,
        ]),
        h('section', { class: 'dsec' }, [
          h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Masa sewa' }), b.trial ? h('span', { class: 'chip draft', text: '🎁 Coba gratis' }) : null]),
          h('div', { class: 'tiles' }, [tile2('Aktif sampai', b.expiredAt ? dateID(b.expiredAt) : '—', active ? '' : 'warn'), tile2('Sisa', active ? `${left} hari` : 'Habis', active && left > 5 ? 'good' : 'warn')]),
          h('p', { class: 'hint', text: 'Bayar QRIS, aktif otomatis. Hari baru ditambahkan ke sisa masa sewa kamu, bukti bayar dikirim ke WhatsApp owner.' }),
          h('div', null, renewBtn),
        ]),
      ]),
    ];
  }
  async function startPair(raw) {
    let n = String(raw || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1); else if (n.startsWith('8')) n = '62' + n;
    if (!/^62\d{8,13}$/.test(n)) { S.pair = { err: 'Nomor bot belum benar. Contoh: 081234567890', num: raw }; refreshMain(); return; }
    S.pair = { busy: true, num: n }; refreshMain();
    const d = await api('/pair', { tenant: S.botId, botNumber: n });
    if (!d.ok) { S.pair = { err: d.error, num: n }; refreshMain(); return; }
    const t0 = Date.now();
    while (Date.now() - t0 < 5 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 2000));
      const st = await api(`/cmd?tenant=${encodeURIComponent(S.botId)}&id=${encodeURIComponent(d.id)}`);
      if (!st.ok) { S.pair = { err: st.error, num: n }; refreshMain(); return; }
      if (st.status === 'code' && st.code && st.code !== (S.pair && S.pair.code)) { S.pair = { busy: true, code: st.code, num: n }; refreshMain(); }
      if (st.status === 'done') { S.pair = { ok: `Bot ${fmtPhone(n)} berhasil tersambung!` }; await refreshMe(); refreshMain(); return; }
      if (st.status === 'error') { S.pair = { err: `Pairing gagal: ${st.error}`, num: n }; await refreshMe(); refreshMain(); return; }
    }
    S.pair = { err: 'Pairing belum selesai (waktu habis). Coba minta kode lagi.', num: n }; refreshMain();
  }
  async function doDisconnect() {
    closeModal(); S.pair = { busy: true }; refreshMain();
    const r = await hostRun('/disconnect', { tenant: S.botId }, 40000);
    S.pair = r.ok ? { ok: 'Nomor bot sudah diputus. Kamu bisa pairing nomor baru di bawah.' } : { err: r.error };
    await refreshMe(); refreshMain();
  }
  // modal perpanjang
  let renewTimer = null;
  function stopRenew() { clearTimeout(renewTimer); renewTimer = null; }
  async function renewCreate(botPhone) {
    S.modal = { kind: 'renew', step: 'wait', status: 'new', message: 'Membuat tagihan…' }; renderModal();
    const d = await api('/renew', { tenant: S.botId, botPhone });
    if (!S.modal || S.modal.kind !== 'renew') return;
    if (!d.ok) { S.modal = { kind: 'renew', step: 'form', error: d.error, botPhone }; renderModal(); return; }
    S.modal.id = d.id; pollRenew();
  }
  function pollRenew() {
    stopRenew();
    renewTimer = setTimeout(async () => {
      const m = S.modal; if (!m || m.kind !== 'renew' || !m.id) return;
      const st = await api(`/renew?tenant=${encodeURIComponent(S.botId)}&id=${encodeURIComponent(m.id)}`);
      if (S.modal !== m) return;
      if (st.ok) {
        const changed = st.status !== m.status || st.qr !== m.qr || st.pairCode !== m.pairCode;
        Object.assign(m, st);
        if (['done', 'rejected', 'expired', 'pair_later', 'pair_failed', 'pair_timeout'].includes(st.status)) { m.step = 'end'; renderModal(); refreshMe(); return; }
        if (changed) renderModal();
      }
      pollRenew();
    }, 3000);
  }
  function renewCard(m) {
    const close = () => { stopRenew(); closeModal(); };
    const b = bot();
    const p = S.me.pricing;
    if (m.step === 'form') {
      const bp = b.realBot ? null : h('input', { class: 'input', id: 'rn-b', inputmode: 'numeric', placeholder: 'nomor WhatsApp bot', value: m.botPhone || '' });
      return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: 'Perpanjang sewa bot' }), h('p', { text: p ? `Paket ${p.days} hari — ${rpx(p.price)}${p.note ? ` (${p.note})` : ''}. Bayar QRIS, aktif otomatis.` : 'Bayar QRIS, aktif otomatis.' })]),
        h('div', { class: 'modal-body' }, [
          m.error ? msg('err', m.error) : null,
          h('div', { class: 'tiles' }, [tile2('Paket', p ? `${p.days} hari` : '-'), tile2('Harga', p ? rpx(p.price) : '-', 'good'), tile2('Aktif sampai (perkiraan)', p ? dateID(Math.max(Date.now(), b.expiredAt || 0) + p.days * 86400000) : '-')]),
          h('p', { class: 'hint', text: 'Setelah dibayar, masa sewa langsung bertambah dan bukti pembayaran dikirim ke WhatsApp owner.' }),
          bp ? h('div', { class: 'field' }, [h('label', { for: 'rn-b', text: 'Nomor WhatsApp bot' }), bp, h('p', { class: 'hint', text: 'Bot kamu belum tersambung — setelah bayar, kode pairing tampil di sini.' })]) : null,
        ]),
        h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Batal'), h('button', { class: 'btn primary', type: 'button', onclick: () => renewCreate(bp ? bp.value : '') }, [I('qr'), 'Buat QRIS'])]),
      ]);
    }
    if (m.step === 'wait') {
      const body = [];
      if (m.status === 'awaiting_payment' && m.qr) {
        body.push(h('div', { class: 'qris-wrap' }, h('img', { class: 'qris', alt: 'QRIS perpanjang sewa', src: m.qr })));
        body.push(h('div', { class: 'tiles' }, [tile2('Total bayar', rpx(m.total), 'good'), tile2('Paket', `${m.days || (p && p.days) || ''} hari`), tile2('Bayar sebelum', m.expireAt ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(m.expireAt)) + ' WIB' : '-')]));
      } else if (m.status === 'pairing' && m.pairCode) {
        body.push(h('div', { class: 'paircode' }, [h('div', { class: 'dl', text: 'Kode pairing' }), h('div', { class: 'code', text: m.pairCode.replace(/(.{4})(?=.)/, '$1-') }), h('p', { class: 'hint', text: 'WhatsApp nomor bot → Perangkat tertaut → Tautkan dengan nomor telepon saja → masukkan kode.' })]));
      }
      body.push(h('div', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: m.message || 'Memproses…' })]));
      return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: m.status === 'awaiting_payment' ? 'Scan QRIS untuk membayar' : m.status === 'paid' ? 'Pembayaran diterima' : 'Menyiapkan tagihan…' })]),
        h('div', { class: 'modal-body' }, body),
        h('footer', null, [h('button', { class: 'btn', type: 'button', onclick: close }, 'Tutup')]),
      ]);
    }
    const okk = ['done', 'pair_later', 'pair_failed', 'pair_timeout'].includes(m.status);   // pembayaran sudah masuk
    const pairBad = m.status === 'pair_failed' || m.status === 'pair_timeout';
    return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: okk ? 'Sewa berhasil diperpanjang' : m.status === 'expired' ? 'QRIS kedaluwarsa' : 'Belum berhasil' })]),
      h('div', { class: 'modal-body' }, okk
        ? [h('div', { class: 'big-ok' }, [h('span', { class: 'c' }, I('check')), h('b', { text: m.expiredAt ? `Aktif sampai ${dateID(m.expiredAt)}` : 'Masa sewa bertambah' }), pairBad ? null : h('p', { class: 'hint', text: m.message || '' })]),
           pairBad ? msg('warn', 'Pembayaran berhasil, tapi pairing bot belum selesai. Tutup jendela ini lalu minta kode pairing lagi di halaman Bot & Sewa.') : null]
        : [msg(m.status === 'expired' ? 'info' : 'err', m.message || 'Coba lagi beberapa saat lagi.')]),
      h('footer', null, [h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Selesai')]),
    ]);
  }

  // ── 3. PROFIT ──
  function renderProfit() {
    const g = viewGuard('__profit', 'profit.get'); const head = viewHead('__profit', [refreshBtn(() => loadView('__profit', 'profit.get', {}, true), V('__profit').busy)]);
    if (g) return [head, ...g];
    const d = V('__profit').data;
    const kinds = [['game', 'Topup game', d.game], ['digi', 'Layanan Lainnya', d.digi], ['oke', 'PPOB', d.oke]].filter((x) => x[2]);
    const v = V('__profit');
    v.kind = kinds.some((k) => k[0] === v.kind) ? v.kind : kinds[0][0];
    const cur = kinds.find((k) => k[0] === v.kind)[2];
    v.edit = v.edit && v.edit.kind === v.kind ? v.edit : { kind: v.kind, percent: { ...cur.percent } };
    v.modal = v.modal || 27000;
    const tabs = kinds.length > 1 ? h('div', { class: 'pv-tabs', role: 'tablist' }, kinds.map(([k, l]) => h('button', { type: 'button', role: 'tab', class: v.kind === k ? 'on' : '', onclick: () => { v.kind = k; v.edit = null; refreshMain(); } }, l))) : null;
    const sim = h('tbody');
    const drawSim = () => {
      sim.textContent = '';
      for (const r of d.roles) {
        const pc = Number(v.edit.percent[r]) || 0;
        const untung = Math.round((v.modal * pc) / 100);
        sim.appendChild(h('tr', null, [h('td', null, roleChip(r)), h('td', { text: `${pc}%` }), h('td', { text: rpx(v.modal + untung) }), h('td', { class: 'good', text: `+${rpx(untung)}` })]));
      }
    };
    const changed = d.roles.some((r) => Number(v.edit.percent[r]) !== Number(cur.percent[r]));
    const rows = d.roles.map((r) => {
      const inp = h('input', { class: 'input num', type: 'number', min: '0', max: String(cur.max), step: '0.1', inputmode: 'decimal', value: String(v.edit.percent[r]), 'aria-label': `Profit ${r}` });
      inp.addEventListener('input', () => { v.edit.percent[r] = inp.value === '' ? '' : Number(inp.value); drawSim(); const sv = $('#pf-save'); if (sv) sv.disabled = false; });
      return h('div', { class: 'setrow' }, [
        h('div', { class: 'tx' }, [h('b', null, roleChip(r)), h('small', { text: `Bawaan ${cur.def[r]}%` })]),
        h('div', { class: 'row' }, [inp, h('span', { class: 'hint', text: '%' })]),
      ]);
    });
    const modalInp = h('input', { class: 'input num wide', type: 'number', min: '0', step: '500', value: String(v.modal), 'aria-label': 'Harga modal contoh' });
    modalInp.addEventListener('input', () => { v.modal = Math.max(0, Math.round(Number(modalInp.value) || 0)); drawSim(); });
    drawSim();
    return [
      head,
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Persen profit per role' }), tabs]),
        ...rows,
        v.err ? msg('err', v.err) : null,
        h('div', { class: 'row' }, [
          h('button', { class: 'btn primary', id: 'pf-save', type: 'button', disabled: changed ? null : true, onclick: async () => {
            for (const r of d.roles) { const n = Number(v.edit.percent[r]); if (!Number.isFinite(n) || n < 0 || n > cur.max) { toast(`Profit ${r} harus 0–${cur.max}%`, 'err'); return; } }
            const r = await callFn('profit.set', { kind: v.kind, percent: Object.fromEntries(d.roles.map((x) => [x, Math.round(Number(v.edit.percent[x]) * 100) / 100])) });
            if (r.ok) { v.data = r.result; v.edit = null; toast('Profit tersimpan & langsung dipakai bot.'); } else toast(r.error, 'err');
            refreshMain();
          } }, [I('check'), 'Simpan profit']),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { v.edit = { kind: v.kind, percent: { ...cur.def } }; refreshMain(); } }, [I('undo'), 'Isi nilai bawaan']),
        ]),
      ]),
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Simulasi harga jual' }), h('div', { class: 'row' }, [h('span', { class: 'hint', text: 'Harga modal' }), modalInp])]),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [h('thead', null, h('tr', null, ['Role', 'Profit', 'Harga jual', 'Untung'].map((x) => h('th', { text: x })))), sim])),
        h('p', { class: 'hint', text: 'Pembeli hanya melihat harga sesuai role-nya. Owner biasanya 0% (harga modal).' }),
      ]),
    ];
  }

  // ── 4. USER ──
  function renderUsers() {
    const g = viewGuard('__users', 'users.list'); const v = V('__users');
    const head = viewHead('__users', [refreshBtn(() => loadView('__users', 'users.list', {}, true), v.busy)]);
    if (g) return [head, ...g];
    const d = v.data;
    let q = (v.q || '').replace(/\D/g, ''); if (q.startsWith('0')) q = '62' + q.slice(1);
    const list = d.rows.filter((u) => (!q || u.nomor.includes(q)) && (!v.role || u.role === v.role));
    const PER = 50; const pages = Math.max(1, Math.ceil(list.length / PER)); v.page = Math.min(v.page || 0, pages - 1);
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Cari nomor…', value: v.q || '', 'aria-label': 'Cari nomor user' });
    search.addEventListener('input', () => { v.q = search.value; v.page = 0; const keep = search.selectionStart; refreshMain(); const s2 = $('#u-q'); if (s2) { s2.focus(); s2.setSelectionRange(keep, keep); } });
    search.id = 'u-q';
    const roleSel = h('select', { class: 'input', 'aria-label': 'Filter role' }, [h('option', { value: '', text: 'Semua role' }), ...d.roles.map((r) => h('option', { value: r, text: r.toUpperCase() }))]);
    roleSel.value = v.role || ''; roleSel.addEventListener('change', () => { v.role = roleSel.value; v.page = 0; refreshMain(); });
    const total = d.rows.reduce((t, u) => t + u.saldo, 0);
    return [
      head,
      h('div', { class: 'tiles' }, [tile2('User terdaftar', String(d.total)), tile2('Total saldo user', rpx(total)), tile2('Ditampilkan', String(list.length))]),
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row filters' }, [search, roleSel]),
        list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl click' }, [
          h('thead', null, h('tr', null, ['Nomor', 'Role', 'Saldo', 'Terdaftar', ''].map((x) => h('th', { text: x })))),
          h('tbody', null, list.slice(v.page * PER, (v.page + 1) * PER).map((u) => h('tr', { tabindex: '0', onclick: () => openModal({ kind: 'user', u }), onkeydown: (e) => { if (e.key === 'Enter') openModal({ kind: 'user', u }); } }, [
            h('td', { text: fmtPhone(u.nomor) }), h('td', null, roleChip(u.role)), h('td', { text: rpx(u.saldo) }), h('td', { text: u.createdAt ? dateID(u.createdAt) : '-' }), h('td', null, h('span', { class: 'linkbtn', text: 'Kelola' })),
          ]))),
        ])) : h('p', { class: 'hint', text: 'Tidak ada user yang cocok.' }),
        pages > 1 ? pager(v, pages) : null,
      ]),
    ];
  }
  function pager(v, pages) {
    return h('div', { class: 'row pager' }, [
      h('button', { class: 'btn sm', type: 'button', disabled: v.page <= 0 ? true : null, onclick: () => { v.page -= 1; refreshMain(); } }, '‹ Sebelumnya'),
      h('span', { class: 'hint', text: `Halaman ${v.page + 1} / ${pages}` }),
      h('button', { class: 'btn sm', type: 'button', disabled: v.page >= pages - 1 ? true : null, onclick: () => { v.page += 1; refreshMain(); } }, 'Berikutnya ›'),
    ]);
  }
  function userCard(m) {
    const u = m.u; const d = V('__users').data;
    const sel = h('select', { class: 'input', id: 'um-r', 'aria-label': 'Role' }, d.roles.map((r) => h('option', { value: r, text: r.toUpperCase() }))); sel.value = u.role;
    const amt = h('input', { class: 'input', id: 'um-a', inputmode: 'numeric', placeholder: 'mis. 10000', value: m.amt || '' });
    amt.addEventListener('input', () => { m.amt = amt.value; amt.classList.remove('bad'); });
    const busy = m.busy;
    const doRole = async () => {
      if (sel.value === u.role) return;
      if (sel.value === 'owner' && !window.confirm('Role OWNER bisa memakai perintah owner bot (atur saldo, profit, dll). Yakin?')) return;
      m.busy = true; renderModal();
      const r = await callFn('users.setRole', { nomor: u.nomor, role: sel.value });
      m.busy = false;
      if (r.ok) { u.role = r.result.role; m.ok = `Role sekarang ${String(u.role).toUpperCase()}`; m.error = ''; refreshMain(); } else { m.error = r.error; m.ok = ''; }
      renderModal();
    };
    const doAdj = async (sign) => {
      const n = Math.round(Number(String(amt.value).replace(/\D/g, '')) || 0);
      if (!n) { amt.focus(); amt.classList.add('bad'); return; }
      if (n > 10000000) { m.error = 'Maksimal Rp 10.000.000 sekali ubah.'; m.ok = ''; renderModal(); return; }
      if (sign < 0 && n > u.saldo) { m.error = `Saldo user hanya ${rpx(u.saldo)} — tidak bisa dikurangi ${rpx(n)}.`; m.ok = ''; renderModal(); return; }
      if (!window.confirm(`${sign > 0 ? 'Tambah' : 'Kurangi'} saldo ${fmtPhone(u.nomor)} sebesar ${rpx(n)}?`)) return;
      m.busy = true; renderModal();
      const r = await callFn('users.adjust', { nomor: u.nomor, delta: sign * n });
      m.busy = false;
      if (r.ok) { u.saldo = r.result.sesudah; m.amt = ''; m.ok = `Saldo ${rpx(r.result.sebelum)} → ${rpx(r.result.sesudah)}`; m.error = ''; refreshMain(); } else { m.error = r.error; m.ok = ''; }
      renderModal();
    };
    return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: fmtPhone(u.nomor) }), h('p', null, [roleChip(u.role), `  Saldo ${rpx(u.saldo)}`])]),
      h('div', { class: 'modal-body' }, [
        m.error ? msg('err', m.error) : null, m.ok ? msg('ok', m.ok) : null,
        h('div', { class: 'field' }, [h('label', { for: 'um-r', text: 'Role' }), h('div', { class: 'row' }, [sel, h('button', { class: 'btn sm', type: 'button', disabled: busy ? true : null, onclick: doRole }, 'Simpan role')])]),
        h('div', { class: 'field' }, [h('label', { for: 'um-a', text: 'Tambah / kurangi saldo' }), amt, h('div', { class: 'row' }, [
          h('button', { class: 'btn sm', type: 'button', disabled: busy ? true : null, onclick: () => doAdj(1) }, [I('plus'), 'Tambah']),
          h('button', { class: 'btn sm danger', type: 'button', disabled: busy ? true : null, onclick: () => doAdj(-1) }, '− Kurangi'),
          busy ? h('span', { class: 'spin' }) : null,
        ]), h('p', { class: 'hint', text: 'Tercatat di tab Mutasi Saldo Google Sheet. Owner dikabari lewat WhatsApp.' })]),
      ]),
      h('footer', null, [h('button', { class: 'btn primary', type: 'button', onclick: closeModal }, 'Selesai')]),
    ]);
  }

  // ── 5. RIWAYAT ──
  function renderHist() {
    const v = V('__hist'); v.kind = v.kind || 'trx';
    const key = `__hist_${v.kind}`;
    const hv = V(key);
    if (!hv.data && !hv.busy && !hv.err) setTimeout(() => loadHist(v.kind), 0);
    const tabs = h('div', { class: 'pv-tabs', role: 'tablist' }, [['trx', 'Transaksi'], ['depo', 'Deposit']].map(([k, l]) => h('button', { type: 'button', role: 'tab', class: v.kind === k ? 'on' : '', onclick: () => { if (v.kind !== k) { v.kind = k; v.page = 0; v.q = ''; v.st = ''; } refreshMain(); } }, l)));
    const head = viewHead('__hist', [tabs, refreshBtn(() => loadHist(v.kind, true), hv.busy)]);
    if (hv.err && !hv.data) return [head, msg('err', hv.err)];
    if (!hv.data) return [head, loading('Mengambil riwayat 7 hari…')];
    const rows = hv.data.rows;
    const q = (v.q || '').trim().toLowerCase();
    const list = rows.filter((r) => (!q || Object.values(r).join(' ').toLowerCase().includes(q)) && (!v.st || STC(r.status) === v.st));
    const PER = 50; const pages = Math.max(1, Math.ceil(list.length / PER)); v.page = Math.min(v.page || 0, pages - 1);
    const search = h('input', { class: 'input', id: 'h-q', type: 'search', placeholder: v.kind === 'trx' ? 'Cari nomor, invoice, tujuan, produk…' : 'Cari nomor atau ref…', value: v.q || '' });
    search.addEventListener('input', () => { v.q = search.value; v.page = 0; const keep = search.selectionStart; refreshMain(); const s2 = $('#h-q'); if (s2) { s2.focus(); s2.setSelectionRange(keep, keep); } });
    const stSel = h('select', { class: 'input', 'aria-label': 'Filter status' }, [['', 'Semua status'], ['custom', 'Sukses'], ['draft', 'Diproses / menunggu'], ['err', 'Gagal / batal / cek manual']].map(([vv, l]) => h('option', { value: vv, text: l })));
    stSel.value = v.st || ''; stSel.addEventListener('change', () => { v.st = stSel.value; v.page = 0; refreshMain(); });
    const sukses = rows.filter((r) => /sukses/i.test(r.status));
    const sum = v.kind === 'trx'
      ? [tile2('Transaksi (7 hari)', String(rows.length)), tile2('Sukses', String(sukses.length), 'good'), tile2('Omset sukses', rpx(sukses.reduce((t, r) => t + r.harga, 0)))]
      : [tile2('Deposit (7 hari)', String(rows.length)), tile2('Sukses', String(sukses.length), 'good'), tile2('Total masuk', rpx(sukses.reduce((t, r) => t + r.masuk, 0)))];
    const headCols = v.kind === 'trx' ? ['Waktu', 'Invoice', 'Nomor', 'Produk', 'Tujuan', 'Harga', 'Status'] : ['Waktu', 'Nomor', 'Jenis', 'Nominal', 'Status'];
    const rowEl = (r) => h('tr', { tabindex: '0', onclick: () => openModal({ kind: 'hist', r, k: v.kind }), onkeydown: (e) => { if (e.key === 'Enter') openModal({ kind: 'hist', r, k: v.kind }); } }, v.kind === 'trx'
      ? [h('td', { text: dateTimeID(r.ts) }), h('td', { class: 'inv' }, [h('b', { text: r.invoice || '-' }), r.invoiceProv && r.invoiceProv !== r.invoice ? h('small', { text: /^BARA-/i.test(r.invoiceProv) ? r.invoiceProv : `${provTag(r.provider)} · ${r.invoiceProv}` }) : null]), h('td', { text: fmtPhone(r.nomor) }), h('td', { class: 'wrap', text: r.item || r.kode }), h('td', { text: r.tujuan }), h('td', { text: rpx(r.harga) }), h('td', null, h('span', { class: `chip ${STC(r.status)}`, text: r.status || '-' }))]
      : [h('td', { text: dateTimeID(r.ts) }), h('td', { text: fmtPhone(r.nomor) }), h('td', { class: 'wrap', text: r.tipe || r.metode }), h('td', { text: rpx(r.nominal) }), h('td', null, h('span', { class: `chip ${STC(r.status)}`, text: r.status || '-' }))]);
    return [
      head, h('div', { class: 'tiles' }, sum),
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row filters' }, [search, stSel]),
        list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl click' }, [h('thead', null, h('tr', null, headCols.map((x) => h('th', { text: x })))), h('tbody', null, list.slice(v.page * PER, (v.page + 1) * PER).map(rowEl))])) : h('p', { class: 'hint', text: 'Tidak ada data yang cocok.' }),
        pages > 1 ? pager(v, pages) : null,
        h('p', { class: 'hint', text: 'Riwayat lebih lama dari 7 hari ada di Google Sheet rekap (tab Data Transaksi / Data Pembayaran).' }),
      ]),
    ];
  }
  const provTag = (p) => (/digi/i.test(p) ? 'DIGI' : /oke/i.test(p) ? 'OKE' : 'BARA');
  async function loadHist(kind, force) {
    const k = `__hist_${kind}`; const v = V(k);
    if (v.busy || (v.data && !force)) return;
    v.busy = true; v.err = ''; if (S.group === '__hist') refreshMain();
    const r = await callFn('history.recent', { kind });
    v.busy = false;
    if (r.ok) v.data = r.result; else v.err = r.error;
    if (S.group === '__hist') refreshMain();
  }
  function histCard(m) {
    const r = m.r;
    const F = m.k === 'trx'
      ? [['Waktu', dateTimeID(r.ts)], ['Status', r.status], ['Invoice toko', r.invoice], [`Invoice ${provTag(r.provider)}`, r.invoiceProv], ['Ref', r.ref], ['Nomor pembeli', fmtPhone(r.nomor)], ['Produk', `${r.item} (${r.kode})`], ['Tujuan', r.tujuan], ['Nickname', r.nickname], ['Harga', rpx(r.harga)], ['Profit', rpx(r.profit)], ['Metode', r.metode], ['Provider', r.provider], ['SN', r.sn], ['Keterangan', r.message]]
      : [['Waktu', dateTimeID(r.ts)], ['Status', r.status], ['Ref', r.ref], ['Nomor', fmtPhone(r.nomor)], ['Jenis', r.tipe], ['Metode', r.metode], ['Nominal', rpx(r.nominal)], ['Saldo masuk', rpx(r.masuk)]];
    return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: m.k === 'trx' ? 'Detail transaksi' : 'Detail deposit' })]),
      h('div', { class: 'modal-body' }, h('dl', { class: 'kv' }, F.filter(([, x]) => x !== undefined && x !== null && String(x).trim() && !/^\s*\(\)\s*$/.test(String(x))).flatMap(([k, x]) => [h('dt', { text: k }), h('dd', { text: String(x) })]))),
      h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: () => { try { navigator.clipboard.writeText(F.map(([k, x]) => `${k}: ${x}`).join('\n')); toast('Disalin.'); } catch (e) { /* abaikan */ } } }, [I('copy'), 'Salin']), h('button', { class: 'btn primary', type: 'button', onclick: closeModal }, 'Tutup')]),
    ]);
  }

  // ── 6. BANNER ──
  function renderBanner() {
    const g = viewGuard('__banner', 'banner.get'); const v = V('__banner');
    const head = viewHead('__banner');
    if (g) return [head, ...g];
    const d = v.data;
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'sr', id: 'bn-file' });
    file.addEventListener('change', () => { const f = file.files && file.files[0]; if (f) prepBanner(f); });
    const src = v.draft || (d.has ? `data:image/jpeg;base64,${String(d.data).replace(/[^A-Za-z0-9+/=]/g, '')}` : '');
    return [
      head,
      h('div', { class: 'dpair' }, [
        h('section', { class: 'dsec' }, [
          h('h3', { class: 'dh', text: v.draft ? 'Banner baru (belum disimpan)' : 'Banner sekarang' }),
          src ? h('img', { class: 'banner-img', src, alt: 'Banner toko' }) : h('div', { class: 'empty' }, [I('image'), h('h3', { text: 'Belum ada banner' }), h('p', { text: 'Halaman produk tampil tanpa gambar.' })]),
          v.err ? msg('err', v.err) : null,
          h('div', { class: 'row' }, v.draft
            ? [h('button', { class: 'btn primary', type: 'button', disabled: v.saving ? true : null, onclick: saveBanner }, [v.saving ? h('span', { class: 'spin' }) : I('check'), v.saving ? 'Menyimpan…' : 'Simpan banner']), h('button', { class: 'btn ghost', type: 'button', onclick: () => { v.draft = ''; refreshMain(); } }, 'Batal')]
            : [h('label', { class: 'btn primary', for: 'bn-file' }, [I('image'), d.has ? 'Ganti gambar' : 'Pilih gambar']), file,
               d.has ? h('button', { class: 'btn ghost danger', type: 'button', onclick: () => openModal({ kind: 'confirm', title: 'Hapus banner?', text: 'Halaman produk akan tampil tanpa gambar.', ok: 'Hapus', danger: true, onOk: async () => { closeModal(); const r = await callFn('banner.remove'); if (r.ok) { v.data = { has: false, data: '' }; toast('Banner dihapus.'); } else toast(r.error, 'err'); refreshMain(); } }) }, [I('trash'), 'Hapus']) : null]),
        ]),
        h('section', { class: 'dsec' }, [
          h('h3', { class: 'dh', text: 'Tips' }),
          h('ul', { class: 'tips' }, ['Ukuran ideal 1280×720 (landscape). Gambar dikecilkan otomatis ke lebar 1024 px.', 'Format JPG / PNG / WEBP. Teks di gambar sebaiknya besar supaya terbaca di HP.', 'Caption di bawah banner diatur di Wording → Menu & Halaman Produk → Halaman produk.'].map((x) => h('li', { text: x }))),
        ]),
      ]),
    ];
  }
  function prepBanner(f) {
    const v = V('__banner'); v.err = '';
    if (f.size > 15 * 1024 * 1024) { v.err = 'Gambar terlalu besar (maks 15 MB).'; refreshMain(); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = Math.min(1024, img.naturalWidth), hh = Math.round(img.naturalHeight * (w / img.naturalWidth));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, hh); cx.drawImage(img, 0, 0, w, hh);
        let q = 0.85, out = cv.toDataURL('image/jpeg', q);
        while (out.length > 900000 && q > 0.4) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
        if (out.length > 900000) { v.err = 'Gambar terlalu rumit. Coba gambar lain.'; refreshMain(); return; }
        v.draft = out; refreshMain();
      };
      img.onerror = () => { v.err = 'File bukan gambar yang bisa dibaca.'; refreshMain(); };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  }
  async function saveBanner() {
    const v = V('__banner'); v.saving = true; refreshMain();
    const r = await callFn('banner.set', { data: v.draft.split(',')[1] }, 60000);
    v.saving = false;
    if (r.ok) { v.data = { has: true, data: v.draft.split(',')[1] }; v.draft = ''; toast('Banner tersimpan & langsung dipakai bot.'); } else v.err = r.error;
    refreshMain();
  }

  // ── 8. PPOB ──
  /** Produk Baramarket (topup game): kelompok → game → produk. Hijau = tampil. */
  function renderBara() {
    const g = viewGuard('__bara', 'bara.tree'); const v = V('__bara');
    const head = viewHead('__bara', [refreshBtn(() => loadView('__bara', 'bara.tree', {}, true), v.busy)]);
    if (g) return [head, ...g];
    const d = v.data;
    v.open = v.open || {};
    const sw = (on, label, onchange) => h('button', { type: 'button', role: 'switch', class: `switch${on ? ' on' : ''}`, 'aria-checked': String(on), 'aria-label': label, onclick: (e) => { e.stopPropagation(); onchange(!on); } }, h('span'));
    const setH = async (kind, key, hidden, apply) => {
      apply(hidden); refreshMain();
      const r = await callFn('bara.set', { kind, key, hidden });
      if (!r.ok) { apply(!hidden); toast(r.error, 'err'); } else { d.hiddenCount = r.result.hiddenCount; toast(hidden ? `${key} disembunyikan dari tokomu.` : `${key} tampil lagi di tokomu.`); }
      refreshMain();
    };
    const q = (v.q || '').trim().toLowerCase();
    const search = h('input', { class: 'input', id: 'br-q', type: 'search', placeholder: 'Cari game atau kode produk… (mis. mobile legends, MLWP)', value: v.q || '' });
    search.addEventListener('input', () => { v.q = search.value; const keep = search.selectionStart; refreshMain(); const s2 = $('#br-q'); if (s2) { s2.focus(); s2.setSelectionRange(keep, keep); } });
    const match = (gm) => !q || gm.name.toLowerCase().includes(q) || (q.length >= 2 && gm.items.some((it) => (it.code + ' ' + it.nama).toLowerCase().includes(q)));
    const gameEl = (gm) => {
      const open = v.open[gm.name] || (q && q.length >= 3 && !gm.name.toLowerCase().includes(q));
      const nHid = gm.items.filter((it) => it.hidden).length;
      return h('div', { class: `pbrand${gm.hidden ? ' off' : ''}` }, [
        h('div', { class: 'prow', onclick: () => { v.open[gm.name] = !v.open[gm.name]; refreshMain(); } }, [
          h('span', { class: `chev2${open ? ' open' : ''}`, icon: 'chev' }), h('span', { text: gm.name }),
          h('small', { class: 'hint', text: `${gm.items.length} produk${nHid ? ` · ${nHid} disembunyikan` : ''}` }),
          sw(!gm.hidden, `Tampilkan ${gm.name}`, (on) => setH('games', gm.name, !on, (hid) => { gm.hidden = hid; })),
        ]),
        open ? h('div', { class: 'pitems' }, gm.items.length ? gm.items.filter((it) => !q || q.length < 3 || gm.name.toLowerCase().includes(q) || (it.code + ' ' + it.nama).toLowerCase().includes(q)).map((it) => h('div', { class: `pitem${it.hidden ? ' off' : ''}` }, [
          h('span', { class: 'tx' }, [h('span', { text: it.nama }), h('code', { text: it.code }), it.aktif ? null : h('span', { class: 'chip def', text: 'gangguan' })]),
          sw(!it.hidden, `Tampilkan ${it.code}`, (on) => setH('prods', it.code, !on, (hid) => { it.hidden = hid; })),
        ])) : [h('p', { class: 'hint', text: d.error ? 'Produk belum bisa dimuat dari Baramarket.' : 'Belum ada produk untuk game ini.' })]) : null,
      ]);
    };
    const groups = d.groups.map((gr) => ({ ...gr, games: gr.games.filter(match) })).filter((gr) => gr.games.length);
    const nGames = d.groups.reduce((n, gr) => n + gr.games.length, 0);
    return [
      head,
      h('div', { class: 'tiles' }, [tile2('Disembunyikan', String(d.hiddenCount || 0), d.hiddenCount ? 'warn' : ''), tile2('Game', String(nGames))]),
      d.error ? msg('warn', `Daftar produk belum bisa diambil: ${d.error}. Game tetap bisa diatur.`) : null,
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row filters' }, [search, d.hiddenCount ? h('button', { class: 'btn sm', type: 'button', onclick: () => openModal({ kind: 'confirm', title: 'Tampilkan semua game & produk?', text: 'Semua game dan produk Baramarket yang disembunyikan akan tampil lagi di tokomu.', ok: 'Tampilkan semua', onOk: async () => { closeModal(); const r = await callFn('bara.reset'); if (r.ok) { v.data = null; loadView('__bara', 'bara.tree', {}, true); toast('Semua game & produk tampil lagi.'); } else toast(r.error, 'err'); } }) }, [I('eye'), 'Tampilkan semua']) : null]),
        h('p', { class: 'hint', text: 'Hijau = tampil & bisa diorder. Matikan saklar game untuk menyembunyikan seluruh game, atau buka game lalu matikan produk tertentu saja. Pembeli yang mengetik kodenya akan mendapat jawaban "produk tidak ada".' }),
        ...groups.map((gr) => h('div', { class: 'pcat' }, [
          h('div', { class: 'prow static' }, [h('b', { text: `${gr.name} ${gr.emoji || ''}`.trim() }), h('small', { class: 'hint', text: `${gr.games.length} game` })]),
          h('div', { class: 'pbrands' }, gr.games.map(gameEl)),
        ])),
        !groups.length ? h('div', { class: 'empty' }, [I('search'), h('h3', { text: 'Tidak ada yang cocok' }), h('p', { text: 'Coba kata lain atau kode produk.' })]) : null,
      ]),
    ];
  }

  function renderPpob() {
    const g = viewGuard('__ppob', 'ppob.tree'); const v = V('__ppob');
    const head = viewHead('__ppob', [refreshBtn(() => loadView('__ppob', 'ppob.tree', {}, true), v.busy)]);
    if (g) return [head, ...g];
    const d = v.data;
    v.open = v.open || {};
    const sw = (on, label, onchange) => {
      const b = h('button', { type: 'button', role: 'switch', class: `switch${on ? ' on' : ''}`, 'aria-checked': String(on), 'aria-label': label, onclick: (e) => { e.stopPropagation(); onchange(!on); } }, h('span'));
      return b;
    };
    const setH = async (kind, key, hidden, apply) => {
      apply(hidden); refreshMain();
      const r = await callFn('ppob.set', { kind, key, hidden });
      if (!r.ok) { apply(!hidden); toast(r.error, 'err'); } else d.hiddenCount = r.result.hiddenCount;
      refreshMain();
    };
    const up = (x) => String(x).trim().toUpperCase();
    const q = (v.q || '').trim().toLowerCase();
    const search = h('input', { class: 'input', id: 'pp-q', type: 'search', placeholder: 'Cari kategori, layanan, atau kode produk…', value: v.q || '' });
    search.addEventListener('input', () => { v.q = search.value; const keep = search.selectionStart; refreshMain(); const s2 = $('#pp-q'); if (s2) { s2.focus(); s2.setSelectionRange(keep, keep); } });
    const cats = d.cats.filter((c) => !q || c.name.toLowerCase().includes(q) || c.brands.some((b) => b.name.toLowerCase().includes(q) || b.items.some((it) => (it.kode + ' ' + it.nama).toLowerCase().includes(q))));
    const catEl = (c) => {
      const parentHidden = c.kuota && d.kuotaHidden;
      const open = v.open[c.name] || (q && q.length >= 2);
      return h('div', { class: `pcat${c.hidden || parentHidden ? ' off' : ''}` }, [
        h('div', { class: 'prow', onclick: () => { v.open[c.name] = !v.open[c.name]; refreshMain(); } }, [
          h('span', { class: `chev2${open ? ' open' : ''}`, icon: 'chev' }), h('b', { text: c.name }), h('small', { class: 'hint', text: `${c.brands.length} layanan` }),
          parentHidden ? h('span', { class: 'chip def', text: 'ikut KUOTA' }) : null,
          sw(!c.hidden, `Tampilkan ${c.name}`, (on) => setH('cats', c.name, !on, (hid) => { c.hidden = hid; })),
        ]),
        open ? h('div', { class: 'pbrands' }, c.brands.filter((b) => !q || c.name.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.items.some((it) => (it.kode + ' ' + it.nama).toLowerCase().includes(q))).map((b) => {
          const bk = `${c.name}|${b.name}`; const bo = v.open[bk] || (q && q.length >= 3);
          return h('div', { class: `pbrand${b.hidden ? ' off' : ''}` }, [
            h('div', { class: 'prow', onclick: () => { v.open[bk] = !v.open[bk]; refreshMain(); } }, [
              h('span', { class: `chev2${bo ? ' open' : ''}`, icon: 'chev' }), h('span', { text: b.name }), h('small', { class: 'hint', text: `${b.items.length} produk` }),
              c.brands.length > 1 ? sw(!b.hidden, `Tampilkan ${b.name}`, (on) => setH('brands', `${up(c.name)}|${up(b.name)}`, !on, (hid) => { b.hidden = hid; })) : null,
            ]),
            bo ? h('div', { class: 'pitems' }, b.items.filter((it) => !q || q.length < 3 || (it.kode + ' ' + it.nama + ' ' + b.name + ' ' + c.name).toLowerCase().includes(q)).map((it) => h('div', { class: `pitem${it.hidden ? ' off' : ''}` }, [
              h('span', { class: 'tx' }, [h('span', { text: it.nama }), h('code', { text: it.kode })]),
              sw(!it.hidden, `Tampilkan ${it.kode}`, (on) => setH('prods', it.kode, !on, (hid) => { it.hidden = hid; })),
            ]))) : null,
          ]);
        })) : null,
      ]);
    };
    const kuota = cats.filter((c) => c.kuota), others = cats.filter((c) => !c.kuota);
    return [
      head,
      h('div', { class: 'tiles' }, [tile2('Disembunyikan', String(d.hiddenCount || 0), d.hiddenCount ? 'warn' : ''), tile2('Kategori', String(d.cats.length))]),
      h('section', { class: 'dsec' }, [
        h('div', { class: 'row filters' }, [search, d.hiddenCount ? h('button', { class: 'btn sm', type: 'button', onclick: () => openModal({ kind: 'confirm', title: 'Tampilkan semua produk PPOB?', text: 'Semua kategori, layanan & produk yang disembunyikan akan tampil lagi.', ok: 'Tampilkan semua', onOk: async () => { closeModal(); const r = await callFn('ppob.reset'); if (r.ok) { v.data = null; loadView('__ppob', 'ppob.tree', {}, true); toast('Semua produk PPOB tampil lagi.'); } else toast(r.error, 'err'); } }) }, [I('eye'), 'Tampilkan semua']) : null]),
        h('p', { class: 'hint', text: 'Hijau = tampil di tokomu. Produk mengikuti etalase pusat Baramarket — kamu hanya bisa menyembunyikan, tidak menambah.' }),
        ...others.map(catEl),
        kuota.length ? h('div', { class: `pcat group${d.kuotaHidden ? ' off' : ''}` }, [
          h('div', { class: 'prow' }, [h('b', { text: 'KUOTA (semua operator)' }), h('small', { class: 'hint', text: `${kuota.length} operator` }), sw(!d.kuotaHidden, 'Tampilkan semua kuota', (on) => setH('cats', 'KUOTA', !on, (hid) => { d.kuotaHidden = hid; }))]),
          h('div', { class: 'pbrands' }, kuota.map(catEl)),
        ]) : null,
      ]),
    ];
  }

  // ── LAYANAN LAINNYA (Digiflazz): kelola kode menu + cari layanan ──
  // Data Digiflazz selalu dari cache di bot (diperbarui otomatis tiap 30 menit). Tombol "Perbarui" dijaga
  // minimal 5 menit sekali di bot, jadi akun Digiflazz tidak kena limit walau tombol diklik berulang.
  const agoID = (ms) => { if (!ms) return 'belum pernah'; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'baru saja' : m < 60 ? `${m} menit lalu` : `${Math.round(m / 60)} jam lalu`; };
  function cacheLine(c) {
    if (!c) return null;
    const t = c.cooling ? `⏸️ Digiflazz sedang membatasi pengecekan — dijeda ±${c.waitMin} menit. Pembeli tetap dilayani dari data tersimpan.` : `Data Digiflazz: ${c.count} produk · diambil ${agoID(c.at)} · otomatis diperbarui tiap 30 menit.`;
    return h('p', { class: `hint${c.cooling ? ' warnt' : ''}`, text: t });
  }
  function suggestCodeLocal(brand, taken) {
    const w = String(brand || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
    let c = (w.length > 1 ? w.map((x) => x[0]).join('') : (w[0] || 'kode')).slice(0, 12);
    if (c.length < 2) c = (w.join('') || 'kode').slice(0, 12);
    let out = c, i = 2; while (taken.includes(out)) out = `${c}${i++}`.slice(0, 20);
    return out;
  }
  function renderDigi() {
    const v = V('__digi'); v.tab = v.tab || 'menu';
    const g = viewGuard('__digi', 'digi.codes');
    const tabs = h('div', { class: 'pv-tabs', role: 'tablist' }, [['menu', 'Menu saya'], ['cari', 'Cari layanan Digiflazz']].map(([k, l]) => h('button', { type: 'button', role: 'tab', class: v.tab === k ? 'on' : '', onclick: () => { v.tab = k; refreshMain(); } }, l)));
    const head = viewHead('__digi', [tabs]);
    if (g) return [head, ...g];
    const d = v.data;
    const refreshBtn2 = h('button', { class: 'btn sm', type: 'button', disabled: v.refreshing ? true : null, onclick: digiRefresh }, [v.refreshing ? h('span', { class: 'spin' }) : I('refresh'), v.refreshing ? 'Memperbarui…' : 'Perbarui data Digiflazz']);
    const top = h('div', { class: 'row between digi-top' }, [cacheLine((V('__digiCat').data && V('__digiCat').data.cache) || d.cache), refreshBtn2]);
    return [head, d.error ? msg('warn', d.error) : null, top, ...(v.tab === 'menu' ? digiMenu(d) : digiCari())];
  }
  async function digiRefresh() {
    const v = V('__digi'); v.refreshing = true; refreshMain();
    const r = await callFn('digi.refresh', {}, 60000);
    v.refreshing = false;
    if (r.ok) {
      V('__digiCat').data = r.result;
      toast(r.result.refreshed ? 'Data Digiflazz diperbarui.' : `Data masih baru (diambil ${agoID(r.result.cache.at)}) — dipakai tanpa memanggil Digiflazz.`);
      loadView('__digi', 'digi.codes', {}, true);
    } else toast(r.error, 'err');
    refreshMain();
  }
  function digiMenu(d) {
    const v = V('__digi');
    const cats = [];
    for (const e of d.list) { if (!cats.includes(e.kategori)) cats.push(e.kategori); }
    const lowInp = h('input', { class: 'input num wide', type: 'number', min: '0', step: '10000', value: String(d.low), 'aria-label': 'Batas peringatan saldo Digiflazz' });
    const lowRow = h('div', { class: 'setrow' }, [
      h('div', { class: 'tx' }, [h('b', { text: 'Peringatan saldo Digiflazz menipis' }), h('small', { text: 'Owner dikabari lewat WhatsApp bila saldo Digiflazz di bawah angka ini. 0 = mati.' })]),
      h('div', { class: 'row' }, [h('span', { class: 'hint', text: 'Rp' }), lowInp, h('button', { class: 'btn sm', type: 'button', onclick: async () => {
        const n = Math.round(Number(lowInp.value) || 0);
        const r = await callFn('digi.setLow', { value: n });
        if (r.ok) { d.low = r.result.low; toast('Batas peringatan disimpan.'); } else toast(r.error, 'err');
      } }, 'Simpan')]),
    ]);
    if (!d.list.length) {
      return [h('section', { class: 'dsec' }, [h('div', { class: 'empty' }, [I('list'), h('h3', { text: 'Menu Layanan Lainnya masih kosong' }), h('p', { text: 'Buka tab "Cari layanan Digiflazz", pilih brand, lalu tekan Tambah.' }),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { v.tab = 'cari'; refreshMain(); } }, [I('plus'), 'Cari & tambah layanan'])])]), h('section', { class: 'dsec' }, [lowRow])];
    }
    return [
      h('div', { class: 'tiles' }, [tile2('Brand di menu', String(d.list.length)), tile2('Kategori', String(cats.length)), tile2('Tanpa produk aktif', String(d.list.filter((e) => e.active === 0).length), d.list.some((e) => e.active === 0) ? 'warn' : '')]),
      ...cats.map((k) => h('section', { class: 'dsec' }, [
        h('h3', { class: 'dh', text: k }),
        ...d.list.filter((e) => e.kategori === k).map((e) => h('div', { class: 'setrow digi-row' }, [
          h('div', { class: 'tx' }, [
            h('b', null, [e.brand, ' ', h('code', { class: 'kode', text: e.code })]),
            h('small', { text: `${e.types.length ? `Type: ${e.types.join(', ')}` : 'Semua type'} · ${e.active === null ? 'jumlah produk belum bisa dicek' : e.active ? `${e.active} produk aktif` : '⚠️ tidak ada produk aktif'}` }),
          ]),
          h('div', { class: 'row' }, [
            h('button', { class: 'btn sm', type: 'button', onclick: () => openDigiProducts(e) }, [I('eye'), 'Produk']),
            h('button', { class: 'btn sm', type: 'button', onclick: () => openDigiEdit(e) }, [I('wand'), 'Ubah']),
            h('button', { class: 'btn sm ghost danger', type: 'button', 'aria-label': `Hapus ${e.code}`, onclick: () => openModal({ kind: 'confirm', title: `Hapus ${e.brand}?`, text: `Kode ${e.code} dihapus dari menu Layanan Lainnya. Pembeli tidak bisa melihat / order brand ini lagi.`, ok: 'Hapus', danger: true, onOk: async () => {
              closeModal(); const r = await callFn('digi.remove', { code: e.code });
              if (r.ok) { V('__digi').data = r.result; V('__digiCat').data = null; toast(`${e.brand} dihapus dari menu.`); } else toast(r.error, 'err');
              refreshMain();
            } }) }, I('trash')),
          ]),
        ])),
      ])),
      h('section', { class: 'dsec' }, [lowRow]),
    ];
  }
  function digiCari() {
    const v = V('__digiCat');
    const g = viewGuard('__digiCat', 'digi.catalog');
    if (g) return g;
    const d = v.data;
    const q = (v.q || '').trim().toLowerCase();
    const search = h('input', { class: 'input', id: 'dg-q', type: 'search', placeholder: 'Cari brand, mis. free fire, telkomsel, dana…', value: v.q || '' });
    search.addEventListener('input', () => { v.q = search.value; const keep = search.selectionStart; refreshMain(); const s2 = $('#dg-q'); if (s2) { s2.focus(); s2.setSelectionRange(keep, keep); } });
    const catSel = h('select', { class: 'input', 'aria-label': 'Kategori' }, [h('option', { value: '', text: 'Semua kategori' }), ...d.cats.map((c) => h('option', { value: c.name, text: `${c.name} (${c.brands.length})` }))]);
    catSel.value = v.cat || ''; catSel.addEventListener('change', () => { v.cat = catSel.value; refreshMain(); });
    let rows = [];
    for (const c of d.cats) { if (v.cat && c.name !== v.cat) continue; for (const b of c.brands) if (!q || b.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) rows.push({ c, b }); }
    const total = rows.length; rows = rows.slice(0, 150);
    return [h('section', { class: 'dsec' }, [
      h('div', { class: 'row filters' }, [search, catSel]),
      rows.length ? h('div', { class: 'digi-list' }, rows.map(({ c, b }) => h('div', { class: 'setrow digi-row' }, [
        h('div', { class: 'tx' }, [h('b', { text: b.name }), h('small', { text: `${c.name} · ${b.active}/${b.count} produk aktif${b.types.length ? ` · type: ${b.types.slice(0, 6).join(', ')}${b.types.length > 6 ? '…' : ''}` : ''}` })]),
        h('div', { class: 'row' }, [
          b.codes.length ? h('span', { class: 'chip custom', text: `✓ di menu (${b.codes.join(', ')})` }) : null,
          h('button', { class: 'btn sm', type: 'button', onclick: () => openDigiProducts({ kategori: c.name, brand: b.name, types: [] }) }, [I('eye'), 'Produk']),
          h('button', { class: `btn sm${b.codes.length ? '' : ' primary'}`, type: 'button', onclick: () => {
            const taken = (V('__digi').data ? V('__digi').data.list : []).map((x) => x.code);
            openModal({ kind: 'digiForm', mode: 'add', e: { kategori: c.name, brand: b.name, code: suggestCodeLocal(b.name, taken), types: [] }, allTypes: b.types });
          } }, [I('plus'), 'Tambah']),
        ]),
      ]))) : h('p', { class: 'hint', text: 'Tidak ada brand yang cocok.' }),
      total > rows.length ? h('p', { class: 'hint', text: `Menampilkan 150 dari ${total} brand — persempit pencarian.` }) : null,
    ])];
  }
  async function openDigiEdit(e) {
    const m = { kind: 'digiForm', mode: 'edit', e: { ...e, types: [...e.types] } };
    openModal(m);
    if (V('__digiCat').data) return;
    m.loadingTypes = true; renderModal();           // pilihan type diambil dari data Digiflazz tersimpan
    const r = await callFn('digi.catalog');
    m.loadingTypes = false;
    if (r.ok) V('__digiCat').data = r.result;
    if (S.modal === m) renderModal();
  }
  function digiFormCard(m) {
    const e = m.e;
    const cat = V('__digiCat').data;
    let allTypes = m.allTypes;
    if (!allTypes && cat) { const c = cat.cats.find((x) => x.name.toLowerCase() === e.kategori.toLowerCase()); const b = c && c.brands.find((x) => x.name.toUpperCase() === e.brand.toUpperCase()); allTypes = b ? b.types : []; }
    allTypes = [...new Set([...(allTypes || []), ...e.types])];
    const code = h('input', { class: 'input', id: 'dg-code', value: e.code, maxlength: '20', autocomplete: 'off', disabled: m.mode === 'edit' ? true : null, 'aria-describedby': 'dg-code-h' });
    code.addEventListener('input', () => { e.code = code.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20); if (code.value !== e.code) code.value = e.code; });
    const typeBox = m.loadingTypes ? h('div', { class: 'row' }, [h('span', { class: 'spin' }), h('span', { class: 'hint', text: 'Memuat pilihan type…' })]) : allTypes.length ? h('div', { class: 'typechk' }, allTypes.map((t) => {
      const cb = h('input', { type: 'checkbox', checked: e.types.includes(t) ? true : null });
      cb.addEventListener('change', () => { e.types = cb.checked ? [...e.types, t] : e.types.filter((x) => x !== t); });
      return h('label', { class: 'chk' }, [cb, h('span', { text: t })]);
    })) : h('p', { class: 'hint', text: 'Brand ini tidak punya pilihan type — semua produk ditampilkan.' });
    const save = async () => {
      if (!/^[a-z0-9_-]{1,20}$/.test(e.code)) { m.error = 'Kode 1–20 karakter: huruf kecil, angka, - atau _'; renderModal(); return; }
      m.busy = true; m.error = ''; renderModal();
      const r = m.mode === 'add' ? await callFn('digi.add', { kategori: e.kategori, brand: e.brand, code: e.code, types: e.types }) : await callFn('digi.update', { code: e.code, types: e.types });
      m.busy = false;
      if (!r.ok) { m.error = r.error; renderModal(); return; }
      V('__digi').data = { ...V('__digi').data, ...r.result };
      const cv = V('__digiCat').data; if (cv && m.mode === 'add') for (const c of cv.cats) if (c.name.toLowerCase() === e.kategori.toLowerCase()) for (const b of c.brands) if (b.name.toUpperCase() === e.brand.toUpperCase()) b.codes = [...b.codes, e.code];
      closeModal(); toast(m.mode === 'add' ? `${e.brand} masuk menu Layanan Lainnya (kode ${e.code}).` : 'Perubahan disimpan.'); refreshMain();
    };
    return h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: m.mode === 'add' ? 'Tambah ke Layanan Lainnya' : `Ubah ${e.brand}` }), h('p', { text: `${e.kategori} → ${e.brand}` })]),
      h('div', { class: 'modal-body' }, [
        m.error ? msg('err', m.error) : null,
        h('div', { class: 'field' }, [h('label', { for: 'dg-code', text: 'Kode menu' }), code, h('p', { class: 'hint', id: 'dg-code-h', text: m.mode === 'add' ? 'Dipakai pembeli: get2 [kode]. Huruf kecil / angka, maks 20.' : 'Kode tidak bisa diganti — hapus lalu tambah lagi bila perlu.' })]),
        h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'Type yang ditampilkan (kosong = semua)' }), typeBox]),
      ]),
      h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: closeModal }, 'Batal'), h('button', { class: 'btn primary', type: 'button', disabled: m.busy ? true : null, onclick: save }, [m.busy ? h('span', { class: 'spin' }) : I('check'), m.mode === 'add' ? 'Tambahkan' : 'Simpan'])]),
    ]);
  }
  async function openDigiProducts(e) {
    const m = { kind: 'digiProducts', e, busy: true }; S.modal = m; renderModal();
    const r = await callFn('digi.products', { kategori: e.kategori, brand: e.brand, types: e.types || [] });
    if (S.modal !== m) return;
    m.busy = false; if (r.ok) m.data = r.result; else m.error = r.error; renderModal();
  }
  function digiProductsCard(m) {
    const e = m.e;
    let body;
    if (m.busy) body = [loading('Mengambil produk dari data Digiflazz tersimpan…')];
    else if (m.error) body = [msg('err', m.error)];
    else if (!m.data.rows.length) body = [h('p', { class: 'hint', text: 'Tidak ada produk untuk brand / type ini.' })];
    else {
      const roles = m.data.roles.filter((r) => r !== 'owner');
      body = [h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [
        h('thead', null, h('tr', null, ['Produk', 'Kode', 'Modal', ...roles.map((r) => r[0].toUpperCase() + r.slice(1)), 'Status'].map((x) => h('th', { text: x })))),
        h('tbody', null, m.data.rows.map((p) => h('tr', { class: p.aktif ? '' : 'off' }, [h('td', { class: 'wrap', text: `${p.nama}${p.type ? ` · ${p.type}` : ''}` }), h('td', null, h('code', { class: 'kode', text: p.sku })), h('td', { text: rpx(p.modal) }), ...roles.map((r) => h('td', { text: rpx(p.harga[r]) })),
          h('td', null, h('span', { class: `chip ${p.aktif ? (p.cutoff ? 'draft' : 'custom') : 'err'}`, text: p.aktif ? (p.cutoff ? 'Cut-off' : 'Aktif') : 'Gangguan' }))]))),
      ])), h('p', { class: 'hint', text: 'Harga jual = modal + profit Layanan Lainnya per role (atur di Profit per Role → Layanan Lainnya). Pembeli order: TP2 [kode produk] [tujuan].' })];
    }
    return h('div', { class: 'modal-card wide', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
      h('header', null, [h('h3', { id: 'mt', text: `Produk ${e.brand}` }), h('p', { text: `${e.kategori}${e.types && e.types.length ? ` · type ${e.types.join(', ')}` : ''}${m.data ? ` · ${m.data.rows.length} produk` : ''}` })]),
      h('div', { class: 'modal-body' }, body),
      h('footer', null, [h('button', { class: 'btn primary', type: 'button', onclick: closeModal }, 'Tutup')]),
    ]);
  }

  // ── SALURAN TESTIMONI (setsaluran / ceksaluran / setteksaluran) ──
  function renderSaluran() {
    const v = V('__saluran');
    const g = viewGuard('__saluran', 'saluran.get');
    const head = viewHead('__saluran');
    if (g) return [head, ...g];
    const d = v.data;
    const inp = h('input', { class: 'input', id: 'sl-link', type: 'url', inputmode: 'url', placeholder: 'https://whatsapp.com/channel/0029Va…', value: v.edit !== undefined ? v.edit : d.link });
    inp.addEventListener('input', () => { v.edit = inp.value; });
    const st = v.status || d.status;
    const run = async (fn, args, okMsg) => {
      v.busy = fn; refreshMain();
      const r = await callFn(fn, args || {}, 40000);
      v.busy = '';
      if (r.ok) { v.data = r.result; v.status = r.result.status || null; v.edit = undefined; if (okMsg) toast(okMsg); } else toast(r.error, 'err');
      refreshMain();
    };
    const save = () => {
      const l = String(inp.value || '').trim();
      if (!/^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]{10,60}\/?$/i.test(l) && !/^\d{8,30}@newsletter$/.test(l)) { toast('Tempel link saluran, contoh: https://whatsapp.com/channel/0029Va…', 'err'); inp.focus(); return; }
      run('saluran.set', { link: l }, 'Saluran testimoni disimpan.');
    };
    const spin = (k, label, icon) => [v.busy === k ? h('span', { class: 'spin' }) : I(icon), label];
    const stBox = st ? msg(st.ok ? 'ok' : st.ok === null ? 'info' : 'warn', String(st.text || '').replace(/\*/g, '')) : null;
    const goWording = () => { const it = items().find((x) => x.key === 'testiText'); if (!it) return; S.group = it.g; S.q = ''; S.sel = it.key; renderApp(); };
    return [
      head,
      h('div', { class: 'dpair' }, [
        h('section', { class: 'dsec' }, [
          h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Link saluran' }), d.link ? h('span', { class: 'chip custom', text: '● Terpasang' }) : h('span', { class: 'chip def', text: 'Belum diatur' })]),
          h('div', { class: 'field' }, [h('label', { for: 'sl-link', text: 'Link saluran WhatsApp milik tokomu' }), inp,
            h('p', { class: 'hint', text: 'Buka saluranmu di WhatsApp → Info saluran → Salin tautan. Lalu jadikan NOMOR BOT admin saluran (Info saluran → Undang admin) dan terima undangannya dari WhatsApp nomor bot.' })]),
          stBox,
          h('div', { class: 'row' }, [
            h('button', { class: 'btn primary', type: 'button', disabled: v.busy ? true : null, onclick: save }, spin('saluran.set', 'Simpan link', 'check')),
            d.link ? h('button', { class: 'btn', type: 'button', disabled: v.busy ? true : null, onclick: () => run('saluran.check', { send: true }, '') }, spin('saluran.check', 'Cek & kirim pesan tes', 'chat')) : null,
            d.link ? h('button', { class: 'btn ghost danger', type: 'button', disabled: v.busy ? true : null, onclick: () => openModal({ kind: 'confirm', title: 'Matikan saluran testimoni?', text: 'Transaksi sukses tidak diposting ke saluran lagi. Link bisa dipasang kembali kapan saja.', ok: 'Matikan', danger: true, onOk: () => { closeModal(); run('saluran.reset', {}, 'Saluran testimoni dimatikan.'); } }) }, [I('x'), 'Matikan']) : null,
          ]),
        ]),
        h('section', { class: 'dsec' }, [
          h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Contoh postingan' }), h('span', { class: `chip ${d.customText ? 'custom' : 'def'}`, text: d.customText ? 'Wording kustom' : 'Wording bawaan' })]),
          h('div', { class: 'wa-mini' }, waFormat(d.sample)),
          h('p', { class: 'hint', text: 'Setiap transaksi sukses otomatis diposting seperti ini. Data pembeli disamarkan (nickname, target & invoice).' }),
          h('div', null, h('button', { class: 'btn', type: 'button', onclick: goWording }, [I('wand'), 'Ubah wording penutup'])),
        ]),
      ]),
    ];
  }

  // ── 11. PANDUAN ──
  const FAQ = [
    ['Cara menyambungkan (pairing) bot', 'Buka menu Bot & Sewa → isi nomor WhatsApp untuk bot (bukan nomor owner) → Minta kode pairing. Di HP nomor bot: WhatsApp → Perangkat tertaut → Tautkan perangkat → "Tautkan dengan nomor telepon saja" → masukkan kode 8 huruf. Kode berlaku singkat; kalau gagal, minta kode lagi.'],
    ['Mengubah tampilan pesan bot (wording)', 'Pilih kelompok di bagian Wording & profil, klik pesan yang mau diubah, edit teksnya, dan lihat pratinjaunya langsung. Perubahan tersimpan sebagai draf — bot baru berubah setelah kamu menekan Luncurkan.'],
    ['Kode @… di wording itu apa?', 'Kode pengganti yang diisi otomatis oleh bot, mis. @toko = nama toko, @produk = nama produk. Klik kode di bawah editor untuk menyisipkannya. Baris yang berisi kode opsional (mis. @sn) hilang sendiri kalau datanya kosong.'],
    ['Kapan uang QRIS dicairkan?', 'Pembayaran QRIS pembeli masuk ke akun pusat lalu dicairkan ke rekening kamu per hari. Statusnya terlihat di Dashboard → Pencairan QRIS (Belum dicairkan / Diproses / Sudah dicairkan) dan di Google Sheet rekap.'],
    ['Deposit saldo web Baramarket', 'Saldo web dipakai bot untuk membeli produk ke Baramarket. Isi lewat Dashboard → Deposit Saldo Web: masukkan nominal, scan QRIS, saldo masuk otomatis sebesar total yang dibayar.'],
    ['Mengatur profit / harga jual', 'Menu Profit per Role: isi persen untung untuk Basic, Gold, Platinum, dan Owner. Harga jual = modal + persen. Pakai simulasi untuk melihat harga jual sebelum menyimpan.'],
    ['Pembeli bilang "Fitur ini khusus di grup"', 'Mode order sedang "Hanya di grup". Ubah di Dashboard → Pengaturan bot → Mode order bila pembeli boleh order di chat pribadi juga.'],
    ['Saldo provider "Waspada"', 'Artinya total saldo provider (Baramarket + lainnya) lebih kecil dari total saldo milik semua user. Segera deposit saldo web supaya order pembeli tidak gagal.'],
    ['Keamanan akun', 'Login hanya dengan kode OTP yang dikirim bot Baramarket ke WhatsApp owner. Jangan berikan kode itu ke siapa pun — admin tidak pernah memintanya. Nyalakan verifikasi dua langkah WhatsApp. Curiga ada yang masuk? Menu ⋮ → Keluar dari semua perangkat.'],
    ['Butuh bantuan lain?', 'Gabung grup diskusi penyewa untuk tanya jawab dan info update fitur.'],
  ];
  function renderHelp() {
    return [
      viewHead('__help'),
      h('section', { class: 'dsec' }, FAQ.map(([qq, a], i) => h('details', { class: 'box', open: i === 0 ? true : null }, [h('summary', null, [I('info'), qq, chevI()]), h('div', { class: 'box-in' }, h('p', { style: 'margin:0', text: a }))]))),
      h('a', { class: 'slink grp', href: GROUP_URL, target: '_blank', rel: 'noopener noreferrer' }, [h('span', { class: 'gi', icon: 'chat' }), h('span', { class: 'tx' }, [h('b', { text: 'Gabung Grup Diskusi Sewa Bot Topup' }), h('small', { text: 'Tanya jawab & info update fitur' })]), I('ext')]),
    ];
  }

  // ── 7. GRAFIK 30 HARI (dashboard) ──
  function chartEl(rows, metric) {
    const W = 720, H = 180, P = { l: 8, r: 8, t: 12, b: 24 };
    const vals = rows.map((r) => r[metric] || 0);
    const max = Math.max(1, ...vals);
    const bw = (W - P.l - P.r) / rows.length;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
    const total = vals.reduce((a, b) => a + b, 0);
    svg.setAttribute('aria-label', `Grafik ${metric} 30 hari, total ${metric === 'n' ? total : rpx(total)}`);
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    svg.appendChild(mk('line', { x1: P.l, x2: W - P.r, y1: H - P.b, y2: H - P.b, class: 'axis' }));
    rows.forEach((r, i) => {
      const v2 = vals[i]; const hh = Math.round(((H - P.t - P.b) * v2) / max);
      const x = P.l + i * bw + bw * 0.15, y = H - P.b - hh;
      const rect = mk('rect', { x: x.toFixed(1), y, width: (bw * 0.7).toFixed(1), height: Math.max(v2 ? 2 : 0, hh), rx: 2, class: i === rows.length - 1 ? 'bar now' : 'bar' });
      const t = document.createElementNS(NS, 'title'); t.textContent = `${dayID(r.day)}: ${metric === 'n' ? `${v2} transaksi` : rpx(v2)}`; rect.appendChild(t);
      svg.appendChild(rect);
      if (i % 5 === 0 || i === rows.length - 1) { const lb = mk('text', { x: (x + bw * 0.35).toFixed(1), y: H - 6, class: 'axl', 'text-anchor': 'middle' }); lb.textContent = String(Number(r.day.slice(8))); svg.appendChild(lb); }
    });
    return svg;
  }
  function chartSection(d) {
    if (!d.chart) return null;
    const m = S.chartM || 'omset';
    const seg = h('div', { class: 'pv-tabs', role: 'tablist' }, [['omset', 'Omset'], ['profit', 'Profit'], ['n', 'Transaksi']].map(([k, l]) => h('button', { type: 'button', role: 'tab', class: m === k ? 'on' : '', onclick: () => { S.chartM = k; refreshMain(); } }, l)));
    const tot = d.chart.reduce((a, r) => a + (r[m] || 0), 0);
    const best = d.chart.reduce((a, r) => ((r[m] || 0) > (a[m] || 0) ? r : a), d.chart[0]);
    return h('section', { class: 'dsec' }, [
      h('div', { class: 'row between' }, [h('h3', { class: 'dh', text: 'Grafik 30 hari' }), seg]),
      h('div', { class: 'tiles' }, [tile2(`Total ${m === 'n' ? 'transaksi' : m}`, m === 'n' ? String(tot) : rpx(tot)), tile2('Rata-rata / hari', m === 'n' ? (tot / 30).toFixed(1) : rpx(tot / 30)), tile2('Hari terbaik', best && best[m] ? `${dayID(best.day)} · ${m === 'n' ? best[m] : rpx(best[m])}` : '—')]),
      h('div', { class: 'chart-wrap' }, chartEl(d.chart, m)),
    ]);
  }

  // ───────────────────────── editor ─────────────────────────
  function renderEditor(it) {
    const short = it.kind === 'short';
    const ta = short
      ? h('input', { class: 'ta', type: 'text', value: editText(it), maxlength: String(it.max + 20), id: 'ed-ta', 'aria-label': it.label, spellcheck: 'false' })
      : h('textarea', { class: 'ta', id: 'ed-ta', 'aria-label': it.label, spellcheck: 'false', rows: String(Math.min(18, Math.max(8, editText(it).split('\n').length + 2))) });
    if (!short) ta.value = editText(it);
    const counter = h('span', { class: 'counter', id: 'ed-count' });
    const probs = h('div', { class: 'probs', id: 'ed-probs' });
    const pvWrap = h('div', { id: 'ed-pv' });
    const pvTabs = h('div', { class: 'pv-tabs', role: 'tablist' }, [
      h('button', { type: 'button', role: 'tab', class: S.pv === 'new' ? 'on' : '', 'aria-selected': String(S.pv === 'new'), onclick: () => { S.pv = 'new'; refreshMain(); } }, 'Wording baru'),
      h('button', { type: 'button', role: 'tab', class: S.pv === 'live' ? 'on' : '', 'aria-selected': String(S.pv === 'live'), onclick: () => { S.pv = 'live'; refreshMain(); } }, 'Di bot sekarang'),
    ]);

    const update = () => {
      const v = ta.value;
      const len = [...v].length;
      counter.textContent = `${len}/${it.max}`;
      counter.className = `counter${len > it.max ? ' bad' : ''}`;
      const pr = problems(it, v);
      probs.textContent = '';
      pr.errors.forEach((e) => probs.appendChild(msg('err', e)));
      pr.warns.forEach((w) => probs.appendChild(msg('warn', w)));
      ta.classList.toggle('bad', pr.errors.length > 0 && changeOf(it) !== undefined);
      pvWrap.textContent = '';
      const shown = S.pv === 'live' ? previewLive(it) : previewOf(it, v);
      pvWrap.appendChild(waPhone(it, shown, S.pv === 'live'));
      refreshCard(it); refreshSide(); renderDock();
    };
    const setValue = (v, focus) => { ta.value = v; onEdit(it, v); update(); if (focus) ta.focus(); };
    ta.addEventListener('input', () => { onEdit(it, ta.value); update(); });

    const insertTag = (tag) => {
      const s = ta.selectionStart != null ? ta.selectionStart : ta.value.length, e = ta.selectionEnd != null ? ta.selectionEnd : s;
      const ins = '@' + tag;
      ta.setRangeText ? ta.setRangeText(ins, s, e, 'end') : (ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e));
      onEdit(it, ta.value); update(); ta.focus();
    };
    const tagBtn = (t, kind) => h('button', { type: 'button', class: `tag${(it.req || []).includes(t[0]) ? ' req' : ''}${(it.opt || []).includes(t[0]) ? ' opt' : ''}${kind === 'glob' ? ' glob' : ''}`, title: `${t[1]}${t[2] ? ' — contoh: ' + String(t[2]).split('\n')[0] : ''}`, onclick: () => insertTag(t[0]) }, ['@' + t[0], h('em', { text: t[1] })]);
    const tags = short ? null : h('div', null, [
      h('div', { class: 'lbl', style: 'margin-bottom:8px' }, [h('span', { text: 'Kode pengganti · klik untuk menyisipkan' })]),
      h('div', { class: 'tags' }, [...(it.tags || []).map((t) => tagBtn(t)), ...(it.glob ? (S.cat.globals || []).map((t) => tagBtn(t, 'glob')) : [])]),
    ]);

    const live = liveText(it), custom = liveCustom(it) !== null;
    const actions = h('div', { class: 'actions' }, [
      it.ex ? h('button', { class: 'btn sm', type: 'button', onclick: () => setValue(it.ex, true) }, [I('wand'), 'Pakai contoh']) : null,
      h('button', { class: 'btn sm', type: 'button', disabled: !custom && !hasDraft(it.key) && !isProfile(it) ? true : null, onclick: () => {
        if (isProfile(it)) { if (liveCustom(it) !== null) { S.draft[it.key] = null; } else delete S.draft[it.key]; ta.value = it.def; scheduleSave(); update(); return; }
        if (custom) S.draft[it.key] = null; else delete S.draft[it.key];
        ta.value = it.def; scheduleSave(); update(); toast('Dikembalikan ke wording bawaan (belum diluncurkan).');
      } }, [I('undo'), 'Kembalikan bawaan']),
      hasDraft(it.key) ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { delete S.draft[it.key]; scheduleSave(); refreshMain(); toast('Perubahan dibatalkan.'); } }, [I('x'), 'Batalkan perubahan']) : null,
    ]);

    const rules = [
      it.req && it.req.length ? `Wajib memuat ${it.req.map((t) => '@' + t).join(' dan ')}.` : null,
      `Maksimal ${it.max} karakter${it.min > 1 ? `, minimal ${it.min}` : ''}.`,
      it.opt && it.opt.length ? `Baris yang berisi ${it.opt.map((t) => '@' + t).join(', ')} otomatis hilang kalau datanya kosong.` : null,
      short ? null : 'Format WhatsApp: *tebal*, _miring_, ~coret~, ```kode```, dan > kutipan.',
      it.glob && !short ? '@readmore memotong pesan panjang (muncul "Baca selengkapnya").' : null,
    ].filter(Boolean);

    const ex = it.ex ? h('details', { class: 'box' }, [
      h('summary', null, [I('spark'), 'Contoh gaya lain', chevI()]),
      h('div', { class: 'box-in' }, [h('pre', { text: it.ex }), h('div', null, h('button', { class: 'btn sm', type: 'button', onclick: () => setValue(it.ex, true) }, [I('wand'), 'Pakai contoh ini']))]),
    ]) : null;
    const guide = h('details', { class: 'box', open: true }, [
      h('summary', null, [I('book'), 'Arahan', chevI()]),
      h('div', { class: 'box-in' }, [h('p', { style: 'margin:0', text: it.desc }), h('ul', null, rules.map((r) => h('li', { text: r })))]),
    ]);
    const cur = h('details', { class: 'box' }, [
      h('summary', null, [I('eye'), `Wording saat ini di bot · ${custom ? 'kustom' : 'bawaan'}`, chevI()]),
      h('div', { class: 'box-in' }, [
        h('pre', { text: live || '(kosong)' }),
        S.state && S.state.updatedAt ? h('p', { class: 'hint', text: `Disalin dari bot ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(S.state.updatedAt))} WIB.` }) : null,
        h('div', { class: 'row' }, [h('button', { class: 'btn sm', type: 'button', onclick: () => setValue(live, true) }, [I('copy'), 'Salin ke editor']), custom && !isProfile(it) ? h('button', { class: 'btn sm ghost', type: 'button', onclick: () => setValue(it.def, true) }, 'Lihat bawaan di editor') : null]),
      ]),
    ]);

    const st = statusOf(it);
    const ed = h('section', { class: 'editor', id: 'editor', 'aria-label': `Edit ${it.label}` }, [
      h('div', { class: 'ed-head' }, [h('div', { class: 'tt' }, [h('h3', null, [it.label, h('span', { class: `chip ${st}`, id: 'ed-chip', text: STATUS_LABEL[st] })]), h('p', { text: it.where })])]),
      h('div', { class: 'ed-body' }, [
        h('div', { class: 'ed-left' }, [
          h('div', { class: 'lbl' }, [h('label', { for: 'ed-ta', text: short ? 'Isi' : 'Wording' }), counter]),
          ta, probs,
        ]),
        h('div', { class: 'ed-more' }, [tags, actions, guide, ex, cur]),
        h('div', { class: 'ed-right' }, [
          h('div', { class: 'lbl' }, [h('span', { text: 'Pratinjau WhatsApp' }), pvTabs]),
          pvWrap,
          h('p', { class: 'pv-note', text: 'Data di pratinjau hanya contoh. Di bot, kode @… diisi otomatis dengan data asli pembeli.' }),
        ]),
      ]),
    ]);
    update();
    return ed;
  }
  function previewLive(it) {
    const saved = S.draft;
    S.draft = {};
    try { return previewOf(it, liveText(it)); } finally { S.draft = saved; }
  }
  function onEdit(it, v) {
    if (norm(it, v) === norm(it, liveText(it))) delete S.draft[it.key];
    else S.draft[it.key] = v;
    scheduleSave();
  }

  // ───────────────────────── draf ─────────────────────────
  function scheduleSave() {
    S.saveState = 'pending';
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(saveDraft, 900);
    renderDock();
  }
  async function saveDraft() {
    clearTimeout(S.saveTimer); S.saveTimer = null;
    S.saveState = 'saving'; renderDock();
    const d = await api('/draft', { tenant: S.botId, values: S.draft });
    if (d.ok) { S.saveState = 'saved'; S.saveAt = d.savedAt || Date.now(); }
    else if (d._status !== 401) S.saveState = 'error';
    renderDock();
  }
  function confirmLeave() { return !(S.saveTimer || S.saveState === 'saving') || window.confirm('Draf sedang disimpan. Tetap pindah?'); }
  window.addEventListener('beforeunload', (e) => { if (S.saveTimer || S.saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } });
  function discardAll() {
    const n = Object.keys(S.draft).length;
    if (!n) { toast('Tidak ada draf.', 'ok'); return; }
    openModal({ kind: 'confirm', title: 'Buang semua draf?', text: `${n} perubahan yang belum diluncurkan akan dihapus. Wording di bot tidak berubah.`, ok: 'Buang draf', danger: true, onOk: () => { S.draft = {}; S.modal = null; saveDraft(); renderApp(); toast('Semua draf dibuang.'); } });
  }

  // ───────────────────────── dok luncurkan ─────────────────────────
  let dockWas = false;   // dok sudah tampil → jangan diulang animasinya setiap ketikan / klik
  function renderDock() {
    const slot = $('#dock-slot'); if (!slot) return;
    const ch = changedItems();
    const errs = ch.filter((it) => problems(it, editText(it)).errors.length);
    slot.textContent = '';
    if (!ch.length && S.saveState !== 'error') { dockWas = false; return; }
    const still = dockWas; dockWas = true;
    const save = S.saveState === 'saving' || S.saveState === 'pending' ? 'Menyimpan draf…' : S.saveState === 'error' ? 'Draf gagal disimpan — cek koneksi' : S.saveAt ? `Draf tersimpan · ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(S.saveAt))}` : 'Draf tersimpan';
    slot.appendChild(h('div', { class: 'dock' }, h('div', { class: `dock-in${still ? ' still' : ''}`, role: 'region', 'aria-label': 'Peluncuran' }, [
      h('div', { class: 'st' }, [
        h('b', { text: ch.length ? `${ch.length} perubahan belum diluncurkan` : 'Draf belum tersimpan' }),
        h('small', { class: errs.length || S.saveState === 'error' ? 'bad' : '', text: errs.length ? `${errs.length} perlu diperbaiki dulu · ${save}` : save }),
      ]),
      ch.length ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openModal({ kind: 'review' }) }, 'Lihat') : null,
      ch.length ? h('button', { class: 'btn primary', type: 'button', onclick: () => openModal({ kind: 'review' }) }, [I('rocket'), 'Luncurkan']) : h('button', { class: 'btn sm', type: 'button', onclick: saveDraft }, 'Coba simpan lagi'),
    ])));
  }

  // ───────────────────────── modal ─────────────────────────
  function openModal(m) { S.modal = m; renderModal(); }
  function closeModal() {
    S.modal = null; const el = $('.modal:not(.closing)'); if (!el) return;
    if (!motionOn()) { el.remove(); return; }
    el.classList.add('closing'); setTimeout(() => el.remove(), 230);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.modal && S.modal.kind !== 'progress') { if (S.modal.kind === 'depo') stopDepo(); if (S.modal.kind === 'renew') stopRenew(); closeModal(); } });
  function renderModal() {
    const old = $('.modal:not(.closing)'); const had = !!old; if (old) old.remove();
    document.querySelectorAll('.modal.closing').forEach((x) => x.remove());
    const m = S.modal; if (!m) return;
    let card;
    if (m.kind === 'confirm') {
      card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: m.title }), h('p', { text: m.text })]),
        h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: closeModal }, 'Batal'), h('button', { class: `btn ${m.danger ? '' : 'primary'}`, type: 'button', onclick: m.onOk }, m.ok)]),
      ]);
    } else if (m.kind === 'review') {
      const ch = changedItems();
      const bad = ch.filter((it) => problems(it, editText(it)).errors.length);
      const glabel = (g) => (S.cat.groups.find((x) => x.id === g) || {}).label || '';
      card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt' }, [
        h('header', null, [h('h3', { id: 'mt', text: `Luncurkan ${ch.length} perubahan ke bot?` }), h('p', { text: 'Setelah diluncurkan, bot langsung memakai wording baru untuk semua pembeli.' })]),
        h('div', { class: 'modal-body' }, [
          !S.hostAlive ? msg('warn', 'Server bot terdeteksi offline. Peluncuran mungkin gagal — coba lagi beberapa menit lagi.') : null,
          bad.length ? msg('err', `${bad.length} wording perlu diperbaiki dulu sebelum bisa diluncurkan.`) : null,
          ...ch.map((it) => {
            const pr = problems(it, editText(it));
            const c = changeOf(it);
            return h('div', { class: `chg${pr.errors.length ? ' bad' : ''}` }, [
              h('div', { class: 't' }, [h('b', { text: it.label }), h('small', { text: pr.errors.length ? pr.errors[0] : c === null ? `${glabel(it.g)} · kembali ke bawaan` : `${glabel(it.g)} · wording baru` })]),
              h('button', { class: 'btn sm ghost', type: 'button', onclick: () => { closeModal(); S.group = it.g; S.q = ''; S.sel = it.key; renderApp(); const ed = $('#editor'); if (ed) ed.scrollIntoView({ behavior: 'smooth' }); } }, pr.errors.length ? 'Perbaiki' : 'Lihat'),
              h('button', { class: 'btn sm ghost', type: 'button', 'aria-label': `Batalkan perubahan ${it.label}`, title: 'Batalkan perubahan ini', onclick: () => { delete S.draft[it.key]; scheduleSave(); if (!changedItems().length) closeModal(); else renderModal(); refreshMain(); } }, I('x')),
            ]);
          }),
        ]),
        h('footer', null, [h('button', { class: 'btn ghost', type: 'button', onclick: closeModal }, 'Nanti dulu'), h('button', { class: 'btn primary', type: 'button', disabled: bad.length || !ch.length ? true : null, onclick: publish }, [I('rocket'), 'Luncurkan sekarang'])]),
      ]);
    } else if (m.kind === 'depo') {
      card = depoCard(m);
    } else if (m.kind === 'renew') {
      card = renewCard(m);
    } else if (m.kind === 'user') {
      card = userCard(m);
    } else if (m.kind === 'hist') {
      card = histCard(m);
    } else if (m.kind === 'digiForm') {
      card = digiFormCard(m);
    } else if (m.kind === 'digiProducts') {
      card = digiProductsCard(m);
    } else if (m.kind === 'progress') {
      const step = (i, label) => h('div', { class: m.step > i ? 'done' : m.step === i ? 'on' : '' }, [h('span', { class: 'ck' }, m.step > i ? I('check') : null), label]);
      card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mt', 'aria-busy': String(m.step < 3) }, [
        h('header', null, [h('h3', { id: 'mt', text: m.step >= 3 ? 'Berhasil diluncurkan' : m.error ? 'Peluncuran gagal' : 'Meluncurkan…' })]),
        h('div', { class: 'modal-body' }, m.step >= 3
          ? [h('div', { class: 'big-ok' }, [h('span', { class: 'c' }, I('check')), h('b', { text: `${m.count} pengaturan sudah aktif di bot` }), h('p', { class: 'hint', text: 'Coba ketik menu atau cekml ke bot kamu untuk melihat hasilnya. Notifikasi juga dikirim ke WhatsApp owner.' })])]
          : [h('div', { class: 'prog' }, [step(0, 'Mengirim perubahan ke server'), step(1, 'Bot menerapkan perubahan'), step(2, 'Menyimpan & menyelesaikan')]), m.error ? msg('err', m.error) : null]),
        h('footer', null, m.step >= 3 || m.error ? [m.error ? h('button', { class: 'btn', type: 'button', onclick: () => openModal({ kind: 'review' }) }, 'Kembali') : null, h('button', { class: 'btn primary', type: 'button', onclick: closeModal }, 'Selesai')] : [h('span', { class: 'hint', text: 'Jangan tutup halaman ini…' })]),
      ]);
    }
    const ov = h('div', { class: `modal${had ? ' still' : ''}`, onclick: (e) => { if (e.target === ov && !['progress', 'depo', 'renew', 'user'].includes(m.kind)) closeModal(); } }, card);
    document.body.appendChild(ov);
    try { liven(ov); } catch (e) { /* abaikan */ }
    const f = card.querySelector('footer .btn.primary:not([disabled])') || card.querySelector('button');
    if (f) f.focus();
  }

  async function publish() {
    const ch = changedItems();
    const changes = {};
    for (const it of ch) { const c = changeOf(it); changes[it.key] = c === null ? null : cleanText(it, c); }
    openModal({ kind: 'progress', step: 0, count: ch.length });
    if (S.saveTimer || S.saveState === 'saving') await saveDraft();
    const d = await api('/publish', { tenant: S.botId, changes });
    if (!d.ok) { S.modal.error = d.error || 'Gagal mengirim.'; renderModal(); return; }
    S.modal.step = 1; renderModal();
    const started = Date.now();
    let st = null;
    while (Date.now() - started < 90000) {
      await new Promise((r) => setTimeout(r, 1800));
      st = await api(`/publish?tenant=${encodeURIComponent(S.botId)}&id=${encodeURIComponent(d.id)}`);
      if (!st.ok && st._status === 401) return;
      if (st.ok && (st.status === 'done' || st.status === 'error')) break;
    }
    if (!st || !st.ok || st.status !== 'done') {
      S.modal.error = st && st.ok && st.status === 'error' ? `Bot menolak perubahan: ${st.error}` : 'Server bot belum merespons. Draf kamu aman — cek lagi beberapa saat, lalu luncurkan ulang bila perlu.';
      renderModal(); return;
    }
    S.modal.step = 2; renderModal();
    // terapkan ke salinan lokal "wording saat ini", lalu hapus dari draf
    S.state = S.state || { values: {}, profile: { custom: [] }, updatedAt: 0 };
    S.state.values = S.state.values || {}; S.state.profile = S.state.profile || { custom: [] }; S.state.profile.custom = S.state.profile.custom || [];
    for (const [k, v] of Object.entries(changes)) {
      const it = S.byKey[k];
      if (isProfile(it)) {
        const cs = new Set(S.state.profile.custom);
        if (v === null) { cs.delete(k); } else { cs.add(k); S.state.profile[k] = v; }
        S.state.profile.custom = [...cs];
      } else if (v === null) delete S.state.values[k]; else S.state.values[k] = v;
      delete S.draft[k];
    }
    S.state.updatedAt = Date.now();
    await saveDraft();
    S.modal.step = 3; renderModal();
    renderApp();
    setTimeout(async () => {   // salinan resmi dari bot (nilai yang sudah dirapikan bot)
      const r = await api(`/data?tenant=${encodeURIComponent(S.botId)}`, null, { quiet: true });
      if (r.ok && r.state && r.state.updatedAt >= S.state.updatedAt - 5000) { S.state = r.state; if (!S.modal) refreshMain(); }
    }, 4000);
  }

  async function logout() { await api('/logout', {}, { quiet: true }); S.menu = false; toLogin('Kamu sudah keluar.'); }
  function logoutAll() {
    S.menu = false;
    openModal({ kind: 'confirm', title: 'Keluar dari semua perangkat?', text: 'Semua sesi login portal untuk nomor ini (HP, laptop, dll.) akan diakhiri. Pakai ini kalau kamu curiga ada orang lain yang masuk.', ok: 'Keluar semua', danger: true, onOk: async () => { closeModal(); const d = await api('/logout-all', {}, { quiet: true }); toLogin(d.ok ? `Berhasil keluar dari ${d.count || 1} perangkat.` : 'Kamu sudah keluar.'); } });
  }

  // ───────────────────────── mulai ─────────────────────────
  async function boot() {
    if (/\.github\.io$/i.test(location.hostname)) { location.replace(PAGES_URL); return; }
    const c = await api('/config', null, { quiet: true });
    if (c._bad || c._status === 404 || c._status === 405) return renderFatal('Halaman Kelola Bot hanya bisa dibuka di alamat resmi: baramarket.my.id/portal');
    if (c._status === 0) return renderFatal(c.error);
    if (!c.ready) return renderFatal('Portal belum diaktifkan oleh admin Baramarket. Coba lagi nanti.');
    const me = await api('/me', null, { quiet: true });
    S.booted = true;
    if (me.ok) { S.me = me; const last = ls.get(LS_BOT); return me.bots.some((b) => b.id === last) ? selectBot(last) : loadMe(); }
    renderPhone();
  }
  boot();
})();
