// functions/api/portal/[[path]].js — API PORTAL PENYEWA (Kelola Bot Topup) untuk halaman /portal/.
//
// Alur:
//   1. POST /api/portal/otp      {phone}        → kode OTP 8 digit dikirim BOT TOPUP UTAMA lewat antrean outbox (Firestore utama)
//   2. POST /api/portal/verify   {phone, code}  → sesi login (cookie HttpOnly), daftar bot milik nomor itu
//   3. GET  /api/portal/data?tenant=ID          → katalog wording + wording yang berlaku di bot + draf
//      POST /api/portal/draft    {tenant, values}   → simpan draf (belum mengubah bot)
//      POST /api/portal/publish  {tenant, changes}  → LUNCURKAN: host bot menerapkan ke bot penyewa (host_commands)
//      GET  /api/portal/publish?tenant=ID&id=X      → status peluncuran
//   GET /api/portal/me · POST /api/portal/logout · POST /api/portal/logout-all · GET /api/portal/config
//
// Browser TIDAK pernah menyentuh Firestore langsung: semua lewat fungsi ini dengan service account (rahasia Cloudflare).
//
// Variabel Cloudflare (Pages → Settings → Variables and Secrets, Production):
//   PORTAL_FIREBASE_SA  (Secret, WAJIB)  isi file JSON service account Firebase UTAMA "sewa-bot-topup"
//                                        (disarankan service account khusus dengan peran "Cloud Datastore User" saja)
//   PORTAL_SECRET       (Secret, opsional) teks acak panjang untuk hash OTP & IP. Kosong = diturunkan dari private key.
//
// Keamanan: OTP 8 digit (berlaku 5 menit, maks 5x salah lalu dikunci 15 menit, maks 5 kode/jam/nomor, jeda 60 dtk),
// batas permintaan per IP, kode disimpan sebagai HMAC (bukan angka asli), sesi acak 256-bit disimpan sebagai SHA-256 di server
// (bisa dicabut: "keluar dari semua perangkat"), cookie __Host- HttpOnly Secure SameSite=Strict, cek Origin, semua isi divalidasi
// ulang di sini DAN di host bot sebelum diterapkan.

const COOKIE = '__Host-bmp_sess';
const SESSION_MS = 12 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_TRIES = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const HOST_ALIVE_MS = 2 * 60 * 1000;
const MAX_BODY = 200 * 1024;
const HOUR = 60 * 60 * 1000;
const enc = new TextEncoder();

// ───────────────────────── util ─────────────────────────
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', ...headers,
    },
  });
}
const fail = (status, error, extra = {}) => json({ ok: false, error, ...extra }, status);
const b64url = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function sha256hex(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
function sameHex(a, b) {
  a = String(a || ''); b = String(b || '');
  let r = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}
function randomId(n = 20) {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const out = []; const buf = new Uint8Array(n * 2); crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length && out.length < n; i++) if (buf[i] < 248) out.push(a[buf[i] % 62]);
  while (out.length < n) { const x = new Uint8Array(1); crypto.getRandomValues(x); if (x[0] < 248) out.push(a[x[0] % 62]); }
  return out.join('');
}
/** 8 digit acak tanpa bias (rejection sampling). */
function otpCode() {
  const max = 4294967296 - (4294967296 % 100000000);
  const x = new Uint32Array(1);
  do crypto.getRandomValues(x); while (x[0] >= max);
  return String(x[0] % 100000000).padStart(8, '0');
}
function normPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}
const okPhone = (p) => /^62\d{8,13}$/.test(p);
const wib = (ms) => new Date(ms + 7 * HOUR).toISOString().replace('T', ' ').slice(0, 16) + ' WIB';
const maskPhone = (p) => (p.length > 7 ? p.slice(0, 4) + '•'.repeat(p.length - 7) + p.slice(-3) : p);
function shortUA(ua) {
  ua = String(ua || '');
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone/iPad' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Perangkat lain';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'browser';
  return `${br} di ${os}`;
}

