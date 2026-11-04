// functions/api/[[path]].js — Cloudflare Pages Functions untuk halaman #edit baramarket.
//
// Login cukup username + password. Token GitHub TIDAK pernah dikirim ke browser: disimpan sebagai
// rahasia di Cloudflare (Pages → Settings → Variables and Secrets) dan hanya dipakai di sini.
//
// Variabel yang wajib diisi di Cloudflare (Production):
//   GITHUB_TOKEN    (Secret)  token fine-grained, repo baramarketid.github.io, Contents: Read and write
//   ADMIN_USER      (Text)    username login
//   ADMIN_PASSWORD  (Secret)  password login
// Opsional: GH_OWNER, GH_REPO, GH_BRANCH, GH_PATH (bawaan: baramarketID / baramarketid.github.io / main / data.json)
//
// Rute:  GET /api/me · POST /api/login · POST /api/logout · POST /api/save
// Sesi: cookie bm_sess (HttpOnly, Secure, SameSite=Strict, 24 jam), ditandatangani HMAC-SHA256.
// Ganti ADMIN_PASSWORD atau GITHUB_TOKEN → semua sesi lama otomatis tidak berlaku.

const COOKIE = 'bm_sess';
const SESSION_S = 24 * 60 * 60;
const MAX_FAILS = 5;
const LOCK_S = 15 * 60;
const MAX_BODY = 15 * 1024 * 1024;
const enc = new TextEncoder();

