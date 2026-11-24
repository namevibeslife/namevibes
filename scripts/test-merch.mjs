// Merchandise tests: unit (elements, availability/routing, quote and commission maths) and integration
// with fakes (payments, providers, webhooks, refunds). No network. Usage: node scripts/test-merch.mjs
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createMemoryDb } from '../src/merch/memoryDb.js';
import { buildNameElementsDesign, verifyClientElements, buildBloodGroupDesign, BLOOD_GROUPS, buildDesign } from '../src/merch/designs.js';
import { checkAvailability, routeProvider } from '../src/merch/availability.js';
import { computeQuote } from '../src/merch/quoteMath.js';
import { computeOrderCommission, reversalAmount } from '../src/merch/commission.js';
import { MockProviderAdapter } from '../src/merch/providers/mock.js';
import { handleMerch, handleAdmin, handlePaymentWebhook, handleProviderWebhook, runFulfilment, retryDue, applyProviderStatus, sweepCommissions } from '../src/merch/engine.js';
import { analyzeName } from '../src/utils/elements.js';
import { ELEMENTS } from '../src/utils/elements.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); }
};

// ---- fixtures -------------------------------------------------------------------------------------
const seed = () => ({
  'merch_settings/global': { visibleTo: 'everyone', enabled: true, message: '' },
  'merch_countries/IN': {
    countryCode: 'IN', enabled: true, currency: 'INR', taxPercent: 18, taxIncluded: true,
    collections: { name_elements: true, blood_group: true }, prices: { tshirt: 799, mug: 399, notebook: 299, poster: 899 },
    costs: { tshirt: 420, mug: 200, notebook: 150, poster: 450 }, shipping: { flat: 60, freeAbove: 1500 }, paymentFeePercent: 2.5,
    providerPrimary: 'mock', providerBackup: 'mock2', gatewayOverride: 'auto'
  },
  'merch_countries/US': {
    countryCode: 'US', enabled: false, currency: 'USD', taxPercent: 0, taxIncluded: false,
    collections: { name_elements: true, blood_group: true }, prices: { tshirt: 25 }, shipping: { flat: 5 }, providerPrimary: 'mock'
  },
  // the T-shirt is DISABLED by default (launch scope); these generic engine tests switch it on
  'merch_products/tshirt': { id: 'tshirt', enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: true } },
  // mug has a complete print spec in this fixture (the shipped default leaves it unset, which blocks it)
  'merch_products/mug': { id: 'mug', enabled: true, printSpec: { printTypeId: 5, allowedPlacements: ['fr'], maxWidthInches: 8, maxHeightInches: 3.5, minDpi: 150, verified: true } },
  'merch_providers/mock': { id: 'mock', adapter: 'mock', active: true, countries: ['IN', 'US'] },
  'merch_providers/mock2': { id: 'mock2', adapter: 'mock', active: true, countries: ['IN'] },
  'admins/admin@x.test': { role: 'super' },
  'users/u1': { email: 'u1@x.test', countryCode: 'IN', referralCode: 'IN123456' },
  'referralCodes/IN123456': { active: true, ambassadorEmail: 'amb@x.test', ambassadorId: 'a1', code: 'IN123456' },
  'merch_settings/commission': { enabled: true, type: 'percent_margin', value: 20, cap: 0, holdDays: 14, overrides: {} },
  'paymentSettings/razorpay': { internationalEnabled: false }
});
const address = (country = 'IN') => ({ name: 'A B', phone: '9999999999', line1: '1 Road', city: 'Pune', state: 'MH', postalCode: '411001', country });

function makeEnv({ db = createMemoryDb(seed()), who = { uid: 'u1', email: 'u1@x.test', emailVerified: true }, now = () => new Date() } = {}) {
  const mock = new MockProviderAdapter('mock');
  const mock2 = new MockProviderAdapter('mock2');
  let n = 0;
  const gw = { created: [], refunds: [], verifyResult: { transactionId: 'pay_1' } };
  const ctx = {
    db, who, env: {}, now, id: () => `id${++n}x${Math.random().toString(36).slice(2, 8)}`,
    providerFor: (p) => (p.id === 'mock2' ? mock2 : mock),
    artworkUrl: async (order, item) => `https://art.test/${item.artwork.path}`,
    gateways: {
      async create(order, choice) { gw.created.push(order); return { orderId: `gw_${order.id}`, client: { gateway: choice.gateway, orderId: `gw_${order.id}` } }; },
      async verify() { return gw.verifyResult; },
      async checkCaptured(order, payment) { return payment.amount === Math.round(order.amount * 100) ? {} : { error: 'amount-mismatch' }; },
      async refund(order, amount) { gw.refunds.push({ id: order.id, amount }); return { ok: true }; }
    }
  };
  return { ctx, db, mock, mock2, gw };
}

