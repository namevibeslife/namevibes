// Runs the payment functions (functions/api/pay) against in-memory fakes of Firestore, Razorpay, PayPal
// and Firebase sign-in. No network. Usage: node scripts/test-payments-server.mjs
import { generateKeyPairSync, createHmac } from 'node:crypto';
import { onRequestPost as createOrder } from '../functions/api/pay/create-order.js';
import { onRequestPost as verify } from '../functions/api/pay/verify.js';
import { onRequestGet as publicPricing } from '../functions/api/pricing.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const env = {
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'p', client_email: 'x@p.iam', private_key: privateKey }),
  RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: 'rzp_secret', PAYPAL_CLIENT_ID: 'pp_id', PAYPAL_CLIENT_SECRET: 'pp_secret', PAYPAL_ENV: 'sandbox'
};

// ---- fake backends ----
const store = new Map(); // 'users/u1' -> fields (plain)
const times = new Map();
let tick = 0;
const enc = (v) => v === null ? { nullValue: null } : typeof v === 'string' ? (/^\d{4}-\d\d-\d\dT/.test(v) ? { timestampValue: v } : { stringValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
const dec = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? v.timestampValue : null]));
const docOut = (path) => ({ name: path, fields: Object.fromEntries(Object.entries(store.get(path)).map(([k, v]) => [k, enc(v)])), updateTime: times.get(path) });
const put = (path, data) => { store.set(path, data); times.set(path, `t${++tick}`); };

