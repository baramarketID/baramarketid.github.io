// functions/api/portal/[[path]].js — API PORTAL PENYEWA (Kelola Bot Topup) untuk halaman /portal/.
//
// Alur:
//   1. POST /api/portal/otp      {phone}        → kode OTP 8 digit dikirim BOT TOPUP UTAMA lewat antrean outbox (Firestore utama)
//   2. POST /api/portal/verify   {phone, code}  → sesi login (cookie HttpOnly), daftar bot milik nomor itu
//   3. GET  /api/portal/data?tenant=ID          → katalog wording + wording yang berlaku di bot + draf
//      POST /api/portal/draft    {tenant, values}   → simpan draf (belum mengubah bot)
//      POST /api/portal/publish  {tenant, changes}  → LUNCURKAN: host bot menerapkan ke bot penyewa (host_commands)
//      GET  /api/portal/publish?tenant=ID&id=X      → status peluncuran
//   DASHBOARD: POST /api/portal/dashboard {tenant, force}      → perintah ke host, lalu GET /api/portal/cmd?tenant=&id=
//              POST /api/portal/depoweb {tenant, nominal}      → QRIS deposit saldo web Baramarket (lewat host)
//              POST /api/portal/depoweb-cancel {tenant, ref}    · GET /api/portal/depo?tenant=&ref= (status pembayaran)
//              POST /api/portal/setting {tenant, key:'orderMode', value:'grup'|'semua'}  → mode order
//   TOKO:      POST /api/portal/call {tenant, fn, args}  → profit / user / riwayat / banner / PPOB / rekap harian (daftar putih CALLS)
//   BOT:       POST /api/portal/pair {tenant, botNumber} · POST /api/portal/disconnect {tenant}  (status lewat /cmd)
//   SEWA:      POST /api/portal/renew {tenant, botPhone?} → web_orders (diproses bot Telegram) · GET /api/portal/renew?tenant=&id=
//   PORTAL_RESERVED_NUMBERS (opsional, Cloudflare): nomor yang tidak boleh dipakai jadi bot (nomor admin), pisahkan koma
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
const MAX_BODY_BANNER = 1000 * 1024;   // unggah banner (base64 maks ±950 KB)
const ROLES = ['basic', 'gold', 'platinum', 'owner'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
async function body(req, max = MAX_BODY) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > max) throw Object.assign(new Error('Isi terlalu besar.'), { status: 413 });
  const t = await req.text();
  if (t.length > max) throw Object.assign(new Error('Isi terlalu besar.'), { status: 413 });
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

async function pricingOf(fs) {
  const p = await fs.get('settings/pricing').catch(() => null);
  const pk = p && Array.isArray(p.packages) && p.packages[0];
  const price = Number(pk ? pk.price : p && p.price) || 0, days = Number(pk ? pk.days : p && p.periodDays) || 0;
  if (price && days) return { price, days, note: (pk && pk.note) || '' };
  return { price: 15000, days: 30, note: '' };   // sama dengan harga bawaan bot Telegram (topupCore DEFAULT_PACKAGES[0]) bila belum diatur
}
async function routeMe(fs, s) {
  const ids = (s.tenants || []).slice(0, 10);
  const [docs, states, alive, notice, pricing] = await Promise.all([
    fs.getMany(ids.map((id) => `tenants/${id}`)), fs.getMany(ids.map((id) => `portal_state/${id}`)), hostAlive(fs),
    fs.get('portal_meta/notice').catch(() => null), pricingOf(fs),
  ]);
  const bots = ids.map((id, i) => {
    const d = docs[i]; if (!d || d.blocked) return null;
    const st = states[i] || {};
    return {
      id, storeName: (st.profile && st.profile.storeName) || d.storeName || '', botNumber: d.displayBotNumber || d.botNumber || '',
      status: d.status || '', expiredAt: Number(d.expiredAt) || 0, connection: d.connection || '', synced: Boolean(states[i]),
      realBot: d.botNumber || '', pendingBot: d.pendingBot || '', trial: Boolean(d.trial),
    };
  }).filter(Boolean);
  const nt = notice && notice.text ? { text: String(notice.text).slice(0, 600), level: notice.level === 'warn' ? 'warn' : 'info', at: Number(notice.at) || 0 } : null;
  return json({ ok: true, phone: maskPhone(s.phone), bots, hostAlive: alive, exp: s.exp, notice: nt, pricing });
}

