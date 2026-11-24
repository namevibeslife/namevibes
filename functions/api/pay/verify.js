// POST /api/pay/verify  (Authorization: Bearer <Firebase ID token>)
//   Razorpay: { gateway: 'razorpay', razorpay_order_id, razorpay_payment_id, razorpay_signature }
//   PayPal:   { gateway: 'paypal', orderId }   (the server captures the approved order itself)
// The ONLY place a paid plan is activated and a payment recorded. It checks the gateway's proof,
// then the amount and currency against the order this server created, then activates exactly once.
import { json, signedInUser, firestore, activatePlan, claimOrder, toSubunits, toGatewayAmount } from '../../_lib/server.js';
import { paypalToken, paypalBase } from './create-order.js';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
// Constant-time string compare
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// Razorpay's signature is HMAC-SHA256 of "order_id|payment_id" with the key secret
export async function razorpaySignatureValid(secret, orderId, paymentId, signature) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${orderId}|${paymentId}`)));
  return same(mac, String(signature || '').toLowerCase());
}

export async function verifyRazorpay(env, order, body) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
  if (!orderId || !paymentId || !signature || orderId !== order.orderId) return { error: 'Payment could not be verified', status: 400 };
  if (!env.RAZORPAY_KEY_SECRET || !(await razorpaySignatureValid(env.RAZORPAY_KEY_SECRET, orderId, paymentId, signature))) return { error: 'Payment could not be verified', status: 400 };

  // The signature proves this payment belongs to this order; also confirm what was actually paid
  const auth = { Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`, 'Content-Type': 'application/json' };
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: auth });
  if (!res.ok) return { error: 'Could not confirm the payment with Razorpay', status: 502 };
  let payment = await res.json();
  const expected = toSubunits(order.amount, order.currency);
  if (payment.order_id !== orderId || payment.currency !== order.currency || Number(payment.amount) !== expected) return { error: 'Payment amount does not match the order', status: 400 };
  if (payment.status === 'authorized') {
    // Account is not on automatic capture: capture exactly the order amount
    const cap = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', headers: auth, body: JSON.stringify({ amount: expected, currency: order.currency }) });
    if (!cap.ok) return { error: 'Could not capture the payment', status: 502 };
    payment = await cap.json();
  }
  if (payment.status !== 'captured') return { error: 'Payment was not completed', status: 400 };
  return { transactionId: paymentId };
}

export async function verifyPayPal(env, order) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return { error: 'PayPal is not set up on the server', status: 500 };
  const token = await paypalToken(env);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const url = `${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(order.orderId)}`;
  // Capture the buyer-approved order (an already-captured order is read back instead)
  let res = await fetch(`${url}/capture`, { method: 'POST', headers, body: '{}' });
  if (res.status === 422) res = await fetch(url, { headers });
  if (!res.ok) return { error: 'Could not capture the PayPal payment', status: 502 };
  const data = await res.json();
  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  if (data.status !== 'COMPLETED' || !capture || capture.status !== 'COMPLETED') return { error: 'Payment was not completed', status: 400 };
  if (capture.amount?.currency_code !== order.currency || capture.amount?.value !== toGatewayAmount(order.amount, order.currency)) return { error: 'Payment amount does not match the order', status: 400 };
  if (unit.custom_id !== order.uid) return { error: 'Payment does not belong to this account', status: 400 };
  return { transactionId: capture.id };
}

export async function onRequestPost({ request, env }) {
  const who = await signedInUser(request);
  if (!who) return json({ error: 'Not signed in' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const orderId = body.gateway === 'razorpay' ? body.razorpay_order_id : body.orderId;
  if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) return json({ error: 'Bad request' }, 400);

  let db;
  try {
    db = await firestore(env);
    const claim = await claimOrder(db, orderId, who.uid);
    if (claim.error) return json({ error: claim.error }, claim.status);
    if (claim.already) return json({ ok: true, already: true });
    const order = { ...claim.order, orderId };
    if (order.gateway !== body.gateway) {
      await db.patch(`paymentOrders/${orderId}`, { status: 'created' });
      return json({ error: 'Payment method mismatch' }, 400);
    }

    const result = order.gateway === 'razorpay' ? await verifyRazorpay(env, order, body) : await verifyPayPal(env, order);
    if (result.error) {
      await db.patch(`paymentOrders/${orderId}`, { status: 'created', lastError: result.error });
      return json({ error: result.error }, result.status);
    }

    await activatePlan(db, { uid: who.uid, email: who.email, order, gateway: order.gateway, transactionId: result.transactionId });
    await db.patch(`paymentOrders/${orderId}`, { status: 'paid', paidAt: new Date(), transactionId: result.transactionId });
    return json({ ok: true });
  } catch (error) {
    // Money may have moved but we could not finish: leave the order claimable so a retry can complete it
    try { if (db) await db.patch(`paymentOrders/${orderId}`, { status: 'created', lastError: 'server error' }); } catch { /* ignore */ }
    return json({ error: 'Could not confirm the payment. If you were charged, contact support with your payment id.' }, 500);
  }
}
