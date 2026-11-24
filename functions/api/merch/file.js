// GET /api/merch/file?o=<orderId>&i=<item>&e=<expiry ms>&s=<signature>
// Serves one generated print file to the fulfilment provider. The link is HMAC-signed (MERCH_ARTWORK_SECRET)
// and expires; the file is read from Firebase Storage with the service account. Nothing else is exposed.
import { accessToken, firestore } from '../../_lib/server.js';
import { hmacHex, sameString } from '../../_lib/merchCtx.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const [o, i, e, s] = ['o', 'i', 'e', 's'].map((k) => q.get(k) || '');
  const k = q.get('k') === 'm' ? 'm' : 'p'; // p = print file, m = mock-up
  const notFound = () => new Response('Not found', { status: 404 });
  if (!env.MERCH_ARTWORK_SECRET || !/^[A-Za-z0-9_-]{6,64}$/.test(o) || !/^\d{1,2}$/.test(i) || !(Number(e) > Date.now())) return notFound();
  if (!sameString(await hmacHex(env.MERCH_ARTWORK_SECRET, `${o}.${i}.${k}.${e}`), s.toLowerCase())) return notFound();
  try {
    const db = await firestore(env);
    const order = (await db.get(`merch_orders/${o}`))?.data;
    const it = order?.items?.[Number(i)];
    const art = k === 'm' ? it?.mockup : it?.artwork;
    if (!art || !String(art.path).startsWith(k === 'm' ? 'merch/mockup/' : 'merch/print/')) return notFound();
    const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    const token = await accessToken(account, 'https://www.googleapis.com/auth/devstorage.read_only');
    const bucket = env.FIREBASE_STORAGE_BUCKET || `${account.project_id}.firebasestorage.app`;
    const res = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(art.path)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return notFound();
    return new Response(res.body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' } });
  } catch { return notFound(); }
}
