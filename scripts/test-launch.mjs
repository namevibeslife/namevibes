// Launch-scope tests: two products (framed posters, blood-group mugs), prepaid only, wallet hold, bulk admin switches.
// No network. Usage: node scripts/test-launch.mjs      (npm run test:launch)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createMemoryDb } from '../src/merch/memoryDb.js';
import { handleMerch, handleAdmin, handlePaymentWebhook, runFulfilment, retryDue, applyLaunchPreset } from '../src/merch/engine.js';
import { BLOOD_GROUPS, bloodGroupSlug, bloodGroupLabel } from '../src/merch/designs.js';
import { productPreviewSvg } from '../src/merch/render.js';
import { HEADINGS, layoutFrame, opBounds } from '../src/merch/frames.js';
import { SITE_HOST } from '../src/config/site.js';
import { buildDesign } from '../src/merch/designs.js';
import { DEFAULT_PRODUCTS, FRAME_COLORS, starterSku } from '../src/merch/catalog.js';
import { computeQuote } from '../src/merch/quoteMath.js';
import { findCod, isCod } from '../src/merch/cod.js';
import { MockProviderAdapter } from '../src/merch/providers/mock.js';
import { QikinkAdapter, buildOrderPayload, DEFAULT_FUNDS_PATTERN } from '../src/merch/providers/qikink.js';
import { BLOOD_ASSETS } from '../src/merch/bloodAssets.js';
import { ELEMENTS } from '../src/utils/elements.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); } };

// ---- fixtures: the launch configuration with TEST print specs (not Qikink data) -----------------------------------
const POSTER_SPEC = { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true, bySize: { A4: { maxWidthInches: 8, maxHeightInches: 11 }, A3: { maxWidthInches: 11.5, maxHeightInches: 16 } } };
const MUG_SPEC = { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 8, maxHeightInches: 3.5, minDpi: 150 };
const launchSeed = ({ specs = true } = {}) => ({
  'merch_settings/global': { enabled: true },
  'merch_settings/commission': { enabled: true, type: 'percent_margin', value: 20, cap: 0, holdDays: 14, overrides: {} },
  'merch_products/poster': { id: 'poster', enabled: true, ...(specs ? { printSpec: POSTER_SPEC } : {}) },
  'merch_products/mug': { id: 'mug', enabled: true, ...(specs ? { printSpec: MUG_SPEC } : {}) },
  'merch_products/tshirt': { id: 'tshirt', enabled: false },
  'merch_products/notebook': { id: 'notebook', enabled: false },
  'merch_countries/IN': { countryCode: 'IN', enabled: true, currency: 'INR', taxPercent: 18, taxByProduct: { poster: 18, mug: 5 }, taxIncluded: true, collections: { name_elements: true, blood_group: true }, prices: { 'poster:A4': 599, 'poster:A3': 899, mug: 399 }, costs: { 'poster:A4': 212, 'poster:A3': 326, mug: 115 }, shipping: { flat: 60 }, paymentFeePercent: 2.5, providerPrimary: 'p', gatewayOverride: 'auto' },
  'merch_countries/US': { countryCode: 'US', enabled: false, currency: 'USD', taxPercent: 0, taxIncluded: false, collections: { name_elements: true, blood_group: true }, prices: { 'poster:A4': 25, 'poster:A3': 35, mug: 15 }, shipping: { flat: 5 }, providerPrimary: 'p' },
  'merch_providers/p': { id: 'p', adapter: 'mock', active: true, countries: ['IN', 'US'] },
  'admins/admin@x.test': { role: 'super' }, 'users/u1': { email: 'u1@x.test', countryCode: 'IN', referralCode: 'IN123456' },
  'referralCodes/IN123456': { active: true, ambassadorEmail: 'amb@x.test', ambassadorId: 'a1', code: 'IN123456' }, 'paymentSettings/razorpay': {}
});
function env({ seed = launchSeed(), who = { uid: 'u1', email: 'u1@x.test', emailVerified: true }, provider } = {}) {
  const db = createMemoryDb(seed); let n = 0; const mock = new MockProviderAdapter('p');
  const ctx = {
    db, env: {}, who, now: () => new Date(), id: () => `eid${++n}x${Math.random().toString(36).slice(2, 8)}`,
    providerFor: () => provider || mock, artworkUrl: async (o, i, kind) => `https://art.test/${kind}/${i.index}`,
    gateways: { async create(o) { return { orderId: `gw_${o.id}`, client: {} }; }, async verify() { return { transactionId: 'pay_1' }; }, async checkCaptured() { return {}; }, async refund() { return { ok: true }; } }
  };
  return { ctx, db, mock, as: (email) => ({ ...ctx, who: { uid: 'adm', email, emailVerified: true } }) };
}
const addr = { name: 'A B', phone: '9999999999', line1: '1 Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' };
const poster = (extra = {}) => ({ productId: 'poster', collection: 'name_elements', color: 'frame-black', size: 'A4', qty: 1, design: { name: 'Vibes' }, ...extra });
const mug = (g = 'O+', extra = {}) => ({ productId: 'mug', collection: 'blood_group', color: 'white', size: '11oz', qty: 1, design: { bloodGroup: g, confirmed: true }, ...extra });
async function order(e, items, { artwork = true } = {}) {
  const q = await handleMerch(e.ctx, 'quote', { items, address: addr }); assert.equal(q.status, 200, JSON.stringify(q.body));
  const c = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId }); assert.equal(c.status, 200, JSON.stringify(c.body));
  const id = c.body.orderId; const o = (await e.db.get(`merch_orders/${id}`)).data;
  if (artwork) await handleMerch(e.ctx, 'artwork', { orderId: id, items: o.items.map((i) => ({ index: i.index, sha256: 'a'.repeat(64), path: `merch/print/u1/${id}/${i.index}.png`, width: 2000, height: 3000 })) });
  return { id, q, c };
}
const pay = async (e, id) => handleMerch(e.ctx, 'verify', { orderId: id, proof: {} });

