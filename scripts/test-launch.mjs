// Launch-scope tests: two products (framed posters, blood-group mugs), prepaid only, wallet hold, bulk admin switches.
// No network. Usage: node scripts/test-launch.mjs      (npm run test:launch)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createMemoryDb } from '../src/merch/memoryDb.js';
import { priceFromCost, launchDefaults, handleMerch, handleAdmin, handlePaymentWebhook, runFulfilment, retryDue, applyLaunchPreset, handleUpload, sweepFiles, fileReport } from '../src/merch/engine.js';
import { createFileStore } from '../src/merch/storage/stores.js';
import { runCron } from '../src/merch/cronRun.js';
import { secretMatches } from '../functions/api/merch/cron.js';
import { makeFakeCloud, fakePng } from './fake-storage.mjs';
import { BLOOD_GROUPS, bloodGroupSlug, bloodGroupLabel } from '../src/merch/designs.js';
import { productPreviewSvg } from '../src/merch/render.js';
import { HEADINGS, layoutFrame, opBounds } from '../src/merch/frames.js';
import { SITE_HOST } from '../src/config/site.js';
import { buildDesign } from '../src/merch/designs.js';
import { DEFAULT_PRODUCTS, FRAME_COLORS, starterSku, FRAMED_SIZES, shippingCostFor, SHIPPING_COST_PLACEHOLDER } from '../src/merch/catalog.js';
import { verificationLevels } from '../src/merch/layout.js';
import { transparentEdges } from '../src/merch/trim.js';
import { FRAME_MM } from '../src/merch/frames.js';
import { computeQuote } from '../src/merch/quoteMath.js';
import { findCod, isCod } from '../src/merch/cod.js';
import { MockProviderAdapter } from '../src/merch/providers/mock.js';
import { QikinkAdapter, buildOrderPayload, DEFAULT_FUNDS_PATTERN } from '../src/merch/providers/qikink.js';
import { BLOOD_ASSETS } from '../src/merch/bloodAssets.js';
import { ELEMENTS } from '../src/utils/elements.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); } };

