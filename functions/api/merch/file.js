// GET /api/merch/file?o=<orderId>&i=<item>&k=p|m&e=<expiry ms>&s=<signature>
// Fallback download link for a stored print file (used only when a backend cannot make its own signed link). The link is
// HMAC-signed (MERCH_ARTWORK_SECRET) and expires; the file is read from whichever backend holds it. Nothing else is exposed.
import { firestore } from '../../_lib/server.js';
import { hmacHex, sameString, buildCtx, artworkSecret } from '../../_lib/merchCtx.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const [o, i, e, s] = ['o', 'i', 'e', 's'].map((k) => q.get(k) || '');
  const k = q.get('k') === 'm' ? 'm' : 'p'; // p = print file, m = mock-up
  const notFound = () => new Response('Not found', { status: 404 });
  if (!artworkSecret(env) || !/^[A-Za-z0-9_-]{6,64}$/.test(o) || !/^\d{1,2}$/.test(i) || !(Number(e) > Date.now())) return notFound();
  if (!sameString(await hmacHex(artworkSecret(env), `${o}.${i}.${k}.${e}`), s.toLowerCase())) return notFound();
  try {
    const db = await firestore(env);
    const order = (await db.get(`merch_orders/${o}`))?.data;
    const it = order?.items?.[Number(i)];
    const rec = k === 'm' ? it?.mockup : it?.artwork;
    if (!rec?.key || rec.fileDeletedAt || !String(rec.key).startsWith(k === 'm' ? 'merch/mockup/' : 'merch/print/')) return notFound();
    const { files } = await buildCtx(env, null);
    const file = await files.get(rec);
    if (!file) return notFound();
    return new Response(file.bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' } });
  } catch { return notFound(); }
}