console.log('Launch configuration and visibility');
await test('launch preset: India + Qikink, poster and mug ON, T-shirt and notebook OFF, global and India switches OFF, no prices, SKUs unverified; idempotent', async () => {
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' } } });
  const a = e.as('admin@x.test');
  const r = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.equal(r.status, 200);
  const g = (p) => e.db.get(p).then((x) => x?.data);
  assert.equal((await g('merch_settings/global')).enabled, false);
  const india = await g('merch_countries/IN');
  assert.equal(india.enabled, false); assert.deepEqual(india.prices, {}); assert.equal(india.providerPrimary, 'qikink'); assert.deepEqual(india.taxByProduct, { poster: 18, mug: 5 });
  assert.equal((await g('merch_providers/qikink')).active, false); assert.equal((await g('merch_providers/qikink')).liveEnabled, false);
  assert.deepEqual([['poster', true], ['mug', true], ['tshirt', false], ['notebook', false]].map(([id]) => id), ['poster', 'mug', 'tshirt', 'notebook']);
  for (const [id, on] of [['poster', true], ['mug', true], ['tshirt', false], ['notebook', false]]) assert.equal((await g(`merch_products/${id}`)).enabled, on);
  const variants = await e.db.list('merch_variants');
  assert.equal(variants.length, 12 + 2);
  assert.equal(variants.find((v) => v.id === 'poster_frame-white_A4').providerSkus.qikink.sku, 'UFPos-Wh-A4 Frame poster');
  assert.equal(variants.find((v) => v.id === 'poster_frame-olive_A3').providerSkus.qikink.sku, 'UFPos-OG-A3 Frame poster');
  assert.equal(variants.find((v) => v.id === 'mug_white_11oz').providerSkus.qikink.sku, 'UWCM-Wh-11 OZ');
  assert.equal(variants.find((v) => v.id === 'mug_black_11oz').providerSkus.qikink.sku, 'UBCM-Bk-11 OZ');
  assert.ok(variants.every((v) => v.providerSkus.qikink.unverified === true && v.providerSkus.qikink.printTypeId === undefined));
  assert.deepEqual(FRAME_COLORS.map((f) => f.code), ['Wh', 'Bk', 'Yl', 'Gn', 'Rb', 'OG']);
  // idempotent and never overwrites an admin's later change
  await e.db.patch('merch_countries/IN', { enabled: true, prices: { mug: 1 } });
  const again = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.deepEqual(again.body.created, []);
  assert.equal((await g('merch_countries/IN')).enabled, true);
  assert.equal(starterSku('poster', 'frame-black', 'A3'), 'UFPos-Bk-A3 Frame poster');
  assert.ok((await e.db.list('merch_audit_logs')).some((l) => l.action === 'admin.applyLaunchPreset'));
});
await test('a fresh launch configuration cannot sell anything: switches off, no prices, specs missing ("enabled but blocked")', async () => {
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'users/u1': { email: 'u1@x.test', countryCode: 'IN' } } });
  await handleAdmin(e.as('admin@x.test'), { action: 'applyLaunchPreset', data: {} });
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat.body.globalEnabled, false); assert.deepEqual(cat.body.products, []);
  await handleAdmin(e.as('admin@x.test'), { action: 'bulkSwitch', data: { scope: 'global', enabled: true } });
  await handleAdmin(e.as('admin@x.test'), { action: 'bulkSwitch', data: { scope: 'country', countryCodes: ['IN'], enabled: true } });
  const cat2 = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(cat2.body.products, []); // posters and mugs are ON but have no price and no print spec
});
await test('only the two launch products are listed; T-shirt/notebook cannot be ordered even by direct API; each sells only in its own collection', async () => {
  const e = env();
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(cat.body.products.map((p) => p.id).sort(), ['mug', 'poster']);
  assert.deepEqual(cat.body.products.find((p) => p.id === 'poster').collections, ['name_elements']);
  assert.deepEqual(cat.body.products.find((p) => p.id === 'mug').collections, ['blood_group']);
  assert.deepEqual(cat.body.products.find((p) => p.id === 'poster').prices, { A4: 599, A3: 899 });
  for (const productId of ['tshirt', 'notebook']) {
    const r = await handleMerch(e.ctx, 'quote', { items: [{ productId, collection: 'name_elements', color: productId === 'tshirt' ? 'white' : 'ivory', size: productId === 'tshirt' ? 'M' : 'A5', qty: 1, design: { name: 'Vibes' } }], address: addr });
    assert.equal(r.status, 409); assert.equal(r.body.error, 'merch-product-off');
  }
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ collection: 'blood_group', design: { bloodGroup: 'O+', confirmed: true } })], address: addr })).body.error, 'merch-product-off');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('O+', { collection: 'name_elements', design: { name: 'Vibes' } })], address: addr })).body.error, 'merch-product-off');
});
await test('posters and mugs with NO print spec are enabled but blocked: hidden and unquotable', async () => {
  const e = env({ seed: launchSeed({ specs: false }) });
  assert.deepEqual((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).body.products, []);
  const q = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  assert.equal(q.body.reason, 'print-area-missing');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug()], address: addr })).body.reason, 'print-area-missing');
});