// ---- fixtures: the launch configuration with TEST print specs (not Qikink data) -----------------------------------
const POSTER_SPEC = { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true, bySize: { A4: { maxWidthInches: 8, maxHeightInches: 11, verified: true }, A3: { maxWidthInches: 11.5, maxHeightInches: 16, verified: true } } };
const MUG_SPEC = { printTypeId: 5, allowedPlacements: ['fr'], maxWidthInches: 8, maxHeightInches: 3.5, minDpi: 150, verified: true };
const launchSeed = ({ specs = true } = {}) => ({
  'merch_settings/global': { visibleTo: 'everyone', enabled: true },
  'merch_settings/commission': { enabled: true, type: 'percent_margin', value: 20, cap: 0, holdDays: 14, overrides: {} },
  'merch_products/poster': { id: 'poster', enabled: true, verification: { sampleApproved: true }, printSpec: specs ? POSTER_SPEC : null },
  'merch_products/mug': { id: 'mug', enabled: true, verification: { sampleApproved: true }, ...(specs ? { printSpec: MUG_SPEC } : {}) },
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
await test('launch preset: India + Qikink, EVERYTHING disabled, global and India switches OFF, no selling prices, Qikink base costs, unverified SKUs for every variant; idempotent', async () => {
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' } } });
  const a = e.as('admin@x.test');
  const r = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.equal(r.status, 200);
  const g = (p) => e.db.get(p).then((x) => x?.data);
  assert.equal((await g('merch_settings/global')).enabled, false);
  const india = await g('merch_countries/IN');
  assert.equal(india.enabled, true); assert.equal(india.currency, 'INR'); assert.equal(india.taxPercent, 18); assert.equal(india.taxIncluded, true); assert.equal(india.providerPrimary, 'qikink'); assert.equal(india.gatewayOverride, 'auto'); assert.deepEqual(india.shipping, { flat: 50, freeAbove: 999 }); assert.equal(india.marginFloorPercent, 0);
  assert.deepEqual(india.collections, { name_elements: true, blood_group: true }); assert.ok(india.testSetup);
  assert.equal(india.prices['poster:A4'], 1003); assert.equal(india.prices['poster:A3'], 1534); assert.equal(india.prices['acrylic:16x24'], 2832); assert.equal(india.prices.mug, 483); assert.equal(india.prices['steel-bottle'], 1003);
  assert.equal(india.priceNotes['poster:A4'], 'cost 212, x4 = 850, GST 18% -> 1003'); assert.match(india.priceNotes['steel-bottle'], /GST unconfirmed/); assert.equal(india.prices.tshirt, undefined); assert.equal(india.disabledProducts.tshirt, true); assert.equal(india.disabledProducts.notebook, true); assert.equal(india.disabledProducts.poster, undefined);
  assert.ok(r.body.notes.some((x) => /tshirt: needs Qikink price/.test(x)) && r.body.notes.some((x) => /12x24/.test(x)));
  assert.deepEqual(india.placeholderPrices, india.prices); // every price is marked as a placeholder until an admin changes it
  assert.deepEqual(india.taxByProduct, { poster: 18, acrylic: 18, 'acrylic-frame': 18, mug: 5 }); // bottle GST is NOT known: left unset
  assert.equal(india.costs['poster:A4'], 212); assert.equal(india.costs['poster:12x18'], 321); assert.equal(india.costs['acrylic:16x24'], 599);
  assert.equal(india.costs.mug, 115); assert.equal(india.costs['steel-bottle'], 213);
  assert.equal((await g('merch_providers/qikink')).active, true); assert.equal((await g('merch_providers/qikink')).liveEnabled, false); // usable in the sandbox, Live submission OFF
  for (const id of ['poster', 'acrylic', 'mug']) assert.equal((await g(`merch_products/${id}`)).enabled, true, id); // verified print specs (a/b): sellable to admin testers
  for (const id of ['acrylic-frame', 'steel-bottle', 'sipper-bottle', 'tumbler', 'tshirt', 'notebook']) assert.equal((await g(`merch_products/${id}`)).enabled, false, id); // no verified print spec: stays hidden
  const variants = await e.db.list('merch_variants');
  assert.equal(variants.length, 26 + 6 + 1 + 15 + 3);
  const sku = (id) => variants.find((v) => v.id === id).providerSkus.qikink.sku;
  assert.equal(sku('poster_frame-white_A4'), 'UFPos-Wh-A4 Frame poster'); assert.equal(sku('poster_frame-olive_A3'), 'UFPos-OG-A3 Frame poster'); assert.equal(sku('poster_frame-black_12x18'), 'UFPos-Bk-12x18Fpos'); assert.equal(sku('poster_frame-white_8x8'), 'UFPos-Wh-8x8FPoster');
  assert.equal(sku('acrylic_white_A4'), 'UAcryPos-Wh-A4 poster'); assert.equal(sku('acrylic_white_16x24'), 'UAcryPos-Wh-16x24Inches'); assert.equal(sku('acrylic_white_8x8'), 'UAcryPos-Wh-8x8inches');
  assert.equal(sku('acrylic-frame_white_NA'), 'UAcryFrmStd-Wh-NA');
  assert.equal(sku('mug_white_11oz'), 'UWCM-Wh-11 OZ'); assert.equal(sku('mug_black_11oz'), 'UBCM-Bk-11 OZ'); assert.equal(sku('mug_enamel-white_11oz'), 'UWECM-Wh-11oz'); assert.equal(sku('mug_magic-royalblue_11oz'), 'UMCM-Wh-11ozRoyalBlue');
  assert.equal(sku('steel-bottle_black_750ml'), 'UWtrbtl-Bk-750ml'); assert.equal(sku('sipper-bottle_white_750ml'), 'USSBl-Wh-750ml'); assert.equal(sku('tumbler_white_20oz'), 'UTumb-Wh-20oz');
  assert.ok(variants.every((v) => v.providerSkus.qikink.unverified === true && v.providerSkus.qikink.printTypeId === undefined));
  assert.equal(variants.find((v) => v.id === 'mug_white_11oz').enabled, true); // only the white mug is on by default; the other mug styles are admin-enableable
  assert.equal(variants.filter((v) => v.productId === 'mug' && v.enabled).length, 1);
  assert.equal(variants.filter((v) => v.productId === 'poster' && v.color !== 'frame-white' && v.color !== 'frame-black').every((v) => ['A4', 'A3'].includes(v.size)), true); // the six frame colours exist for A4/A3 only
  assert.deepEqual(FRAME_COLORS.map((f) => f.code), ['Wh', 'Bk', 'Yl', 'Gn', 'Rb', 'OG']);
  // second run: nothing new, nothing duplicated, nothing overwritten; a value changed after the first run is kept
  await e.db.patch('merch_countries/IN', { enabled: false, prices: { ...india.prices, 'poster:A4': 777 }, taxPercent: 12 });
  await e.db.patch('merch_products/mug', { enabled: false });
  const before = JSON.stringify((await e.db.list('merch_variants')).map((v) => v.id).sort());
  const again = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.equal(again.body.ok, true); assert.deepEqual(again.body.created, []);
  assert.equal((await g('merch_countries/IN')).enabled, false); assert.equal((await g('merch_countries/IN')).prices['poster:A4'], 777); assert.equal((await g('merch_countries/IN')).taxPercent, 12);
  assert.equal((await g('merch_products/mug')).enabled, false);
  assert.equal(JSON.stringify((await e.db.list('merch_variants')).map((v) => v.id).sort()), before);
  assert.equal((await e.db.list('merch_providers')).length, 1);
  assert.equal(starterSku('poster', 'frame-black', 'A3'), 'UFPos-Bk-A3 Frame poster');
  assert.ok((await e.db.list('merch_audit_logs')).some((l) => l.action === 'admin.applyLaunchPreset'));
});
await test('price formula: 4 x Qikink cost rounded to Rs 10, GST on top, rounded to the rupee; mug 5%; unknown GST marked; unknown cost gets no price', () => {
  const eq = (id, cost, pretax, gst, price) => { const r = priceFromCost(id, cost); assert.deepEqual([r.pretax, r.gst, r.price], [pretax, gst, price], id + ' ' + cost); };
  eq('poster', 250, 1000, 18, 1180); assert.equal(priceFromCost('poster', 250).note, 'cost 250, x4 = 1000, GST 18% -> 1180');
  eq('poster', 212, 850, 18, 1003); // 848 rounds to 850; 850 x 1.18 = 1003
  eq('poster', 173, 690, 18, 814); // 692 -> 690; 814.2 -> 814
  eq('poster', 188, 750, 18, 885); // 752 -> 750 (rounds down); 885
  eq('mug', 115, 460, 5, 483); // 5% GST, 483
  eq('acrylic', 599, 2400, 18, 2832);
  eq('acrylic', 126, 500, 18, 590); // 504 -> 500; exactly .5 handling not needed
  const b = priceFromCost('steel-bottle', 213); assert.deepEqual([b.gst, b.gstConfirmed, b.price], [18, false, 1003]); assert.match(b.note, /GST unconfirmed/);
  for (const bad of [0, undefined, null, NaN, -5, '']) assert.equal(priceFromCost('poster', bad), null);
  const d = launchDefaults(); assert.equal(d.prices.tshirt, undefined); assert.equal(d.prices['acrylic-stand'], undefined);
  for (const [k, v] of Object.entries(d.prices)) assert.equal(v, priceFromCost(k.split(':')[0], d.costs[k]).price, k);
});
await test('launch preset for admin testing: first run, global ON only because visibility is Admins only, second run changes nothing, a changed value is kept, a non-admin is refused', async () => {
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'merch_settings/global': { enabled: false, visibleTo: 'admins' } } });
  const a = e.as('admin@x.test');
  const g = (p) => e.db.get(p).then((x) => x?.data);
  assert.equal((await handleAdmin({ ...e.ctx, who: null }, { action: 'applyLaunchPreset', data: {} })).status, 401); // not signed in
  const user = e.as('u1@x.test'); assert.equal((await handleAdmin(user, { action: 'applyLaunchPreset', data: {} })).status, 403);
  assert.equal(await g('merch_countries/IN'), undefined); assert.equal((await g('merch_settings/global')).enabled, false); // nothing was written
  const r = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.equal(r.body.ok, true); assert.ok(r.body.created.some((x) => /provider qikink/.test(x))); assert.ok(r.body.created.some((x) => /India/.test(x))); assert.ok(r.body.created.some((x) => /Qikink SKU variant/.test(x)));
  assert.equal((await g('merch_settings/global')).enabled, true); assert.equal((await g('merch_settings/global')).visibleTo, 'admins'); // visibility itself is never changed
  const p = await g('merch_providers/qikink'); assert.deepEqual([p.adapter, p.active, p.liveEnabled], ['qikink', true, false]);
  const india = await g('merch_countries/IN'); assert.equal(india.enabled, true); assert.deepEqual(india.taxByProduct.mug, 5); assert.equal(india.taxPercent, 18);
  // an admin tester can now see and quote the sellable products; the ones without a verified print spec stay hidden
  const cat = await handleMerch(e.as('admin@x.test'), 'catalogue', { country: 'IN' });
  assert.equal(cat.status, 200); const ids = cat.body.products.map((x) => x.id);
  assert.ok(ids.includes('poster') && ids.includes('mug')); assert.ok(!ids.includes('steel-bottle') && !ids.includes('tshirt') && !ids.includes('acrylic-frame'));
  assert.equal((await handleMerch(e.as('u1@x.test'), 'catalogue', { country: 'IN' })).status, 404); // visible to admins only
  // second run: nothing created again; values changed after the first run are kept
  await e.db.patch('merch_countries/IN', { prices: { ...india.prices, mug: 349 }, taxPercent: 12 });
  const n = (await e.db.list('merch_variants')).length;
  const r2 = await handleAdmin(a, { action: 'applyLaunchPreset', data: {} });
  assert.deepEqual([r2.body.ok, r2.body.created.length, r2.body.filled.length], [true, 0, 0]);
  assert.equal((await g('merch_countries/IN')).prices.mug, 349); assert.equal((await g('merch_countries/IN')).taxPercent, 12);
  assert.equal((await e.db.list('merch_variants')).length, n); assert.equal((await e.db.list('merch_providers')).length, 1);
  assert.equal((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'admin.applyLaunchPreset').length, 2);
});
await test('launch preset: visibility Nobody or Everyone leaves the global switch alone and says why; a value left blank is filled without touching others; the work is a handful of database calls', async () => {
  for (const visibleTo of ['nobody', 'everyone']) {
    const e = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'merch_settings/global': { enabled: false, visibleTo } } });
    const r = await handleAdmin(e.as('admin@x.test'), { action: 'applyLaunchPreset', data: {} });
    assert.equal((await e.db.get('merch_settings/global')).data.enabled, false); assert.ok(r.body.notes.some((x) => /NOT turned on/.test(x)));
    assert.equal((await e.db.get('merch_settings/global')).data.visibleTo, visibleTo);
  }
  // an existing, half-empty India document (what the admin screen saves) is completed on the first run
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'merch_settings/global': { visibleTo: 'admins' }, 'merch_countries/IN': { countryCode: 'IN', enabled: false, currency: 'INR', taxPercent: 0, prices: { 'poster:A4': 555 }, costs: {}, collections: { name_elements: false, blood_group: false }, providerPrimary: '' } } });
  assert.equal((await handleAdmin(e.as('admin@x.test'), { action: 'applyLaunchPreset', data: {} })).body.ok, true);
  const india = (await e.db.get('merch_countries/IN')).data;
  assert.equal(india.enabled, true); assert.equal(india.taxPercent, 18); assert.equal(india.providerPrimary, 'qikink'); assert.equal(india.prices['poster:A4'], 555); assert.ok(india.prices['poster:A3'] > 0);
  assert.ok(!('poster:A4' in india.placeholderPrices)); // the admin's own price is not marked as a placeholder
  // a Cloudflare Worker may make only ~50 outgoing calls per request: count them
  const e2 = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'merch_settings/global': { visibleTo: 'admins' } } });
  let calls = 0; for (const k of ['get', 'list', 'patch', 'create', 'createMany', 'query']) { const orig = e2.db[k]?.bind(e2.db); if (orig) e2.db[k] = async (...x) => { calls++; return orig(...x); }; }
  await handleAdmin(e2.as('admin@x.test'), { action: 'applyLaunchPreset', data: {} });
  assert.ok(calls <= 25, 'database calls: ' + calls);
  // a failing database is reported on the page instead of failing silently
  const e3 = env({ seed: { 'admins/admin@x.test': { role: 'super' } } }); const as3 = e3.as('admin@x.test'); const origList = as3.db.list; as3.db.list = async () => { throw new Error('Firestore list failed (503)'); };
  const bad = await handleAdmin(as3, { action: 'applyLaunchPreset', data: {} }); assert.equal(bad.body.ok, false); assert.match(bad.body.error, /Firestore list failed/); as3.db.list = origList;
});
await test('a fresh launch configuration cannot sell anything: switches off, no prices, everything disabled and unverified', async () => {
  const e = env({ seed: { 'admins/admin@x.test': { role: 'super' }, 'users/u1': { email: 'u1@x.test', countryCode: 'IN' } } });
  await handleAdmin(e.as('admin@x.test'), { action: 'applyLaunchPreset', data: {} });
  assert.equal((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).status, 404); // visibility defaults to Nobody
  await handleAdmin(e.as('admin@x.test'), { action: 'setVisibility', data: { visibleTo: 'everyone' } });
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat.body.globalEnabled, false); assert.deepEqual(cat.body.products, []);
  await handleAdmin(e.as('admin@x.test'), { action: 'bulkSwitch', data: { scope: 'global', enabled: true } });
  await handleAdmin(e.as('admin@x.test'), { action: 'bulkSwitch', data: { scope: 'country', countryCodes: ['IN'], enabled: true } });
  assert.equal((await handleAdmin(e.as('admin@x.test'), { action: 'bulkSwitch', data: { scope: 'products', productIds: ['tshirt'], enabled: true } })).body.error, 'not-ready');
  assert.deepEqual((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).body.products, []);
});
await test('only enabled, ready products with a price are listed; direct API calls for the others are refused; each sells only in its own collection; Bloodline on posters stays off until enabled', async () => {
  const e = env();
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(cat.body.products.map((p) => p.id).sort(), ['mug', 'poster']);
  assert.deepEqual(cat.body.products.find((p) => p.id === 'poster').collections, ['name_elements']); // bloodline posters exist but their design source is off
  assert.deepEqual(cat.body.products.find((p) => p.id === 'mug').collections, ['blood_group']);
  assert.deepEqual(cat.body.products.find((p) => p.id === 'poster').prices, { A4: 599, A3: 899 });
  for (const productId of ['tshirt', 'notebook', 'acrylic', 'steel-bottle']) {
    const r = await handleMerch(e.ctx, 'quote', { items: [{ productId, collection: 'name_elements', color: 'white', size: 'M', qty: 1, design: { name: 'Vibes' } }], address: addr });
    assert.equal(r.status === 400 || r.status === 409, true, productId); assert.notEqual(r.status, 200);
  }
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ collection: 'blood_group', design: { bloodGroup: 'O+', confirmed: true } })], address: addr })).body.error, 'design-source-off');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('O+', { collection: 'name_elements', design: { name: 'Vibes' } })], address: addr })).body.error, 'merch-product-off'); // the mug cannot carry Elements at all
  const a = e.as('admin@x.test');
  assert.equal((await handleAdmin(a, { action: 'setDesignSource', data: { productId: 'poster', source: 'blood_group', enabled: true } })).status, 200);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ collection: 'blood_group', design: { bloodGroup: 'O+', confirmed: true } })], address: addr })).status, 200);
  assert.equal((await handleAdmin(a, { action: 'setDesignSource', data: { productId: 'mug', source: 'name_elements', enabled: true } })).status, 400); // a mug cannot be given Elements
});
await test('a poster with no print spec is blocked (hidden and unquotable); the mug is ready by default because its spec is confirmed', async () => {
  const e = env({ seed: launchSeed({ specs: false }) });
  assert.deepEqual((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).body.products.map((p) => p.id), ['mug']);
  const q = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  assert.equal(q.body.reason, 'print-area-missing');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug()], address: addr })).status, 200);
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
await test('select all + activate/deactivate selected; only READY products can be switched on; collection, country and whole-module switches; bad input is refused', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const ready = ['poster', 'mug'];
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ready, enabled: false } });
  assert.deepEqual(await names(e, ready), [false, false]);
  await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ready, enabled: true } });
  assert.deepEqual(await names(e, ready), [true, true]);
  const all = await handleAdmin(a, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['poster', 'mug', 'tshirt', 'notebook'], enabled: true } });
  assert.equal(all.status, 400); assert.equal(all.body.error, 'not-ready'); assert.equal(all.body.productId, 'tshirt'); // select-all cannot enable unverified products
  assert.deepEqual(await names(e, ['tshirt', 'notebook']), [false, false]);
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