const tshirtItem = (name = 'Vibes') => ({ productId: 'tshirt', collection: 'name_elements', color: 'white', size: 'M', qty: 1, design: { name } });
const withArtwork = async (e, orderId, uid = 'u1') => {
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  return handleMerch(e.ctx, 'artwork', { orderId, items: order.items.map((i) => ({ index: i.index, sha256: 'a'.repeat(64), path: `merch/print/${uid}/${orderId}/${i.index}.png`, width: 3600, height: 4800 })) });
};
async function placeOrder(e, items = [tshirtItem()], addr = address()) {
  const q = await handleMerch(e.ctx, 'quote', { items, address: addr });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  const c = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  const att = await withArtwork(e, c.body.orderId);
  assert.equal(att.status, 200, JSON.stringify(att.body));
  return { orderId: c.body.orderId, total: c.body.total };
}

console.log('Unit: element extraction');
await test('Vibes -> V, I, Be, S (same as the app engine)', () => {
  const r = buildNameElementsDesign('Vibes');
  assert.deepEqual(r.design.elements.map((e) => e.symbol), ['V', 'I', 'Be', 'S']);
  assert.deepEqual(r.design.elements.map((e) => e.atomicNumber), [23, 53, 4, 16]);
  assert.equal(r.design.algorithmVersion, 'namasutra-elements-v1');
});
await test('every symbol comes from the engine; none invented (Ja, Me never appear)', () => {
  for (const name of ['Jamie', 'Meera', 'Radhe Krishna', 'Sunil Kumar', 'Anjali']) {
    const r = buildNameElementsDesign(name);
    if (r.error) continue;
    r.design.elements.forEach((e) => assert.ok(ELEMENTS[e.symbol], `${name}: ${e.symbol}`));
    assert.ok(!r.design.elements.some((e) => e.symbol === 'Ja' || e.symbol === 'Me'));
    assert.deepEqual(r.design.elements.map((e) => e.symbol), analyzeName(name).elements.map((e) => e.symbol));
  }
});
await test('invalid symbols and mismatched elements are rejected', () => {
  assert.equal(verifyClientElements('Vibes', ['V', 'I', 'Ja', 'S']).error, 'invalid-symbol');
  assert.equal(verifyClientElements('Vibes', ['V', 'I', 'S']).error, 'elements-mismatch');
  assert.equal(verifyClientElements('Vibes', ['V', 'I', 'Be', 'S']).design.name, 'Vibes');
  assert.equal(buildNameElementsDesign('').error, 'name-required');
  assert.equal(buildNameElementsDesign('x'.repeat(41)).error, 'name-too-long');
  assert.equal(buildNameElementsDesign('123 !!').error, 'name-required' === 'x' ? '' : 'no-elements');
});
await test('exactly eight blood groups; must be confirmed; never inferred', () => {
  assert.equal(BLOOD_GROUPS.length, 8);
  for (const g of BLOOD_GROUPS) assert.equal(buildBloodGroupDesign(g, { confirmed: true }).design.bloodGroup, g);
  assert.equal(buildBloodGroupDesign('A+').error, 'blood-group-not-confirmed');
  assert.equal(buildBloodGroupDesign('C+', { confirmed: true }).error, 'invalid-blood-group');
  assert.equal(buildBloodGroupDesign('AB−', { confirmed: true }).design.bloodGroup, 'AB-');
  assert.equal(buildDesign('blood_group', {}).error, 'invalid-blood-group');
});

