// POST /api/merch/{catalogue|quote|checkout|artwork|verify|admin}  (Authorization: Bearer <Firebase ID token>)
// All merchandise decisions (availability, price, provider, payment proof, admin changes) are made by
// src/merch/engine.js on the server; the browser only displays results.
import { handleMerch } from '../../../src/merch/engine.js';
import { buildCtx, respond } from '../../_lib/merchCtx.js';
import { json } from '../../_lib/server.js';

export async function onRequestPost({ request, env, params }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  try {
    const ctx = await buildCtx(env, request);
    return respond(await handleMerch(ctx, params.action, body));
  } catch (e) {
    return json({ error: 'server-error' }, 500);
  }
}
