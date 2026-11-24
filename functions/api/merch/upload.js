// POST /api/merch/upload?o=<orderId>&i=<item index>&k=print|mockup   (Authorization: Bearer <Firebase ID token>, body = the PNG bytes)
// The browser never talks to a storage service. The server checks the signed-in user, who owns the order, the size limit
// (15 MB print / 5 MB mock-up) and the PNG signature, then stores the file in Supabase Storage / Cloudflare R2 with automatic
// failover (src/merch/storage/stores.js) and records it on the order. If both backends fail the buyer gets a retry message
// (503 storage-unavailable) and the order is not sent to the print provider.
import { handleUpload } from '../../../src/merch/engine.js';
import { buildCtx, respond } from '../../_lib/merchCtx.js';
import { json } from '../../_lib/server.js';

const MAX_BODY = 15 * 1024 * 1024 + 1;

export async function onRequestPost({ request, env }) {
  const q = new URL(request.url).searchParams;
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY) return json({ error: 'file-too-large' }, 413);
  let bytes;
  try { bytes = new Uint8Array(await request.arrayBuffer()); } catch { return json({ error: 'bad-request' }, 400); }
  if (bytes.length > MAX_BODY) return json({ error: 'file-too-large' }, 413);
  try {
    const ctx = await buildCtx(env, request);
    return respond(await handleUpload(ctx, { orderId: q.get('o') || '', index: q.get('i'), kind: q.get('k') || '', bytes }));
  } catch { return json({ error: 'server-error' }, 500); }
}