console.log('Unit: availability and routing');
const cfgFromSeed = async () => {
  const db = createMemoryDb(seed());
  return { settings: (await db.get('merch_settings/global')).data, india: (await db.get('merch_countries/IN')).data, us: (await db.get('merch_countries/US')).data, providers: await db.list('merch_providers') };
};
await test('switches cascade global -> country -> collection -> product', async () => {
  const c = await cfgFromSeed();
  const product = { id: 'tshirt', enabled: true, collections: ['name_elements', 'blood_group'], sizes: ['M'], printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: true } };
  assert.equal(checkAvailability({ settings: c.settings, country: c.india, product, collection: 'name_elements' }).ok, true);
  assert.equal(checkAvailability({ settings: { enabled: false }, country: c.india, product, collection: 'name_elements' }).reason, 'global-off');
  assert.equal(checkAvailability({ settings: c.settings, country: c.us, product, collection: 'name_elements' }).reason, 'country-off');
  assert.equal(checkAvailability({ settings: c.settings, country: { ...c.india, collections: { name_elements: false, blood_group: true } }, product, collection: 'name_elements' }).reason, 'collection-off');
  assert.equal(checkAvailability({ settings: c.settings, country: c.india, product: { ...product, enabled: false }, collection: 'name_elements' }).reason, 'product-off');
  assert.equal(checkAvailability({ settings: c.settings, country: c.india, product: { id: 'mug', enabled: true, collections: ['name_elements'] }, collection: 'blood_group' }).reason, 'product-collection');
});
await test('routing: primary, backup, never a disabled or non-serving provider', async () => {
  const c = await cfgFromSeed();
  const product = { id: 'tshirt' };
  assert.equal(routeProvider({ providers: c.providers, country: c.india, product }).provider.id, 'mock');
  const down = c.providers.map((p) => (p.id === 'mock' ? { ...p, active: false } : p));
  assert.equal(routeProvider({ providers: down, country: c.india, product }).provider.id, 'mock2');
  const none = routeProvider({ providers: c.providers.map((p) => ({ ...p, active: false })), country: c.india, product });
  assert.equal(none.provider, null);
  assert.equal(routeProvider({ providers: c.providers, country: { ...c.india, countryCode: 'DE' }, product }).provider, null);
  const real = [{ id: 'qikink', adapter: 'qikink', active: true, countries: ['IN'] }];
  assert.equal(routeProvider({ providers: real, country: { ...c.india, providerPrimary: 'qikink' }, product, variantMap: null }).provider, null);
  assert.equal(routeProvider({ providers: real, country: { ...c.india, providerPrimary: 'qikink' }, product, variantMap: { providerSkus: { qikink: 'SKU1' } } }).provider.id, 'qikink');
});

console.log('Unit: quote and commission maths');
await test('tax-inclusive India quote: shipping, free-shipping threshold, GST extracted', () => {
  const country = { currency: 'INR', taxPercent: 18, taxIncluded: true, shipping: { flat: 60, freeAbove: 1500 }, costs: { tshirt: 420 }, paymentFeePercent: 2.5 };
  const q = computeQuote({ lines: [{ productId: 'tshirt', qty: 1, unitPrice: 799 }], country });
  assert.equal(q.items, 799); assert.equal(q.shipping, 60); assert.equal(q.total, 859);
  assert.equal(q.tax, 131.03); // 859 - 859/1.18
  const free = computeQuote({ lines: [{ productId: 'tshirt', qty: 2, unitPrice: 799 }], country });
  assert.equal(free.shipping, 0); assert.equal(free.total, 1598);
});
await test('tax-exclusive USD quote adds tax on top; 0-decimal currency stays whole', () => {
  const q = computeQuote({ lines: [{ productId: 'tshirt', qty: 2, unitPrice: 25 }], country: { currency: 'USD', taxPercent: 10, taxIncluded: false, shipping: { flat: 5 } } });
  assert.equal(q.total, 60.5); assert.equal(q.tax, 5.5);
  const jp = computeQuote({ lines: [{ productId: 'x', qty: 1, unitPrice: 3000 }], country: { currency: 'JPY', taxPercent: 10, taxIncluded: true, shipping: { flat: 500 } } });
  assert.equal(jp.total, 3500); assert.ok(Number.isInteger(jp.tax));
});
await test('commission: percent of margin, fixed, caps, overrides, never above margin, reversal', () => {
  const order = { currency: 'INR', countryCode: 'IN', lines: [{ productId: 'tshirt', collection: 'name_elements', qty: 2, lineMargin: 100 }] };
  assert.equal(computeOrderCommission({ enabled: true, type: 'percent_margin', value: 20 }, order).amount, 20);
  assert.equal(computeOrderCommission({ enabled: true, type: 'fixed', value: 60 }, order).amount, 100); // capped at margin
  assert.equal(computeOrderCommission({ enabled: true, type: 'fixed', value: 30, cap: 25 }, order).amount, 50); // cap per unit
  assert.equal(computeOrderCommission({ enabled: false }, order).amount, 0);
  const pol = { enabled: true, type: 'percent_margin', value: 10, overrides: { 'collection:name_elements': { value: 30 }, 'product:tshirt': { enabled: false } } };
  assert.equal(computeOrderCommission(pol, order).amount, 0);
  assert.equal(computeOrderCommission({ ...pol, overrides: { 'collection:name_elements': { value: 30 } } }, order).amount, 30);
  assert.equal(computeOrderCommission({ enabled: true, type: 'percent_margin', value: 50 }, { ...order, lines: [{ ...order.lines[0], lineMargin: -40 }] }).amount, 0);
  assert.equal(reversalAmount({ commissionAmount: 20, refundedAmount: 400, orderTotal: 800, currency: 'INR' }), 10);
  assert.equal(reversalAmount({ commissionAmount: 20, alreadyReversed: 10, refundedAmount: 800, orderTotal: 800, currency: 'INR' }), 10);
});