console.log('Framed poster artwork text');
const exactTexts = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
await test('poster artwork (Elements Gold, the launch default) has the exact headings, the name, every symbol, element name and atomic number', async () => {
  assert.equal(HEADINGS.name, 'THE CHEMISTRY OF YOUR NAME'); assert.equal(HEADINGS.section, 'ELEMENTS IN YOUR NAME');
  const { design } = buildDesign('name_elements', { frame: 'elements-gold', name: 'Vibes' });
  assert.equal(design.template, 'frame'); assert.equal(design.frame, 'elements-gold');
  const l = layoutFrame(design, 2480, 3508);
  const texts = l.ops.filter((o) => o.type === 'text').map((o) => o.text);
  assert.ok(texts.includes('THE CHEMISTRY OF YOUR NAME')); assert.ok(texts.includes('Vibes')); assert.ok(texts.includes('ELEMENTS IN YOUR NAME'));
  const tiles = l.ops.filter((o) => o.type === 'tile');
  assert.deepEqual(tiles.map((t) => t.el.symbol), ['V', 'I', 'Be', 'S']); assert.deepEqual(tiles.map((t) => t.el.number), [23, 53, 4, 16]);
  for (const t of tiles) assert.equal(ELEMENTS[t.el.symbol].name, t.el.name);
  assert.ok(!JSON.stringify(l.ops).toLowerCase().includes('namevibes'));
  assert.ok(texts.includes(SITE_HOST));
});
await test('long names scale or wrap inside the safe area and are escaped; the headings never depend on the UI language', async () => {
  const built = buildDesign('name_elements', { frame: 'elements-gold', name: 'Venkatasubramaniam Radhakrishnan' });
  assert.ok(!built.error, built.error);
  assert.ok(built.design.elements.length >= 12, 'a long name gives many tiles: ' + built.design.elements.length);
  assert.equal(buildDesign('name_elements', { frame: 'elements-gold', name: 'x'.repeat(41) }).error, 'name-too-long');
  const l = layoutFrame(built.design, 2480, 3508);
  for (const o of l.ops) { const b = opBounds(o); assert.ok(b.x >= l.safe.x - 1 && b.y >= l.safe.y - 1 && b.x + b.w <= l.safe.x + l.safe.w + 1 && b.y + b.h <= l.safe.y + l.safe.h + 1, o.type + ' ' + (o.text || '') + ' outside the safe area'); }
  assert.ok(!/i18n|useTranslation|\bt\(/.test(readFileSync('src/merch/frames.js', 'utf8')));
});
await test('server builds the frame design; frame colours, A4/A3 sizes and the print-area canvas are used; frames are an admin option', async () => {
  const e = env();
  const q = await handleMerch(e.ctx, 'quote', { items: [poster({ size: 'A3', color: 'frame-olive' })], address: addr });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  const it = (await e.db.get(`merch_quotes/${q.body.quoteId}`)).data.items[0];
  assert.equal(it.design.template, 'frame'); assert.equal(it.design.frame, 'elements-gold'); assert.deepEqual(it.canvasInches, { width: 11.5, height: 16 }); assert.equal(it.unitPrice, 899);
  assert.deepEqual(it.layout, { scale: 1, x: 0.5, y: 0.5 });
  assert.deepEqual((await handleMerch(e.ctx, 'quote', { items: [poster({ size: 'A5' })], address: addr })).body.error, 'bad-variant');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ color: 'frame-pink' })], address: addr })).body.error, 'bad-variant');
  for (const f of FRAME_COLORS) assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ color: f.id })], address: addr })).status, 200, f.id);
});

