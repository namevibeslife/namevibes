// Placement, print-area, resolution and mock-up tests (no browser, no network).
// The pixel-level check of the real canvas renderer runs in the browser test (scripts/test-merch-browser.mjs).
// Usage: node scripts/test-placement.mjs      (npm run test:placement)
import assert from 'node:assert/strict';
import { createMemoryDb } from '../src/merch/memoryDb.js';
import { placementBox, normaliseLayout, designAspect, specProblems, specComplete, effectiveSpec, readiness, readySizes, sizeReady, designDpi, resolutionStatus, maxScaleForDpi, defaultLayoutFor, fitRect } from '../src/merch/layout.js';
import { DEFAULT_PRODUCTS, mergeProducts } from '../src/merch/catalog.js';
import { checkAvailability } from '../src/merch/availability.js';
import { printSvg, productMockup, productPreviewSvg } from '../src/merch/render.js';
import { buildNameElementsDesign } from '../src/merch/designs.js';
import { buildOrderPayload } from '../src/merch/providers/qikink.js';
import { handleMerch, handleAdmin } from '../src/merch/engine.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); } };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

const AREA = { width: 3600, height: 4800 }; // 12 x 16 in at 300 DPI

console.log('Layout: where the design lands in the print file');
await test('centred, scaled and corner positions give the right pixel boxes', () => {
  const centred = placementBox(AREA, { scale: 0.5, x: 0.5, y: 0.5 }, 0.8);
  assert.deepEqual(centred, { x: 900, y: 1275, width: 1800, height: 2250 });
  const topLeft = placementBox(AREA, { scale: 0.5, x: 0, y: 0 }, 0.8);
  assert.deepEqual(topLeft, { x: 0, y: 0, width: 1800, height: 2250 }); // clamped: never outside the area
  const bottomRight = placementBox(AREA, { scale: 0.5, x: 1, y: 1 }, 0.8);
  assert.deepEqual(bottomRight, { x: 1800, y: 2550, width: 1800, height: 2250 });
  const off = placementBox(AREA, { scale: 0.4, x: 0.3, y: 0.7 }, 0.8); // an off-centre design
  near(off.width, 1440); near(off.height, 1800); near(off.x, 0.3 * 3600 - 720); near(off.y, 0.7 * 4800 - 900);
  const full = placementBox(AREA, { scale: 1, x: 0.5, y: 0.5 }, 0.8);
  assert.deepEqual(full, { x: 0, y: 150, width: 3600, height: 4500 });
  const tall = placementBox(AREA, { scale: 1, x: 0.5, y: 0.5 }, 0.5); // taller than the area allows: height limits
  assert.deepEqual(tall, { x: 600, y: 0, width: 2400, height: 4800 });
});
await test('bad layouts are normalised: out of range, NaN, missing, strings', () => {
  assert.deepEqual(normaliseLayout(undefined), { scale: 0.8, x: 0.5, y: 0.5 });
  assert.deepEqual(normaliseLayout({ scale: 5, x: -2, y: 9 }), { scale: 1, x: 0, y: 1 });
  assert.deepEqual(normaliseLayout({ scale: 0.01 }), { scale: 0.2, x: 0.5, y: 0.5 });
  assert.deepEqual(normaliseLayout({ scale: 'abc', x: NaN }), { scale: 0.8, x: 0.5, y: 0.5 });
  const b = placementBox(AREA, { scale: 1, x: 9, y: -9 }, 0.8);
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 3600 && b.y + b.height <= 4800);
});
await test('print file and preview come from the same layout: the design sits at the same fractions of the print area', () => {
  const { design } = buildNameElementsDesign('Vibes');
  const spec = DEFAULT_PRODUCTS.tshirt.printSpec;
  const layout = { scale: 0.45, x: 0.25, y: 0.8 };
  const box = placementBox(AREA, layout, designAspect(design));
  // print file: every tile of the design is drawn inside that box
  const svg = printSvg(design, AREA, { ink: '#000', layout });
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  assert.ok(rects.length >= 4);
  for (const [x, y, w, h] of rects) { assert.ok(x >= box.x - 1 && y >= box.y - 1 && x + w <= box.x + box.width + 1 && y + h <= box.y + box.height + 1, `tile outside box: ${[x, y, w, h]}`); }
  assert.match(svg, /width="3600" height="4800"/);
  // preview: the same fractions of the printed area drawn on the product
  const m = productMockup(DEFAULT_PRODUCTS.tshirt, '#FFFFFF', design, { layout, spec });
  near((m.designBox.x - m.areaRect.x) / m.areaRect.width, box.x / AREA.width);
  near((m.designBox.y - m.areaRect.y) / m.areaRect.height, box.y / AREA.height);
  near(m.designBox.width / m.areaRect.width, box.width / AREA.width);
  near(m.designBox.height / m.areaRect.height, box.height / AREA.height);
  near(m.areaRect.width / m.areaRect.height, 12 / 16); // the drawn print area has the real aspect
  const sv = productPreviewSvg(DEFAULT_PRODUCTS.tshirt, '#FFFFFF', design, { layout, spec, showArea: true });
  assert.match(sv, /data-print-area/); // the printable area is shown on the preview
  assert.ok(!productPreviewSvg(DEFAULT_PRODUCTS.tshirt, '#FFFFFF', design, { layout, spec }).includes('data-print-area'));
});
await test('moving the layout moves the preview and the print file consistently (corner vs centre differ)', () => {
  const { design } = buildNameElementsDesign('Vibes');
  const spec = DEFAULT_PRODUCTS.tshirt.printSpec;
  const a = productMockup(DEFAULT_PRODUCTS.tshirt, '#FFF', design, { layout: { scale: 0.4, x: 0, y: 0 }, spec }).designBox;
  const b = productMockup(DEFAULT_PRODUCTS.tshirt, '#FFF', design, { layout: { scale: 0.4, x: 0.5, y: 0.5 }, spec }).designBox;
  assert.ok(a.x < b.x && a.y < b.y);
  assert.notEqual(printSvg(design, AREA, { layout: { scale: 0.4, x: 0, y: 0 } }), printSvg(design, AREA, { layout: { scale: 0.4, x: 0.5, y: 0.5 } }));
});

