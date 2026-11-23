// Browser workflow test for the merchandise module in mock mode (Playwright + Chromium).
//   1. npm run dev:mock -- --port 5190        2. node scripts/test-merch-browser.mjs
// Env: PLAYWRIGHT_MODULE (path to playwright/index.mjs), CHROME (chromium executable), BASE_URL.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs');
const BASE = process.env.BASE_URL || 'http://localhost:5190';
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const dialogMessages = [];
page.on('dialog', (d) => { dialogMessages.push(d.message()); d.accept(); });

let passed = 0;
const step = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); await page.screenshot({ path: `artifacts/merch/fail-${passed}.png` }).catch(() => {}); throw e; } };
const signIn = async (uid, email, name) => { await page.evaluate(([u, e, n]) => localStorage.setItem('nv_mock_session', JSON.stringify({ uid: u, email: e, displayName: n })), [uid, email, name]); };
const noOverflow = async (label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow: ${label}`);

await page.goto(`${BASE}/`);
await page.evaluate(() => { localStorage.removeItem('nv_mock_db'); localStorage.setItem('nv_lang', 'en'); });

console.log('Customer (India)');
await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
await step('"Frame My Elements" on the results screen carries the name and verified elements into the designer', async () => {
  await page.goto(`${BASE}/analyze`);
  await page.locator('input').first().fill('Vibes');
  await page.getByRole('button', { name: /analy/i }).first().click();
  assert.equal((await page.getByTestId('make-merch').innerText()).trim(), 'Frame My Elements');
  await page.getByTestId('make-merch').click();
  await page.waitForURL('**/merch');
  assert.equal(await page.getByTestId('product-poster').getAttribute('aria-pressed'), 'true'); // opens the framed poster directly
  assert.equal(await page.getByTestId('merch-name').inputValue(), 'Vibes');
  assert.equal((await page.getByTestId('merch-symbols').innerText()).replace(/.*:\s*/, ''), 'V · I · Be · S');
  await noOverflow('store 390');
});
await step('changing the language keeps the element symbols unchanged', async () => {
  await page.evaluate(() => localStorage.setItem('nv_lang', 'hi'));
  await page.reload();
  await page.getByTestId('merch-name').fill('Vibes');
  const txt = await page.getByTestId('merch-symbols').innerText();
  assert.match(txt, /V · I · Be · S/);
  assert.ok(!/Your elements/.test(txt), 'label should be translated');
  assert.notEqual((await page.getByTestId('product-poster').innerText()).split('\n')[0], 'Framed poster (A4 / A3)', 'product name is translated');
  const heads = await page.evaluate(() => [...document.querySelectorAll('[role=img] svg text')].map((x) => x.textContent));
  assert.ok(heads.includes('THE CHEMISTRY OF YOUR NAME') && heads.includes('ELEMENTS IN YOUR NAME'), 'poster headings stay exactly as specified in a translated UI');
  await page.evaluate(() => localStorage.setItem('nv_lang', 'en'));
  await page.reload();
});
await step('only the eight blood groups are offered and confirmation is required', async () => {
  await page.getByTestId('tab-blood_group').click();
  assert.equal(await page.locator('[data-testid="blood-groups"] input[type=radio]').count(), 8);
  await page.locator('[data-testid="blood-groups"] label', { hasText: 'AB' }).filter({ hasText: '−' }).first().click();
  await page.getByTestId('add-to-cart').click();
  assert.match(await page.getByTestId('merch-msg').innerText(), /confirm/i);
  await page.getByTestId('tab-name_elements').click();
});
await step('designer (framed poster): frame colours, A4/A3 prices, exact headings, and position/size controls keep the design inside the print area; only the two launch products are offered', async () => {
  await page.getByTestId('tab-name_elements').click();
  await page.getByTestId('merch-name').fill('Vibes');
  assert.equal(await page.getByTestId('product-tshirt').count(), 0, 'T-shirts are disabled at launch');
  assert.equal(await page.getByTestId('product-notebook').count(), 0, 'notebooks are disabled at launch');
  assert.equal(await page.getByTestId('product-poster').count(), 1);
  assert.equal(await page.getByTestId('product-mug').count(), 0, 'the mug belongs to the Blood Group collection');
  // six frame colours and two sizes; each size has its own price
  assert.equal(await page.locator('select').filter({ has: page.locator('option[value="frame-olive"]') }).locator('option').count(), 6);
  assert.match(await page.getByTestId('unit-price').innerText(), /599/);
  await page.locator('select').filter({ has: page.locator('option[value="A3"]') }).selectOption('A3');
  assert.match(await page.getByTestId('unit-price').innerText(), /899/);
  await page.locator('select').filter({ has: page.locator('option[value="A3"]') }).selectOption('A4');
  const texts = await page.evaluate(() => [...document.querySelectorAll('[role=img] svg text')].map((t) => t.textContent));
  assert.equal(texts[0], 'THE CHEMISTRY OF YOUR NAME'); assert.equal(texts[1], 'Vibes'); assert.equal(texts[2], 'ELEMENTS IN YOUR NAME');
  for (const s of ['V', 'Vanadium', '23', 'I', 'Iodine', '53', 'Be', 'Beryllium', '4', 'S', 'Sulfur', '16']) assert.ok(texts.includes(s), s);
  const rect = async () => page.evaluate(() => {
    const svg = document.querySelector('[role=img] svg');
    const area = svg.querySelector('[data-print-area]').getBoundingClientRect();
    const els = [...svg.querySelectorAll('rect[rx], text')].map((r) => r.getBoundingClientRect());
    return { area: { x: area.x, y: area.y, w: area.width, h: area.height }, left: Math.min(...els.map((r) => r.left)), top: Math.min(...els.map((r) => r.top)), right: Math.max(...els.map((r) => r.right)), bottom: Math.max(...els.map((r) => r.bottom)) };
  });
  const inside = (r) => r.left >= r.area.x - 2 && r.top >= r.area.y - 2 && r.right <= r.area.x + r.area.w + 2 && r.bottom <= r.area.y + r.area.h + 2;
  const centred = await rect(); assert.ok(inside(centred), 'design inside the print area');
  await page.getByTestId('layout-scale').fill('0.4');
  await page.getByTestId('layout-x').fill('0');
  await page.getByTestId('layout-y').fill('0');
  const corner = await rect(); assert.ok(inside(corner));
  assert.ok(corner.left < centred.left - 5 && corner.top < centred.top - 5, 'design moved to the top-left');
  assert.ok(corner.right - corner.left < centred.right - centred.left, 'design is smaller');
  assert.ok(corner.left - corner.area.x < 8 && corner.top - corner.area.y < 8, 'sits in the corner of the print area, not outside it');
  await page.getByTestId('layout-scale').fill('1');
  await page.getByTestId('layout-x').fill('1').catch(() => {}); // disabled when the design spans the full width: it cannot be moved out
  assert.ok(inside(await rect()), 'even at full size and moved, the design stays inside the print area');
  await page.getByTestId('layout-centre').click();
});
await step('designer (blood-group mug): a design too large for its resolution is blocked with a message, and "use that size" fixes it', async () => {
  // the mock mug print area is small and never blocks; make it large for this check, then put it back
  await page.evaluate(async () => { const { doc, updateDoc } = await import('/src/mock/firestore.js'); const { db } = await import('/src/firebase.js'); await updateDoc(doc(db, 'merch_products', 'mug'), { printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: false, mockOnly: true } }); });
  await page.reload();
  await page.getByTestId('tab-blood_group').click();
  assert.equal(await page.getByTestId('product-mug').count(), 1);
  await page.locator('[data-testid="blood-groups"] label').nth(6).click();
  await page.getByTestId('blood-confirm').check();
  await page.getByTestId('layout-scale').fill('1');
  await page.getByTestId('dpi-blocked').waitFor();
  assert.equal(await page.getByTestId('add-to-cart').isDisabled(), true);
  await page.getByTestId('dpi-blocked').getByRole('button').click();
  assert.equal(await page.getByTestId('dpi-blocked').count(), 0);
  assert.equal(await page.getByTestId('add-to-cart').isDisabled(), false);
  await page.evaluate(async () => { const { doc, updateDoc } = await import('/src/mock/firestore.js'); const { db } = await import('/src/firebase.js'); await updateDoc(doc(db, 'merch_products', 'mug'), { printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 8, maxHeightInches: 3.5, minDpi: 150, verified: false, mockOnly: true } }); });
  await page.reload();
  await page.getByTestId('tab-name_elements').click();
});
await step('the real canvas renderer puts the design at the chosen pixels in a transparent print-area canvas (centre, corner, scaled)', async () => {
  const r = await page.evaluate(async () => {
    const pc = await import('/src/merch/printCanvas.js');
    const L = await import('/src/merch/layout.js');
    const D = await import('/src/merch/designs.js');
    const spec = { maxWidthInches: 12, maxHeightInches: 16 };
    const bbox = async (blob) => {
      const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
      let l = c.width; let t = c.height; let rr = 0; let b = 0; let corner = d[3];
      for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) { if (d[(y * c.width + xx) * 4 + 3] > 8) { if (xx < l) l = xx; if (xx > rr) rr = xx; if (y < t) t = y; if (y > b) b = y; } }
      return { w: c.width, h: c.height, left: l, top: t, right: rr, bottom: b, cornerAlpha: corner };
    };
    const out = {};
    for (const [name, design] of [['name', D.buildNameElementsDesign('Vibes').design], ['poster', D.applyTemplate(D.buildNameElementsDesign('Vibes').design, { kind: 'wall-art' })], ['blood', { collection: 'blood_group', bloodGroup: 'O+' }]]) {
      for (const [key, layout] of Object.entries({ centre: { scale: 0.5, x: 0.5, y: 0.5 }, corner: { scale: 0.4, x: 0, y: 0 }, br: { scale: 0.4, x: 1, y: 1 }, half: { scale: 0.25, x: 0.5, y: 0.5 } })) {
        const f = await pc.renderPrintFile({ design, spec, layout, ink: '#000' });
        out[`${name}-${key}`] = { ...(await bbox(f.blob)), box: f.box, canvas: [f.width, f.height] };
      }
    }
    const m = await pc.renderMockup({ product: (await import('/src/merch/catalog.js')).DEFAULT_PRODUCTS.tshirt, colorHex: '#FFFFFF', design: D.buildNameElementsDesign('Vibes').design, spec, layout: { scale: 0.5, x: 0.5, y: 0.5 } });
    out.mockup = { w: m.width, h: m.height, size: m.blob.size };
    return out;
  });
  for (const name of ['name', 'poster', 'blood']) {
    for (const key of ['centre', 'corner', 'br', 'half']) {
      const o = r[`${name}-${key}`];
      assert.ok(o.right > o.left && o.bottom > o.top, `${name}-${key}: something was drawn`);
      assert.equal(o.cornerAlpha, 0, `${name}-${key}: canvas is transparent (nothing behind the design)`);
      // the aspect of the canvas is the print area (12 x 16 in)
      assert.ok(Math.abs(o.w / o.h - 0.75) < 0.01);
      const tol = 3;
      assert.ok(o.left >= o.box.x - tol && o.top >= o.box.y - tol && o.right <= o.box.x + o.box.width + tol && o.bottom <= o.box.y + o.box.height + tol, `${name}-${key}: pixels inside the layout box`);
    }
    const c = r[`${name}-centre`]; const k = r[`${name}-corner`]; const br = r[`${name}-br`]; const h = r[`${name}-half`];
    // centre: bounding box is centred on the canvas
    assert.ok(Math.abs((c.left + c.right) / 2 - c.w / 2) < c.w * 0.03 && Math.abs((c.top + c.bottom) / 2 - c.h / 2) < c.h * 0.06, `${name}: centred`);
    // corner: touches the top-left region; bottom-right: the opposite one
    assert.ok(k.left < k.w * 0.08 && k.top < k.h * 0.08, `${name}: top-left corner`);
    assert.ok(br.right > br.w * 0.92 && br.bottom > br.h * 0.92, `${name}: bottom-right corner`);
    // scaled: half the scale gives about half the width
    const ratio = (h.right - h.left) / (c.right - c.left);
    assert.ok(ratio > 0.42 && ratio < 0.58, `${name}: scaled ratio ${ratio}`);
  }
  assert.equal(r.mockup.w, 800); assert.equal(r.mockup.h, 880); assert.ok(r.mockup.size > 2000);
});
await step('add a framed poster, get a server-calculated quote, pay (simulated), order is confirmed and sent to the provider', async () => {
  await page.getByTestId('merch-name').fill('Vibes');
  await page.getByTestId('add-to-cart').click();
  await page.getByText(/Added to your cart/).waitFor();
  await page.goto(`${BASE}/merch/cart`);
  await page.getByTestId('cart-lines').waitFor();
  for (const [f, v] of [['name', 'Test Buyer'], ['phone', '9999999999'], ['line1', '1 Road'], ['city', 'Pune'], ['state', 'MH'], ['postalCode', '411001']]) await page.getByTestId(`addr-${f}`).fill(v);
  await page.getByTestId('get-quote').click();
  await page.getByTestId('quote-box').waitFor();
  assert.match(await page.getByTestId('quote-total').innerText(), /659/); // poster A4 599 + 60 shipping, GST included
  await noOverflow('cart 390');
  await page.getByTestId('pay').click();
  await page.waitForURL('**/merch/orders/**', { timeout: 15000 });
  assert.match(await page.getByTestId('order-status').innerText(), /Sent to production/);
  await noOverflow('order 390');
});
await step('the paid poster order stores the layout, the poster template, the print-area size, a print file and a mock-up', async () => {
  const o = await page.evaluate(async () => {
    const { collection, getDocs, query, where } = await import('/src/mock/firestore.js');
    const { db } = await import('/src/firebase.js');
    const snap = await getDocs(query(collection(db, 'merch_orders'), where('uid', '==', 'mock-individual')));
    const order = snap.docs.map((d) => d.data()).find((x) => x.status === 'submitted');
    const ff = (await getDocs(collection(db, 'merch_fulfillments'))).docs.map((d) => d.data()).find((x) => x.orderId === order.id);
    return { item: order.items[0], sources: ff.mockupSources, gateway: order.gateway };
  });
  assert.equal(o.item.productId, 'poster'); assert.equal(o.item.size, 'A4');
  assert.deepEqual(o.item.canvasInches, { width: 8, height: 11 });
  assert.equal(o.item.placementSku, 'fr'); assert.equal(o.item.design.template, 'poster');
  assert.ok(o.item.layout && o.item.layout.scale > 0);
  assert.match(o.item.artwork.path, /^merch\/print\//); assert.match(o.item.mockup.path, /^merch\/mockup\//);
  assert.deepEqual(o.sources, ['mockup']);
  assert.equal(o.gateway, 'razorpay'); // India is paid online through Razorpay; there is no COD option anywhere
});
await step('order history lists the order and Order again refills the cart', async () => {
  await page.goto(`${BASE}/merch/orders`);
  await page.getByTestId('orders-list').waitFor();
  await page.getByTestId('orders-list').locator('a').first().click();
  await page.getByTestId('timeline').waitFor();
  await page.getByTestId('reorder').click();
  await page.waitForURL('**/merch/cart');
  await page.getByTestId('cart-lines').waitFor();
});
await step('a US address is blocked (country OFF) and a country change recomputes', async () => {
  await page.getByTestId('addr-country').selectOption('US');
  for (const [f, v] of [['name', 'Test Buyer'], ['phone', '9999999999'], ['line1', '1 Road'], ['city', 'Pune'], ['state', 'MH'], ['postalCode', '411001']]) await page.getByTestId(`addr-${f}`).fill(v);
  await page.getByTestId('get-quote').click();
  await page.getByTestId('cart-error').waitFor();
  assert.match(await page.getByTestId('cart-error').innerText(), /cannot deliver|not available/i);
  await page.goto(`${BASE}/merch`);
  await page.getByTestId('ship-country').selectOption('US');
  await page.getByTestId('merch-off').waitFor();
});
await step('an ordinary customer cannot reach merchandise administration or change settings', async () => {
  await page.goto(`${BASE}/admin/merch`);
  await page.getByTestId('not-admin').waitFor();
  const r = await page.evaluate(async () => { const m = await import('/src/merch/client.js'); return m.callMerch('admin', { action: 'setGlobal', data: { enabled: false } }); });
  assert.equal(r.status, 403);
});

console.log('Admin');
await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
await step('admin turns merchandise OFF: customers are blocked with the message; turning it ON restores it', async () => {
  await page.goto(`${BASE}/admin/merch`);
  await page.getByTestId('overview').waitFor();
  assert.equal(await page.getByTestId('global-state').innerText(), 'ON');
  await page.getByRole('tab', { name: 'Global & countries' }).click();
  await page.getByTestId('global-toggle').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  await page.goto(`${BASE}/merch`);
  await page.getByTestId('merch-off').waitFor();
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByRole('tab', { name: 'Global & countries' }).click();
  await page.getByTestId('global-toggle').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
});
await step('collections switch independently per country; audit log records every change', async () => {
  await page.getByTestId('country-select').selectOption('IN');
  await page.getByTestId('col-blood_group').uncheck();
  await page.getByTestId('save-country').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  await page.goto(`${BASE}/merch`);
  await page.getByTestId('tab-name_elements').waitFor();
  assert.equal(await page.getByTestId('tab-blood_group').count(), 0);
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByRole('tab', { name: 'Global & countries' }).click();
  await page.getByTestId('country-select').selectOption('IN');
  await page.getByTestId('col-blood_group').check();
  await page.getByTestId('save-country').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await page.getByRole('tab', { name: 'Audit' }).click();
  const rows = await page.getByTestId('audit').locator('tbody tr').count();
  assert.ok(rows >= 4, `audit rows ${rows}`);
});
await step('admin Product Management: single and bulk switches with a confirmation that lists what changes; disabled products vanish from the shop', async () => {
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByTestId('overview').waitFor();
  assert.equal(await page.getByTestId('held-count').innerText(), 'Orders held for provider funds (Qikink wallet): 0');
  await page.getByRole('tab', { name: 'Products' }).click();
  await page.getByTestId('product-management').waitFor();
  assert.equal(await page.getByTestId('apply-preset').count(), 0); // lives on the Overview tab
  const row = (id) => page.getByTestId(`pm-row-${id}`);
  const statusIs = (id, text) => page.waitForFunction(([i, x]) => document.querySelector(`[data-testid="pm-row-${i}"] td:nth-child(3)`)?.textContent.trim().startsWith(x), [id, text]);
  const dialogAfter = async (n) => { for (let i = 0; i < 60 && dialogMessages.length === n; i++) await page.waitForTimeout(100); };
  assert.match(await row('poster').innerText(), /ON/); assert.match(await row('tshirt').innerText(), /OFF/); assert.match(await row('notebook').innerText(), /OFF/);
  const before = dialogMessages.length;
  await page.getByTestId('select-all').check();
  await page.getByTestId('deactivate-selected').click();
  await dialogAfter(before);
  await statusIs('poster', 'OFF');
  const msg = dialogMessages[before];
  assert.match(msg, /poster \(everywhere\): ON -> OFF/); assert.match(msg, /tshirt \(everywhere\): OFF -> OFF \(no change\)/); assert.match(msg, /paid orders, tracking and refunds are not touched/);
  // customers cannot see or buy them now
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  await page.goto(`${BASE}/merch`);
  await page.getByTestId('merch-off').waitFor().catch(() => {});
  assert.equal(await page.getByTestId('add-to-cart').count(), 0);
  // activate selected again (all four), then switch ONE product off in India only
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByRole('tab', { name: 'Products' }).click();
  await page.getByTestId('select-all').check();
  await page.getByTestId('activate-selected').click();
  await statusIs('poster', 'ON');
  await page.getByTestId('select-all').uncheck();
  await page.getByTestId('switch-tshirt').click(); // turn T-shirt ON then OFF again to prove the single switch
  await statusIs('tshirt', 'ON');
  await page.getByTestId('switch-tshirt').click();
  await statusIs('tshirt', 'OFF');
  await page.getByTestId('switch-poster-IN').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="switch-poster-IN"]')?.textContent === 'OFF');
  await page.getByTestId('switch-poster-IN').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="switch-poster-IN"]')?.textContent === 'ON');
  await page.getByRole('tab', { name: 'Audit' }).click();
  const audit = await page.getByTestId('audit').innerText();
  assert.ok((audit.match(/admin\.bulkSwitch/g) || []).length >= 5, 'every change is audited');
});
await step('orders: paid order is listed; admin refund marks it refunded', async () => {
  await page.getByRole('tab', { name: 'Orders' }).click();
  await page.getByTestId('orders-table').waitFor();
  assert.ok(await page.getByTestId('orders-table').locator('tbody tr').count() >= 1);
  await page.getByRole('button', { name: 'Manage' }).first().click();
  await page.locator('[data-testid^="refund-"]').first().click();
  await page.getByTestId('admin-note').getByText('Refunded').waitFor();
  assert.match(await page.locator('[data-testid^="status-"]').first().innerText(), /refunded/);
});
await step('admin pages have no horizontal page overflow at 390px', async () => {
  await page.getByRole('tab', { name: 'Overview' }).click();
  await noOverflow('admin overview');
});

console.log(`\n${passed} passed`);
console.log('Console/page errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