console.log('Blood-group mugs');
await test('all eight blood groups render on the mug preview from the approved masters, and all eight can be quoted', async () => {
  assert.deepEqual(BLOOD_GROUPS, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
  const e = env();
  const files = readdirSync('bloodline logos'); assert.equal(files.length, 8);
  for (const g of BLOOD_GROUPS) {
    const asset = BLOOD_ASSETS[bloodGroupSlug(g)];
    assert.ok(asset && asset.sha256.length === 64 && asset.version === 1, g);
    const svg = productPreviewSvg(DEFAULT_PRODUCTS.mug, '#FFFFFF', { collection: 'blood_group', bloodGroup: g }, { spec: MUG_SPEC, showArea: true });
    assert.ok(svg.includes(asset.path), g); assert.ok(svg.includes(`<title>${bloodGroupLabel(g)}</title>`), g);
    const q = await handleMerch(e.ctx, 'quote', { items: [mug(g)], address: addr });
    assert.equal(q.status, 200, `${g} ${JSON.stringify(q.body)}`);
    assert.equal(q.body.quote.total, 459); // 399 + 60 shipping, GST included
  }
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('O+', { design: { bloodGroup: 'O+' } })], address: addr })).body.error, 'blood-group-not-confirmed');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('X+')], address: addr })).body.error, 'invalid-blood-group');
});

