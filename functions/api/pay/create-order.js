// POST /api/pay/create-order  { gateway: 'razorpay' | 'paypal' }  (Authorization: Bearer <Firebase ID token>)
// Creates the order at the gateway with the server-side secret. The amount, currency and gateway are
// worked out here from Firestore, so a tampered browser cannot change what is charged. The browser only
// receives what its checkout needs. Nothing is activated here; see verify.js.
import { json, signedInUser, firestore, priceForUser, toSubunits, toGatewayAmount } from '../../_lib/server.js';

export const paypalBase = (env) => (env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

export async function paypalToken(env) {
  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal sign-in failed');
  return (await res.json()).access_token;
}

export async function onRequestPost({ request, env }) {
  const who = await signedInUser(request);
  if (!who) return json({ error: 'Not signed in' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  try {
    const db = await firestore(env);
    const price = await priceForUser(db, who.uid);
    if (!price.gateway) return json({ error: 'Payments are not available for this country yet', code: 'unavailable' }, 409);
    if (body.gateway !== price.gateway) return json({ error: 'That payment method is not available', code: 'gateway-mismatch', gateway: price.gateway }, 409);
    if (!(price.amount > 0)) return json({ error: 'Bad price' }, 500);

    const order = {
      uid: who.uid,
      gateway: price.gateway,
      amount: price.amount,
      currency: price.currency,
      listPrice: price.listPrice,
      discountPercent: price.discountPercent,
      referralCode: price.referralCode,
      countryCode: price.countryCode,
      status: 'created',
      createdAt: new Date()
    };

    if (price.gateway === 'razorpay') {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: 'Razorpay is not set up on the server' }, 500);
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: toSubunits(price.amount, price.currency), // smallest unit: paise, cents, fils, ...
          currency: price.currency,
          receipt: `${who.uid}`.slice(0, 40),
          notes: { uid: who.uid, country: price.countryCode }
        })
      });
      if (!res.ok) return json({ error: 'Razorpay could not create the order' }, 502);
      const rz = await res.json();
      await db.create('paymentOrders', rz.id, { ...order, orderId: rz.id, subunits: rz.amount });
      return json({ gateway: 'razorpay', orderId: rz.id, keyId: env.RAZORPAY_KEY_ID, amount: rz.amount, currency: rz.currency, displayAmount: price.amount });
    }

    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return json({ error: 'PayPal is not set up on the server' }, 500);
    const token = await paypalToken(env);
    const res = await fetch(`${paypalBase(env)}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: who.uid,
          description: 'NAMASUTRA Annual Plan',
          amount: { currency_code: price.currency, value: toGatewayAmount(price.amount, price.currency) }
        }]
      })
    });
    if (!res.ok) return json({ error: 'PayPal could not create the order' }, 502);
    const pp = await res.json();
    await db.create('paymentOrders', pp.id, { ...order, orderId: pp.id });
    return json({ gateway: 'paypal', orderId: pp.id, currency: price.currency, displayAmount: price.amount });
  } catch (error) {
    return json({ error: 'Could not start the payment' }, 500);
  }
}