console.log('Integration: customer flow');
await test('quote -> checkout -> verify -> paid once -> submitted to provider; one fulfilment job', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  const v = await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  assert.equal(v.status, 200);
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'submitted');
  assert.equal(order.gateway, 'razorpay');
  assert.equal(order.items[0].design.elements.length, 4);
  assert.equal(e.mock.submitCalls, 1);
  assert.equal((await e.db.list('merch_fulfillments')).length, 1);
  const again = await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  assert.equal(again.body.already, true);
  assert.equal(e.mock.submitCalls, 1);
});
await test('server recomputes the price: a tampered browser cannot change what is charged', async () => {
  const e = makeEnv();
  const q = await handleMerch(e.ctx, 'quote', { items: [{ ...tshirtItem(), unitPrice: 1, price: 1 }], address: address(), total: 1 });
  assert.equal(q.body.quote.items, 799);
  const stored = (await e.db.get(`merch_quotes/${q.body.quoteId}`)).data;
  assert.equal(stored.items[0].unitPrice, 799);
});
await test('invalid element symbol is rejected at quote', async () => {
  const e = makeEnv();
  const r = await handleMerch(e.ctx, 'quote', { items: [{ ...tshirtItem(), design: { name: 'Vibes', elements: ['V', 'I', 'Ja', 'S'] } }], address: address() });
  assert.equal(r.status, 400); assert.equal(r.body.error, 'invalid-symbol');
});
await test('Global OFF blocks new quotes and checkout', async () => {
  const e = makeEnv();
  const q = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  await e.db.patch('merch_settings/global', { enabled: false, message: 'Back soon' });
  const c = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId });
  assert.equal(c.status, 409); assert.equal(c.body.error, 'merch-off');
  const q2 = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  assert.equal(q2.body.error, 'merch-off'); assert.equal(q2.body.message, 'Back soon');
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat.body.globalEnabled, false);
});
await test('Global OFF keeps a PAID order serviceable (fulfil, track, refund)', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  e.mock.failNext('timeout');
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  await e.db.patch('merch_settings/global', { enabled: false });
  const r = await runFulfilment(e.ctx, orderId, { force: true });
  assert.ok(r.submitted);
  const admin = makeEnv({ db: e.db, who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  const ref = await handleAdmin(admin.ctx, { action: 'refund', data: { orderId, reason: 'test' } });
  assert.equal(ref.status, 200);
});
await test('India ON / US OFF: a US address is blocked on the server; country change recomputes provider, tax and total', async () => {
  const e = makeEnv();
  const us = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address('US') });
  assert.equal(us.status, 409); assert.equal(us.body.error, 'merch-country-off');
  const inQ = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address('IN') });
  assert.equal(inQ.body.quote.total, 859); assert.equal(inQ.body.quote.currency, 'INR');
  await e.db.patch('merch_countries/US', { enabled: true });
  const usQ = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address('US') });
  assert.equal(usQ.status, 200); assert.equal(usQ.body.quote.currency, 'USD'); assert.equal(usQ.body.quote.total, 30); assert.equal(usQ.body.quote.taxIncluded, false);
  assert.equal(usQ.body.providerId, 'mock');
  const unknown = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address('DE') });
  assert.equal(unknown.body.error, 'merch-country-off');
});
await test('collections switch independently per country', async () => {
  const e = makeEnv();
  await e.db.patch('merch_countries/IN', { collections: { name_elements: true, blood_group: false } });
  const bg = await handleMerch(e.ctx, 'quote', { items: [{ productId: 'tshirt', collection: 'blood_group', color: 'white', size: 'M', qty: 1, design: { bloodGroup: 'O+', confirmed: true } }], address: address() });
  assert.equal(bg.body.error, 'merch-collection-off');
  const ne = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  assert.equal(ne.status, 200);
  await e.db.patch('merch_countries/IN', { collections: { name_elements: false, blood_group: true } });
  const bg2 = await handleMerch(e.ctx, 'quote', { items: [{ productId: 'tshirt', collection: 'blood_group', color: 'white', size: 'M', qty: 1, design: { bloodGroup: 'O+', confirmed: true } }], address: address() });
  assert.equal(bg2.status, 200);
});
await test('quote cannot be reused or used by another account; expired quote refused', async () => {
  let t = Date.now();
  const e = makeEnv({ now: () => new Date(t) });
  const q = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  const other = makeEnv({ db: e.db, who: { uid: 'u2', email: 'u2@x.test', emailVerified: true } });
  assert.equal((await handleMerch(other.ctx, 'checkout', { quoteId: q.body.quoteId })).status, 404);
  const first = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId });
  assert.equal(first.status, 200);
  assert.equal((await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId })).body.error, 'quote-used');
  const q2 = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  t += 16 * 60 * 1000;
  assert.equal((await handleMerch(e.ctx, 'checkout', { quoteId: q2.body.quoteId })).body.error, 'quote-expired');
});
await test('a price change between quote and payment is caught (quote-changed)', async () => {
  const e = makeEnv();
  const q = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  await e.db.patch('merch_countries/IN', { prices: { tshirt: 999, mug: 399, notebook: 299, poster: 899 } });
  assert.equal((await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId })).body.error, 'quote-changed');
});
await test('blood-group order uses the fixed approved artwork reference and is never exposed to the ambassador commission row', async () => {
  const e = makeEnv();
  const q = await handleMerch(e.ctx, 'quote', { items: [{ productId: 'mug', collection: 'blood_group', color: 'white', size: '11oz', qty: 1, design: { bloodGroup: 'AB-', confirmed: true } }], address: address() });
  assert.equal(q.status, 200);
  const c = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId });
  assert.equal(c.status, 200);
  assert.deepEqual(c.body.needsArtwork, [0]); // the browser composites the approved master at the customer's position
  const o = (await e.db.get(`merch_orders/${c.body.orderId}`)).data;
  assert.match(o.items[0].sourceAsset.path, /^\/merch\/blood\/ab-neg\.v1\./); assert.equal(o.items[0].sourceAsset.sha256.length, 64);
  assert.equal((await withArtwork(e, c.body.orderId)).status, 200);
  await handleMerch(e.ctx, 'verify', { orderId: c.body.orderId, proof: {} });
  const com = (await e.db.get(`merch_commissions/${c.body.orderId}`));
  if (com) { const s = JSON.stringify(com.data); assert.ok(!s.includes('AB-') && !s.includes('411001') && !s.includes('9999999999')); }
});