console.log('Prices, tax, commission');
await test('A4 and A3 have separate prices; posters carry 18% and mugs 5% included tax (admin-editable); payment fee and margin are internal', async () => {
  const country = launchSeed()['merch_countries/IN'];
  const q = computeQuote({ lines: [{ productId: 'poster', qty: 1, unitPrice: 599, unitCost: 212, taxPercent: 18 }, { productId: 'mug', qty: 1, unitPrice: 399, unitCost: 115, taxPercent: 5 }], country });
  assert.equal(q.items, 998); assert.equal(q.lines[0].tax, 91.37); assert.equal(q.lines[1].tax, 19); assert.equal(q.total, 1058);
  assert.equal(q.tax, +(91.37 + 19 + 9.15).toFixed(2));
  const e = env();
  const a4 = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr }); const a3 = await handleMerch(e.ctx, 'quote', { items: [poster({ size: 'A3' })], address: addr });
  assert.equal(a4.body.quote.items, 599); assert.equal(a3.body.quote.items, 899);
  assert.ok(!('estimatedMargin' in a4.body.quote) && !('estimatedFee' in a4.body.quote)); // margin and fee never reach the customer
  const stored = (await e.db.get(`merch_quotes/${a4.body.quoteId}`)).data.totals;
  assert.ok('estimatedMargin' in stored && 'estimatedFee' in stored);
  const admin = e.as('admin@x.test');
  await handleAdmin(admin, { action: 'setCountry', data: { ...launchSeed()['merch_countries/IN'], taxByProduct: { poster: 12, mug: 5 }, enabled: true } });
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).body.quote.lines[0].taxPercent, 12);
});
await test('merchandise commission is separate: it uses the merchandise policy, never the 30%/50% subscription tiers', async () => {
  const src = readdirSync('src/merch').filter((f) => f.endsWith('.js')).map((f) => readFileSync(`src/merch/${f}`, 'utf8')).join('\n');
  assert.ok(!/from\s+['"][^'"]*utils\/commission/.test(src), 'merch code must not import the subscription commission');
  const e = env(); const { id } = await order(e, [poster()]); await pay(e, id);
  const o = (await e.db.get(`merch_orders/${id}`)).data; const c = (await e.db.get(`merch_commissions/${id}`)).data;
  assert.equal(c.amount, +(o.totals.estimatedMargin * 0.2).toFixed(2));
  assert.notEqual(c.amount, +(o.amount * 0.5).toFixed(2)); assert.notEqual(c.amount, +(o.amount * 0.3).toFixed(2));
  const off = env({ seed: { ...launchSeed(), 'merch_settings/commission': { enabled: false } } });
  const o2 = await order(off, [poster()]); await pay(off, o2.id);
  assert.equal(await off.db.get(`merch_commissions/${o2.id}`), null); // no policy = no commission, never a default 30/50%
});

console.log('No Cash on Delivery');
await test('COD is rejected by the backend in every request shape, with an audit entry; normal methods pass', async () => {
  const e = env();
  const items = [poster()];
  for (const body of [{ items, address: addr, paymentMethod: 'COD' }, { items, address: addr, payment_method: 'cash on delivery' }, { items, address: addr, method: 'Pay on Delivery' }, { items, address: addr, payment: { method: 'cod' } }, { items, address: addr, cod: true }, { items, address: addr, gateway: 'cash' }, { items, address: addr, meta: { paymentType: 'POD' } }]) {
    const r = await handleMerch(e.ctx, 'quote', body);
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.body.error, 'cod-not-allowed');
  }
  const ok = await handleMerch(e.ctx, 'quote', { items, address: addr, paymentMethod: 'razorpay', gateway: 'razorpay' });
  assert.equal(ok.status, 200);
  const co = await handleMerch(e.ctx, 'checkout', { quoteId: ok.body.quoteId, paymentMethod: 'COD' });
  assert.equal(co.body.error, 'cod-not-allowed');
  assert.equal((await handleMerch(e.ctx, 'verify', { orderId: 'x', proof: { method: 'cod' } })).body.error, 'cod-not-allowed');
  assert.equal((await handleMerch(e.as('admin@x.test'), 'admin', { action: 'setProvider', data: { id: 'z1', paymentMethod: 'cod' } })).status, 400); // admin requests too
  const logs = (await e.db.list('merch_audit_logs')).filter((l) => l.action === 'alert.cod-rejected');
  assert.ok(logs.length >= 9);
  assert.equal(findCod({ a: { b: { paymentMethod: 'razorpay' } } }), null); assert.equal(isCod('upi'), false); assert.equal(isCod('Cash On Delivery'), true); assert.equal(isCod('decode'), false);
});
await test('a payment webhook for a COD payment never marks an order paid', async () => {
  const e = env(); const { id } = await order(e, [poster()]);
  const o = (await e.db.get(`merch_orders/${id}`)).data;
  const r = await handlePaymentWebhook(e.ctx, { eventId: 'evt_cod', event: { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: o.gatewayOrderId, amount: Math.round(o.amount * 100), method: 'cod' } } } } });
  assert.equal(r.status, 400);
  assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'payment_pending');
});
await test('adapter contract: every adapter refuses COD and Qikink always sends "Prepaid"', async () => {
  const base = { idempotencyKey: 'k1', orderId: 'abc123', address: addr, email: 'a@x.test', totalValue: 100, items: [{ index: 0, qty: 1, unitPrice: 100, designUrl: 'https://a.test/p.png', mockupUrl: 'https://a.test/m.png', designSha256: 'ab'.repeat(32), canvasInches: { width: 8, height: 11 }, placementSku: 'fr', printTypeId: 1, providerSku: { sku: 'S' } }] };
  const adapters = [new MockProviderAdapter('m'), new QikinkAdapter('qikink', { clientId: 'c', clientSecret: 's', fetch: async () => { throw new Error('must not be called'); } })];
  for (const a of adapters) {
    for (const bad of [{ paymentMethod: 'COD' }, { gateway: 'COD' }, { payment: 'cash on delivery' }]) {
      const r = await a.submitOrder({ ...base, ...bad });
      assert.equal(r.ok, false, a.constructor.name); assert.equal(r.error, 'cod-not-allowed'); assert.equal(r.retryable, false);
    }
  }
  assert.equal(buildOrderPayload({ ...base, paymentMethod: 'COD' }).error, 'cod-not-allowed');
  assert.equal(buildOrderPayload({ ...base, paymentMethod: 'prepaid' }).payload.gateway, 'Prepaid');
  assert.equal(buildOrderPayload(base).payload.gateway, 'Prepaid'); // never defaults to COD
  assert.equal(buildOrderPayload(base).payload.line_items[0].print_type_id, 1); // from the product print spec
});
await test('every order the engine sends to a provider is marked prepaid and only after verified payment', async () => {
  const e = env(); const sent = [];
  e.ctx.providerFor = () => ({ submitOrder: async (p) => { sent.push(p); return { ok: true, providerOrderId: 'P1' }; } });
  const { id } = await order(e, [poster()]);
  await pay(e, id);
  assert.equal(sent.length, 1); assert.equal(sent[0].paymentMethod, 'prepaid'); assert.equal(sent[0].items[0].printTypeId, 1);
  // unverified payment: forcing a fulfilment of an order that was never paid must not reach the provider
  const f = env(); const sent2 = []; f.ctx.providerFor = () => ({ submitOrder: async (p) => { sent2.push(p); return { ok: true, providerOrderId: 'P2' }; } });
  const o2 = await order(f, [poster()]);
  await f.db.create('merch_fulfillments', o2.id, { id: o2.id, orderId: o2.id, status: 'pending', attempts: 0, idempotencyKey: 'k', nextRetryAt: new Date() });
  await f.db.patch(`merch_orders/${o2.id}`, { status: 'paid' }); // status says paid, but no verified transaction
  const r = await runFulfilment(f.ctx, o2.id, { force: true });
  assert.equal(r.exception, 'payment-not-verified'); assert.equal(sent2.length, 0);
  // failed verification never submits
  const g = env(); const sent3 = []; g.ctx.providerFor = () => ({ submitOrder: async (p) => { sent3.push(p); return { ok: true, providerOrderId: 'P3' }; } });
  g.ctx.gateways.verify = async () => ({ error: 'Payment could not be verified', status: 400 });
  const o3 = await order(g, [poster()]); assert.equal((await pay(g, o3.id)).status, 400); assert.equal(sent3.length, 0);
});