// ───────────────────────── Firestore REST (service account) ─────────────────────────
let _sa = null, _saRaw = '', _tok = null;
function serviceAccount(env) {
  const raw = env.PORTAL_FIREBASE_SA || '';
  if (!raw) return null;
  if (raw !== _saRaw) {
    _saRaw = raw; _tok = null;
    try { const s = JSON.parse(raw); _sa = s && s.client_email && s.private_key && s.project_id ? s : null; } catch (e) { _sa = null; }
  }
  return _sa;
}
async function secretOf(env) {
  if (env.PORTAL_SECRET && String(env.PORTAL_SECRET).length >= 16) return String(env.PORTAL_SECRET);
  const sa = serviceAccount(env);
  return 'bmp|' + await sha256hex('portal-secret|' + sa.private_key);
}
function pemToDer(pem) {
  const b = atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out.buffer;
}
async function accessToken(env) {
  const sa = serviceAccount(env);
  if (_tok && _tok.exp - 60000 > Date.now()) return _tok.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${body}`)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${head}.${body}.${sig}`,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error('auth ' + res.status);
  _tok = { token: d.access_token, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return _tok.token;
}

function encVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encVal) } };
  if (typeof v === 'object') return { mapValue: { fields: encFields(v) } };
  return { stringValue: String(v) };
}
function encFields(o) { const f = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) f[k] = encVal(v); return f; }
function decVal(x) {
  if (!x || typeof x !== 'object') return null;
  if ('stringValue' in x) return x.stringValue;
  if ('integerValue' in x) return Number(x.integerValue);
  if ('doubleValue' in x) return Number(x.doubleValue);
  if ('booleanValue' in x) return Boolean(x.booleanValue);
  if ('nullValue' in x) return null;
  if ('timestampValue' in x) return Date.parse(x.timestampValue);
  if ('mapValue' in x) return decFields((x.mapValue && x.mapValue.fields) || {});
  if ('arrayValue' in x) return ((x.arrayValue && x.arrayValue.values) || []).map(decVal);
  return null;
}
function decFields(f) { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = decVal(v); return o; }