console.log('Frame inset setting (designInsetMm)');
await test('designInsetMm: default 10 mm recorded on each frame item; admin can set 0 to 30 (audited); invalid values refused; the quote follows the setting', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat.body.products.find((p) => p.id === 'poster').designInsetMm, 10);
  assert.equal(cat.body.products.find((p) => p.id === 'mug').designInsetMm, undefined);
  const q = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  const it = (await e.db.get(`merch_quotes/${q.body.quoteId}`)).data.items[0];
  assert.equal(it.designInsetMm, 10); assert.equal(it.insetApplied, 'frame-minus-inset');
  assert.ok(Math.abs(it.artworkInches.width - (210 / 25.4 - 2 * 10 / 25.4)) < 1e-6); // fixture print area 8 x 11 in is a little smaller than A4: the stricter of the two applies per side
  assert.deepEqual(it.canvasInches, { width: 8, height: 11 }); // the file stays the full print area
  for (const bad of [-1, 31, 'abc']) assert.equal((await handleAdmin(a, { action: 'setProduct', data: { id: 'poster', enabled: true, designInsetMm: bad } })).body.error, 'bad-inset');
  assert.equal((await handleAdmin(a, { action: 'setProduct', data: { id: 'poster', enabled: true, designInsetMm: 15 } })).status, 200);
  assert.equal((await e.db.get('merch_products/poster')).data.designInsetMm, 15);
  const q15 = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  assert.equal((await e.db.get(`merch_quotes/${q15.body.quoteId}`)).data.items[0].designInsetMm, 15);
  assert.equal((await handleAdmin(a, { action: 'setProduct', data: { id: 'poster', enabled: true, designInsetMm: 0 } })).status, 200);
  const q0 = await handleMerch(e.ctx, 'quote', { items: [poster()], address: addr });
  assert.equal((await e.db.get(`merch_quotes/${q0.body.quoteId}`)).data.items[0].designInsetMm, 0);
  assert.ok((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'admin.setProduct').length >= 2);
  // a customer cannot change it
  assert.equal((await handleMerch(e.ctx, 'admin', { action: 'setProduct', data: { id: 'poster', designInsetMm: 5 } })).status, 403);
  // an exact A4/A3 print area: artwork is 190 x 277 mm and 277 x 400 mm
  const exact = env({ seed: { ...launchSeed(), 'merch_products/poster': { id: 'poster', enabled: true, verification: { sampleApproved: true }, printSpec: { ...POSTER_SPEC, bySize: { A4: { maxWidthInches: 210 / 25.4, maxHeightInches: 297 / 25.4, verified: true }, A3: { maxWidthInches: 297 / 25.4, maxHeightInches: 420 / 25.4, verified: true } } } } } });
  for (const [size, w, h] of [['A4', 190, 277], ['A3', 277, 400]]) {
    const qq = await handleMerch(exact.ctx, 'quote', { items: [poster({ size })], address: addr });
    const x = (await exact.db.get(`merch_quotes/${qq.body.quoteId}`)).data.items[0];
    assert.ok(Math.abs(x.artworkInches.width * 25.4 - w) < 1e-6 && Math.abs(x.artworkInches.height * 25.4 - h) < 1e-6, size);
  }
});