function json(obj, status = 200, headers = {}) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
    });
}
function b64urlBytes(buf) {
    let s = ''; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlText = (t) => b64urlBytes(enc.encode(t));
function fromB64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(out);
}
function b64Utf8(str) {
    const bytes = enc.encode(str); let bin = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
}
async function hmac(key, msg) {
    const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return b64urlBytes(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
/** Bandingkan dua teks tanpa membocorkan waktu: bandingkan HMAC keduanya. */
async function sameText(a, b, key) {
    const [x, y] = await Promise.all([hmac(key, 'cmp:' + a), hmac(key, 'cmp:' + b)]);
    let r = x.length ^ y.length;
    for (let i = 0; i < Math.min(x.length, y.length); i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return r === 0;
}
const secretOf = (env) => `${env.SESSION_SECRET || ''}|${env.GITHUB_TOKEN}|${env.ADMIN_PASSWORD}`;
const ready = (env) => !!(env.GITHUB_TOKEN && env.ADMIN_USER && env.ADMIN_PASSWORD);

function cookieOf(req) {
    const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
    return m ? m[1] : '';
}
function setCookie(value, maxAge) {
    return `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function readSession(req, env) {
    const raw = cookieOf(req); if (!raw || !ready(env)) return null;
    const i = raw.lastIndexOf('.'); if (i < 1) return null;
    const payload = raw.slice(0, i), sig = raw.slice(i + 1);
    if (!(await sameText(sig, await hmac(secretOf(env), payload), secretOf(env)))) return null;
    try {
        const s = JSON.parse(fromB64url(payload));
        if (!s || typeof s.exp !== 'number' || s.exp * 1000 <= Date.now()) return null;
        if (String(s.u).toLowerCase() !== String(env.ADMIN_USER).trim().toLowerCase()) return null;
        return s;
    } catch (e) { return null; }
}

// Batas salah login per IP (disimpan di cache Cloudflare, ±15 menit).
function limiterKey(req) {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    return new Request('https://login-limit.invalid/' + encodeURIComponent(ip));
}
async function fails(req) {
    try { const r = await caches.default.match(limiterKey(req)); return r ? (Number(await r.text()) || 0) : 0; } catch (e) { return 0; }
}
async function setFails(req, n) {
    try {
        if (n <= 0) await caches.default.delete(limiterKey(req));
        else await caches.default.put(limiterKey(req), new Response(String(n), { headers: { 'cache-control': `max-age=${LOCK_S}` } }));
    } catch (e) { /* tanpa cache: tetap jalan, hanya tanpa batas */ }
}

function sameOrigin(req) {
    const o = req.headers.get('origin');
    if (!o) return true;
    try { return new URL(o).host === new URL(req.url).host; } catch (e) { return false; }
}

async function gh(env, method, path, body) {
    const owner = env.GH_OWNER || 'baramarketID', repo = env.GH_REPO || 'baramarketid.github.io';
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'baramarket-pages-editor',
            ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch (e) { /* kosong */ }
    return { status: res.status, data };
}
function ghMessage(status) {
    if (status === 401) return 'Token GitHub di Cloudflare ditolak (salah atau kedaluwarsa). Buat token baru lalu ganti GITHUB_TOKEN di Cloudflare.';
    if (status === 403 || status === 404) return 'Token GitHub di Cloudflare tidak punya izin ke repo website (perlu Contents: Read and write).';
    if (status === 413 || status === 422) return 'Isi website terlalu besar. Pakai gambar yang lebih kecil.';
    return 'GitHub sedang menolak penyimpanan (HTTP ' + status + '). Coba lagi sebentar lagi.';
}

async function handleLogin(req, env) {
    if (!ready(env)) return json({ ok: false, mode: 'server', setup: false, error: 'Login belum diatur di Cloudflare (GITHUB_TOKEN, ADMIN_USER, ADMIN_PASSWORD).' }, 503);
    const n = await fails(req);
    if (n >= MAX_FAILS) return json({ ok: false, mode: 'server', error: 'Terlalu banyak percobaan salah. Coba lagi 15 menit lagi.' }, 429);
    let b = null; try { b = await req.json(); } catch (e) { /* kosong */ }
    const user = String((b && b.user) || '').trim().toLowerCase(), pass = String((b && b.pass) || '');
    const key = secretOf(env);
    const okUser = await sameText(user, String(env.ADMIN_USER).trim().toLowerCase(), key);
    const okPass = await sameText(pass, String(env.ADMIN_PASSWORD), key);
    if (!user || !pass || !okUser || !okPass) {
        await setFails(req, n + 1);
        await new Promise((r) => setTimeout(r, 600));
        return json({ ok: false, mode: 'server', error: 'Username atau password salah.', left: Math.max(0, MAX_FAILS - n - 1) }, 401);
    }
    await setFails(req, 0);
    const exp = Math.floor(Date.now() / 1000) + SESSION_S;
    const payload = b64urlText(JSON.stringify({ u: user, exp }));
    const value = payload + '.' + await hmac(key, payload);
    return json({ ok: true, mode: 'server', user: env.ADMIN_USER, exp: exp * 1000 }, 200, { 'set-cookie': setCookie(value, SESSION_S) });
}

async function handleSave(req, env, sess) {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BODY) return json({ ok: false, error: 'Isi website terlalu besar. Pakai gambar yang lebih kecil.' }, 413);
    let b = null; try { b = await req.json(); } catch (e) { return json({ ok: false, error: 'Data yang dikirim rusak. Muat ulang halaman lalu coba lagi.' }, 400); }
    const d = b && b.data;
    if (!d || typeof d !== 'object' || !d.profile || !Array.isArray(d.links)) return json({ ok: false, error: 'Format isi website tidak dikenali.' }, 400);
    const text = JSON.stringify(d, null, 1);
    if (text.length > MAX_BODY) return json({ ok: false, error: 'Isi website terlalu besar. Pakai gambar yang lebih kecil.' }, 413);
    const branch = env.GH_BRANCH || 'main', file = env.GH_PATH || 'data.json';
    const content = b64Utf8(text);
    const shaOf = async () => {
        const r = await gh(env, 'GET', `/contents/${file}?ref=${encodeURIComponent(branch)}`);
        if (r.status === 404) return null;
        if (r.status !== 200) throw r.status;
        return r.data && r.data.sha;
    };
    try {
        for (let attempt = 0; attempt < 2; attempt++) {
            const sha = await shaOf();
            const body = { message: `Update isi website (${sess.u})`, content, branch };
            if (sha) body.sha = sha;
            const r = await gh(env, 'PUT', `/contents/${file}`, body);
            if (r.status === 200 || r.status === 201) return json({ ok: true });
            if ((r.status === 409 || r.status === 422) && attempt === 0) continue;
            return json({ ok: false, error: ghMessage(r.status) }, 502);
        }
        return json({ ok: false, error: ghMessage(409) }, 502);
    } catch (st) {
        return json({ ok: false, error: typeof st === 'number' ? ghMessage(st) : 'Tidak bisa menghubungi GitHub. Coba lagi sebentar lagi.' }, 502);
    }
}

export async function onRequest(context) {
    const { request: req, env } = context;
    const route = new URL(req.url).pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
    try {
        if (route === 'me' && req.method === 'GET') {
            const s = await readSession(req, env);
            return s ? json({ ok: true, mode: 'server', user: env.ADMIN_USER, exp: s.exp * 1000 }) : json({ ok: false, mode: 'server', setup: ready(env) }, 401);
        }
        if (req.method !== 'POST') return json({ ok: false, error: 'Tidak ditemukan.' }, 404);
        if (!sameOrigin(req) || !/application\/json/i.test(req.headers.get('content-type') || '')) return json({ ok: false, error: 'Permintaan ditolak.' }, 403);
        if (route === 'login') return handleLogin(req, env);
        if (route === 'logout') return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) });
        if (route === 'save') {
            const s = await readSession(req, env);
            if (!s) return json({ ok: false, error: 'Sesi login sudah habis. Masuk lagi.' }, 401);
            return handleSave(req, env, s);
        }
        return json({ ok: false, error: 'Tidak ditemukan.' }, 404);
    } catch (e) {
        return json({ ok: false, error: 'Terjadi kesalahan di server. Coba lagi.' }, 500);
    }
}