console.log('Print spec and blocked products');
await test('catalogue defaults: everything starts DISABLED; only the white mug has a verified print area (confirmed in the Qikink sandbox); the rest is blocked until Qikink data is filled in', () => {
  assert.ok(Object.values(DEFAULT_PRODUCTS).every((p) => p.enabled === false), 'every product starts disabled');
  const mug = DEFAULT_PRODUCTS.mug.printSpec;
  assert.deepEqual([mug.printTypeId, mug.allowedPlacements, mug.maxWidthInches, mug.maxHeightInches, mug.verified], [5, ['fr'], 8.5, 3.5, true]);
  assert.equal(readiness(DEFAULT_PRODUCTS.mug).ok, true);
  for (const id of ['poster', 'acrylic', 'acrylic-frame', 'steel-bottle', 'sipper-bottle', 'tumbler', 'notebook']) { assert.equal(readiness(DEFAULT_PRODUCTS[id]).ok, false, id); assert.equal(readiness(DEFAULT_PRODUCTS[id]).reason, 'print-area-missing', id); }
  assert.equal(specComplete(DEFAULT_PRODUCTS.tshirt.printSpec), true);
  assert.equal(readiness(DEFAULT_PRODUCTS.tshirt).reason, 'print-area-unverified'); // complete but never confirmed
  const settings = { enabled: true }; const country = { enabled: true, collections: { name_elements: true, blood_group: true }, prices: { mug: 399, poster: 599, 'steel-bottle': 599 } };
  assert.equal(checkAvailability({ settings, country, product: DEFAULT_PRODUCTS.mug, collection: 'blood_group' }).reason, 'product-off');
  assert.equal(checkAvailability({ settings, country, product: { ...DEFAULT_PRODUCTS.mug, enabled: true }, collection: 'blood_group' }).ok, true);
  assert.equal(checkAvailability({ settings, country, product: { ...DEFAULT_PRODUCTS.mug, enabled: true }, collection: 'name_elements' }).reason, 'product-collection');
  assert.equal(checkAvailability({ settings, country, product: { ...DEFAULT_PRODUCTS.poster, enabled: true }, collection: 'name_elements' }).reason, 'print-area-missing');
  assert.equal(checkAvailability({ settings, country, product: { ...DEFAULT_PRODUCTS.poster, enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true, bySize: { A4: { maxWidthInches: 8, maxHeightInches: 11 } } } }, collection: 'name_elements' }).reason, 'print-area-unverified');
});
await test('per-size print areas: a framed poster needs a complete area for EVERY size to be complete, but only the verified sizes are sold', () => {
  const base = { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true };
  assert.deepEqual(specProblems({ ...base, bySize: { A4: { maxWidthInches: 8, maxHeightInches: 11 } } }, ['A4', 'A3']), ['size A3:maxWidthInches', 'size A3:maxHeightInches']);
  const ok = { ...base, bySize: { A4: { maxWidthInches: 8, maxHeightInches: 11, verified: true }, A3: { maxWidthInches: 11.5, maxHeightInches: 16 } } };
  assert.deepEqual(specProblems(ok, ['A4', 'A3']), []);
  assert.equal(effectiveSpec(ok, null, 'A3').maxHeightInches, 16);
  assert.deepEqual(specProblems({ ...ok, bySize: { ...ok.bySize, A3: { maxWidthInches: 17, maxHeightInches: 16 } } }, ['A4', 'A3']), ['exceedsTypeLimit']);
  const product = { sizes: ['A4', 'A3'], printSpec: ok };
  assert.deepEqual(readySizes(product), ['A4']); // A3 is filled in but not verified
  assert.equal(sizeReady(product, 'A3').reason, 'print-area-unverified');
});
await test('spec validation: type ids, placements, sizes, documented DTG 16x20 / DTF 18x20 limits', () => {
  const ok = { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 16, maxHeightInches: 20, minDpi: 150 };
  assert.deepEqual(specProblems(ok), []);
  assert.deepEqual(specProblems({ ...ok, maxWidthInches: 16.1 }), ['exceedsTypeLimit']);
  assert.deepEqual(specProblems({ ...ok, printTypeId: 17, maxWidthInches: 18, maxHeightInches: 20 }), []);
  assert.deepEqual(specProblems({ ...ok, printTypeId: 17, maxWidthInches: 18.5 }), ['exceedsTypeLimit']);
  assert.ok(specProblems({ ...ok, printTypeId: 4 }).includes('printTypeId'));
  assert.ok(specProblems({ ...ok, allowedPlacements: ['xx'] }).includes('allowedPlacements'));
  assert.ok(specProblems({ ...ok, allowedPlacements: [] }).includes('allowedPlacements'));
  assert.ok(specProblems({ ...ok, minDpi: 0 }).includes('minDpi'));
  assert.ok(specProblems({}).length >= 4); assert.deepEqual(specProblems(null), ['missing']);
  assert.equal(effectiveSpec(ok, { maxWidthInches: 10 }).maxWidthInches, 10);
  assert.equal(effectiveSpec(ok, { maxWidthInches: '' }).maxWidthInches, 16);
});