console.log('Full catalogue');
await test('every framed size and acrylic size: dimensions exist and the minimum text size is computed (never silently shrunk)', async () => {
  const { FRAMED_SIZES, ACRYLIC_SIZES } = await import('../src/merch/catalog.js');
  const { FRAME_MM, MIN_TEXT_MM } = await import('../src/merch/frames.js');
  for (const s of [...FRAMED_SIZES, ...ACRYLIC_SIZES]) assert.ok(FRAME_MM[s], `size ${s} has dimensions`);
  assert.equal(MIN_TEXT_MM, 1.5);
});
await test('Add stand = two Qikink line items (design product + plain stand), separate quote line; refused where the product has no stand', async () => {
  const seed = launchSeed();
  seed['merch_products/acrylic'] = { id: 'acrylic', enabled: true, standAsLine: true, verification: { sampleApproved: true }, printSpec: { printTypeId: 5, allowedPlacements: ['fr'], minDpi: 150, verified: true, perSize: true, bySize: { A4: { maxWidthInches: 8.27, maxHeightInches: 11.69, verified: true } } } };
  const inC = seed['merch_countries/IN'];
  seed['merch_countries/IN'] = { ...inC, taxByProduct: { poster: 18, acrylic: 18, 'acrylic-stand': 18, mug: 5 }, prices: { ...inC.prices, 'acrylic:A4': 499, 'acrylic-stand': 249 }, costs: { ...inC.costs, 'acrylic:A4': 140, 'acrylic-stand': 120 } };
  const e = env({ seed }); const sent = [];
  e.ctx.providerFor = () => ({ submitOrder: async (p) => { sent.push(p); return { ok: true, providerOrderId: 'P1' }; } });
  const ac = (extra = {}) => ({ productId: 'acrylic', collection: 'name_elements', color: 'white', size: 'A4', qty: 1, design: { name: 'Vibes' }, ...extra });
  const plain = await handleMerch(e.ctx, 'quote', { items: [ac()], address: addr });
  const withStand = await handleMerch(e.ctx, 'quote', { items: [ac({ addStand: true })], address: addr });
  assert.equal(plain.status, 200, JSON.stringify(plain.body)); assert.equal(withStand.status, 200, JSON.stringify(withStand.body));
  assert.ok(withStand.body.quote.total > plain.body.quote.total);
  const { id } = await order(e, [ac({ addStand: true })]);
  await pay(e, id);
  assert.equal(sent.length, 1); assert.equal(sent[0].items.length, 2);
  assert.equal(sent[0].items[0].productId, 'acrylic'); assert.equal(sent[0].items[1].productId, 'acrylic-stand'); assert.equal(sent[0].items[1].printTypeId, 1);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [poster({ addStand: true })], address: addr })).body.error, 'stand-unavailable');
});
await test('Blood Group designs: all 8 listed, admin can hide one, a hidden design cannot be quoted, COD still rejected', async () => {
  const e = env(); const a = e.as('admin@x.test');
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat.body.bloodDesigns.length, 8);
  assert.equal((await handleAdmin(a, { action: 'setBloodDesign', data: { code: 'AB-', visible: false } })).status, 200);
  const cat2 = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.equal(cat2.body.bloodDesigns.length, 7); assert.ok(!cat2.body.bloodDesigns.some((d) => d.code === 'AB-'));
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('AB-')], address: addr })).body.error, 'design-hidden');
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [mug('O+')], address: addr })).status, 200);
  assert.equal((await handleAdmin(a, { action: 'setBloodDesign', data: { code: 'ZZ', visible: false } })).status, 400);
  assert.ok((await e.db.list('merch_audit_logs')).some((l) => l.action === 'admin.setBloodDesign'));
  assert.equal((await handleMerch(e.ctx, 'verify', { orderId: 'x', proof: { method: 'cod' } })).body.error, 'cod-not-allowed');
});


