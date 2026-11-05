// baramarket.my.id/edit → tampilkan website (index.html) dengan alamat tetap /edit (halaman edit admin).
// Link lama /#edit tetap jalan.
export function onRequest({ request, env }) {
  const url = new URL(request.url);
  url.pathname = '/';
  return env.ASSETS.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }));
}