console.log('Qikink wallet: held orders');
await test('Qikink classifies an insufficient-wallet 400 as "held funds" (configurable pattern); other 400s stay permanent', async () => {
  const mk = (error) => new QikinkAdapter('qikink', { clientId: 'c', clientSecret: 's', fetch: async (u) => (String(u).includes('/token') ? new Response(JSON.stringify({ Accesstoken: 'T', expires_in: 3600 })) : new Response(JSON.stringify({ error, status_code: '400' }), { status: 400 })), now: () => 0, sleep: async () => {} });
  const order = { idempotencyKey: 'k', orderId: 'abc123', address: addr, email: 'a@x.test', totalValue: 100, attempt: 1, items: [{ index: 0, qty: 1, unitPrice: 100, designUrl: 'https://a.test/p.png', designSha256: 'ab'.repeat(32), canvasInches: { width: 8, height: 11 }, placementSku: 'fr', printTypeId: 1, providerSku: { sku: 'S' } }] };
  const held = await mk('Insufficient wallet balance').submitOrder(order);
  assert.equal(held.heldFunds, true); assert.equal(held.retryable, false);
  assert.equal((await mk('Invalid province').submitOrder(order)).heldFunds, undefined);
  assert.equal(DEFAULT_FUNDS_PATTERN.test('Low fund in wallet'), true);
  const custom = new QikinkAdapter('qikink', { clientId: 'c', clientSecret: 's', fundsPattern: /no credit/i, fetch: async (u) => (String(u).includes('/token') ? new Response(JSON.stringify({ Accesstoken: 'T' })) : new Response(JSON.stringify({ error: 'No credit left' }), { status: 400 })), now: () => 0, sleep: async () => {} });
  assert.equal((await custom.submitOrder(order)).heldFunds, true);
});
await test('held order: own state, ONE alert, no retry loop, no duplicate; admin retry after top-up submits it exactly once', async () => {
  let wallet = false; const calls = [];
  const provider = { submitOrder: async (p) => { calls.push(p.attempt); return wallet ? { ok: true, providerOrderId: 'Q1', orderNumber: 'x' } : { ok: false, error: 'Insufficient wallet balance', retryable: false, heldFunds: true }; } };
  const e = env({ provider });
  const { id } = await order(e, [mug()]);
  await pay(e, id);
  let o = (await e.db.get(`merch_orders/${id}`)).data;
  assert.equal(o.status, 'held_provider_funds'); assert.equal((await e.db.get(`merch_fulfillments/${id}`)).data.status, 'held');
  assert.equal((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'alert.provider-funds').length, 1);
  for (let i = 0; i < 4; i++) await retryDue(e.ctx); // the scheduler never retries a held order
  assert.deepEqual(calls, [1]);
  assert.deepEqual(await runFulfilment(e.ctx, id), { skipped: 'held_provider_funds' }); // not without an explicit admin retry
  const admin = e.as('admin@x.test'); admin.providerFor = e.ctx.providerFor;
  const still = await handleAdmin(admin, { action: 'retry', data: { orderId: id } }); // top-up not done yet
  assert.equal(still.body.held, true); assert.equal((await e.db.get(`merch_orders/${id}`)).data.status, 'held_provider_funds');
  assert.equal((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'alert.provider-funds').length, 1); // still ONE alert
  wallet = true;
  const ok = await handleAdmin(admin, { action: 'retry', data: { orderId: id } });
  assert.equal(ok.body.submitted, true);
  o = (await e.db.get(`merch_orders/${id}`)).data; assert.equal(o.status, 'submitted');
  assert.deepEqual(calls, [1, 2, 3]); // attempts are counted (the adapter looks up by reference before a repeat attempt)
  assert.deepEqual(await runFulfilment(e.ctx, id, { force: true }), { skipped: 'submitted' }); // never a second order
  const customerView = o.timeline.map((t) => t.state);
  assert.ok(customerView.includes('held_provider_funds'));
});
await test('the admin overview counts held orders', async () => {
  const src = readFileSync('src/pages/MerchAdmin.jsx', 'utf8');
  assert.match(src, /held-count/); assert.match(src, /Retry after wallet top-up/);
});