class FS {
  constructor(env) { this.env = env; const sa = serviceAccount(env); this.root = `projects/${sa.project_id}/databases/(default)/documents`; this.base = `https://firestore.googleapis.com/v1/${this.root}`; }
  async call(method, url, body) {
    const res = await fetch(url, { method, headers: { authorization: `Bearer ${await accessToken(this.env)}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { status: res.status, d };
  }
  path(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  async get(p) {
    const r = await this.call('GET', `${this.base}/${this.path(p)}`);
    if (r.status === 404) return null;
    if (r.status !== 200) throw new Error(`firestore get ${r.status}`);
    return decFields(r.d.fields);
  }
  async getMany(paths) {
    if (!paths.length) return [];
    const r = await this.call('POST', `${this.base}:batchGet`, { documents: paths.map((p) => `${this.root}/${p}`) });
    if (r.status !== 200 || !Array.isArray(r.d)) throw new Error(`firestore batchGet ${r.status}`);
    const by = new Map();
    for (const x of r.d) if (x.found) by.set(x.found.name.slice(this.root.length + 1), decFields(x.found.fields));
    return paths.map((p) => by.get(p) || null);
  }
  /** set (ganti seluruh dokumen) atau merge (hanya kolom yang dikirim). */
  async set(p, obj, { merge = false, mustNotExist = false } = {}) {
    const q = [];
    if (merge) for (const k of Object.keys(obj)) q.push(`updateMask.fieldPaths=${encodeURIComponent(/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : '`' + k.replace(/[`\\]/g, '') + '`')}`);
    if (mustNotExist) q.push('currentDocument.exists=false');
    const r = await this.call('PATCH', `${this.base}/${this.path(p)}${q.length ? '?' + q.join('&') : ''}`, { fields: encFields(obj) });
    if (r.status !== 200) throw new Error(`firestore set ${r.status}`);
  }
  async del(p) { const r = await this.call('DELETE', `${this.base}/${this.path(p)}`); if (r.status !== 200 && r.status !== 404) throw new Error(`firestore delete ${r.status}`); }
  async where(col, field, value, limit = 20) {
    const r = await this.call('POST', `${this.base}:runQuery`, { structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encVal(value) } }, limit } });
    if (r.status !== 200 || !Array.isArray(r.d)) throw new Error(`firestore query ${r.status}`);
    return r.d.filter((x) => x.document).map((x) => ({ id: x.document.name.split('/').pop(), ...decFields(x.document.fields) }));
  }
}

// ───────────────────────── katalog & validasi (salinan app/lib/wordingCatalog.js → clean) ─────────────────────────
let _cat = null;
async function catalog(fs) {
  if (_cat && Date.now() - _cat.at < 60000) return _cat.cat;
  const d = await fs.get('portal_meta/catalog');
  if (!d || !d.json) return null;
  let cat = null; try { cat = JSON.parse(d.json); } catch (e) { cat = null; }
  if (!cat || !Array.isArray(cat.items)) return null;
  cat.hash = d.hash || '';
  _cat = { at: Date.now(), cat };
  return cat;
}
function cleanText(item, raw) {
  let v = String(raw == null ? '' : raw).replace(/\r/g, '');
  v = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (item.kind === 'short') v = v.replace(/\s+/g, ' ').trim();
  else v = v.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
  const len = [...v].length;
  const min = item.min || 1;
  if (len < min) throw new Error(`${item.label}: minimal ${min} karakter.`);
  if (len > item.max) throw new Error(`${item.label}: maksimal ${item.max} karakter (sekarang ${len}).`);
  for (const t of item.req || []) if (!new RegExp(`@${t}(?![a-zA-Z0-9])`, 'i').test(v)) throw new Error(`${item.label}: wajib memuat @${t}.`);
  return v;
}

// ───────────────────────── permintaan & sesi ─────────────────────────
function cookieOf(req) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-bmp_sess=([A-Za-z0-9_-]{20,100})/);
  return m ? m[1] : '';
}
const setCookie = (v, maxAgeS) => `${COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeS}`;
function sameOrigin(req) {
  const o = req.headers.get('origin');
  if (o) { try { return new URL(o).host === new URL(req.url).host; } catch (e) { return false; } }
  return req.headers.get('sec-fetch-site') === 'same-origin';
}
async function body(req) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw Object.assign(new Error('Isi terlalu besar.'), { status: 413 });
  const t = await req.text();
  if (t.length > MAX_BODY) throw Object.assign(new Error('Isi terlalu besar.'), { status: 413 });
  try { return JSON.parse(t || '{}'); } catch (e) { throw Object.assign(new Error('Data rusak. Muat ulang halaman.'), { status: 400 }); }
}
const ipOf = (req) => req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

/** Batas permintaan global (Firestore) — kembalikan false bila sudah melewati batas. */
async function allow(fs, key, max, windowMs) {
  const p = `portal_rl/${key}`;
  const d = (await fs.get(p)) || {};
  const now = Date.now();
  let w = Number(d.w) || 0, n = Number(d.n) || 0;
  if (now - w > windowMs) { w = now; n = 0; }
  if (n >= max) return false;
  await fs.set(p, { w, n: n + 1, exp: w + windowMs });
  return true;
}
async function ipKey(env, req, action) { return `${action}_${(await hmacHex(await secretOf(env), 'ip|' + ipOf(req))).slice(0, 32)}`; }

async function session(fs, req) {
  const sid = cookieOf(req);
  if (!sid) return null;
  const id = await sha256hex('sess|' + sid);
  const s = await fs.get(`portal_sessions/${id}`);
  if (!s || !(Number(s.exp) > Date.now())) return null;
  return { ...s, _id: id };
}

/** Bot milik nomor ini: tenants/{nomor} + bot yang ownerNumber-nya nomor ini. */
async function tenantsOf(fs, phone) {
  const [own, byOwner] = await Promise.all([fs.get(`tenants/${phone}`), fs.where('tenants', 'ownerNumber', phone, 10).catch(() => [])]);
  const list = [];
  if (own) list.push({ id: phone, ...own });
  for (const t of byOwner) if (!list.some((x) => x.id === t.id)) list.push(t);
  return list.filter((t) => !t.blocked && t.status !== 'deleted');
}
const outbox = (fs, to, text, extra = {}) => fs.set(`outbox/${randomId(20)}`, { to: String(to), text, sent: false, createdAt: Date.now(), src: 'portal', ...extra }, { mustNotExist: true });

async function hostAlive(fs) {
  const h = await fs.get('system/host').catch(() => null);
  return Boolean(h && Number(h.lastBeat) && Date.now() - Number(h.lastBeat) < HOST_ALIVE_MS);
}

// ───────────────────────── rute ─────────────────────────
async function routeOtp(fs, env, req) {
  const b = await body(req);
  const phone = normPhone(b.phone);
  if (!okPhone(phone)) return fail(400, 'Nomor tidak valid. Contoh: 081234567890');
  if (!(await allow(fs, await ipKey(env, req, 'otp'), 12, HOUR))) return fail(429, 'Terlalu banyak permintaan kode dari jaringan ini. Coba lagi 1 jam lagi.');
  const now = Date.now();
  const cur = (await fs.get(`portal_otp/${phone}`)) || {};
  if (Number(cur.lockUntil) > now) return fail(429, `Nomor ini dikunci sementara karena terlalu banyak kode salah. Coba lagi ${Math.ceil((cur.lockUntil - now) / 60000)} menit lagi.`);
  const wait = Number(cur.lastSent) + OTP_RESEND_MS - now;
  if (wait > 0) return fail(429, `Tunggu ${Math.ceil(wait / 1000)} detik sebelum minta kode lagi.`, { wait: Math.ceil(wait / 1000) });
  const sends = (Array.isArray(cur.sends) ? cur.sends : []).filter((t) => now - Number(t) < HOUR);
  if (sends.length >= OTP_MAX_PER_HOUR) return fail(429, 'Sudah 5 kode dalam 1 jam terakhir. Coba lagi nanti.');

  const tenants = await tenantsOf(fs, phone);
  // Jawaban SAMA untuk nomor terdaftar maupun tidak (nomor penyewa tidak bisa ditebak dari sini).
  if (!tenants.length) {
    await fs.set(`portal_otp/${phone}`, { hash: null, exp: 0, tries: 0, sends: [...sends, now], lastSent: now, lockUntil: 0, none: true });
    return json({ ok: true, cooldown: OTP_RESEND_MS / 1000, ttl: OTP_TTL_MS / 1000, to: maskPhone(phone) });
  }
  const code = otpCode();
  const exp = now + OTP_TTL_MS;
  const hash = await hmacHex(await secretOf(env), `otp|${phone}|${code}`);
  if (cur.outboxId) await fs.del(`outbox/${cur.outboxId}`).catch(() => {});   // kode lama yang belum terkirim tidak perlu dikirim
  const outId = randomId(20);
  await fs.set(`outbox/${outId}`, {
    to: phone, sent: false, createdAt: now, src: 'portal', sensitive: true, expireAt: exp,
    text: `🔐 *KODE LOGIN KELOLA BOT TOPUP*\n\nKode kamu:\n\`\`\`${code}\`\`\`\n\nBerlaku 5 menit. Masukkan kode ini di halaman *Kelola Bot Topup* website Baramarket.\n\n⚠️ *Jangan berikan kode ini ke siapa pun*, termasuk yang mengaku admin. Admin Baramarket tidak pernah meminta kode ini.\n_Tidak sedang login? Abaikan pesan ini._`,
  }, { mustNotExist: true });
  await fs.set(`portal_otp/${phone}`, { hash, exp, tries: 0, sends: [...sends, now], lastSent: now, lockUntil: 0, outboxId: outId });
  return json({ ok: true, cooldown: OTP_RESEND_MS / 1000, ttl: OTP_TTL_MS / 1000, to: maskPhone(phone) });
}

async function routeVerify(fs, env, req) {
  const b = await body(req);
  const phone = normPhone(b.phone);
  const code = String(b.code || '').replace(/\D/g, '');
  if (!okPhone(phone)) return fail(400, 'Nomor tidak valid.');
  if (!(await allow(fs, await ipKey(env, req, 'verify'), 30, HOUR))) return fail(429, 'Terlalu banyak percobaan dari jaringan ini. Coba lagi 1 jam lagi.');
  const now = Date.now();
  const cur = await fs.get(`portal_otp/${phone}`);
  if (cur && Number(cur.lockUntil) > now) return fail(429, `Terlalu banyak kode salah. Coba lagi ${Math.ceil((cur.lockUntil - now) / 60000)} menit lagi.`);
  if (!cur || !cur.hash || !(Number(cur.exp) > now)) return fail(400, 'Kode sudah tidak berlaku. Tekan "Kirim ulang kode".', { expired: true });
  const tries = (Number(cur.tries) || 0) + 1;
  const good = /^\d{8}$/.test(code) && sameHex(await hmacHex(await secretOf(env), `otp|${phone}|${code}`), cur.hash);
  if (!good) {
    if (tries >= OTP_MAX_TRIES) {
      await fs.set(`portal_otp/${phone}`, { hash: null, tries, lockUntil: now + OTP_LOCK_MS }, { merge: true });
      return fail(429, 'Kode salah 5 kali. Demi keamanan, coba lagi 15 menit lagi.');
    }
    await fs.set(`portal_otp/${phone}`, { tries }, { merge: true });
    return fail(401, `Kode salah. Sisa ${OTP_MAX_TRIES - tries} percobaan.`, { left: OTP_MAX_TRIES - tries });
  }
  await fs.set(`portal_otp/${phone}`, { hash: null, exp: 0, tries: 0 }, { merge: true });   // sekali pakai
  const tenants = await tenantsOf(fs, phone);
  if (!tenants.length) return fail(403, 'Nomor ini tidak terdaftar sebagai owner bot topup.');
  const sidBytes = new Uint8Array(32); crypto.getRandomValues(sidBytes);
  const sid = b64url(sidBytes);
  const ua = String(req.headers.get('user-agent') || '').slice(0, 160);
  await fs.set(`portal_sessions/${await sha256hex('sess|' + sid)}`, {
    phone, tenants: tenants.map((t) => t.id), createdAt: now, exp: now + SESSION_MS, ua: shortUA(ua),
  }, { mustNotExist: true });
  // bersih-bersih sesi lama nomor ini yang sudah kedaluwarsa
  fs.where('portal_sessions', 'phone', phone, 50).then((old) => Promise.all(old.filter((x) => !(Number(x.exp) > now)).map((x) => fs.del(`portal_sessions/${x.id}`)))).catch(() => {});
  // kabar keamanan ke WhatsApp owner
  await outbox(fs, phone, `✅ *Login Kelola Bot Topup berhasil*\n\n🕐 ${wib(now)}\n📱 ${shortUA(ua)}\n\n_Bukan kamu? Buka halaman Kelola Bot Topup → Keluar dari semua perangkat, lalu hubungi admin Baramarket._`).catch(() => {});
  return json({ ok: true }, 200, { 'set-cookie': setCookie(sid, SESSION_MS / 1000) });
}

async function routeMe(fs, s) {
  const ids = (s.tenants || []).slice(0, 10);
  const [docs, states, alive] = await Promise.all([fs.getMany(ids.map((id) => `tenants/${id}`)), fs.getMany(ids.map((id) => `portal_state/${id}`)), hostAlive(fs)]);
  const bots = ids.map((id, i) => {
    const d = docs[i]; if (!d || d.blocked) return null;
    const st = states[i] || {};
    return {
      id, storeName: (st.profile && st.profile.storeName) || d.storeName || '', botNumber: d.displayBotNumber || d.botNumber || '',
      status: d.status || '', expiredAt: Number(d.expiredAt) || 0, connection: d.connection || '', synced: Boolean(states[i]),
    };
  }).filter(Boolean);
  return json({ ok: true, phone: maskPhone(s.phone), bots, hostAlive: alive, exp: s.exp });
}

function ownsTenant(s, id) { return typeof id === 'string' && (s.tenants || []).includes(id); }

async function routeData(fs, s, url) {
  const id = url.searchParams.get('tenant') || '';
  if (!ownsTenant(s, id)) return fail(403, 'Bot ini bukan milikmu.');
  const [cat, st, dr, alive] = await Promise.all([catalog(fs), fs.get(`portal_state/${id}`), fs.get(`portal_drafts/${id}`), hostAlive(fs)]);
  if (!cat) return fail(503, 'Data pengaturan belum tersedia. Host bot perlu diperbarui ke versi yang mendukung website ini.');
  return json({
    ok: true, catalog: cat, hostAlive: alive,
    state: st ? { values: st.values || {}, profile: st.profile || {}, updatedAt: Number(st.updatedAt) || 0 } : null,
    draft: dr ? { values: dr.values || {}, updatedAt: Number(dr.updatedAt) || 0 } : { values: {}, updatedAt: 0 },
  });
}

async function routeDraft(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const cat = await catalog(fs);
  if (!cat) return fail(503, 'Data pengaturan belum tersedia.');
  const by = Object.fromEntries(cat.items.map((i) => [i.key, i]));
  const v = b.values && typeof b.values === 'object' && !Array.isArray(b.values) ? b.values : null;
  if (!v) return fail(400, 'Format draf tidak dikenal.');
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (!by[k]) continue;   // kunci lama yang sudah tidak ada di katalog dibuang
    if (val === null) { out[k] = null; continue; }
    if (typeof val !== 'string') return fail(400, `${by[k].label}: isi harus teks.`);
    if ([...val].length > by[k].max + 200) return fail(400, `${by[k].label}: terlalu panjang (maks ${by[k].max} karakter).`);
    out[k] = val.replace(/\r/g, '');
  }
  await fs.set(`portal_drafts/${b.tenant}`, { values: out, updatedAt: Date.now(), by: s.phone });
  return json({ ok: true, savedAt: Date.now() });
}