function ownsTenant(s, id) { return typeof id === 'string' && (s.tenants || []).includes(id); }

async function routeData(fs, s, url) {
  const id = url.searchParams.get('tenant') || '';
  if (!ownsTenant(s, id)) return fail(403, 'Bot ini bukan milikmu.');
  const [cat, st, dr, alive] = await Promise.all([catalog(fs), fs.get(`portal_state/${id}`), fs.get(`portal_drafts/${id}`), hostAlive(fs)]);
  if (!cat) return fail(503, 'Data pengaturan belum tersedia. Host bot perlu diperbarui ke versi yang mendukung website ini.');
  return json({
    ok: true, catalog: cat, hostAlive: alive,
    state: st ? { values: st.values || {}, profile: st.profile || {}, features: st.features || null, updatedAt: Number(st.updatedAt) || 0 } : null,
    draft: dr ? { values: dr.values || {}, updatedAt: Number(dr.updatedAt) || 0 } : { values: {}, updatedAt: 0 },
  });
}

async function routeDraft(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const cat = await catalog(fs);
  if (!cat) return fail(503, 'Data pengaturan belum tersedia.');
  const by = Object.assign(Object.create(null), Object.fromEntries(cat.items.map((i) => [i.key, i])));   // tanpa prototipe: kunci "constructor" dll. tidak lolos
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
  const by = Object.assign(Object.create(null), Object.fromEntries(cat.items.map((i) => [i.key, i])));   // tanpa prototipe: kunci "constructor" dll. tidak lolos
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

/** Perintah portal ke host (dashboard / deposit). Hasil diambil lewat GET /cmd. */
async function hostCommand(fs, s, tenant, type, payload, notifyText) {
  if (!(await hostAlive(fs))) return fail(503, 'Server bot sedang offline atau restart. Coba lagi beberapa menit lagi.');
  const id = randomId(20);
  await fs.set(`host_commands/${id}`, { type, phone: tenant, payload, status: 'pending', createdAt: Date.now(), src: 'portal', by: s.phone, ...(notifyText ? { notifyText } : {}) }, { mustNotExist: true });
  return json({ ok: true, id });
}
async function routeDashboard(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!(await allow(fs, `dash_${b.tenant}`, 120, HOUR))) return fail(429, 'Terlalu sering memuat dashboard. Coba lagi sebentar lagi.');
  return hostCommand(fs, s, b.tenant, 'portal_dashboard', { force: Boolean(b.force) });
}
async function routeDepoWeb(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const nominal = Number(b.nominal);
  if (!Number.isInteger(nominal) || nominal < 1000) return fail(400, 'Nominal minimal Rp 1.000 (angka saja).');
  if (nominal > 10000000) return fail(400, 'Nominal maksimal Rp 10.000.000 per transaksi.');
  if (!(await allow(fs, `depo_${b.tenant}`, 12, HOUR))) return fail(429, 'Terlalu banyak permintaan deposit dalam 1 jam. Coba lagi nanti.');
  return hostCommand(fs, s, b.tenant, 'portal_depoweb', { nominal });
}
async function routeDepoCancel(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(String(b.ref || ''))) return fail(400, 'Ref deposit tidak valid.');
  return hostCommand(fs, s, b.tenant, 'portal_depoweb_cancel', { ref: String(b.ref) });
}
async function routeSetting(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (b.key !== 'orderMode' || !['grup', 'semua'].includes(b.value)) return fail(400, 'Pengaturan tidak dikenal.');
  if (!(await allow(fs, `set_${b.tenant}`, 30, HOUR))) return fail(429, 'Terlalu sering mengubah pengaturan. Coba lagi nanti.');
  const r = await hostCommand(fs, s, b.tenant, 'portal_setorder', { mode: b.value });
  if (r.status === 200) await outbox(fs, s.phone, `⚙️ *Pengaturan bot diubah dari website*\n\nMode order: *${b.value === 'grup' ? 'hanya di grup' : 'grup & chat pribadi'}*\n🕐 ${wib(Date.now())}\n\n_Bukan kamu? Buka Kelola Bot Topup → Keluar dari semua perangkat, lalu hubungi admin Baramarket._`).catch(() => {});
  return r;
}
async function routeCmd(fs, s, url) {
  const tenant = url.searchParams.get('tenant') || '';
  const id = url.searchParams.get('id') || '';
  if (!ownsTenant(s, tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!/^[A-Za-z0-9]{20}$/.test(id)) return fail(400, 'ID tidak valid.');
  const c = await fs.get(`host_commands/${id}`);
  if (!c || c.phone !== tenant || c.src !== 'portal' || !/^(portal_(dashboard|depoweb|depoweb_cancel|setorder|call)|pair|disconnect)$/.test(String(c.type))) return fail(404, 'Tidak ditemukan.');
  if (c.status === 'done' || c.status === 'error') {
    await fs.del(`host_commands/${id}`).catch(() => {});   // sekali baca, lalu dibersihkan
    if (c.status === 'done' && c.notifyText) await outbox(fs, s.phone, `${c.notifyText}\n🕐 ${wib(Date.now())}\n\n_Bukan kamu? Buka Kelola Bot Topup → Keluar dari semua perangkat, lalu hubungi admin Baramarket._`).catch(() => {});
  }
  return json({ ok: true, status: c.status, code: c.status === 'code' ? String(c.code || '') : '', error: c.status === 'error' ? String(c.error || 'Gagal') : '', result: c.status === 'done' ? resultOf(c) : null });
}
function resultOf(c) {
  if (typeof c.resultJson === 'string') { try { return JSON.parse(c.resultJson); } catch (e) { return null; } }
  return c.result || null;
}
async function routeDepoStatus(fs, s, url) {
  const tenant = url.searchParams.get('tenant') || '';
  const ref = url.searchParams.get('ref') || '';
  if (!ownsTenant(s, tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(ref)) return fail(400, 'Ref tidak valid.');
  const d = await fs.get(`portal_depo/${tenant}__${ref}`);
  if (!d || d.tenant !== tenant) return json({ ok: true, status: 'Menunggu Bayar' });
  const pick = ['status', 'nominal', 'total', 'expireAt', 'saldoSebelum', 'saldoSesudah', 'kredit', 'message', 'updatedAt'];
  return json({ ok: true, ...Object.fromEntries(pick.filter((k) => d[k] !== undefined).map((k) => [k, d[k]])) });
}


// ───────────────────────── aksi bot (profit, user, riwayat, banner, PPOB, rekap harian) ─────────────────────────
const isNomor = (v) => /^\d{8,16}$/.test(String(v || ''));
const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
/** Daftar putih aksi: validasi argumen + jenis (baca/tulis) + kabar WA untuk aksi penting. */
const CALLS = {
  'profit.get': { w: false, v: () => ({}) },
  'profit.set': { w: true, v: (a) => {
    if (!['game', 'digi', 'oke'].includes(a.kind)) return null;
    if (!a.percent || typeof a.percent !== 'object' || Array.isArray(a.percent)) return null;
    const percent = {};
    for (const [r, x] of Object.entries(a.percent)) { const n = Number(x); if (!ROLES.includes(r) || !Number.isFinite(n) || n < 0 || n > 100 || Math.round(n * 100) !== n * 100) return null; percent[r] = n; }
    if (!Object.keys(percent).length) return null;
    return { kind: a.kind, percent };
  }, note: (a) => `📈 *Profit ${a.kind === 'digi' ? 'Layanan Lainnya' : a.kind === 'oke' ? 'PPOB' : 'topup game'} diubah dari website*\n\n${Object.entries(a.percent).map(([r, n]) => `› ${r}: ${n}%`).join('\n')}` },
  'users.list': { w: false, v: () => ({}) },
  'users.setRole': { w: true, v: (a) => (isNomor(a.nomor) && ROLES.includes(a.role) ? { nomor: String(a.nomor), role: a.role } : null),
    note: (a) => `👤 *Role user diubah dari website*\n\n› ${a.nomor} → *${a.role}*${a.role === 'owner' ? '\n⚠️ Role owner bisa memakai perintah owner bot.' : ''}` },
  'users.adjust': { w: true, v: (a) => { const d = Number(a.delta); return isNomor(a.nomor) && Number.isInteger(d) && d !== 0 && Math.abs(d) <= 10000000 ? { nomor: String(a.nomor), delta: d } : null; },
    note: (a) => `💰 *Saldo user ${a.delta > 0 ? 'ditambah' : 'dikurangi'} dari website*\n\n› User   : ${a.nomor}\n› Nominal: ${a.delta > 0 ? '+' : '−'}${rp(Math.abs(a.delta))}` },
  'history.recent': { w: false, v: (a) => (['trx', 'depo'].includes(a.kind) ? { kind: a.kind } : null) },
  'banner.get': { w: false, v: () => ({}) },
  'banner.set': { w: true, big: true, v: (a) => { const d = String(a.data || ''); return /^[A-Za-z0-9+/=]{200,950000}$/.test(d) ? { data: d } : null; }, note: () => '🖼️ *Banner toko diganti dari website*' },
  'banner.remove': { w: true, v: () => ({}), note: () => '🖼️ *Banner toko dihapus dari website*' },
  'ppob.tree': { w: false, v: () => ({}) },
  'ppob.set': { w: true, v: (a) => (['cats', 'brands', 'prods'].includes(a.kind) && typeof a.key === 'string' && a.key.length >= 1 && a.key.length <= 160 && typeof a.hidden === 'boolean' ? { kind: a.kind, key: a.key, hidden: a.hidden } : null) },
  'ppob.reset': { w: true, v: () => ({}), note: () => '🙈 *Semua produk PPOB ditampilkan lagi (dari website)*' },
  'prefs.setRekap': { w: true, v: (a) => (typeof a.on === 'boolean' ? { on: a.on } : null), note: (a) => `🧾 *Rekap harian otomatis ${a.on ? 'dinyalakan' : 'dimatikan'} dari website*` },
  // Layanan Lainnya (Digiflazz). Bacaan memakai cache di bot; "refresh" dibatasi ketat supaya akun Digiflazz tidak kena limit.
  'digi.codes': { w: false, v: () => ({}) },
  'digi.catalog': { w: false, v: () => ({}) },
  'digi.refresh': { w: true, rate: ['dr', 12], v: () => ({}) },
  'digi.products': { w: false, v: (a) => (digiName(a.kategori) && digiName(a.brand) && digiTypes(a.types) ? { kategori: a.kategori.trim(), brand: a.brand.trim(), types: digiTypes(a.types) } : null) },
  'digi.suggest': { w: false, v: (a) => (digiName(a.brand) ? { brand: a.brand.trim() } : null) },
  'digi.add': { w: true, v: (a) => (digiName(a.kategori) && digiName(a.brand) && DIGI_CODE.test(String(a.code || '')) && digiTypes(a.types) ? { kategori: a.kategori.trim(), brand: a.brand.trim(), code: String(a.code), types: digiTypes(a.types) } : null),
    note: (a) => `➕ *Layanan ditambahkan dari website*\n\n› ${a.kategori} → ${a.brand}\n› Kode: ${a.code}${a.types.length ? `\n› Type: ${a.types.join(', ')}` : ''}` },
  'digi.update': { w: true, v: (a) => (DIGI_CODE.test(String(a.code || '')) && (a.kategori === undefined || digiName(a.kategori)) && (a.brand === undefined || digiName(a.brand)) && digiTypes(a.types)
    ? { code: String(a.code), ...(a.kategori !== undefined ? { kategori: a.kategori.trim() } : {}), ...(a.brand !== undefined ? { brand: a.brand.trim() } : {}), ...(a.types !== undefined ? { types: digiTypes(a.types) } : {}) } : null) },
  'digi.remove': { w: true, v: (a) => (DIGI_CODE.test(String(a.code || '')) ? { code: String(a.code) } : null), note: (a) => `🗑️ *Layanan kode ${a.code} dihapus dari menu Layanan Lainnya (website)*` },
  // saluran testimoni WhatsApp milik penyewa
  'saluran.get': { w: false, v: () => ({}) },
  'saluran.set': { w: true, v: (a) => { const l = String(a.link || '').trim(); return /^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]{10,60}\/?$/i.test(l) || /^\d{8,30}@newsletter$/.test(l) ? { link: l } : null; },
    note: (a) => `📣 *Saluran testimoni diatur dari website*\n\n› ${a.link}\n\nPastikan nomor bot sudah jadi *admin* saluran itu.` },
  'saluran.reset': { w: true, v: () => ({}), note: () => '📣 *Saluran testimoni dimatikan dari website*' },
  'saluran.check': { w: true, rate: ['sc', 15], v: (a) => ({ send: a.send === true }) },
  'digi.setLow': { w: true, v: (a) => { const n = Number(a.value); return Number.isInteger(n) && n >= 0 && n <= 100000000 ? { value: n } : null; } },
};
const DIGI_CODE = /^[a-z0-9_-]{1,20}$/;
const digiName = (x) => typeof x === 'string' && x.trim().length >= 1 && x.trim().length <= 80 && !/[<>]/.test(x);
const digiTypes = (t) => { if (t === undefined) return []; if (!Array.isArray(t) || t.length > 30) return null; const out = []; for (const x of t) { if (!digiName(x)) return null; if (!out.includes(x.trim())) out.push(x.trim()); } return out; };
async function routeCall(fs, s, req) {
  const b = await body(req, MAX_BODY_BANNER);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const spec = typeof b.fn === 'string' && Object.hasOwn(CALLS, b.fn) ? CALLS[b.fn] : null;
  if (!spec) return fail(400, 'Aksi tidak dikenal.');
  if (!spec.big && JSON.stringify(b.args || {}).length > 20000) return fail(413, 'Isi terlalu besar.');
  const args = spec.v(b.args && typeof b.args === 'object' && !Array.isArray(b.args) ? b.args : {});
  if (!args) return fail(400, 'Data tidak valid. Muat ulang halaman lalu coba lagi.');
  if (!(await allow(fs, `${spec.w ? 'cw' : 'cr'}_${b.tenant}`, spec.w ? 150 : 400, HOUR))) return fail(429, 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.');
  if (spec.rate && !(await allow(fs, `${spec.rate[0]}_${b.tenant}`, spec.rate[1], HOUR))) return fail(429, 'Terlalu sering memperbarui. Coba lagi nanti.');
  return hostCommand(fs, s, b.tenant, 'portal_call', { fn: b.fn, args }, spec.note ? spec.note(args) : '');
}

// ───────────────────────── bot: pairing / putuskan ─────────────────────────
async function routePair(fs, env, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const num = normPhone(b.botNumber);
  if (!okPhone(num)) return fail(400, 'Nomor bot tidak valid. Contoh: 081234567890');
  const t = await fs.get(`tenants/${b.tenant}`);
  if (!t) return fail(404, 'Penyewa tidak ditemukan.');
  if (t.blocked) return fail(403, 'Akun kamu diblokir. Hubungi admin.');
  if (!(Number(t.expiredAt) > Date.now())) return fail(400, 'Masa sewa sudah habis. Perpanjang dulu.');
  if (t.botNumber) return fail(400, `Bot sudah tersambung ke ${t.botNumber}. Putuskan dulu kalau mau ganti nomor.`);
  const reserved = [b.tenant, t.ownerNumber, ...String(env.PORTAL_RESERVED_NUMBERS || '').split(/[\s,]+/)].map(normPhone).filter(Boolean);
  if (reserved.includes(num)) return fail(400, 'Nomor itu tidak bisa dipakai sebagai bot topup. Pakai nomor WhatsApp lain (bukan nomor owner).');
  const dup = await fs.where('tenants', 'botNumber', num, 5).catch(() => []);
  if (dup.some((x) => x.id !== b.tenant)) return fail(400, 'Nomor itu sudah dipakai penyewa lain.');
  if (t.trial) {
    const tr = await fs.get(`trials/bot_${num}`).catch(() => null);
    if (tr && tr.phone && String(tr.phone) !== b.tenant) return fail(400, 'Nomor bot itu sudah pernah dipakai untuk coba gratis. Pakai nomor lain.');
    await fs.set(`trials/bot_${num}`, { phone: b.tenant, at: Date.now() }, { merge: true }).catch(() => {});
  }
  if (!(await allow(fs, `pair_${b.tenant}`, 8, HOUR))) return fail(429, 'Terlalu sering minta kode pairing. Coba lagi nanti.');
  return hostCommand(fs, s, b.tenant, 'pair', { botNumber: num }, `🔗 *Pairing bot diminta dari website*\n\n› Nomor bot: ${num}`);
}
async function routeDisconnect(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!(await allow(fs, `disc_${b.tenant}`, 6, HOUR))) return fail(429, 'Terlalu sering. Coba lagi nanti.');
  return hostCommand(fs, s, b.tenant, 'disconnect', {}, '🔌 *Nomor bot diputus dari website*\n\nData user, saldo & pengaturan tetap tersimpan. Pairing ulang lewat website atau ketik *pairingtopup* di WA Baramarket.');
}

// ───────────────────────── perpanjang sewa (diproses bot Telegram Baramarket, sama dengan #sewa) ─────────────────────────
async function routeRenew(fs, s, req) {
  const b = await body(req);
  if (!ownsTenant(s, b.tenant)) return fail(403, 'Bot ini bukan milikmu.');
  const [t, st] = await Promise.all([fs.get(`tenants/${b.tenant}`), fs.get(`portal_state/${b.tenant}`)]);
  if (!t) return fail(404, 'Penyewa tidak ditemukan.');
  // Email hanya catatan (bot Telegram mewajibkan field ini, tidak mengirim email apa pun): pakai email lama penyewa,
  // bila belum ada pakai alamat penanda supaya penyewa tidak perlu mengisi apa-apa.
  const saved = String((t.webProfile && t.webProfile.email) || '').trim().toLowerCase().slice(0, 120);
  const email = EMAIL_RE.test(saved) ? saved : `${b.tenant}@penyewa.baramarket.id`;
  if (t.blocked) return fail(403, 'Akun kamu diblokir. Hubungi admin.');
  let botPhone = t.botNumber || '';
  if (!botPhone) {
    botPhone = normPhone(b.botPhone);
    if (!okPhone(botPhone)) return fail(400, 'Bot belum tersambung — isi nomor WhatsApp yang akan dipakai sebagai bot.');
    if (botPhone === b.tenant || botPhone === normPhone(t.ownerNumber)) return fail(400, 'Nomor bot harus berbeda dengan nomor owner.');
  }
  if (!(await allow(fs, `renew_${b.tenant}`, 8, HOUR))) return fail(429, 'Terlalu sering membuat tagihan. Coba lagi nanti.');
  const prof = (st && st.profile) || {}, wp = t.webProfile || {};
  const name = (v, d) => { const x = String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60); return x.length >= 2 ? x : d; };
  const id = randomId(20);
  await fs.set(`web_orders/${id}`, {
    email, storeName: name(prof.storeName || wp.storeName, 'Toko Topup'), ownerName: name(prof.ownerName || wp.ownerName, 'Owner'),
    ownerPhone: b.tenant, botName: name(prof.botName || wp.botName, 'Bot Topup'), botPhone, status: 'new', src: 'portal', createdAt: Date.now(),
  }, { mustNotExist: true });
  return json({ ok: true, id });
}
async function routeRenewStatus(fs, s, url) {
  const tenant = url.searchParams.get('tenant') || '';
  const id = url.searchParams.get('id') || '';
  if (!ownsTenant(s, tenant)) return fail(403, 'Bot ini bukan milikmu.');
  if (!/^[A-Za-z0-9]{20}$/.test(id)) return fail(400, 'ID tidak valid.');
  const d = await fs.get(`web_orders/${id}`);
  if (!d || d.ownerPhone !== tenant || d.src !== 'portal') return fail(404, 'Tagihan tidak ditemukan.');
  const qr = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(d.qr || '')) ? d.qr : '';
  return json({ ok: true, status: d.status || 'new', message: String(d.message || d.error || ''), qr, total: Number(d.total) || 0, price: Number(d.price) || 0, days: Number(d.periodDays) || 0, expireAt: Number(d.expireAt) || 0, expiredAt: Number(d.expiredAt) || 0, pairCode: String(d.pairCode || ''), renewing: Boolean(d.renewing) });
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
    if (route === 'dashboard' && req.method === 'POST') return await routeDashboard(fs, s, req);
    if (route === 'depoweb' && req.method === 'POST') return await routeDepoWeb(fs, s, req);
    if (route === 'depoweb-cancel' && req.method === 'POST') return await routeDepoCancel(fs, s, req);
    if (route === 'setting' && req.method === 'POST') return await routeSetting(fs, s, req);
    if (route === 'call' && req.method === 'POST') return await routeCall(fs, s, req);
    if (route === 'pair' && req.method === 'POST') return await routePair(fs, env, s, req);
    if (route === 'disconnect' && req.method === 'POST') return await routeDisconnect(fs, s, req);
    if (route === 'renew' && req.method === 'POST') return await routeRenew(fs, s, req);
    if (route === 'renew' && req.method === 'GET') return await routeRenewStatus(fs, s, url);
    if (route === 'cmd' && req.method === 'GET') return await routeCmd(fs, s, url);
    if (route === 'depo' && req.method === 'GET') return await routeDepoStatus(fs, s, url);
    return fail(404, 'Tidak ditemukan.');
  } catch (e) {
    if (e && e.status) return fail(e.status, e.message);
    return fail(500, 'Terjadi kesalahan di server. Coba lagi sebentar lagi.');
  }
}

// untuk pengujian lokal (node): fungsi murni
export const _test = { normPhone, okPhone, otpCode, cleanText, encVal, decVal, encFields, decFields, randomId, sameHex, shortUA };