console.log('Admin: Product Management');
const names = async (e, ids) => Promise.all(ids.map((id) => e.db.get(`merch_products/${id}`).then((x) => x?.data?.enabled)));
await test('bulk switch previews (dryRun writes nothing), applies, audits before/after; single and bulk, products everywhere and per country', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const dry = await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster', 'mug'], enabled: false, dryRun: true } });
  assert.equal(dry.status, 200); assert.deepEqual(dry.body.changes.map((c) => [c.label, c.before, c.after]), [['poster (everywhere)', true, false], ['mug (everywhere)', true, false]]);
  assert.deepEqual(await names(e, ['poster', 'mug']), [true, true]); assert.equal((await e.db.list('merch_audit_logs')).length, 0);
  const done = await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster', 'mug'], enabled: false } });
  assert.equal(done.body.applied, 2); assert.deepEqual(await names(e, ['poster', 'mug']), [false, false]);
  const log = (await e.db.list('merch_audit_logs')).find((l) => l.action === 'admin.bulkSwitch');
  assert.equal(log.actor, 'admin@x.test'); assert.equal(log.detail.changes.length, 2); assert.equal(log.detail.changes[0].before, true); assert.equal(log.detail.changes[0].after, false);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster'], enabled: true } });
  assert.deepEqual(await names(e, ['poster', 'mug']), [true, false]);
  // per country: poster off in India only
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster'], countryCode: 'IN', enabled: false } });
  assert.equal((await e.db.get('merch_countries/IN')).data.disabledProducts.poster, true);
  assert.equal((await e.db.get('merch_products/poster')).data.enabled, true);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).body.error, 'merch-product-off');
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster'], countryCode: 'IN', enabled: true } });
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).status, 200);
});
await test('select all + activate/deactivate selected; collection, country and whole-module switches; bad input is refused', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const all = ['poster', 'mug', 'tshirt', 'notebook'];
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: all, enabled: false } });
  assert.deepEqual(await names(e, all), [false, false, false, false]);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: all, enabled: true } });
  assert.deepEqual(await names(e, all), [true, true, true, true]);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'collection', collection: 'blood_group', countryCodes: 'all', enabled: false } });
  assert.equal((await e.db.get('merch_countries/IN')).data.collections.blood_group, false); assert.equal((await e.db.get('merch_countries/US')).data.collections.blood_group, false);
  assert.equal((await e.db.get('merch_countries/IN')).data.collections.name_elements, true);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug()], address: addr })).body.error, 'merch-collection-off');
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'country', countryCodes: ['US'], enabled: true } });
  assert.equal((await e.db.get('merch_countries/US')).data.enabled, true);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'global', enabled: false } });
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).body.error, 'merch-off');
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'global', enabled: true } });
  for (const bad of [{ scope: 'products', productIds: [], enabled: true }, { scope: 'products', productIds: ['nope'], enabled: true }, { scope: 'country', countryCodes: ['ZZ'], enabled: true }, { scope: 'x', enabled: true }, { scope: 'global' }]) {
    assert.equal((await handleAdmin(a, { action: 'bulkSwitch', data: bad })).status, 400, JSON.stringify(bad));
  }
  assert.equal((await handleAdmin(e.ctx, { action: 'bulkSwitch', data: { scope: 'global', enabled: false } })).status, 403); // a customer cannot
});
await test('disabling a product blocks new quotes and checkout (direct API too) but never touches paid orders, tracking or refunds', async () => {
  const e = env(); const a = e.as('admin@x.test'); a.providerFor = e.ctx.providerFor; a.gateways = e.ctx.gateways;
  const q = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  const paid = await order(e, [mug()]); await pay(e, paid.id);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster', 'mug'], enabled: false } });
  assert.equal((await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId })).body.error, 'merch-product-off'); // an existing quote cannot be checked out
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).body.error, 'merch-product-off');
  assert.equal((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).body.products.length, 0);
  const o = (await e.db.get(`merch_orders/${paid.id}`)).data; assert.equal(o.status, 'submitted');
  const { applyProviderStatus } = await import('../src/merch/engine.js');
  assert.equal((await applyProviderStatus(e.ctx, paid.id, { status: 'shipped', tracking: { carrier: 'X', number: '1', url: null } })).state, 'shipped');
  assert.equal((await handleAdmin(a, { action: 'refund', data: { orderId: paid.id, reason: 'x' } })).status, 200);
  assert.equal((await e.db.get(`merch_orders/${paid.id}`)).data.status, 'refunded');
});
await test('duplicate verify/webhook gives exactly one paid order and one fulfilment job (poster)', async () => {
  const e = env(); const { id } = await order(e, [poster()]);
  const o = (await e.db.get(`merch_orders/${id}`)).data;
  const evt = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9', order_id: o.gatewayOrderId, amount: Math.round(o.amount * 100), method: 'upi' } } } };
  await handlePaymentWebhook(e.ctx, { eventId: 'e1', event: evt }); await handlePaymentWebhook(e.ctx, { eventId: 'e1', event: evt }); await pay(e, id); await pay(e, id);
  assert.equal((await e.db.list('merch_fulfillments')).length, 1); assert.equal(e.mock.submitCalls, 1);
});
await test('complaints and replacements are recorded by staff only (never on the customer-readable order)', async () => {
  const e = env(); const a = e.as('admin@x.test'); const { id } = await order(e, [poster()]); await pay(e, id);
  assert.equal((await handleAdmin(a, { action: 'addOrderNote', data: { orderId: id, type: 'replacement', text: 'Frame arrived cracked, replacement sent' } })).status, 200);
  assert.equal((await e.db.get(`merch_fulfillments/${id}`)).data.notes[0].type, 'replacement');
  assert.ok(!JSON.stringify((await e.db.get(`merch_orders/${id}`)).data).includes('cracked'));
  assert.equal((await handleAdmin(a, { action: 'addOrderNote', data: { orderId: id, text: '' } })).status, 400);
});
await test('a draft returns policy page exists, clearly marked as a draft for legal review', async () => {
  const page = readFileSync('src/pages/MerchReturnsPolicy.jsx', 'utf8');
  assert.match(page, /DRAFT for legal review/); assert.match(page, /Cash on delivery is not available/); assert.match(page, /personalised/i);
  assert.match(readFileSync('src/App.jsx', 'utf8'), /merch\/returns-policy/);
});

