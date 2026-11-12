// Firebase sign-in proxy: serves /__/auth/* and /__/firebase/* from this domain so Google
// sign-in shows www.namevibes.life instead of firebaseapp.com (replaces the Vercel rewrites).
export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = 'https://namevibes-life.firebaseapp.com' + url.pathname + url.search;
  const upstream = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  });
  return new Response(upstream.body, upstream);
}