console.log('Resolution');
await test('blood-group masters (1312 px) fail on big prints and pass when small; name tiles are vector', () => {
  const spec = DEFAULT_PRODUCTS.tshirt.printSpec; const blood = { collection: 'blood_group', bloodGroup: 'O+' };
  const big = designDpi({ design: blood, spec, layout: { scale: 1, x: 0.5, y: 0.5 } });
  assert.equal(big.dpi, Math.round(1312 / 12)); assert.equal(resolutionStatus(big.dpi, { minDpi: 150 }), 'blocked');
  const mid = designDpi({ design: blood, spec, layout: { scale: 0.7, x: 0.5, y: 0.5 } });
  assert.equal(resolutionStatus(mid.dpi, { minDpi: 150 }), 'low');
  const small = designDpi({ design: blood, spec, layout: { scale: 0.35, x: 0.5, y: 0.5 } });
  assert.equal(resolutionStatus(small.dpi, { minDpi: 150 }), 'ok'); assert.ok(small.dpi >= 300);
  const { design } = buildNameElementsDesign('Vibes');
  assert.equal(designDpi({ design, spec, layout: { scale: 1, x: 0.5, y: 0.5 } }).dpi, 300);
  const cap = maxScaleForDpi({ design: blood, spec, minDpi: 150 });
  assert.equal(resolutionStatus(designDpi({ design: blood, spec, layout: { scale: cap, x: 0.5, y: 0.5 } }).dpi, { minDpi: 149 }), 'low');
  const dflt = defaultLayoutFor(blood, spec);
  assert.ok(dflt.scale < 0.8 && resolutionStatus(designDpi({ design: blood, spec, layout: dflt }).dpi, { minDpi: 150 }) !== 'blocked');
  assert.equal(defaultLayoutFor(design, spec).scale, 0.8);
});