console.log('Visibility (owner-only testing)');
await test('visibility: Nobody (default) / Admins only / Everyone, enforced for every merch API; admin actions stay reachable; changes audited', async () => {
  const seed = launchSeed(); seed['merch_settings/global'] = { enabled: true }; // no visibleTo = Nobody
  const e = env({ seed }); const admin = e.as('admin@x.test'); const anon = { ...e.ctx, who: null };
  const other = e.as('someone@x.test');
  const apis = [['catalogue', { country: 'IN' }], ['quote', { items: [poster()], address: addr }], ['checkout', { quoteId: 'x' }], ['artwork', {}], ['verify', { orderId: 'x', proof: {} }], ['visibility', {}], ['nothing', {}]];
  const all = async (c) => Promise.all(apis.map(async ([a, b]) => (await handleMerch(c, a, b)).status));
  for (const c of [e.ctx, anon, other]) assert.deepEqual(await all(c), apis.map(() => 404), 'Nobody: everyone gets 404');
  assert.equal((await handleMerch(admin, 'catalogue', { country: 'IN' })).status, 404); // even admins see nothing in the shop...
  const vis = await handleMerch(admin, 'visibility', {}); assert.equal(vis.status, 200); assert.equal(vis.body.visible, false); // ...but can read the setting
  assert.equal((await handleAdmin(other, { action: 'setVisibility', data: { visibleTo: 'everyone' } })).status, 403);
  assert.equal((await handleAdmin(admin, { action: 'setVisibility', data: { visibleTo: 'bogus' } })).status, 400);
  assert.equal((await handleAdmin(admin, { action: 'setVisibility', data: { visibleTo: 'admins' } })).status, 200);
  assert.equal((await handleMerch(admin, 'catalogue', { country: 'IN' })).status, 200);
  assert.equal((await handleMerch(admin, 'visibility', {})).body.visible, true);
  for (const c of [e.ctx, anon, other]) { assert.deepEqual(await all(c), apis.map(() => 404), 'Admins only: non-admins, signed-out and unverified get 404'); }
  const unverified = { ...admin, who: { ...admin.who, emailVerified: false } };
  assert.equal((await handleMerch(unverified, 'catalogue', { country: 'IN' })).status, 404);
  assert.equal((await handleAdmin(admin, { action: 'setVisibility', data: { visibleTo: 'everyone' } })).status, 200);
  assert.equal((await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).status, 200);
  assert.equal((await handleMerch(anon, 'visibility', {})).status, 200);
  assert.ok((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'admin.setVisibility').length >= 2);
});

console.log('Print-file storage (engine)');
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
function envF(opts = {}) {
  const e = env(opts); const cloud = makeFakeCloud();
  e.ctx.now = () => new Date(cloud.clock.t);
  e.ctx.files = createFileStore({ env: cloud.env, fetch: cloud.fetch, getSettings: async () => (await e.db.get('merch_settings/storage'))?.data || {}, now: () => new Date(cloud.clock.t) });
  e.ctx.artworkUrl = async (o, i, kind) => e.ctx.files.getSignedUrl(kind === 'mockup' ? i.mockup : i.artwork);
  return { ...e, cloud };
}
const upl = (e, id, kind = 'print', bytes = fakePng(), index = 0, who) => handleUpload(who || e.ctx, { orderId: id, index, kind, bytes });
async function stored(e, items = [poster()]) { const { id } = await order(e, items, { artwork: false }); assert.equal((await upl(e, id)).status, 200); assert.equal((await upl(e, id, 'mockup')).status, 200); return id; }
const orderOf = async (e, id) => (await e.db.get(`merch_orders/${id}`)).data;
const deletes = (cloud) => cloud.state.calls.filter((c) => c.startsWith('DELETE'));