const razorpayOrders = new Map();
const razorpayPayments = new Map();
const paypalOrders = new Map();
let rzCount = 0;
let ppCount = 0;
const log = [];

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
  const res = (obj, status = 200) => new Response(JSON.stringify(obj), { status });
  if (url.startsWith('https://oauth2.googleapis.com/token')) return res({ access_token: 'tok' });
  if (url.includes('identitytoolkit')) {
    const t = body.idToken;
    return t.startsWith('user:') ? res({ users: [{ localId: t.slice(5), email: `${t.slice(5)}@x.test` }] }) : res({}, 400);
  }
  if (url.includes('firestore.googleapis.com')) {
    const m = url.match(/documents\/([^?]*)(\?(.*))?$/);
    const path = decodeURIComponent(m[1]); const qs = new URLSearchParams(m[3] || '');
    if (init.method === 'POST') {
      const id = qs.get('documentId'); const full = `${path}/${id}`;
      if (store.has(full)) return res({}, 409);
      put(full, dec(body.fields)); return res({});
    }
    if (init.method === 'PATCH') {
      const pre = qs.get('currentDocument.updateTime');
      if (pre && times.get(path) !== pre) return res({}, 409);
      put(path, { ...(store.get(path) || {}), ...dec(body.fields) }); return res({});
    }
    if (store.has(path)) return res(docOut(path));
    const children = [...store.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/'));
    if (children.length) return res({ documents: children.map(docOut) });
    return path.split('/').length % 2 === 1 ? res({}) : res({}, 404);
  }
  if (url === 'https://api.razorpay.com/v1/orders') {
    const id = `order_${++rzCount}ABCDEF`;
    razorpayOrders.set(id, body); return res({ id, amount: body.amount, currency: body.currency });
  }
  let m = url.match(/api\.razorpay\.com\/v1\/payments\/([^/]+)(\/capture)?$/);
  if (m) {
    const p = razorpayPayments.get(m[1]); if (!p) return res({}, 404);
    if (m[2]) { p.status = 'captured'; }
    return res(p);
  }
  if (url.includes('/v1/oauth2/token')) return res({ access_token: 'pptok' });
  if (url.endsWith('/v2/checkout/orders')) {
    const id = `PPORDER${++ppCount}XYZ`; const u = body.purchase_units[0];
    paypalOrders.set(id, { status: 'CREATED', purchase_units: [{ custom_id: u.custom_id, amount: u.amount }] }); return res({ id });
  }
  m = url.match(/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
  if (m) {
    const o = paypalOrders.get(m[1]); if (!o) return res({}, 404);
    if (m[2]) {
      if (o.status === 'COMPLETED') return res({}, 422);
      if (!o.approved) return res({ name: 'ORDER_NOT_APPROVED' }, 422);
      o.status = 'COMPLETED'; o.purchase_units[0].payments = { captures: [{ id: `CAP${m[1]}`, status: 'COMPLETED', amount: o.captured || o.purchase_units[0].amount }] };
    }
    return res(o);
  }
  throw new Error('unexpected fetch ' + url);
};

const call = async (fn, uid, payload) => {
  const r = await fn({ request: new Request('http://x/api', { method: 'POST', headers: { Authorization: uid ? `Bearer user:${uid}` : '' }, body: JSON.stringify(payload) }), env });
  return { status: r.status, body: await r.json() };
};
let failed = 0;
const check = (name, ok, extra = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };

// ---- data ----
put('countrySettings/in', { countryCode: 'IN', currency: 'INR', price: 399, referralDiscount: 10, isActive: true });
put('countrySettings/us', { countryCode: 'US', currency: 'USD', price: 25, referralDiscount: 10, isActive: true });
put('countrySettings/ae', { countryCode: 'AE', currency: 'AED', price: 50, referralDiscount: 10, isActive: true });
put('countrySettings/jp', { countryCode: 'JP', currency: 'JPY', price: 3500, referralDiscount: 10, isActive: true });
put('referralCodes/IN123456', { active: true, ambassadorEmail: 'a@x.test' });
put('referralCodes/OLD000000', { active: false, ambassadorEmail: 'a@x.test' });
put('users/inUser', { countryCode: 'IN', email: 'inUser@x.test' });
put('users/inRef', { countryCode: 'IN', referralCodeUsed: 'IN123456' });
put('users/inDeadRef', { countryCode: 'IN', referralCodeUsed: 'OLD000000' });
put('users/usUser', { countryCode: 'US' });
put('users/aeUser', { countryCode: 'AE' });
put('users/jpUser', { countryCode: 'JP' });
put('users/noCountry', {});
put('users/inUser2', { countryCode: 'IN' });

// ---- tests ----
console.log('create-order');
check('unauthenticated rejected', (await call(createOrder, null, { gateway: 'razorpay' })).status === 401);
let r = await call(createOrder, 'inUser', { gateway: 'razorpay', amount: 1, currency: 'USD' });
check('India: Razorpay order, amount from server (399 INR = 39900 paise), client amount ignored', r.status === 200 && r.body.amount === 39900 && r.body.currency === 'INR' && r.body.keyId === 'rzp_test_key', JSON.stringify(r));
const orderIN = r.body.orderId;
check('order stored server-side', store.get(`paymentOrders/${orderIN}`)?.uid === 'inUser' && store.get(`paymentOrders/${orderIN}`)?.amount === 399);
r = await call(createOrder, 'inRef', { gateway: 'razorpay' });
check('India + valid referral: 359 INR = 35900 paise', r.body.amount === 35900, JSON.stringify(r));
r = await call(createOrder, 'inDeadRef', { gateway: 'razorpay' });
check('inactive referral code gives no discount', r.body.amount === 39900, JSON.stringify(r));
r = await call(createOrder, 'inUser', { gateway: 'paypal' });
check('India asking for PayPal is refused (gateway chosen by server)', r.status === 409 && r.body.gateway === 'razorpay', JSON.stringify(r));
r = await call(createOrder, 'usUser', { gateway: 'paypal' });
check('US, international off: PayPal 25.00 USD', r.status === 200 && paypalOrders.get(r.body.orderId).purchase_units[0].amount.value === '25.00', JSON.stringify(r));
r = await call(createOrder, 'aeUser', { gateway: 'razorpay' });
check('AE, international off: coming soon (AED not on PayPal)', r.status === 409 && r.body.code === 'coming-soon', JSON.stringify(r));
r = await call(createOrder, 'jpUser', { gateway: 'paypal' });
check('JP PayPal amount is whole yen "3500"', r.status === 200 && paypalOrders.get(r.body.orderId).purchase_units[0].amount.value === '3500', JSON.stringify(r));
put('users/frUser', { countryCode: 'FR' });
r = await call(createOrder, 'frUser', { gateway: 'paypal' });
check('country with no Active pricing record: refused, no built-in price (no-pricing)', r.status === 409 && r.body.code === 'no-pricing', JSON.stringify(r));
put('countrySettings/ae-off', { countryCode: 'SA', currency: 'SAR', price: 40, isActive: false });
put('users/saUser', { countryCode: 'SA' });
r = await call(createOrder, 'saUser', { gateway: 'razorpay' });
check('inactive record is not priced', r.status === 409 && r.body.code === 'no-pricing', JSON.stringify(r));
r = await call(createOrder, 'noCountry', { gateway: 'paypal' });
check('profile without country fails safely', r.status === 500);
put('paymentSettings/razorpay', { internationalEnabled: true });
r = await call(createOrder, 'aeUser', { gateway: 'razorpay' });
check('AE, international on: Razorpay 5000 fils AED', r.status === 200 && r.body.amount === 5000 && r.body.currency === 'AED', JSON.stringify(r));
r = await call(createOrder, 'jpUser', { gateway: 'razorpay' });
check('JP on Razorpay: 3500 (zero-decimal, not 350000)', r.body.amount === 3500, JSON.stringify(r));
put('paymentSettings/razorpay', { internationalEnabled: false });

console.log('verify - Razorpay');
const sign = (o, p, secret = 'rzp_secret') => createHmac('sha256', secret).update(`${o}|${p}`).digest('hex');
razorpayPayments.set('pay_good', { id: 'pay_good', order_id: orderIN, amount: 39900, currency: 'INR', status: 'captured' });
r = await call(verify, 'inUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_good', razorpay_signature: 'deadbeef' });
check('bad signature rejected, nothing activated', r.status === 400 && !store.get('users/inUser').planActive && ![...store.keys()].some((k) => k.startsWith('payments/')), JSON.stringify(r));
r = await call(verify, 'inUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_good', razorpay_signature: sign(orderIN, 'pay_good', 'wrong_secret') });
check('signature made with another secret rejected', r.status === 400);
r = await call(verify, 'otherUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_good', razorpay_signature: sign(orderIN, 'pay_good') });
check("another user cannot claim someone else's order", r.status === 404);
razorpayPayments.set('pay_short', { id: 'pay_short', order_id: orderIN, amount: 100, currency: 'INR', status: 'captured' });
r = await call(verify, 'inUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_short', razorpay_signature: sign(orderIN, 'pay_short') });
check('valid signature but wrong paid amount rejected', r.status === 400 && !store.get('users/inUser').planActive, JSON.stringify(r));
r = await call(verify, 'inUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_good', razorpay_signature: sign(orderIN, 'pay_good') });
const pay = [...store.entries()].find(([k]) => k.startsWith('payments/inUser_'));
check('valid payment activates plan and records payment', r.status === 200 && store.get('users/inUser').planActive === true && store.get('users/inUser').planType === 'family' && pay && pay[1].amount === 399 && pay[1].currency === 'INR' && pay[1].gateway === 'razorpay' && pay[1].transactionId === 'pay_good' && pay[1].countryCode === 'IN', JSON.stringify([r, pay]));
const before = [...store.keys()].filter((k) => k.startsWith('payments/')).length;
r = await call(verify, 'inUser', { gateway: 'razorpay', razorpay_order_id: orderIN, razorpay_payment_id: 'pay_good', razorpay_signature: sign(orderIN, 'pay_good') });
check('replay does not record a second payment', r.status === 200 && r.body.already && [...store.keys()].filter((k) => k.startsWith('payments/')).length === before);
// authorized -> captured
r = await call(createOrder, 'inUser2', { gateway: 'razorpay' });
const o2 = r.body.orderId; razorpayPayments.set('pay_auth', { id: 'pay_auth', order_id: o2, amount: 39900, currency: 'INR', status: 'authorized' });
r = await call(verify, 'inUser2', { gateway: 'razorpay', razorpay_order_id: o2, razorpay_payment_id: 'pay_auth', razorpay_signature: sign(o2, 'pay_auth') });
check('authorized payment is captured then activated', r.status === 200 && store.get('users/inUser2').planActive === true);