console.log('Integration: payments, webhooks, providers');
await test('webhook replay: exactly one paid order and one fulfilment job', async () => {
  const e = makeEnv();
  const { orderId, total } = await placeOrder(e);
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  const evt = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9', order_id: order.gatewayOrderId, amount: Math.round(total * 100) } } } };
  const a = await handlePaymentWebhook(e.ctx, { eventId: 'evt_1', event: evt });
  const b = await handlePaymentWebhook(e.ctx, { eventId: 'evt_1', event: evt });
  const c = await handlePaymentWebhook(e.ctx, { eventId: 'evt_2', event: evt }); // same payment, new event id
  assert.equal(a.status, 200); assert.equal(b.body.duplicate, true); assert.equal(c.body.duplicate, true);
  assert.equal((await e.db.list('merch_fulfillments')).length, 1);
  assert.equal(e.mock.submitCalls, 1);
  assert.equal((await e.db.list('merch_commissions')).length, 1);
  // verify racing the webhook does not pay or submit again
  const v = await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  assert.equal(v.body.already, true);
  assert.equal(e.mock.submitCalls, 1);
});
await test('webhook with the wrong amount does not mark the order paid', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  const evt = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9', order_id: order.gatewayOrderId, amount: 100 } } } };
  const r = await handlePaymentWebhook(e.ctx, { eventId: 'evt_x', event: evt });
  assert.equal(r.status, 400);
  assert.equal((await e.db.get(`merch_orders/${orderId}`)).data.status, 'payment_pending');
});
await test('failed gateway verification leaves the order unpaid', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  e.gw.verifyResult = { error: 'Payment could not be verified', status: 400 };
  assert.equal((await handleMerch(e.ctx, 'verify', { orderId, proof: {} })).status, 400);
  assert.equal((await e.db.get(`merch_orders/${orderId}`)).data.status, 'payment_pending');
  assert.equal((await e.db.list('merch_fulfillments')).length, 0);
});
await test('provider timeout: paid order is queued, retried with back-off, never lost; duplicate-safe', async () => {
  let t = Date.now();
  const e = makeEnv({ now: () => new Date(t) });
  const { orderId } = await placeOrder(e);
  e.mock.failNext('timeout', 2);
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  let order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'fulfillment_pending');
  assert.equal((await e.db.get(`merch_fulfillments/${orderId}`)).data.attempts, 1);
  assert.equal((await retryDue(e.ctx)).length, 0); // not due yet
  t += 3 * 60 * 1000;
  await retryDue(e.ctx); // second timeout
  t += 10 * 60 * 1000;
  const done = await retryDue(e.ctx);
  assert.ok(done[0].submitted);
  assert.equal((await e.db.get(`merch_orders/${orderId}`)).data.status, 'submitted');
  assert.equal(e.mock.orders.size, 1);
});
await test('provider keeps failing: order moves to the exception queue with an alert', async () => {
  let t = Date.now();
  const e = makeEnv({ now: () => new Date(t) });
  const { orderId } = await placeOrder(e);
  e.mock.failNext('timeout', 10);
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  for (let i = 0; i < 6; i++) { t += 2 * 60 * 60 * 1000; await retryDue(e.ctx); }
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'exception');
  assert.ok((await e.db.list('merch_audit_logs')).some((l) => l.action === 'alert.paid-not-submitted'));
});
await test('non-retryable provider rejection goes straight to exception', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  e.mock.failNext('reject');
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  assert.equal((await e.db.get(`merch_orders/${orderId}`)).data.status, 'exception');
});
await test('provider disabled: no NEW routing, existing paid order stays manageable (reroute to backup)', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  await e.db.patch('merch_providers/mock', { active: false });
  const newQ = await handleMerch(e.ctx, 'quote', { items: [tshirtItem()], address: address() });
  assert.equal(newQ.body.providerId, 'mock2'); // new orders route to the backup
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  let order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'exception'); assert.equal(order.exceptionReason, 'provider-disabled');
  const admin = makeEnv({ db: e.db, who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  admin.ctx.providerFor = e.ctx.providerFor;
  const r = await handleAdmin(admin.ctx, { action: 'reroute', data: { orderId, providerId: 'mock2' } });
  assert.equal(r.status, 200);
  order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'submitted'); assert.equal(order.providerId, 'mock2');
  assert.equal(e.mock.submitCalls, 0);
});
await test('provider webhook: signed, deduplicated, moves the order forward only; tracking stored', async () => {
  const e = makeEnv();
  const { orderId } = await placeOrder(e);
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  const ff = (await e.db.get(`merch_fulfillments/${orderId}`)).data;
  const body = (id, status, tracking) => JSON.stringify({ id, providerOrderId: ff.providerOrderId, status, tracking });
  const hdr = { 'x-mock-signature': 'mock-webhook-secret' };
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', { 'x-mock-signature': 'bad' }, body('e1', 'processing'))).status, 401);
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', hdr, body('e1', 'processing'))).body.state, 'in_production');
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', hdr, body('e1', 'processing'))).body.duplicate, true);
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', hdr, body('e2', 'shipped', { carrier: 'X', number: '1' }))).body.state, 'shipped');
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', hdr, body('e3', 'processing'))).body.ignored, 'not-forward');
  assert.equal((await handleProviderWebhook(e.ctx, 'mock', hdr, body('e4', 'delivered'))).body.state, 'delivered');
  const order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.tracking.number, '1');
  assert.deepEqual(order.timeline.map((t) => t.state), ['payment_pending', 'paid', 'fulfillment_pending', 'submitted', 'in_production', 'shipped', 'delivered']);
});