await test('upload: the server stores the file (R2 first), records backend/key/bytes/sha256 on the order, key is under merch/print/<uid>/<order>/', async () => {
  const e = envF(); const { id } = await order(e, [poster()], { artwork: false });
  const png = fakePng(); const r = await upl(e, id, 'print', png);
  assert.equal(r.status, 200); assert.equal(r.body.backend, 'r2'); assert.equal(r.body.width, 2400);
  const a = (await orderOf(e, id)).items[0].artwork;
  assert.match(a.key, new RegExp(`^merch/print/u1/${id}/0-[A-Za-z0-9]+\\.png$`)); assert.equal(a.bytes, png.length); assert.match(a.sha256, /^[a-f0-9]{64}$/); assert.equal(a.backend, 'r2'); assert.ok(a.createdAt && a.expiresAt);
  assert.ok(e.cloud.state.r2.has(a.key));
  assert.equal((await upl(e, id, 'mockup')).status, 200); assert.match((await orderOf(e, id)).items[0].mockup.key, /^merch\/mockup\/u1\//);
  assert.equal((await handleMerch(e.ctx, 'artwork', { orderId: id, items: [] })).body.error, 'use-upload');
});
await test('upload refusals: not signed in, another buyer order, not a PNG (even as image/png), oversize, too few pixels, locked order, bad kind or index', async () => {
  const e = envF(); const { id } = await order(e, [poster()], { artwork: false });
  assert.equal((await upl(e, id, 'print', fakePng(), 0, { ...e.ctx, who: null })).status, 401);
  assert.equal((await upl(e, id, 'print', fakePng(), 0, { ...e.ctx, who: { uid: 'u2', email: 'u2@x.test', emailVerified: true } })).status, 404);
  assert.equal((await upl(e, id, 'print', new TextEncoder().encode('<html>hello</html>'.repeat(10)))).body.error, 'not-a-png');
  assert.equal((await upl(e, id, 'print', fakePng(2400, 3200, 15 * 1024 * 1024 + 1))).body.error, 'file-too-large');
  assert.equal((await upl(e, id, 'mockup', fakePng(2400, 3200, 5 * 1024 * 1024 + 1))).body.error, 'file-too-large');
  assert.equal((await upl(e, id, 'print', fakePng(600, 800))).body.error, 'resolution-too-low');
  assert.equal((await upl(e, id, 'print', fakePng(), 5)).body.error, 'bad-artwork-index');
  assert.equal((await upl(e, id, 'other')).body.error, 'bad-upload');
  assert.equal(e.cloud.state.r2.size + e.cloud.state.sb.size, 0, 'nothing was stored for any refused upload');
  await e.db.patch(`merch_orders/${id}`, { status: 'delivered' });
  assert.equal((await upl(e, id)).body.error, 'order-locked');
});
await test('upload: R2 down -> Supabase; both down -> 503 storage-unavailable and the order is NOT sent to Qikink; replacing a file removes the old copy', async () => {
  const e = envF(); const sent = []; e.ctx.providerFor = () => ({ submitOrder: async (p) => { sent.push(p); return { ok: true, providerOrderId: 'P' }; } });
  const { id } = await order(e, [poster()], { artwork: false });
  e.cloud.state.r2Down = true; assert.equal((await upl(e, id)).body.backend, 'supabase');
  const first = (await orderOf(e, id)).items[0].artwork.key;
  e.cloud.state.r2Down = false; assert.equal((await upl(e, id)).status, 200);
  assert.ok(!e.cloud.state.sb.has(first), 'the replaced file is gone');
  const { id: id2 } = await order(e, [poster()], { artwork: false });
  e.cloud.state.r2Down = true; e.cloud.state.sbDown = true;
  const bad = await upl(e, id2); assert.equal(bad.status, 503); assert.equal(bad.body.error, 'storage-unavailable');
  assert.ok(!(await orderOf(e, id2)).items[0].artwork);
  e.cloud.state.r2Down = false; e.cloud.state.sbDown = false;
  const blocked = await pay(e, id2); assert.equal(blocked.status, 409); assert.equal(blocked.body.error, 'artwork-missing'); // no file stored: the payment is not even confirmed and nothing is submitted
  assert.equal(sent.filter((p) => p.orderId === id2).length, 0); assert.equal((await orderOf(e, id2)).status, 'payment_pending');
  const noconf = envF(); noconf.ctx.files = createFileStore({ env: {}, fetch: noconf.cloud.fetch });
  const { id: id3 } = await order(noconf, [poster()], { artwork: false });
  assert.equal((await upl(noconf, id3)).body.error, 'storage-not-configured');
});
await test('before submitting, the signed link is fetched like the provider would: size, PNG type and hash must match; the provider gets that link', async () => {
  const e = envF(); const sent = []; e.ctx.providerFor = () => ({ submitOrder: async (p) => { sent.push(p); return { ok: true, providerOrderId: 'P' }; } });
  const id = await stored(e); await pay(e, id);
  assert.equal(sent.length, 1);
  const url = sent[0].items[0].designUrl; assert.match(url, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/prints-r2\/merch\/print\/u1\//);
  const got = await e.cloud.fetch(url); assert.equal(got.status, 200);
  assert.equal(Buffer.from(await got.arrayBuffer()).length, (await orderOf(e, id)).items[0].artwork.bytes);
  assert.match(sent[0].items[0].mockupUrl, /merch\/mockup\//);
  // tampered file (same size, different bytes) -> never submitted
  const t = envF(); const sent2 = []; t.ctx.providerFor = () => ({ submitOrder: async (p) => { sent2.push(p); return { ok: true }; } });
  const tid = await stored(t); const key = (await orderOf(t, tid)).items[0].artwork.key; const f = t.cloud.state.r2.get(key); f.bytes[100] ^= 255;
  await pay(t, tid); assert.equal(sent2.length, 0); assert.equal((await orderOf(t, tid)).exceptionReason, 'artwork-hash-mismatch');
  // vanished file
  const v = envF(); const sent3 = []; v.ctx.providerFor = () => ({ submitOrder: async (p) => { sent3.push(p); return { ok: true }; } });
  const vid = await stored(v); v.cloud.state.r2.clear(); await pay(v, vid);
  assert.equal(sent3.length, 0); assert.equal((await orderOf(v, vid)).exceptionReason, 'artwork-unreachable');
  // primary outage at submission with mirror on: the link comes from the other backend
  const m = envF(); await m.db.patch('merch_settings/storage', { mirror: true }); const sent4 = []; m.ctx.providerFor = () => ({ submitOrder: async (p) => { sent4.push(p); return { ok: true, providerOrderId: 'P' }; } });
  const mid = await stored(m); m.cloud.state.r2Down = true; await pay(m, mid);
  assert.equal(sent4.length, 1); assert.match(sent4[0].items[0].designUrl, /^https:\/\/sb\.test\//);
});

console.log('Automatic deletion of print files');
const settle = async (e, id, status, ageMs, extra = {}) => e.db.patch(`merch_orders/${id}`, { status, timeline: [{ state: status, at: new Date(e.cloud.clock.t - ageMs) }], ...extra });
const present = (e, rec) => e.cloud.state.r2.has(rec.key) || e.cloud.state.sb.has(rec.key);
await test('schedule: unpaid 48 h, cancelled/refunded 7 days, delivered 30 days after delivery; nothing earlier; the order record, sha256 and a removed timestamp stay', async () => {
  const e = envF();
  const cases = [['payment_pending', 47 * HOUR, 49 * HOUR], ['cancelled', 6 * DAY, 7 * DAY + HOUR], ['refunded', 6 * DAY, 8 * DAY], ['delivered', 29 * DAY, 31 * DAY]];
  for (const [status, early, late] of cases) {
    const id = await stored(e); const rec = (await orderOf(e, id)).items[0].artwork;
    const unpaid = status === 'payment_pending';
    await settle(e, id, status, early, unpaid ? { createdAt: new Date(e.cloud.clock.t - early) } : {});
    let r = await sweepFiles(e.ctx); assert.equal(r.deleted, 0, `${status} kept at ${early / HOUR} h`); assert.ok(present(e, rec));
    await settle(e, id, status, late, unpaid ? { createdAt: new Date(e.cloud.clock.t - late) } : {});
    r = await sweepFiles(e.ctx); assert.equal(r.deleted, 2, `${status} deleted at ${late / HOUR} h (print + mock-up)`); assert.ok(!present(e, rec));
    const o = await orderOf(e, id); assert.ok(o.items[0].artwork.fileDeletedAt && o.items[0].mockup.fileDeletedAt && o.fileDeletedAt); assert.equal(o.items[0].artwork.sha256, rec.sha256); assert.equal(o.status, status);
  }
  assert.ok(deletes(e.cloud).every((c) => /\/merch\/(print|mockup)\//.test(c)), 'only merch/print and merch/mockup are ever deleted');
  const again = await sweepFiles(e.ctx); assert.equal(again.due, 0); assert.equal(again.deleted, 0); // idempotent
  assert.equal((await e.db.list('merch_file_logs')).filter((l) => l.ok).length, 8);
});
await test('an open return, dispute or exception blocks deletion until it is closed plus the window; orders in progress are never touched', async () => {
  const e = envF(); const id = await stored(e); const rec = (await orderOf(e, id)).items[0].artwork;
  await settle(e, id, 'delivered', 100 * DAY, { openCase: true });
  assert.equal((await sweepFiles(e.ctx)).deleted, 0); assert.ok(present(e, rec));
  const admin = e.as('admin@x.test');
  assert.equal((await handleAdmin(admin, { action: 'setOpenCase', data: { orderId: id, open: false } })).status, 200); // closed now
  assert.equal((await sweepFiles(e.ctx)).deleted, 0, 'closed just now: the window starts at closing'); e.cloud.clock.t += 29 * DAY;
  assert.equal((await sweepFiles(e.ctx)).deleted, 0); e.cloud.clock.t += 2 * DAY;
  assert.equal((await sweepFiles(e.ctx)).deleted, 2);
  for (const status of ['exception', 'held_provider_funds', 'paid', 'submitted', 'in_production', 'shipped']) {
    const x = await stored(e); await settle(e, x, status, 400 * DAY); assert.equal((await sweepFiles(e.ctx)).deleted, 0, status);
  }
});
await test('admin: retention window 0-365 days (overall and per product), audited; dry run deletes nothing; real deletion only when dryRun is false; customers cannot', async () => {
  const e = envF(); const admin = e.as('admin@x.test'); const id = await stored(e); const rec = (await orderOf(e, id)).items[0].artwork;
  await settle(e, id, 'delivered', 11 * DAY);
  assert.equal((await sweepFiles(e.ctx)).due, 0);
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { retentionDays: 10 } })).status, 200);
  const dry = await handleAdmin(admin, { action: 'sweepFiles', data: {} }); // default = dry run
  assert.equal(dry.body.dryRun, true); assert.equal(dry.body.due, 2); assert.equal(dry.body.deleted, 0); assert.ok(present(e, rec));
  const rep = await handleAdmin(admin, { action: 'fileReport', data: {} }); assert.equal(rep.body.due, 2); assert.equal(rep.body.deleted, 0);
  const real = await handleAdmin(admin, { action: 'sweepFiles', data: { dryRun: false } }); assert.equal(real.body.deleted, 2); assert.ok(!present(e, rec));
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { retentionDays: 366 } })).status, 400);
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { retentionDays: -1 } })).status, 400);
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { retentionByProduct: { poster: 400 } } })).status, 400);
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { primary: 'dropbox' } })).status, 400);
  const id2 = await stored(e); await settle(e, id2, 'delivered', 3 * DAY);
  assert.equal((await handleAdmin(admin, { action: 'setStorage', data: { retentionByProduct: { poster: 2 } } })).status, 200);
  assert.equal((await sweepFiles(e.ctx)).deleted, 2, 'the per-product window (2 days) applies to the poster');
  assert.ok((await e.db.list('merch_audit_logs')).filter((l) => l.action === 'admin.setStorage').length >= 2);
  assert.equal((await handleAdmin(e.ctx, { action: 'sweepFiles', data: { dryRun: false } })).status, 403);
  assert.equal((await handleAdmin(e.ctx, { action: 'setStorage', data: { retentionDays: 0 } })).status, 403);
});
await test('failures are isolated: a failing backend leaves that file in place (logged), the others are deleted, and the next run finishes the job', async () => {
  const e = envF(); const a = await stored(e); e.cloud.state.r2Down = true; const b = await stored(e); e.cloud.state.r2Down = false; // a on r2, b on supabase
  const ra = (await orderOf(e, a)).items[0].artwork; const rb = (await orderOf(e, b)).items[0].artwork; assert.equal(ra.backend, 'r2'); assert.equal(rb.backend, 'supabase');
  await settle(e, a, 'cancelled', 8 * DAY); await settle(e, b, 'cancelled', 8 * DAY);
  e.cloud.state.sbDown = true;
  const r1 = await sweepFiles(e.ctx); assert.equal(r1.deleted, 2); assert.equal(r1.failed, 2);
  assert.ok(!present(e, ra)); assert.ok(e.cloud.state.sb.has(rb.key)); assert.equal((await orderOf(e, b)).items[0].artwork.fileDeletedAt, undefined);
  assert.equal((await e.db.list('merch_file_logs')).filter((l) => !l.ok).length, 2);
  const rep = await fileReport(e.ctx); assert.equal(rep.failed, 2); assert.equal(rep.due, 2);
  e.cloud.state.sbDown = false; const r2 = await sweepFiles(e.ctx); assert.equal(r2.deleted, 2); assert.ok(!e.cloud.state.sb.has(rb.key));
});
await test('mirrored copies are deleted from both backends', async () => {
  const e = envF(); await e.db.patch('merch_settings/storage', { mirror: true });
  const id = await stored(e); const rec = (await orderOf(e, id)).items[0].artwork; assert.ok(e.cloud.state.r2.has(rec.key) && e.cloud.state.sb.has(rec.key));
  await settle(e, id, 'cancelled', 8 * DAY); await sweepFiles(e.ctx);
  assert.ok(!e.cloud.state.r2.has(rec.key) && !e.cloud.state.sb.has(rec.key));
});
await test('admin health: each backend ok/failing/not configured, last failover, and a test upload that writes, reads and deletes a tiny file', async () => {
  const e = envF(); const admin = e.as('admin@x.test');
  let h = await handleAdmin(admin, { action: 'storageHealth', data: {} });
  assert.equal(h.body.backends.r2.status, 'ok'); assert.equal(h.body.backends.supabase.status, 'ok');
  const t = await handleAdmin(admin, { action: 'storageTest', data: {} });
  for (const n of ['supabase', 'r2']) assert.deepEqual(t.body.results[n], { ok: true, write: true, read: true, signedDownload: true, privateBucket: true, deleted: true, gone: true }); assert.equal(e.cloud.state.r2.size + e.cloud.state.sb.size, 0, 'the test file is removed again');
  e.cloud.state.r2Down = true; h = await handleAdmin(admin, { action: 'storageHealth', data: {} }); assert.equal(h.body.backends.r2.status, 'failing');
  const t2 = await handleAdmin(admin, { action: 'storageTest', data: {} }); assert.equal(t2.body.results.r2.ok, false); assert.equal(t2.body.results.supabase.ok, true);
  const none = envF(); none.ctx.files = createFileStore({ env: {}, fetch: none.cloud.fetch });
  h = await handleAdmin(none.as('admin@x.test'), { action: 'storageHealth', data: {} }); assert.equal(h.body.backends.r2.status, 'not-configured'); assert.equal(h.body.backends.supabase.status, 'not-configured');
  assert.equal((await handleAdmin(e.ctx, { action: 'storageHealth', data: {} })).status, 403);
  await e.db.patch('merch_settings/global', { visibleTo: 'nobody' }); // the upload route obeys the visibility setting like every customer action
  assert.equal((await upl(e, 'x')).status, 404);
});

