// baramarket.my.id/sewa → tampilkan website (index.html) dengan alamat tetap /sewa.
// Halaman itu sendiri yang membuka bagian "Sewa Bot Topup". Link lama /#sewa tetap jalan.
export function onRequest({ request, env }) {
  const url = new URL(request.url);
  url.pathname = '/';
  return env.ASSETS.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }));
}