console.log('Engine: print areas, resolution, mock-ups, payload to Qikink');
const baseSeed = () => ({
  'merch_settings/global': { enabled: true },
  'merch_products/tshirt': { id: 'tshirt', enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: true } },
  'merch_countries/IN': { countryCode: 'IN', enabled: true, currency: 'INR', taxPercent: 18, taxIncluded: true, collections: { name_elements: true, blood_group: true }, prices: { tshirt: 799, mug: 399, poster: 599 }, costs: { tshirt: 420 }, shipping: { flat: 60 }, providerPrimary: 'p' },
  'merch_providers/p': { id: 'p', adapter: 'mock', active: true, countries: ['IN'] },
  'admins/admin@x.test': { role: 'super' }, 'users/u1': { email: 'u1@x.test', countryCode: 'IN' }, 'paymentSettings/razorpay': {}
});
function env(seed = baseSeed(), who = { uid: 'u1', email: 'u1@x.test', emailVerified: true }) {
  const db = createMemoryDb(seed); let n = 0; const submitted = [];
  const ctx = {
    db, env: {}, who, now: () => new Date(), id: () => `eid${++n}x${Math.random().toString(36).slice(2, 8)}`,
    providerFor: () => ({ submitOrder: async (p) => { submitted.push(p); return { ok: true, providerOrderId: `P${submitted.length}` }; } }),
    artworkUrl: async (o, i, kind) => `https://art.test/${kind}/${i.index}`,
    gateways: { async create(o) { return { orderId: `gw_${o.id}`, client: {} }; }, async verify() { return { transactionId: 'pay_1' }; }, async checkCaptured() { return {}; }, async refund() { return { ok: true }; } }
  };
  return { ctx, db, submitted };
}
const addr = { name: 'A B', phone: '9999999999', line1: '1 Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' };
const nameItem = (extra = {}) => ({ productId: 'tshirt', collection: 'name_elements', color: 'white', size: 'M', qty: 1, design: { name: 'Vibes' }, ...extra });
const bloodItem = (extra = {}) => ({ productId: 'tshirt', collection: 'blood_group', color: 'white', size: 'M', qty: 1, design: { bloodGroup: 'O+', confirmed: true }, ...extra });

