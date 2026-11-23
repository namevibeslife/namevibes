// Builds the engine context (src/merch/engine.js) for Cloudflare Pages Functions: Firestore REST,
// the real payment gateways, provider adapters and signed artwork URLs. Secrets only come from `env`.
import { json, signedInUser, firestore, toSubunits, toGatewayAmount } from './server.js';
import { paypalToken, paypalBase } from '../api/pay/create-order.js';
import { verifyRazorpay, verifyPayPal } from '../api/pay/verify.js';
import { createProvider } from '../../src/merch/providers/index.js';
import { SITE_URL } from '../../src/config/site.js';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
export const sameString = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const rzAuth = (env) => ({ Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`, 'Content-Type': 'application/json' });

export function gatewaysFor(env) {
  return {
    async create(order, choice) {
      if (choice.gateway === 'razorpay') {
        if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return { error: 'razorpay-not-configured', status: 500 };
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST', headers: rzAuth(env),
          body: JSON.stringify({ amount: toSubunits(order.amount, order.currency), currency: order.currency, receipt: order.id.slice(0, 40), notes: { kind: 'merch', orderId: order.id, uid: order.uid } })
        });
        if (!res.ok) return { error: 'gateway-create-failed', status: 502 };
        const rz = await res.json();
        return { orderId: rz.id, client: { gateway: 'razorpay', orderId: rz.id, keyId: env.RAZORPAY_KEY_ID, amount: rz.amount, currency: rz.currency } };
      }
      if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return { error: 'paypal-not-configured', status: 500 };
      const token = await paypalToken(env);
      const res = await fetch(`${paypalBase(env)}/v2/checkout/orders`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ custom_id: order.uid, description: 'NAMASUTRA Merchandise', amount: { currency_code: order.currency, value: toGatewayAmount(order.amount, order.currency) } }] })
      });
      if (!res.ok) return { error: 'gateway-create-failed', status: 502 };
      const pp = await res.json();
      return { orderId: pp.id, client: { gateway: 'paypal', orderId: pp.id, currency: order.currency } };
    },
    // `order.orderId` is the gateway's order id (the engine maps it); same proof checks as the subscription flow.
    async verify(order, proof) {
      const gatewayOrder = { ...order, gateway: order.gateway };
      return order.gateway === 'razorpay' ? verifyRazorpay(env, gatewayOrder, proof) : verifyPayPal(env, gatewayOrder);
    },
    async checkCaptured(order, payment) {
      if (payment.status !== 'captured' || payment.currency !== order.currency || Number(payment.amount) !== toSubunits(order.amount, order.currency)) return { error: 'amount-mismatch' };
      return {};
    },
    async refund(order, amount) {
      if (order.gateway === 'razorpay') {
        const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(order.transactionId)}/refund`, {
          method: 'POST', headers: rzAuth(env), body: JSON.stringify({ amount: toSubunits(amount, order.currency), notes: { orderId: order.id } })
        });
        return res.ok ? { ok: true } : { error: 'refund-failed', status: 502 };
      }
      const token = await paypalToken(env);
      const res = await fetch(`${paypalBase(env)}/v2/payments/captures/${encodeURIComponent(order.transactionId)}/refund`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: { currency_code: order.currency, value: toGatewayAmount(amount, order.currency) } })
      });
      return res.ok ? { ok: true } : { error: 'refund-failed', status: 502 };
    }
  };
}

// Short-lived signed link to a customer's generated print file. The file proxy (api/merch/file.js)
// checks the signature and expiry before streaming it from Storage; the provider never gets Storage access.
export async function signedArtworkUrl(env, order, item, kind = 'print', ttlMs = 72 * 3600 * 1000) {
  const k = kind === 'mockup' ? 'm' : 'p';
  const exp = Date.now() + ttlMs;
  const sig = await hmacHex(env.MERCH_ARTWORK_SECRET || '', `${order.id}.${item.index}.${k}.${exp}`);
  return `${SITE_URL}/api/merch/file?o=${encodeURIComponent(order.id)}&i=${item.index}&k=${k}&e=${exp}&s=${sig}`;
}

export async function buildCtx(env, request) {
  const db = await firestore(env);
  const who = request ? await signedInUser(request) : null;
  return {
    db, env, who,
    now: () => new Date(),
    id: () => crypto.randomUUID().replace(/-/g, '').slice(0, 20),
    gateways: gatewaysFor(env),
    providerFor: (doc) => createProvider(doc, env),
    artworkUrl: (order, item, kind) => signedArtworkUrl(env, order, item, kind)
  };
}

export const respond = (r) => json(r.body, r.status);