console.log('Frame designs (admin option, family, print resolution)');
await test('launch default: only Elements Gold is selectable; the dark designs are refused until an admin enables them (audited)', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(cat.body.products.find((p) => p.id === 'poster').frames, { 'elements-gold': true, 'individual-dark': false, 'family-dark': false });
  assert.equal(cat.body.products.find((p) => p.id === 'mug').frames, undefined);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr })).status, 200); // no frame sent = Elements Gold
  const dark = await handleMerch(e.ctx, 'quote', { items: [poster({ design: { frame: 'individual-dark', name: 'Vibes' } })], address: addr });
  assert.equal(dark.status, 409); assert.equal(dark.body.error, 'frame-design-off');
  const fam = { frame: 'family-dark', familyName: 'Nair Family', people: [{ name: 'Vibes', relation: 'Father' }, { name: 'Ajay', relation: 'Son' }] };
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ design: fam })], address: addr })).body.error, 'frame-design-off');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ design: { frame: 'bogus', name: 'Vibes' } })], address: addr })).body.error, 'unknown-frame');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('O+', { design: { frame: 'elements-gold', name: 'Vibes' } })], address: addr })).body.error, 'frame-design-unavailable');
  // admin enables the two dark designs
  assert.equal((await handleAdmin(a, { action: 'setFrameDesign', data: { productId: 'poster', frame: 'individual-dark', enabled: true } })).status, 200);
  assert.equal((await handleAdmin(a, { action: 'setFrameDesign', data: { productId: 'poster', frame: 'family-dark', enabled: true } })).status, 200);
  const log = (await e.db.list('merch_audit_logs')).filter((l) => l.action === 'admin.setFrameDesign');
  assert.equal(log.length, 2); assert.equal(log[0].detail.before['individual-dark'], false); assert.equal(log[0].detail.after['individual-dark'], true);
  const q = await handleMerch(e.ctx, 'quote', { items: [poster({ design: { frame: 'individual-dark', name: 'Vibes' } })], address: addr });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  const it = (await e.db.get(`merch_quotes/${q.body.quoteId}`)).data.items[0];
  assert.equal(it.design.frame, 'individual-dark'); assert.deepEqual(it.layout, { scale: 1, x: 0.5, y: 0.5 });
  const fq = await handleMerch(e.ctx, 'quote', { items: [poster({ design: fam })], address: addr });
  assert.equal(fq.status, 200, JSON.stringify(fq.body));
  const fi = (await e.db.get(`merch_quotes/${fq.body.quoteId}`)).data.items[0];
  assert.equal(fi.design.people.length, 2); assert.equal(fi.design.people[0].relation, 'Father'); assert.equal(fi.design.familyName, 'Nair Family');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ design: { ...fam, people: [...fam.people, ...fam.people, { name: 'Asha' }] } })], address: addr })).body.error, 'too-many-people');
  // not for mugs, and only admins
  assert.equal((await handleAdmin(a, { action: 'setFrameDesign', data: { productId: 'mug', frame: 'family-dark', enabled: true } })).status, 400);
  assert.equal((await handleMerch(e.ctx, 'admin', { action: 'setFrameDesign', data: { productId: 'poster', frame: 'family-dark', enabled: false } })).status, 403);
  // a switch back off blocks new quotes again
  await handleAdmin(a, { action: 'setFrameDesign', data: { productId: 'poster', frame: 'individual-dark', enabled: false } });
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ design: { frame: 'individual-dark', name: 'Vibes' } })], address: addr })).body.error, 'frame-design-off');
});
await test('the print file must reach the product minimum DPI over the print area (A4 and A3); the reference images are never an input', async () => {
  const e = env();
  const a4 = await order(e, [poster()], { artwork: false });
  const o = (await e.db.get(`merch_orders/${a4.id}`)).data;
  assert.deepEqual(o.items[0].canvasInches, { width: 8, height: 11 });
  const att = (width, extra = {}) => handleMerch(e.ctx, 'artwork', { orderId: a4.id, items: [{ index: 0, sha256: 'a'.repeat(64), path: `merch/print/u1/${a4.id}/0.png`, width, height: Math.round(width * 11 / 8), ...extra }] });
  const low = await att(1024); // the size of the reference images: only 128 DPI over 8 inches
  assert.equal(low.status, 400); assert.equal(low.body.error, 'resolution-too-low'); assert.equal(low.body.dpi, 128);
  assert.equal((await att(2400)).status, 200); // 300 DPI
  assert.equal((await att(1200)).status, 200); // exactly the 150 DPI minimum
  const a3 = await order(e, [poster({ size: 'A3' })], { artwork: false });
  const att3 = (width) => handleMerch(e.ctx, 'artwork', { orderId: a3.id, items: [{ index: 0, sha256: 'b'.repeat(64), path: `merch/print/u1/${a3.id}/0.png`, width, height: Math.round(width * 16 / 11.5) }] });
  assert.equal((await att3(3450)).status, 200); assert.equal((await att3(1500)).body.error, 'resolution-too-low');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