await test('switching a product ON needs a complete AND verified print area (server-enforced, single and bulk); a verified size unblocks only that size', async () => {
  const e = env();
  const admin = env(baseSeed(), { uid: 'adm', email: 'admin@x.test', emailVerified: true });
  const cat = await handleMerch(e.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(cat.body.products.map((p) => p.id), ['tshirt']); // poster/acrylic/bottles are disabled and unverified
  const q = await handleMerch(e.ctx, 'quote', { items: [{ ...bloodItem(), productId: 'mug', size: '11oz', color: 'white' }], address: addr });
  assert.equal(q.status, 409); assert.equal(q.body.error, 'merch-product-off'); assert.equal(q.body.reason, 'product-off');
  const none = await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'poster', enabled: true } });
  assert.equal(none.status, 400); assert.equal(none.body.error, 'not-ready');
  const unverified = await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'poster', enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true, bySize: { A4: { maxWidthInches: 8.27, maxHeightInches: 11.69 } } } } });
  assert.equal(unverified.status, 400); assert.equal(unverified.body.reason, 'print-area-unverified');
  const bulk = await handleAdmin(admin.ctx, { action: 'bulkSwitch', data: { scope: 'products', productIds: ['acrylic'], enabled: true } });
  assert.equal(bulk.status, 400); assert.equal(bulk.body.error, 'not-ready');
  const tooBig = await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'mug', enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 17, maxHeightInches: 10, minDpi: 150, verified: true } } });
  assert.equal(tooBig.status, 400); assert.equal(tooBig.body.error, 'print-spec-invalid');
  const yes = await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'mug', enabled: true } }); // the default mug spec IS verified
  assert.equal(yes.status, 200);
  const q2 = await handleMerch(admin.ctx, 'quote', { items: [{ ...bloodItem(), productId: 'mug', size: '11oz' }], address: addr });
  assert.equal(q2.status, 200, JSON.stringify(q2.body));
  // one verified poster size
  const one = await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'poster', enabled: true, printSpec: { printTypeId: 1, allowedPlacements: ['fr'], minDpi: 150, perSize: true, bySize: { A4: { maxWidthInches: 8.27, maxHeightInches: 11.69, verified: true }, A3: { maxWidthInches: 11.69, maxHeightInches: 16.54 } } } } });
  assert.equal(one.status, 200, JSON.stringify(one.body));
  await admin.db.patch('merch_countries/IN', { prices: { tshirt: 799, mug: 399, poster: 599 } });
  const catalogue = await handleMerch(admin.ctx, 'catalogue', { country: 'IN' });
  assert.deepEqual(catalogue.body.products.find((p) => p.id === 'poster').sizes, ['A4']);
  const poster = (size) => ({ productId: 'poster', collection: 'name_elements', color: 'frame-black', size, qty: 1, design: { name: 'Vibes' } });
  assert.equal((await handleMerch(admin.ctx, 'quote', { items: [poster('A4')], address: addr })).status, 200);
  const a3 = await handleMerch(admin.ctx, 'quote', { items: [poster('A3')], address: addr });
  assert.equal(a3.status, 409); assert.equal(a3.body.reason, 'print-area-unverified');
  assert.ok((await admin.db.list('merch_audit_logs')).some((l) => l.action === 'admin.setProduct'));
});
await test('the layout is validated and clamped on the server and stored; default layout is chosen when none is sent', async () => {
  const e = env();
  const q = await handleMerch(e.ctx, 'quote', { items: [nameItem({ layout: { scale: 9, x: -4, y: 'junk' } })], address: addr });
  assert.equal(q.status, 200);
  const stored = (await e.db.get(`merch_quotes/${q.body.quoteId}`)).data.items[0];
  assert.deepEqual(stored.layout, { scale: 1, x: 0, y: 0.5 });
  assert.deepEqual(stored.canvasInches, { width: 12, height: 16 }); assert.equal(stored.placementSku, 'fr');
  const q2 = await handleMerch(e.ctx, 'quote', { items: [bloodItem()], address: addr }); // no layout sent
  assert.equal(q2.status, 200, JSON.stringify(q2.body));
  assert.notEqual(q2.body.resolution[0].status, 'blocked');
});
await test('too-low resolution is blocked with a clear message and a suggested size; admin can override per product', async () => {
  const e = env();
  const q = await handleMerch(e.ctx, 'quote', { items: [bloodItem({ layout: { scale: 1, x: 0.5, y: 0.5 } })], address: addr });
  assert.equal(q.status, 409); assert.equal(q.body.error, 'resolution-too-low');
  assert.equal(q.body.minDpi, 150); assert.ok(q.body.dpi < 150); assert.ok(q.body.maxScale > 0.5 && q.body.maxScale < 0.8);
  const ok = await handleMerch(e.ctx, 'quote', { items: [bloodItem({ layout: { scale: q.body.maxScale, x: 0.5, y: 0.5 } })], address: addr });
  assert.equal(ok.status, 200);
  const admin = env(baseSeed(), { uid: 'adm', email: 'admin@x.test', emailVerified: true });
  await handleAdmin(admin.ctx, { action: 'setProduct', data: { id: 'tshirt', enabled: true, dpiOverride: true } });
  const forced = await handleMerch(admin.ctx, 'quote', { items: [bloodItem({ layout: { scale: 1, x: 0.5, y: 0.5 } })], address: addr });
  assert.equal(forced.status, 200); assert.equal(forced.body.resolution[0].status, 'blocked');
  // the name tiles are vector, so they never fail the check
  assert.equal((await handleMerch(e.ctx, 'quote', { items: [nameItem({ layout: { scale: 1, x: 0.5, y: 0.5 } })], address: addr })).status, 200);
});
async function paid(e, items, attach) {
  const q = await handleMerch(e.ctx, 'quote', { items, address: addr }); assert.equal(q.status, 200, JSON.stringify(q.body));
  const c = await handleMerch(e.ctx, 'checkout', { quoteId: q.body.quoteId }); assert.equal(c.status, 200, JSON.stringify(c.body));
  const id = c.body.orderId;
  const a = await handleMerch(e.ctx, 'artwork', { orderId: id, items: [{ index: 0, sha256: 'a'.repeat(64), path: `merch/print/u1/${id}/0.png`, width: 3600, height: 4800, ...(attach ? attach(id) : {}) }] });
  return { id, a, c };
}
await test('mock-up: a real mock-up is sent to Qikink when the browser made one; otherwise the print file is used and that is recorded', async () => {
  const e = env();
  const { id, a } = await paid(e, [nameItem({ layout: { scale: 0.4, x: 0.3, y: 0.7 } })], (oid) => ({ mockup: { path: `merch/mockup/u1/${oid}/0.png`, sha256: 'b'.repeat(64) } }));
  assert.equal(a.status, 200);
  await handleMerch(e.ctx, 'verify', { orderId: id, proof: {} });
  assert.equal(e.submitted[0].items[0].mockupUrl, 'https://art.test/mockup/0');
  assert.equal(e.submitted[0].items[0].designUrl, 'https://art.test/print/0');
  assert.deepEqual(e.submitted[0].items[0].layout, { scale: 0.4, x: 0.3, y: 0.7 });
  assert.deepEqual(e.submitted[0].items[0].canvasInches, { width: 12, height: 16 });
  assert.deepEqual((await e.db.get(`merch_fulfillments/${id}`)).data.mockupSources, ['mockup']);
  const f = env();
  const second = await paid(f, [nameItem()], null);
  await handleMerch(f.ctx, 'verify', { orderId: second.id, proof: {} });
  assert.equal(f.submitted[0].items[0].mockupUrl, null);
  assert.deepEqual((await f.db.get(`merch_fulfillments/${second.id}`)).data.mockupSources, ['print-fallback']);
});
await test('a mock-up path outside the customer\'s own order folder is refused', async () => {
  const e = env();
  const { a } = await paid(e, [nameItem()], () => ({ mockup: { path: 'merch/mockup/someone-else/x/0.png', sha256: 'b'.repeat(64) } }));
  assert.equal(a.status, 400); assert.equal(a.body.error, 'bad-mockup');
});
await test('Qikink payload declares the print-area canvas size and the placement from the spec; over-limit canvases are refused', () => {
  const item = { index: 0, qty: 1, unitPrice: 799, designUrl: 'https://a.test/p.png', mockupUrl: 'https://a.test/m.png', designSha256: 'ab'.repeat(32), canvasInches: { width: 12, height: 16 }, placementSku: 'fr', providerSku: { sku: 'S', printTypeId: 1 } };
  const base = { orderId: 'abc123', address: addr, email: 'a@x.test', totalValue: 859, items: [item] };
  const d = buildOrderPayload(base).payload.line_items[0].designs[0];
  assert.equal(d.width_inches, 12); assert.equal(d.height_inches, 16); assert.equal(d.placement_sku, 'fr');
  assert.equal(d.design_link, 'https://a.test/p.png'); assert.equal(d.mockup_link, 'https://a.test/m.png');
  assert.equal(buildOrderPayload({ ...base, items: [{ ...item, canvasInches: { width: 17, height: 16 } }] }).error, 'design-too-large');
  assert.equal(buildOrderPayload({ ...base, items: [{ ...item, canvasInches: { width: 18, height: 20 }, providerSku: { sku: 'S', printTypeId: 17 } }] }).error, undefined);
  assert.equal(buildOrderPayload({ ...base, items: [{ ...item, placementSku: 'zz' }] }).error, 'placement-invalid');
  assert.equal(buildOrderPayload({ ...base, items: [{ ...item, mockupUrl: null }] }).payload.line_items[0].designs[0].mockup_link, 'https://a.test/p.png');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