console.log('Integration: refunds and merchandise commission');
await test('commission: pending at payment, eligible only after delivery + hold, payable/paid by admin', async () => {
  let t = Date.now();
  const e = makeEnv({ now: () => new Date(t) });
  const { orderId } = await placeOrder(e);
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  const c0 = (await e.db.get(`merch_commissions/${orderId}`)).data;
  assert.equal(c0.status, 'pending'); assert.ok(c0.amount > 0); assert.equal(c0.ambassadorEmail, 'amb@x.test');
  assert.deepEqual(await sweepCommissions(e.ctx), []);
  const ff = (await e.db.get(`merch_fulfillments/${orderId}`)).data;
  await applyProviderStatus(e.ctx, orderId, { status: 'shipped' });
  await applyProviderStatus(e.ctx, orderId, { status: 'delivered' });
  assert.deepEqual(await sweepCommissions(e.ctx), []); // inside the hold window
  t += 15 * 86400000;
  assert.deepEqual(await sweepCommissions(e.ctx), [orderId]);
  const admin = makeEnv({ db: e.db, who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  assert.equal((await handleAdmin(admin.ctx, { action: 'commissionStatus', data: { id: orderId, status: 'paid' } })).status, 409);
  assert.equal((await handleAdmin(admin.ctx, { action: 'commissionStatus', data: { id: orderId, status: 'payable' } })).status, 200);
  assert.equal((await handleAdmin(admin.ctx, { action: 'commissionStatus', data: { id: orderId, status: 'paid' } })).status, 200);
});
await test('refund reconciles the order and the commission ledger (partial then full)', async () => {
  const e = makeEnv();
  const { orderId, total } = await placeOrder(e);
  await handleMerch(e.ctx, 'verify', { orderId, proof: {} });
  const admin = makeEnv({ db: e.db, who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  admin.ctx.providerFor = e.ctx.providerFor; admin.ctx.gateways = e.ctx.gateways;
  const c0 = (await e.db.get(`merch_commissions/${orderId}`)).data;
  const half = Math.round(total / 2 * 100) / 100;
  let r = await handleAdmin(admin.ctx, { action: 'refund', data: { orderId, amount: half, reason: 'partial' } });
  assert.equal(r.status, 200);
  let order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.refundedAmount, half); assert.notEqual(order.status, 'refunded');
  let c1 = (await e.db.get(`merch_commissions/${orderId}`)).data;
  assert.ok(Math.abs(c1.reversedAmount - c0.amount / 2) < 0.011, `${c1.reversedAmount} vs ${c0.amount / 2}`);
  assert.equal((await handleAdmin(admin.ctx, { action: 'refund', data: { orderId, amount: total } })).body.error, 'bad-refund-amount');
  r = await handleAdmin(admin.ctx, { action: 'refund', data: { orderId, reason: 'rest' } });
  order = (await e.db.get(`merch_orders/${orderId}`)).data;
  assert.equal(order.status, 'refunded'); assert.equal(order.refundedAmount, total);
  c1 = (await e.db.get(`merch_commissions/${orderId}`)).data;
  assert.equal(c1.status, 'reversed'); assert.equal(c1.reversedAmount, c0.amount);
  assert.equal(e.gw.refunds.length, 2);
  assert.equal([...e.mock.orders.values()][0].status, 'cancelled'); // provider production stopped
});

console.log('Integration: admin and authorisation');
await test('unauthorised admin change is rejected server-side and nothing is written', async () => {
  const e = makeEnv();
  const r = await handleAdmin(e.ctx, { action: 'setGlobal', data: { enabled: false } });
  assert.equal(r.status, 403);
  assert.equal((await e.db.get('merch_settings/global')).data.enabled, true);
  const unverified = makeEnv({ db: e.db, who: { uid: 'adm', email: 'admin@x.test', emailVerified: false } });
  assert.equal((await handleAdmin(unverified.ctx, { action: 'setCountry', data: { countryCode: 'US', enabled: true, currency: 'USD' } })).status, 403);
  assert.equal((await e.db.get('merch_countries/US')).data.enabled, false);
  const anon = makeEnv({ db: e.db, who: null });
  assert.equal((await handleAdmin(anon.ctx, { action: 'setGlobal', data: {} })).status, 401);
});
await test('admin changes are applied and every one is audited with before/after', async () => {
  const e = makeEnv({ who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  assert.equal((await handleAdmin(e.ctx, { action: 'setGlobal', data: { enabled: false, message: 'Paused' } })).status, 200);
  assert.equal((await handleAdmin(e.ctx, { action: 'setCountry', data: { countryCode: 'DE', enabled: false, currency: 'EUR', prices: { tshirt: 25 } } })).status, 200);
  assert.equal((await e.db.get('merch_countries/DE')).data.enabled, false);
  assert.equal((await handleAdmin(e.ctx, { action: 'setCountry', data: { countryCode: 'DE', enabled: true } })).body.error, 'currency-required');
  const logs = await e.db.list('merch_audit_logs');
  assert.equal(logs.length, 2);
  assert.equal(logs[0].actor, 'admin@x.test');
  assert.ok(logs.find((l) => l.action === 'admin.setGlobal').detail.before.enabled === true);
});
await test('new countries stay disabled by default', async () => {
  const e = makeEnv({ who: { uid: 'adm', email: 'admin@x.test', emailVerified: true } });
  await handleAdmin(e.ctx, { action: 'setCountry', data: { countryCode: 'FR', currency: 'EUR', prices: { tshirt: 25 }, collections: { name_elements: true } } });
  assert.equal((await e.db.get('merch_countries/FR')).data.enabled, false);
});

console.log('Server adapter (Firestore REST fake) and print artwork');
await test('REST adapter round-trips nested orders (maps, arrays, dates), enforces updateTime, and queries by field', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const { firestore } = await import('../functions/_lib/server.js');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const env = { FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'p', client_email: 'x@p.iam', private_key: privateKey }) };
  const docs = new Map(); const times = new Map(); let tick = 0;
  const dec = (v) => ('stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? v.timestampValue : 'nullValue' in v ? null : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : (v.arrayValue.values || []).map(dec));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); const res = (o, st = 200) => new Response(JSON.stringify(o), { status: st });
    if (url.includes('oauth2.googleapis.com')) return res({ access_token: 't' });
    const body = init.body ? JSON.parse(init.body) : null;
    if (url.endsWith(':runQuery')) {
      const f = body.structuredQuery.where.fieldFilter; const want = dec(f.value);
      return res([...docs.entries()].filter(([k, v]) => k.startsWith(body.structuredQuery.from[0].collectionId + '/') && dec({ mapValue: { fields: v } })[f.field.fieldPath] === want).map(([k, v]) => ({ document: { name: k, fields: v } })));
    }
    const m = url.match(/documents\/([^?]*)(\?(.*))?$/); const path = decodeURIComponent(m[1]); const qs = new URLSearchParams(m[3] || '');
    if (init.method === 'POST') { const full = path + '/' + qs.get('documentId'); if (docs.has(full)) return res({}, 409); docs.set(full, body.fields); times.set(full, 't' + ++tick); return res({}); }
    if (init.method === 'PATCH') { const pre = qs.get('currentDocument.updateTime'); if (pre && times.get(path) !== pre) return res({}, 409); docs.set(path, { ...(docs.get(path) || {}), ...body.fields }); times.set(path, 't' + ++tick); return res({}); }
    return docs.has(path) ? res({ fields: docs.get(path), updateTime: times.get(path) }) : res({}, 404);
  };
  try {
    const db = await firestore(env);
    const order = { id: 'o1', status: 'paid', items: [{ design: { elements: [{ symbol: 'V', atomicNumber: 23 }] }, qty: 2 }], totals: { total: 859, tax: 131.03 }, timeline: [{ state: 'paid', at: new Date('2026-11-23T10:00:00Z') }], empty: [], flag: true, none: null };
    await db.create('merch_orders', 'o1', order);
    const back = (await db.get('merch_orders/o1')).data;
    assert.deepEqual(back.items, order.items); assert.deepEqual(back.totals, order.totals); assert.equal(back.timeline[0].state, 'paid'); assert.deepEqual(back.empty, []); assert.equal(back.none, null);
    const first = await db.get('merch_orders/o1');
    await db.patch('merch_orders/o1', { status: 'submitted' }, { ifUpdateTime: first.updateTime });
    await assert.rejects(db.patch('merch_orders/o1', { status: 'x' }, { ifUpdateTime: first.updateTime })); // stale precondition loses
    assert.equal((await db.query('merch_orders', 'status', 'submitted')).length, 1);
    assert.equal((await db.query('merch_orders', 'status', 'paid')).length, 0);
    await assert.rejects(db.create('merch_orders', 'o1', order)); // second create of the same id fails
  } finally { globalThis.fetch = realFetch; }
});
await test('print artwork comes from the same design: symbols only, escaped name, transparent, print-area sized', async () => {
  const { printSvg, productPreviewSvg } = await import('../src/merch/render.js');
  const { design } = buildNameElementsDesign('Vibes');
  const svg = printSvg(design, { width: 3600, height: 4800 }, { ink: '#FFFFFF' });
  assert.match(svg, /width="3600" height="4800"/);
  for (const sym of ['V', 'I', 'Be', 'S']) assert.ok(svg.includes('>' + sym + '</text>'), sym);
  assert.ok(!svg.includes('<rect width="3600"')); // no opaque background
  const evil = productPreviewSvg({ kind: 'apparel' }, '#FFFFFF', { ...design, name: '<script>x</script>' });
  assert.ok(!evil.includes('<script>'));
  const bg = printSvg({ collection: 'blood_group', bloodGroup: 'O+' }, { width: 1500, height: 1500 }, {});
  assert.match(bg, /\/merch\/blood\/o-pos\.v1\./);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
