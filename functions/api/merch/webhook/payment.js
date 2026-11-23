// POST /api/merch/webhook/payment - Razorpay webhook (event payment.captured). The signature is
// HMAC-SHA256 of the RAW body with RAZORPAY_WEBHOOK_SECRET. Replays are acknowledged and ignored.
import { handlePaymentWebhook } from '../../../../src/merch/engine.js';
import { buildCtx, respond, hmacHex, sameString } from '../../../_lib/merchCtx.js';
import { json } from '../../../_lib/server.js';

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const sig = request.headers.get('x-razorpay-signature') || '';
  if (!env.RAZORPAY_WEBHOOK_SECRET || !sameString(await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw), sig.toLowerCase())) return json({ error: 'bad-signature' }, 401);
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: 'bad-body' }, 400); }
  try {
    const ctx = await buildCtx(env, null);
    return respond(await handlePaymentWebhook(ctx, { eventId: request.headers.get('x-razorpay-event-id') || '', event }));
  } catch { return json({ error: 'server-error' }, 500); }
}
