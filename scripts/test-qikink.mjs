// Qikink adapter tests against a FAKE Qikink server built from the documented API (no network).
// Usage: node scripts/test-qikink.mjs      (npm run test:qikink)
// Nothing here proves the real service behaves this way: see docs/qikink-adapter.md for what is unverified.
import assert from 'node:assert/strict';
import { createMemoryDb } from '../src/merch/memoryDb.js';
import {
  QikinkAdapter, QIKINK_RATE_LIMIT, QIKINK_STATUS_MAP, mapQikinkStatus, qikinkOrderNumber, isValidOrderNumber, buildOrderPayload, unknownFields, buildShippingAddress
} from '../src/merch/providers/qikink.js';
import { handleMerch, retryDue, syncTracking, runFulfilment } from '../src/merch/engine.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); } };

// ---- fake Qikink ----------------------------------------------------------------------------------------
function fakeQikink() {
  const s = { tokens: 0, token: null, creates: 0, lists: 0, orders: [], failCreate: [], listDisabled: false, ttl: 3600, delay: false, calls: [] };
  const res = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  s.fetch = async (url, init = {}) => {
    const u = new URL(String(url)); s.calls.push(`${init.method || 'GET'} ${u.pathname}`);
    if (u.pathname === '/api/token') {
      const p = new URLSearchParams(init.body);
      if (p.get('ClientId') !== 'cid' || p.get('client_secret') !== 'sec') return res({ error: 'bad credentials' }, 401);
      s.tokens++; s.token = `T${s.tokens}`; // every request OVERWRITES the previous token
      return res({ ClientId: 'cid', Accesstoken: s.token, expires_in: s.ttl });
    }
    const h = init.headers || {};
    if (h.Accesstoken !== s.token || h.ClientId !== 'cid') return res({ error: 'Unauthorized' }, 401);
    if (u.pathname === '/api/order/create') {
      s.creates++;
      const fail = s.failCreate.shift();
      const body = JSON.parse(init.body);
      const store = () => { const o = { order_id: 5000 + s.orders.length, number: `cid_${body.order_number}`, status: 'Live', shipping: {}, created_on: '2026-11-24' }; s.orders.push(o); return o; };
      if (fail === 'rate') return res({ error: 'Rate limit exceeded. Try again later.' }, 429);
      if (fail === '500-after-store') { store(); return res({ error: 'upstream' }, 500); }
      if (fail === '500') return res({ error: 'upstream' }, 500);
      const bad = unknownFields(body);
      if (bad.length) return res({ error: `Unexpected fields: ${bad.join(',')}`, status_code: '400' }, 400);
      if (fail === '400') return res({ error: 'Invalid province', status_code: '400' }, 400);
      if (s.orders.some((o) => o.number === `cid_${body.order_number}`)) return res({ error: 'order_number already exists', status_code: '400' }, 400);
      const o = store();
      return res({ message: 'Order created successfully', order_id: o.order_id, status_code: '200' });
    }
    if (u.pathname === '/api/order/list') {
      s.lists++;
      if (s.listDisabled) return res({ error: 'Not available in sandbox' }, 500);
      const q = u.searchParams; let rows = s.orders;
      if (q.get('order_reference_no')) { const r = q.get('order_reference_no').replace(/^cid_/, ''); rows = rows.filter((o) => o.number === `cid_${r}`); }
      if (q.get('id')) rows = rows.filter((o) => String(o.order_id) === q.get('id'));
      if (q.get('ids')) { const ids = q.get('ids').split(','); rows = rows.filter((o) => ids.includes(String(o.order_id))); }
      const page = Number(q.get('page_no') || 1);
      return res({ success: true, data: rows.slice((page - 1) * 10, page * 10), pagination: { total_pages: Math.max(1, Math.ceil(rows.length / 10)), page_no: page }, filters: {} });
    }
    return res({ error: 'not found' }, 404);
  };
  return s;
}
const clock = () => { const c = { t: 1_000_000, slept: [] }; c.now = () => c.t; c.sleep = async (ms) => { c.slept.push(ms); c.t += ms; }; return c; };
const adapterFor = (q, c = clock(), env = 'sandbox') => new QikinkAdapter('qikink', { clientId: 'cid', clientSecret: 'sec', env, fetch: q.fetch, now: c.now, sleep: c.sleep });