async function routePublish(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!(await allow(fs, `pub_${b.tenant}`, 20, HOUR))) return fail(429, 'Terlalu sering meluncurkan. Coba lagi beberapa menit lagi.');
  const cat = await catalog(fs);
  if (!cat) return fail(503, 'Data pengaturan belum tersedia.');
  const by = Object.fromEntries(cat.items.map((i) => [i.key, i]));
  const ch = b.changes && typeof b.changes === 'object' && !Array.isArray(b.changes) ? b.changes : null;
  if (!ch || !Object.keys(ch).length) return fail(400, 'Belum ada perubahan untuk diluncurkan.');
  const clean = {};
  for (const [k, val] of Object.entries(ch)) {
    const it = by[k];
    if (!it) return fail(400, 'Ada pengaturan yang tidak dikenal. Muat ulang halaman.');
    if (val === null) { clean[k] = null; continue; }
    if (typeof val !== 'string') return fail(400, `${it.label}: isi harus teks.`);
    try { clean[k] = cleanText(it, val); } catch (e) { return fail(400, e.message, { key: k }); }
  }
  if (!(await hostAlive(fs))) return fail(503, 'Server bot sedang offline atau restart. Draf kamu aman — coba luncurkan lagi beberapa menit lagi.');
  const id = randomId(20);
  await fs.set(`host_commands/${id}`, { type: 'portal_apply', phone: b.tenant, payload: { changes: clean }, status: 'pending', createdAt: Date.now(), src: 'portal', by: s.phone }, { mustNotExist: true });
  return json({ ok: true, id, count: Object.keys(clean).length });
}