console.log('Daily cron');
await test('cron: the secret check is constant-time-style (hashed, equal length) and refuses missing, wrong and empty secrets', async () => {
  assert.equal(await secretMatches('s3cret-value', 's3cret-value'), true);
  for (const [a, b] of [['s3cret-value', 's3cret-valuf'], ['s3cret-value', 's3cret'], ['s3cret-value', ''], ['', ''], [undefined, 'x'], ['s3cret-value', 's3cret-value-and-more']]) assert.equal(await secretMatches(a, b), false, `${a}/${b}`);
});
await test('cron: nothing to delete -> a short JSON result with counts only; dry run reports per rule and deletes/changes nothing; log rows hold order id and rule only', async () => {
  const e = envF(); const empty = await runCron(e.ctx);
  assert.equal(empty.status, 200); assert.deepEqual(Object.keys(empty.body).sort(), ['eligible', 'files', 'retried', 'synced']); assert.deepEqual(empty.body.files, { due: 0, deleted: 0, failed: 0 });
  const mk = async (status, ageMs, extra = {}) => { const id = await stored(e); await settle(e, id, status, ageMs, extra); return id; };
  await mk('payment_pending', 49 * HOUR, { createdAt: new Date(e.cloud.clock.t - 49 * HOUR) });
  await mk('cancelled', 8 * DAY); await mk('refunded', 9 * DAY); await mk('delivered', 31 * DAY);
  const open = await mk('delivered', 90 * DAY, { openCase: true }); await mk('exception', 90 * DAY); await mk('delivered', 5 * DAY);
  const before = e.cloud.state.r2.size + e.cloud.state.sb.size;
  const dry = await runCron(e.ctx, { dryRun: true });
  assert.equal(dry.status, 200); assert.equal(dry.body.dryRun, true); assert.equal(dry.body.deleted, 0);
  assert.deepEqual(dry.body.byRule, { unpaid48h: 2, cancelledOrRefunded7d: 4, delivered30d: 2 }); assert.equal(dry.body.wouldDelete, 8);
  assert.equal(dry.body.skippedOpenCase, 4, 'open delivered case + exception order are kept (print + mock-up each)');
  assert.equal(e.cloud.state.r2.size + e.cloud.state.sb.size, before, 'a dry run deletes nothing');
  assert.equal((await e.db.list('merch_file_logs')).length, 0, 'and writes no deletion log');
  assert.ok(!JSON.stringify(dry.body).includes('merch/'), 'counts only: no keys or file names in the response');
  const real = await runCron(e.ctx); assert.deepEqual(real.body.files, { due: 8, deleted: 8, failed: 0 });
  const logs = await e.db.list('merch_file_logs'); assert.equal(logs.length, 8);
  for (const l of logs) { assert.deepEqual(Object.keys(l).sort(), ['at', 'id', 'index', 'kind', 'ok', 'orderId', 'results', 'rule']); assert.match(l.rule, /^(unpaid48h|cancelledOrRefunded7d|delivered30d)$/); assert.ok(!JSON.stringify(l).includes('merch/') && !JSON.stringify(l).includes('https://')); }
  assert.ok(e.cloud.state.r2.size + e.cloud.state.sb.size > 0, 'the open case and the recent order keep their files');
  assert.ok((await orderOf(e, open)).items[0].artwork.key);
  const again = await runCron(e.ctx); assert.deepEqual(again.body.files, { due: 0, deleted: 0, failed: 0 });
});