// ---- fixtures -------------------------------------------------------------------------------------------
const address = { name: 'Asha Rao', phone: '9999999999', line1: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' };
const mapping = { sku: 'REAL-SKU-TBD', printTypeId: 1, placementSku: 'fr', widthInches: 12, heightInches: 16 };
const item = (o = {}) => ({ index: 0, qty: 1, unitPrice: 799, designUrl: 'https://art.test/a.png', designSha256: 'ab'.repeat(32), providerSku: mapping, ...o });
const order = (o = {}) => ({ orderId: 'abcdef0123456789abcd', address, email: 'a@x.test', totalValue: 859, items: [item()], ...o });

console.log('Order number');
await test('<= 15 chars, [a-z0-9_] only, deterministic, unique per order', () => {
  const ids = ['abcdef0123456789abcd', 'abcdef0123456789abce', 'ID-With Caps_1', 'short'];
  const nums = ids.map(qikinkOrderNumber);
  nums.forEach((n) => assert.ok(isValidOrderNumber(n), n));
  assert.equal(qikinkOrderNumber(ids[0]), qikinkOrderNumber(ids[0]));
  assert.notEqual(nums[0], nums[1]);
  assert.equal(nums[3], 'short');
  assert.equal(new Set(Array.from({ length: 500 }, (_, i) => qikinkOrderNumber(`${i.toString(16).padStart(4, '0')}${'f'.repeat(16)}`))).size, 500);
  assert.throws(() => qikinkOrderNumber('!!!'));
});

console.log('Payload builder');
await test('uses only documented field names (design_link / mockup_link) at every level', () => {
  const { payload, error } = buildOrderPayload(order());
  assert.equal(error, undefined);
  assert.deepEqual(unknownFields(payload), []);
  assert.equal(payload.gateway, 'Prepaid'); assert.equal(payload.qikink_shipping, 1); assert.equal(payload.total_order_value, 859);
  const l = payload.line_items[0];
  assert.equal(l.search_from_my_products, 0); assert.equal(l.print_type_id, 1); assert.equal(l.sku, 'REAL-SKU-TBD'); assert.equal(l.price, 799);
  const d = l.designs[0];
  assert.equal(d.design_link, 'https://art.test/a.png'); assert.equal(d.mockup_link, 'https://art.test/a.png');
  assert.equal(d.placement_sku, 'fr'); assert.ok(d.design_code.length <= 20); assert.equal(d.width_inches, 12);
  assert.ok(!('design_url' in d) && !('mockup_url' in d));
  assert.deepEqual(unknownFields({ ...payload, extra: 1 }), ['order.extra']);
});
await test('DTG max 16x20 in, DTF max 18x20 in', () => {
  const big = (printTypeId, w, h) => buildOrderPayload(order({ items: [item({ providerSku: { ...mapping, printTypeId, widthInches: w, heightInches: h } })] }));
  assert.equal(big(1, 16, 20).error, undefined);
  assert.equal(big(1, 16.5, 20).error, 'design-too-large');
  assert.equal(big(1, 12, 21).error, 'design-too-large');
  assert.equal(big(17, 18, 20).error, undefined);
  assert.equal(big(17, 18.5, 20).error, 'design-too-large');
  assert.equal(big(99, 5, 5).error, 'print-type-invalid');
});
await test('size falls back to the product print area at 300 DPI; missing size is an error', () => {
  const noInches = { sku: 'S', printTypeId: 1, placementSku: 'fr' };
  assert.equal(buildOrderPayload(order({ items: [item({ providerSku: noInches, printAreaPx: { width: 3600, height: 4800 } })] })).payload.line_items[0].designs[0].width_inches, 12);
  assert.equal(buildOrderPayload(order({ items: [item({ providerSku: noInches })] })).error, 'design-size-missing');
});
await test('plain (non-printed) product: print_type_id 1 and no designs; incomplete SKU mapping is refused', () => {
  const p = buildOrderPayload(order({ items: [item({ providerSku: { sku: 'PLAIN', printTypeId: 1, plain: true }, designUrl: null })] })).payload;
  assert.equal(p.line_items[0].print_type_id, 1); assert.deepEqual(p.line_items[0].designs, []);
  assert.equal(buildOrderPayload(order({ items: [item({ providerSku: 'just-a-string' })] })).error, 'sku-mapping-incomplete');
  assert.equal(buildOrderPayload(order({ items: [item({ providerSku: null })] })).error, 'sku-mapping-incomplete');
  assert.equal(buildOrderPayload(order({ items: [item({ qty: 101 })] })).error, 'bad-quantity');
  assert.equal(buildOrderPayload(order({ items: [item({ providerSku: { ...mapping, placementSku: 'xx' } })] })).error, 'placement-invalid');
  assert.equal(buildOrderPayload(order({ items: [item({ designUrl: `https://a.test/${'x'.repeat(520)}` })] })).error, 'design-link-invalid');
});
await test('shipping address: state name or code normalised, zip numeric, long address1 overflows to address2, India only', () => {
  const a = buildShippingAddress({ ...address, state: 'mh', name: 'Asha  Devi Rao' }, 'a@x.test').address;
  assert.equal(a.province, 'Maharashtra'); assert.equal(a.first_name, 'Asha'); assert.equal(a.last_name, 'Devi Rao'); assert.equal(a.country_code, 'IN'); assert.equal(a.zip, '411001');
  assert.equal(buildShippingAddress({ ...address, state: 'Maharastra' }, 'a@x.test').error, 'address-province-invalid');
  assert.equal(buildShippingAddress({ ...address, postalCode: 'SW1A 1AA' }, 'a@x.test').error, 'address-zip-invalid');
  assert.equal(buildShippingAddress(address, '').error, 'address-email-missing');
  const long = buildShippingAddress({ ...address, line1: 'Flat 4B, Sunrise Apartments, Near The Old Water Tank Behind The Municipal Primary School, Off Main Road', line2: 'Landmark' }, 'a@x.test').address;
  assert.ok(long.address1.length <= 90); assert.ok(long.address2.endsWith('Landmark')); assert.ok(`${long.address1} ${long.address2}`.includes('Municipal'));
  assert.equal(buildOrderPayload(order({ address: { ...address, country: 'US' } })).error, 'unsupported-country');
  assert.equal(unknownFields(buildOrderPayload(order()).payload.shipping_address ? buildOrderPayload(order()).payload : {}).length, 0);
});

console.log('Status mapping');
await test('every documented status is mapped or deliberately unmapped; unknown text is "unmapped"', () => {
  const documented = ['Archived', 'Cancelled', 'Consignee unavailable', 'Delivered', 'Delivery rescheduled', 'Dispatch Ready', 'Exception', 'In-Transit', 'Incorrect/incomplete Address', 'Live', 'Live-OOS', 'Lost', 'Manifested', 'Maximum attempts reached', 'Misrouted', 'No-Data', 'Not attempted', 'ODA', 'On Hold', 'Open delivery refused', 'OTP not shared', 'OTP verification cancelled', 'Out for Delivery', 'Out Of Stock', 'Partially Printed', 'Partially Returned', 'Partitally Picklisted', 'PIcked Up', 'Printed', 'Refused to accept', 'Residence / office closed', 'Returned', 'Reverse Pickup Initiated', 'RTO Initiated', 'S-Printed', 'Self collect', 'Stitched/QC', 'To be Printed'];
  const deliberatelyUnmapped = ['Archived', 'No-Data', 'Self collect'];
  for (const s of documented) assert.equal(mapQikinkStatus(s).unmapped === true, deliberatelyUnmapped.includes(s), s);
  assert.equal(mapQikinkStatus('Live').status, 'processing'); assert.equal(mapQikinkStatus('Printed').status, 'processing');
  assert.equal(mapQikinkStatus('In-Transit').status, 'shipped'); assert.equal(mapQikinkStatus('PIcked Up').status, 'shipped');
  assert.equal(mapQikinkStatus('Delivered').status, 'delivered'); assert.equal(mapQikinkStatus('Cancelled').status, 'cancelled');
  assert.equal(mapQikinkStatus('RTO Initiated').status, 'failed'); assert.equal(mapQikinkStatus('Out Of Stock').status, 'failed');
  assert.equal(mapQikinkStatus('  in-transit ').status, 'shipped');
  const u = mapQikinkStatus('Teleported'); assert.equal(u.status, null); assert.equal(u.unmapped, true); assert.equal(u.raw, 'Teleported');
  assert.ok(Object.keys(QIKINK_STATUS_MAP).length >= 35);
});

console.log('Token, rate limit, errors');
await test('token: one cached token, single-flight under concurrency, refreshed before expiry', async () => {
  const q = fakeQikink(); const c = clock(); const a = adapterFor(q, c);
  const got = await Promise.all(Array.from({ length: 8 }, () => a.accessToken()));
  assert.equal(q.tokens, 1); assert.equal(new Set(got).size, 1);
  await a.accessToken(); assert.equal(q.tokens, 1);
  c.t += 3600 * 1000 - 30_000; // inside the 60 s safety margin
  await a.accessToken(); assert.equal(q.tokens, 2);
});
await test('a 401 (token overwritten elsewhere) refreshes ONCE and retries once', async () => {
  const q = fakeQikink(); const a = adapterFor(q);
  await a.accessToken(); q.token = 'someone-else'; // another process fetched a token: ours is now invalid
  const r = await a.request('/api/order/list');
  assert.ok(r.ok); assert.equal(q.tokens, 2);
  const bad = new QikinkAdapter('qikink', { clientId: 'cid', clientSecret: 'wrong', fetch: q.fetch, now: () => 0, sleep: async () => {} });
  const rb = await bad.request('/api/order/list');
  assert.equal(rb.ok, false); assert.equal(rb.retryable, false);
});
await test('rate limiter never exceeds the configured requests per minute; documented limit is 60', async () => {
  assert.ok(QIKINK_RATE_LIMIT.max <= 60);
  const q = fakeQikink(); const c = clock(); const a = adapterFor(q, c);
  const stamps = []; const origFetch = q.fetch; q.fetch = async (...x) => { stamps.push(c.t); return origFetch(...x); }; a.fetch = q.fetch;
  for (let i = 0; i < 130; i++) assert.ok((await a.request('/api/order/list')).ok);
  for (const t of stamps) assert.ok(stamps.filter((x) => x <= t && x > t - QIKINK_RATE_LIMIT.perMs).length <= QIKINK_RATE_LIMIT.max, 'window exceeded');
  assert.ok(c.slept.length > 0);
});
await test('rate-limit response backs off and retries (bounded); it never loops forever', async () => {
  const q = fakeQikink(); const c = clock(); const a = adapterFor(q, c);
  q.failCreate = ['rate', 'rate'];
  const r = await a.submitOrder({ ...order(), attempt: 1 });
  assert.ok(r.ok); assert.equal(q.creates, 3); assert.deepEqual(c.slept.slice(0, 2), [1000, 2000]);
  q.failCreate = Array(10).fill('rate');
  const r2 = await a.submitOrder({ ...order({ orderId: 'zzzz0000111122223333' }), attempt: 1 });
  assert.equal(r2.ok, false); assert.equal(r2.retryable, true); assert.ok(q.creates <= 3 + 4);
});
const buildAndSubmitBad = (a) => a.submitOrder({ ...order({ address: { ...address, state: 'Narnia' } }), attempt: 1 });
await test('400 validation errors are permanent; 5xx/network are retryable AND not blindly re-sent', async () => {
  const q = fakeQikink(); const a = adapterFor(q);
  q.failCreate = ['400'];
  const r = await a.submitOrder({ ...order(), attempt: 1 });
  assert.equal(r.ok, false); assert.equal(r.retryable, false); assert.match(r.error, /Invalid province/);
  assert.equal(q.creates, 1);
  q.creates = 0; q.failCreate = ['500'];
  const r2 = await a.submitOrder({ ...order({ orderId: 'bbbb0000111122223333' }), attempt: 1 });
  assert.equal(r2.ok, false); assert.equal(r2.retryable, true); assert.equal(q.creates, 1, 'create must not be auto-retried');
  const down = new QikinkAdapter('qikink', { clientId: 'cid', clientSecret: 'sec', fetch: async (u) => { if (String(u).includes('/token')) return new Response(JSON.stringify({ Accesstoken: 'T', expires_in: 3600 })); throw new Error('network'); }, now: () => 0, sleep: async () => {} });
  const r3 = await down.submitOrder({ ...order(), attempt: 1 });
  assert.equal(r3.ok, false); assert.equal(r3.retryable, true);
  assert.equal((await buildAndSubmitBad(a)).error, 'address-province-invalid');
});
await test('not documented: cancel, webhook and quote are explicit "unsupported"; capabilities are India only', async () => {
  const a = adapterFor(fakeQikink());
  assert.equal((await a.cancelOrder('1')).unsupported, true);
  assert.equal((await a.verifyWebhook({}, '{}')).unsupported, true);
  const quote = await a.getQuote({}); assert.equal(quote.unsupported, true); assert.equal(quote.source, 'configured');
  assert.equal((await a.getCapabilities('IN')).ok, true);
  assert.equal((await a.getCapabilities('US')).ok, false);
});

console.log('Integration with the engine (fake Qikink)');
function engineEnv({ env = 'sandbox', q = fakeQikink(), clk = clock() } = {}) {
  const db = createMemoryDb({
    'merch_settings/global': { enabled: true },
    'merch_countries/IN': { countryCode: 'IN', enabled: true, currency: 'INR', taxPercent: 18, taxIncluded: true, collections: { name_elements: true, blood_group: true }, prices: { tshirt: 799 }, costs: { tshirt: 420 }, shipping: { flat: 60 }, providerPrimary: 'qikink' },
    'merch_providers/qikink': { id: 'qikink', adapter: 'qikink', active: true, countries: ['IN'] },
    'merch_variants/tshirt_white_M': { id: 'tshirt_white_M', providerSkus: { qikink: mapping } },
    'admins/admin@x.test': { role: 'super' }, 'users/u1': { email: 'u1@x.test', countryCode: 'IN' }, 'paymentSettings/razorpay': {}
  });
  let n = 0; const adapter = adapterFor(q, clk, env);
  const ctx = {
    db, env: {}, who: { uid: 'u1', email: 'u1@x.test', emailVerified: true }, now: () => new Date(clk.now()), id: () => `eid${++n}x${Math.random().toString(36).slice(2, 8)}`,
    providerFor: () => adapter, artworkUrl: async (o, i) => `https://art.test/${i.artwork.path}`,
    gateways: { async create(o) { return { orderId: `gw_${o.id}`, client: {} }; }, async verify() { return { transactionId: 'pay_1' }; }, async checkCaptured() { return {}; }, async refund() { return { ok: true }; } }
  };
  return { ctx, db, q, clk, adapter };
}
async function pay(e) {
  const qt = await handleMerch(e.ctx, 'quote', { items: [{ productId: 'tshirt', collection: 'name_elements', color: 'white', size: 'M', qty: 1, design: { name: 'Vibes' } }], address: { name: 'Asha Rao', phone: '9999999999', line1: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' } });
  assert.equal(qt.status, 200, JSON.stringify(qt.body));
  const co = await handleMerch(e.ctx, 'checkout', { quoteId: qt.body.quoteId }); assert.equal(co.status, 200, JSON.stringify(co.body));
  const id = co.body.orderId;
  await handleMerch(e.ctx, 'artwork', { orderId: id, items: [{ index: 0, sha256: 'c'.repeat(64), path: `merch/print/u1/${id}/0.png`, width: 3600, height: 4800 }] });
  await handleMerch(e.ctx, 'verify', { orderId: id, proof: {} });
  return id;
}
await test('happy path: exactly one Qikink order, provider id + order number stored, quote marked "configured"', async () => {
  const e = engineEnv(); const id = await pay(e);
  const o = (await e.db.get(`merch_orders/${id}`)).data; const ff = (await e.db.get(`merch_fulfillments/${id}`)).data;
  assert.equal(o.status, 'submitted'); assert.equal(e.q.orders.length, 1);
  assert.equal(ff.providerOrderId, String(e.q.orders[0].order_id)); assert.ok(isValidOrderNumber(ff.providerOrderNumber));
  assert.equal(e.q.orders[0].number, `cid_${ff.providerOrderNumber}`);
  assert.equal((await e.db.get(`merch_quotes/${o.quoteId}`)).data.totals.source, 'configured');
});
await test('ambiguous failure (Qikink stored the order but answered 500): the retry looks it up first, so there is still exactly one order (live)', async () => {
  const e = engineEnv({ env: 'live' }); e.q.failCreate = ['500-after-store'];
  const id = await pay(e);
  assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'fulfillment_pending');
  assert.equal(e.q.orders.length, 1);
  e.clk.t += 3 * 60 * 1000;
  const r = await retryDue(e.ctx);
  assert.ok(r[0].submitted, JSON.stringify(r));
  assert.equal(e.q.orders.length, 1, 'no duplicate order'); assert.equal(e.q.creates, 1, 'no second create call');
  assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'submitted');
});
await test('on live, if the lookup itself fails the retry is held back (no risk of a duplicate)', async () => {
  const e = engineEnv({ env: 'live' }); e.q.failCreate = ['500-after-store'];
  const id = await pay(e); e.q.listDisabled = true; e.clk.t += 3 * 60 * 1000;
  const r = await retryDue(e.ctx);
  assert.ok(r[0].queued, JSON.stringify(r)); assert.equal(e.q.creates, 1); assert.equal(e.q.orders.length, 1);
});
await test('sandbox: the list API is unavailable, so a retry proceeds without lookup (documented limitation)', async () => {
  const e = engineEnv({ env: 'sandbox' }); e.q.failCreate = ['500']; e.q.listDisabled = true;
  const id = await pay(e); e.clk.t += 3 * 60 * 1000;
  const r = await retryDue(e.ctx);
  assert.ok(r[0].submitted); assert.equal(e.q.orders.length, 1);
});
await test('a 400 from Qikink goes straight to the exception queue (no blind retry)', async () => {
  const e = engineEnv(); e.q.failCreate = ['400'];
  const id = await pay(e);
  const o = (await e.db.get(`merch_orders/${id}`)).data;
  assert.equal(o.status, 'exception'); assert.match(o.exceptionReason, /Invalid province/); assert.equal(e.q.creates, 1);
});
await test('an invalid state name is refused before anything is sent', async () => {
  const e = engineEnv();
  const qt = await handleMerch(e.ctx, 'quote', { items: [{ productId: 'tshirt', collection: 'name_elements', color: 'white', size: 'M', qty: 1, design: { name: 'Vibes' } }], address: { name: 'A B', phone: '1', line1: 'x', city: 'y', state: 'Narnia', postalCode: '411001', country: 'IN' } });
  const co = await handleMerch(e.ctx, 'checkout', { quoteId: qt.body.quoteId });
  await handleMerch(e.ctx, 'artwork', { orderId: co.body.orderId, items: [{ index: 0, sha256: 'c'.repeat(64), path: `merch/print/u1/${co.body.orderId}/0.png` }] });
  await handleMerch(e.ctx, 'verify', { orderId: co.body.orderId, proof: {} });
  assert.equal((await e.db.get(`merch_orders/${co.body.orderId}`)).data.exceptionReason, 'address-province-invalid');
  assert.equal(e.q.creates, 0);
});
await test('polling (fixtures): batched status sync moves the order forward, saves awb/tracking link/courier, never backwards', async () => {
  const e = engineEnv(); const id = await pay(e);
  const q = e.q.orders[0];
  q.status = 'Printed'; await syncTracking(e.ctx);
  assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'in_production');
  q.status = 'In-Transit'; q.shipping = { awb: 'AWB123', tracking_link: 'https://track.test/AWB123', courier_provider_name: 'Delhivery' };
  await syncTracking(e.ctx);
  let o = (await e.db.get(`merch_orders/${id}`)).data;
  assert.equal(o.status, 'shipped'); assert.deepEqual(o.tracking, { carrier: 'Delhivery', number: 'AWB123', url: 'https://track.test/AWB123' });
  assert.equal((await e.db.get(`merch_fulfillments/${id}`)).data.tracking.number, 'AWB123');
  q.status = 'Printed'; await syncTracking(e.ctx);
  assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'shipped');
  q.status = 'Delivered'; await syncTracking(e.ctx);
  o = (await e.db.get(`merch_orders/${id}`)).data;
  assert.equal(o.status, 'delivered'); assert.ok(o.deliveredAt);
  assert.deepEqual(o.timeline.map((t) => t.state), ['payment_pending', 'paid', 'fulfillment_pending', 'submitted', 'in_production', 'shipped', 'delivered']);
});
await test('polling: 25 open orders are fetched in batches of 10 per call', async () => {
  const e = engineEnv(); const ids = [];
  for (let i = 0; i < 12; i++) ids.push(await pay(e));
  e.q.lists = 0;
  const r = await e.adapter.getOrderStatuses(e.q.orders.map((o) => String(o.order_id)));
  assert.ok(r.ok); assert.equal(Object.keys(r.orders).length, 12); assert.equal(e.q.lists, 2);
});
await test('an unmapped status changes nothing, keeps the raw text and alerts admin once (not on every poll)', async () => {
  const e = engineEnv(); const id = await pay(e);
  e.q.orders[0].status = 'Teleported';
  await syncTracking(e.ctx); await syncTracking(e.ctx);
  const o = (await e.db.get(`merch_orders/${id}`)).data;
  assert.equal(o.status, 'submitted');
  assert.equal((await e.db.get(`merch_fulfillments/${id}`)).data.providerRawStatus, 'Teleported');
  assert.equal((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'alert.unmapped-provider-status').length, 1);
});
await test('"Cancelled" and problem statuses from Qikink are picked up by polling', async () => {
  const a = engineEnv(); const ia = await pay(a); a.q.orders[0].status = 'Cancelled'; await syncTracking(a.ctx);
  assert.equal((await a.db.get(`merch_orders/${ia}`)).data.status, 'cancelled');
  const b = engineEnv(); const ib = await pay(b); b.q.orders[0].status = 'Out Of Stock'; await syncTracking(b.ctx);
  assert.equal((await b.db.get(`merch_orders/${ib}`)).data.status, 'exception');
});
await test('a submitted order is never re-sent (exactly one provider order per paid order)', async () => {
  const e = engineEnv(); const id = await pay(e);
  await runFulfilment(e.ctx, id, { force: true }); await runFulfilment(e.ctx, id, { force: true });
  assert.equal(e.q.creates, 1); assert.equal(e.q.orders.length, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