async function routePublishStatus(fs, s, url) {
  const tenant = url.searchParams.get('tenant') || '';
  const id = url.searchParams.get('id') || '';
  if (!ownsTenant(s, tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!/^[A-Za-z0-9]{20}$/.test(id)) return fail(400, 'ID peluncuran tidak valid.');
  const c = await fs.get(`host_commands/${id}`);
  if (!c || c.phone !== tenant || c.src !== 'portal') return fail(404, 'Peluncuran tidak ditemukan.');
  if (c.status === 'done' && !c.notified) {
    const n = (c.result && Array.isArray(c.result.applied) ? c.result.applied.length : 0);
    await fs.set(`host_commands/${id}`, { notified: true }, { merge: true });
    await outbox(fs, s.phone, `🚀 *Pengaturan bot diperbarui dari website*\n\n${n} pengaturan sudah aktif di bot kamu.\n🕐 ${wib(Date.now())}\n\n_Bukan kamu? Segera buka Kelola Bot Topup → Keluar dari semua perangkat, lalu hubungi admin Baramarket._`).catch(() => {});
  }
  return json({ ok: true, status: c.status, error: c.status === 'error' ? String(c.error || 'Gagal diterapkan') : '', applied: (c.result && c.result.applied) || [] });
}

async function routeLogoutAll(fs, s) {
  const list = await fs.where('portal_sessions', 'phone', s.phone, 50).catch(() => []);
  await Promise.all(list.map((x) => fs.del(`portal_sessions/${x.id}`).catch(() => {})));
  return json({ ok: true, count: list.length }, 200, { 'set-cookie': setCookie('', 0) });
}

export async function onRequest(context) {
  const { request: req, env } = context;
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/portal\/?/, '').replace(/\/+$/, '');
  try {
    if (route === 'config' && req.method === 'GET') return json({ ok: true, ready: Boolean(serviceAccount(env)) });
    if (!serviceAccount(env)) return fail(503, 'Portal belum diaktifkan oleh admin (PORTAL_FIREBASE_SA belum diisi di Cloudflare).', { setup: false });
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return fail(403, 'Permintaan ditolak.');
      if (!/application\/json/i.test(req.headers.get('content-type') || '')) return fail(415, 'Permintaan ditolak.');
    } else if (req.method !== 'GET') return fail(405, 'Metode tidak didukung.');
    const fs = new FS(env);
    if (route === 'otp' && req.method === 'POST') return await routeOtp(fs, env, req);
    if (route === 'verify' && req.method === 'POST') return await routeVerify(fs, env, req);
    if (route === 'logout' && req.method === 'POST') {
      const sid = cookieOf(req);
      if (sid) await fs.del(`portal_sessions/${await sha256hex('sess|' + sid)}`).catch(() => {});
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) });
    }
    const s = await session(fs, req);
    if (!s) return fail(401, 'Sesi login sudah habis. Masuk lagi.', { login: true });
    if (route === 'me' && req.method === 'GET') return await routeMe(fs, s);
    if (route === 'data' && req.method === 'GET') return await routeData(fs, s, url);
    if (route === 'draft' && req.method === 'POST') return await routeDraft(fs, s, req);
    if (route === 'publish' && req.method === 'POST') return await routePublish(fs, s, req);
    if (route === 'publish' && req.method === 'GET') return await routePublishStatus(fs, s, url);
    if (route === 'logout-all' && req.method === 'POST') return await routeLogoutAll(fs, s);
    return fail(404, 'Tidak ditemukan.');
  } catch (e) {
    if (e && e.status) return fail(e.status, e.message);
    return fail(500, 'Terjadi kesalahan di server. Coba lagi sebentar lagi.');
  }
}

// untuk pengujian lokal (node): fungsi murni
export const _test = { normPhone, okPhone, otpCode, cleanText, encVal, decVal, encFields, decFields, randomId, sameHex, shortUA };