console.log('Qikink written answers (ticket 136313)');
await test('verification levels: Admins only needs (a) or (b); Everyone needs (c); the server enforces it and every change is audited', async () => {
  const seed = launchSeed(); seed['merch_settings/global'] = { visibleTo: 'admins', enabled: true };
  seed['merch_products/mug'] = { id: 'mug', enabled: true, printSpec: MUG_SPEC }; // no sampleApproved
  const e = env({ seed }); const admin = e.as('admin@x.test');
  const q = (c) => handleMerch(c, 'quote', { items: [mug()], address: addr });
  assert.equal((await q(admin)).status, 200, 'admins-only testing works without an approved sample (levels a/b)');
  await handleAdmin(admin, { action: 'setVisibility', data: { visibleTo: 'everyone' } });
  const blocked = await q(e.ctx); assert.equal(blocked.status, 409); assert.equal(blocked.body.reason, 'sample-not-approved');
  assert.ok(!(await handleMerch(e.ctx, 'catalogue', { country: 'IN' })).body.products.some((p) => p.id === 'mug'), 'unapproved products are not listed for Everyone');
  assert.equal((await handleAdmin(admin, { action: 'setVerification', data: { productId: 'mug', level: 'bogus', value: true } })).status, 400);
  assert.equal((await handleAdmin(e.ctx, { action: 'setVerification', data: { productId: 'mug', level: 'sampleApproved', value: true } })).status, 403);
  assert.equal((await handleAdmin(admin, { action: 'setVerification', data: { productId: 'mug', level: 'sampleApproved', value: true, source: 'owner approved sample 1' } })).status, 200);
  assert.equal((await q(e.ctx)).status, 200);
  assert.ok((await e.db.list('merch_audit_logs')).some((l) => l.action === 'admin.setVerification'));
  assert.deepEqual(verificationLevels(DEFAULT_PRODUCTS.poster, 'A4'), { specConfirmed: true, sandboxAccepted: false, sampleApproved: false, source: DEFAULT_PRODUCTS.poster.verification.source });
  assert.equal(verificationLevels(DEFAULT_PRODUCTS.mug, '11oz').sandboxAccepted, true);
});
await test('print type 5 for framed and acrylic posters carries the Qikink source; the stand as a second line item is OFF by default (single-SKU stand not confirmed)', async () => {
  for (const id of ['poster', 'acrylic']) { const ps = DEFAULT_PRODUCTS[id].printSpec; assert.equal(ps.printTypeId, 5); assert.deepEqual(ps.allowedPlacements, ['fr']); assert.match(ps.source, /ticket 136313/); assert.ok(Object.values(ps.bySize).every((s) => s.verified === true)); }
  assert.equal(DEFAULT_PRODUCTS.acrylic.standAsLine, false); assert.equal(DEFAULT_PRODUCTS.acrylic.standSingleSkuConfirmed, false);
  const seed = launchSeed(); const inC = seed['merch_countries/IN'];
  seed['merch_products/acrylic'] = { id: 'acrylic', enabled: true, verification: { sampleApproved: true } }; // flag NOT set
  seed['merch_countries/IN'] = { ...inC, taxByProduct: { ...inC.taxByProduct, acrylic: 18, 'acrylic-stand': 18 }, prices: { ...inC.prices, 'acrylic:A4': 499, 'acrylic-stand': 249 } };
  const e = env({ seed });
  const ac = (extra = {}) => ({ productId: 'acrylic', collection: 'name_elements', color: 'white', size: 'A4', qty: 1, design: { name: 'Vibes' }, ...extra });
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [ac()], address: addr })).status, 200);
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [ac({ addStand: true })], address: addr })).body.error, 'stand-unavailable');
});
await test('shipping cost slabs: 500 g surface Rs 50 is confirmed; heavier framed posters (A4 ~1.4 kg, A3 ~2 kg) use a placeholder that is flagged unconfirmed', () => {
  const india = { shippingCost: SHIPPING_COST_PLACEHOLDER };
  const light = shippingCostFor(india, 'mug', '11oz'); assert.equal(light.unconfirmed, true); // weight unknown -> never presented as final
  const a4 = shippingCostFor(india, 'poster', 'A4'); assert.deepEqual([a4.weightGrams, a4.amount, a4.unconfirmed], [1400, 50, true]);
  const a3 = shippingCostFor(india, 'poster', 'A3'); assert.deepEqual([a3.weightGrams, a3.unconfirmed], [2000, true]);
  const edited = shippingCostFor({ shippingCost: { slabs: [{ upToGrams: 500, amount: 50, confirmed: true }, { upToGrams: 3000, amount: 120, confirmed: true }] } }, 'poster', 'A3');
  assert.deepEqual([edited.amount, edited.unconfirmed], [120, false]); // once the owner confirms a slab it stops being flagged
});
await test('trim rule: a transparent edge is refused, an opaque flat-colour border is accepted', () => {
  const strip = (alpha, n = 8) => { const d = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) d[i * 4 + 3] = alpha; return d; };
  assert.deepEqual(transparentEdges({ top: strip(255), bottom: strip(255), left: strip(255), right: strip(255) }), []);
  const bad = strip(255); bad[3 * 4 + 3] = 0;
  assert.deepEqual(transparentEdges({ top: strip(255), bottom: bad, left: strip(255), right: strip(0) }), ['bottom', 'right']);
  assert.deepEqual(transparentEdges({ top: strip(254), bottom: strip(255), left: strip(255), right: strip(255) }), ['top']); // even faint transparency
});
await test('new Qikink sizes 12x24, 14x14, 16x24, 18x24: layouts and DPI checks work, but no SKU is added until it is found on the SKU list', () => {
  for (const [s, w, h] of [['12x24', 304.8, 609.6], ['14x14', 355.6, 355.6], ['16x24', 406.4, 609.6], ['18x24', 457.2, 609.6]]) {
    assert.deepEqual(FRAME_MM[s], [w, h]);
    const { design } = buildDesign('name_elements', { frame: 'elements-gold', name: 'Vibes' });
    const lay = layoutFrame(design, Math.round(w / 25.4 * 150), Math.round(h / 25.4 * 150));
    assert.ok(lay && Object.keys(lay).length > 0, s + ' lays out');
  }
  assert.ok(!FRAMED_SIZES.includes('12x24') && !FRAMED_SIZES.includes('14x14') && !FRAMED_SIZES.includes('18x24'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