console.log('verify - PayPal');
r = await call(createOrder, 'usUser', { gateway: 'paypal' });
const ppo = r.body.orderId;
r = await call(verify, 'usUser', { gateway: 'paypal', orderId: ppo });
check('order not approved by the buyer: nothing activated', r.status !== 200 && !store.get('users/usUser').planActive, JSON.stringify(r));
paypalOrders.get(ppo).approved = true; paypalOrders.get(ppo).captured = { currency_code: 'USD', value: '1.00' };
r = await call(verify, 'usUser', { gateway: 'paypal', orderId: ppo });
check('captured amount differs from order: rejected', r.status === 400 && !store.get('users/usUser').planActive, JSON.stringify(r));
r = await call(createOrder, 'usUser', { gateway: 'paypal' });
const ppo2 = r.body.orderId; paypalOrders.get(ppo2).approved = true;
r = await call(verify, 'usUser', { gateway: 'paypal', orderId: ppo2 });
const pp = [...store.entries()].find(([k]) => k.startsWith('payments/usUser_'));
check('approved + exact amount and currency: activated and recorded', r.status === 200 && store.get('users/usUser').planActive === true && pp && pp[1].amount === 25 && pp[1].currency === 'USD' && pp[1].gateway === 'paypal', JSON.stringify([r, pp]));
r = await call(verify, 'usUser', { gateway: 'razorpay', razorpay_order_id: ppo2, razorpay_payment_id: 'x', razorpay_signature: 'y' });
check('wrong gateway for the order rejected', r.status === 400 || r.body.already === true);

console.log('public pricing (signed-out visitors)');
put('countrySettings/us', { countryCode: 'US', countryName: 'United States', currency: 'USD', symbol: '$', price: 25, referralDiscount: 10, taxPercent: 0, isActive: true, gatewayOverride: 'paypal', updatedBy: 'admin@x.test' });
const pub = async (q) => (await publicPricing({ request: new Request('http://x/api/pricing' + q), env })).json();
let pr = await pub('?country=US');
check('returns only public fields, no admin fields', pr.pricing && pr.pricing.price === 25 && pr.pricing.currency === 'USD' && !('gatewayOverride' in pr.pricing) && !('updatedBy' in pr.pricing), JSON.stringify(pr));
pr = await pub('?country=FR');
check('country with no record returns null (no default price)', pr.pricing === null, JSON.stringify(pr));
pr = await pub('?country=SA');
check('inactive country returns null', pr.pricing === null);
pr = await pub('');
check('list holds only Active priced countries', pr.countries.length === 4 && !pr.countries.some((c) => c.code === 'SA'), JSON.stringify(pr));

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
