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
  await page.waitForFunction(() => document.querySelector('[data-testid="product-poster"]')?.getAttribute('aria-pressed') === 'true'); // opens the framed poster directly
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
  const heads = await page.evaluate(async () => { const D = await import('/src/merch/designs.js'); const F = await import('/src/merch/framePaint.js'); const r = await F.renderFrameCanvas({ design: D.buildDesign('name_elements', { frame: 'elements-gold', name: 'Vibes' }).design, width: 600, height: 848 }); return r.metrics.map((m) => m.text); });
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
await step('designer (framed poster): Elements Gold only by default, painted preview, three Sample images, colours/sizes/prices; no position sliders (the design fills the paper)', async () => {
  await page.getByTestId('tab-name_elements').click();
  await page.getByTestId('merch-name').fill('Vibes');
  assert.equal(await page.getByTestId('product-tshirt').count(), 0, 'T-shirts are disabled at launch');
  assert.equal(await page.getByTestId('product-notebook').count(), 0, 'notebooks are disabled at launch');
  assert.equal(await page.getByTestId('product-poster').count(), 1);
  assert.equal(await page.getByTestId('product-mug').count(), 0, 'the mug belongs to the Blood Group collection');
  assert.equal(await page.getByTestId('frame-designs').count(), 0, 'only Elements Gold is on, so there is nothing to choose');
  assert.equal(await page.getByTestId('layout-scale').count(), 0, 'a frame design fills the whole print area: no position/size sliders');
  assert.equal(await page.locator('select').filter({ has: page.locator('option[value="frame-olive"]') }).locator('option').count(), 6);
  assert.match(await page.getByTestId('unit-price').innerText(), /599/);
  await page.locator('select').filter({ has: page.locator('option[value="A3"]') }).selectOption('A3');
  assert.match(await page.getByTestId('unit-price').innerText(), /899/);
  await page.locator('select').filter({ has: page.locator('option[value="A3"]') }).selectOption('A4');
  // the preview is the painted design (same operations as the print file) inside the print area of the frame
  await page.locator('[data-frame-ready="true"]').waitFor();
  const img = await page.evaluate(() => { const svg = document.querySelector('[role=img] svg'); const i = svg.querySelector('image[data-frame-image]').getBoundingClientRect(); const a = svg.querySelector('[data-print-area]').getBoundingClientRect(); return { i: [i.x, i.y, i.width, i.height], a: [a.x, a.y, a.width, a.height] }; });
  assert.ok(Math.abs(img.i[0] - img.a[0]) < 1.5 && Math.abs(img.i[2] - img.a[2]) < 1.5, 'the painted poster covers exactly the print area');
  // samples: the three reference looks, labelled Sample, never used for printing
  assert.equal(await page.locator('[data-testid="samples"] img').count(), 3);
  assert.equal(await page.locator('[data-testid="samples"] span', { hasText: 'Sample' }).count(), 3);
  await page.locator('[data-testid="samples"] img').first().waitFor();
  assert.ok((await page.evaluate(() => [...document.querySelectorAll('[data-testid="samples"] img')].every((i) => i.complete && i.naturalWidth > 100))), 'sample images load');
});
await step('designer (blood-group mug): position and size controls keep the design inside the print area', async () => {
  await page.getByTestId('tab-blood_group').click();
  await page.locator('[data-testid="blood-groups"] label').nth(6).click();
  await page.getByTestId('blood-confirm').check();
  const rect = async () => page.evaluate(() => {
    const svg = document.querySelector('[role=img] svg');
    const area = svg.querySelector('[data-print-area]').getBoundingClientRect();
    const i = svg.querySelector('image').getBoundingClientRect();
    return { area: { x: area.x, y: area.y, w: area.width, h: area.height }, left: i.left, top: i.top, right: i.right, bottom: i.bottom };
  });
  const inside = (r) => r.left >= r.area.x - 2 && r.top >= r.area.y - 2 && r.right <= r.area.x + r.area.w + 2 && r.bottom <= r.area.y + r.area.h + 2;
  const centred = await rect(); assert.ok(inside(centred));
  await page.getByTestId('layout-scale').fill('0.5');
  await page.getByTestId('layout-x').fill('0');
  const left = await rect(); assert.ok(inside(left));
  assert.ok(left.left < centred.left - 3, 'moved left');
  assert.ok(left.left - left.area.x < 4, 'touches the left edge of the print area but not beyond');
  await page.getByTestId('layout-scale').fill('1');
  assert.ok(inside(await rect()), 'even at full size the design stays inside the print area');
  await page.getByTestId('layout-centre').click();
  await page.getByTestId('tab-name_elements').click();
});
await step('REAL rendering of all three frame designs at A4 and A3 (300 DPI): size, opaque paint, text inside the safe area, NAMASUTRA branding and the domain from SITE_URL', async () => {
  const r = await page.evaluate(async () => {
    const D = await import('/src/merch/designs.js');
    const P = await import('/src/merch/printCanvas.js');
    const S = await import('/src/config/site.js');
    const fam = (n) => ({ frame: 'family-dark', familyName: 'Nair Family', people: ['Sreshan S Nair', 'Anupamaa B Nair', 'Vipasha S Nair', 'Ashvika S Nair'].slice(0, n).map((name, i) => ({ name, relation: ['Father', 'Mother', 'Daughter', 'Daughter'][i] })) });
    const cases = [
      ['gold one name A4', { frame: 'elements-gold', name: 'Sreshan S Nair' }, 'A4'], ['gold long name A4', { frame: 'elements-gold', name: 'Venkatasubramaniam Radhakrishnan' }, 'A4'],
      ['gold Devanagari A4', { frame: 'elements-gold', name: 'Sreshan श्रेशन' }, 'A4'], ['gold Tamil A4', { frame: 'elements-gold', name: 'Sreshan நாயர்' }, 'A4'], ['gold one name A3', { frame: 'elements-gold', name: 'Sreshan S Nair' }, 'A3'],
      ['indiv one name A4', { frame: 'individual-dark', name: 'Sreshan S Nair' }, 'A4'], ['indiv long name A4', { frame: 'individual-dark', name: 'Venkatasubramaniam Radhakrishnan' }, 'A4'],
      ['indiv Devanagari A4', { frame: 'individual-dark', name: 'Sreshan श्रेशन' }, 'A4'], ['indiv Tamil A4', { frame: 'individual-dark', name: 'Sreshan நாயர்' }, 'A4'], ['indiv one name A3', { frame: 'individual-dark', name: 'Sreshan S Nair' }, 'A3'],
      ['family 1 A4', fam(1), 'A4'], ['family 4 A4', fam(4), 'A4'], ['family 4 A3', fam(4), 'A3'],
      ['family Indic A4', { frame: 'family-dark', people: [{ name: 'Sreshan श्रेशन', relation: 'Father' }, { name: 'Anupama அனுபமா' }] }, 'A4']
    ];
    const SPEC = { A4: { maxWidthInches: 8.27, maxHeightInches: 11.69 }, A3: { maxWidthInches: 11.69, maxHeightInches: 16.54 } };
    const out = [];
    for (const [label, input, size] of cases) {
      const { design, error } = D.buildDesign('name_elements', input);
      if (error) { out.push({ label, error }); continue; }
      const f = await P.renderPrintFile({ design, spec: SPEC[size], layout: { scale: 1, x: 0.5, y: 0.5 }, ink: '#000' });
      const outside = f.metrics.filter((m) => m.x < f.safe.x - 2 || m.y < f.safe.y - 2 || m.x + m.w > f.safe.x + f.safe.w + 2 || m.y + m.h > f.safe.y + f.safe.h + 2).map((m) => m.text);
      out.push({ label, w: f.width, h: f.height, dpi: f.dpi, bytes: f.blob.size, outside, texts: f.metrics.map((m) => m.text), host: S.SITE_HOST, exp: [Math.round(SPEC[size].maxWidthInches * 300), Math.round(SPEC[size].maxHeightInches * 300)] });
    }
    return out;
  });
  for (const o of r) {
    assert.ok(!o.error, `${o.label}: ${o.error}`);
    assert.deepEqual([o.w, o.h], o.exp, `${o.label}: canvas size`);
    assert.ok(o.dpi >= 300, `${o.label}: ${o.dpi} DPI`);
    assert.ok(o.bytes > 50000, `${o.label}: painted (${o.bytes} bytes)`);
    assert.deepEqual(o.outside, [], `${o.label}: text outside the safe area`);
    assert.ok(o.texts.includes(o.host), `${o.label}: domain ${o.host}`);
    assert.ok(!o.texts.some((t) => /namevibes/i.test(t)), `${o.label}: old brand name`);
    assert.ok(o.texts.some((t) => t === 'MORE THAN A NAME'));
  }
  const printed = (label) => r.find((o) => o.label === label).texts.join(' '); // a long name may be wrapped over two lines
  assert.ok(printed('gold Devanagari A4').includes('श्रेशन') && printed('gold Devanagari A4').includes('Sreshan'));
  assert.ok(printed('gold Tamil A4').includes('நாயர்') && printed('indiv Tamil A4').includes('நாயர்'));
  assert.ok(printed('family Indic A4').includes('Anupama அனுபமா') && printed('family Indic A4').includes('Sreshan श्रेशन'));
});
await step('the artwork is inset by designInsetMm on all four sides: exact flat border in the real file (pixel check), centred, text inside, DPI kept; 0 and 15 mm change the file', async () => {
  const r = await page.evaluate(async () => {
    const D = await import('/src/merch/designs.js');
    const P = await import('/src/merch/printCanvas.js');
    const Fr = await import('/src/merch/frames.js');
    const SPEC = { A4: { maxWidthInches: 8.27, maxHeightInches: 11.69 }, A3: { maxWidthInches: 11.69, maxHeightInches: 16.54 } };
    const designs = { 'elements-gold': { frame: 'elements-gold', name: 'Sreshan S Nair' }, 'individual-dark': { frame: 'individual-dark', name: 'Sreshan S Nair' }, 'family-dark': { frame: 'family-dark', familyName: 'Nair Family', people: [{ name: 'Sreshan S Nair', relation: 'Father' }, { name: 'Anupamaa B Nair', relation: 'Mother' }] } };
    const hex = (c) => '#' + [c[0], c[1], c[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    async function analyse(blob, edge) {
      const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); const W = c.width; const H = c.height; const d = x.getImageData(0, 0, W, H).data;
      const isEdge = (i) => hex([d[i], d[i + 1], d[i + 2]]) === edge && d[i + 3] === 255;
      const col = (xx) => { for (let y = 0; y < H; y += 5) if (!isEdge((y * W + xx) * 4)) return false; return true; };
      const row = (yy) => { for (let xx = 0; xx < W; xx += 5) if (!isEdge((yy * W + xx) * 4)) return false; return true; };
      let left = 0; while (left < W / 2 && col(left)) left++;
      let right = 0; while (right < W / 2 && col(W - 1 - right)) right++;
      let top = 0; while (top < H / 2 && row(top)) top++;
      let bottom = 0; while (bottom < H / 2 && row(H - 1 - bottom)) bottom++;
      return { W, H, left, right, top, bottom };
    }
    const out = [];
    for (const [id, input] of Object.entries(designs)) {
      for (const [size, mm] of [['A4', 10], ['A3', 10], ['A4', 0], ['A4', 15]]) {
        const { design } = D.buildDesign('name_elements', input);
        const f = await P.renderPrintFile({ design, spec: SPEC[size], layout: { scale: 1, x: 0.5, y: 0.5 }, ink: '#000', inset: { mm, size } });
        const a = await analyse(f.blob, Fr.EDGE_COLORS[id]);
        const expected = Math.round((mm / 25.4) * f.dpi);
        const outside = f.metrics.filter((m) => m.x < f.safe.x - 2 || m.y < f.safe.y - 2 || m.x + m.w > f.safe.x + f.safe.w + 2 || m.y + m.h > f.safe.y + f.safe.h + 2).map((m) => m.text);
        out.push({ id, size, mm, expected, dpi: f.dpi, ...a, art: f.art, artworkMm: [f.artworkInches.width * 25.4, f.artworkInches.height * 25.4], applied: f.insetApplied, outside, texts: f.metrics.map((m) => m.text) });
      }
    }
    return out;
  });
  for (const o of r) {
    const tag = o.id + ' ' + o.size + ' ' + o.mm + 'mm';
    assert.ok(o.dpi >= 300, tag + ' DPI ' + o.dpi);
    for (const side of ['left', 'right', 'top', 'bottom']) assert.ok(Math.abs(o[side] - o.expected) <= 1, tag + ' ' + side + ' border ' + o[side] + ' px, expected ' + o.expected);
    assert.ok(Math.abs(o.left - o.right) <= 1 && Math.abs(o.top - o.bottom) <= 1, tag + ' centred');
    assert.equal(o.art.x, o.art.y); assert.equal(o.art.w, o.W - 2 * o.art.x); // equal on all four sides
    assert.deepEqual(o.outside, [], tag + ' text outside the artwork area');
    if (o.mm === 10 && o.size === 'A4') { assert.ok(Math.abs(o.artworkMm[0] - 190) < 0.3 && Math.abs(o.artworkMm[1] - 277) < 0.3, tag + ' artwork 190 x 277 mm'); assert.equal(o.applied, 'frame-minus-inset'); }
    if (o.mm === 10 && o.size === 'A3') assert.ok(Math.abs(o.artworkMm[0] - 277) < 0.3 && Math.abs(o.artworkMm[1] - 400) < 0.4, tag + ' artwork 277 x 400 mm');
    assert.ok(!o.texts.some((t) => /namevibes/i.test(t)));
  }
  for (const id of ['elements-gold', 'individual-dark', 'family-dark']) {
    const a = r.filter((o) => o.id === id && o.size === 'A4');
    const by = Object.fromEntries(a.map((o) => [o.mm, o]));
    assert.equal(by[0].left, 0); assert.ok(by[10].left > 100 && by[15].left > by[10].left, id + ': changing the setting changes the file');
    assert.equal(by[0].W, by[10].W); assert.equal(by[10].W, by[15].W); // the file stays the full frame size
  }
});
await step('admin enables the dark frame designs; customers then see the design choice, the family inputs and a painted preview for each', async () => {
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByRole('tab', { name: 'Products' }).click();
  const box = page.getByTestId('frames-poster');
  await box.waitFor();
  assert.equal(await page.getByTestId('inset-input-poster').inputValue(), '10'); // the inset setting is visible in Product Management
  await page.getByTestId('inset-input-poster').fill('12'); await page.getByTestId('save-inset-poster').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await page.getByTestId('inset-input-poster').fill('10'); await page.getByTestId('save-inset-poster').click();
  await page.waitForTimeout(400);
  assert.equal(await box.locator('input[data-testid="frame-toggle-elements-gold"]').isChecked(), true);
  assert.equal(await box.locator('input[data-testid="frame-toggle-individual-dark"]').isChecked(), false);
  assert.equal(await box.locator('input[data-testid="frame-toggle-family-dark"]').isChecked(), false);
  await box.locator('input[data-testid="frame-toggle-individual-dark"]').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await box.locator('input[data-testid="frame-toggle-family-dark"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="frames-poster"] input[data-testid="frame-toggle-family-dark"]')?.checked === true);
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  await page.goto(`${BASE}/merch`, { waitUntil: 'load' });
  await page.getByTestId('product-poster').click();
  await page.getByTestId('merch-name').fill('Sreshan S Nair');
  await page.getByTestId('frame-designs').waitFor();
  assert.equal(await page.locator('[data-testid="frame-designs"] input').count(), 3);
  await page.getByTestId('frame-individual-dark').check({ force: true });
  await page.locator('[data-frame-ready="true"]').waitFor();
  await page.getByTestId('frame-family-dark').check({ force: true });
  await page.getByTestId('family-inputs').waitFor();
  await page.getByTestId('member-name-0').fill('Sreshan S Nair');
  await page.getByTestId('family-name').fill('Nair Family');
  await page.locator('[data-frame-ready="true"]').waitFor();
  // back to launch defaults
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
  await page.goto(`${BASE}/admin/merch`);
  await page.getByRole('tab', { name: 'Products' }).click();
  const b2 = page.getByTestId('frames-poster');
  await b2.locator('input[data-testid="frame-toggle-individual-dark"]').click();
  await page.getByTestId('admin-note').getByText('Saved').waitFor();
  await b2.locator('input[data-testid="frame-toggle-family-dark"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="frames-poster"] input[data-testid="frame-toggle-family-dark"]')?.checked === false);
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  await page.goto(`${BASE}/merch`);
});
await step('designer (blood-group mug): a design too large for its resolution is blocked with a message, and "use that size" fixes it', async () => {
  // the mock mug print area is small and never blocks; make it large for this check, then put it back
  await page.evaluate(async () => { const { doc, updateDoc } = await import('/src/mock/firestore.js'); const { db } = await import('/src/firebase.js'); await updateDoc(doc(db, 'merch_products', 'mug'), { printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: true, mockOnly: true } }); });
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
  await page.evaluate(async () => { const { doc, updateDoc } = await import('/src/mock/firestore.js'); const { db } = await import('/src/firebase.js'); await updateDoc(doc(db, 'merch_products', 'mug'), { printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 8, maxHeightInches: 3.5, minDpi: 150, verified: true, mockOnly: true } }); });
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
  assert.deepEqual(o.item.canvasInches, { width: 8.27, height: 11.69 });
  assert.equal(o.item.designInsetMm, 10); assert.equal(o.item.insetApplied, 'frame-minus-inset');
  assert.ok(Math.abs(o.item.artworkInches.width * 25.4 - 190) < 0.5 && Math.abs(o.item.artworkInches.height * 25.4 - 277) < 0.5, 'A4 artwork is 190 x 277 mm');
  assert.equal(o.item.placementSku, 'fr'); assert.equal(o.item.design.template, 'frame'); assert.equal(o.item.design.frame, 'elements-gold');
  assert.deepEqual(o.item.layout, { scale: 1, x: 0.5, y: 0.5 }); // a frame design fills the whole print area
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
  await page.getByLabel('Select poster').check(); await page.getByLabel('Select mug').check(); // select-all would include unverified products, which the server refuses
  await page.getByTestId('activate-selected').click();
  await statusIs('poster', 'ON');
  await page.getByTestId('select-all').check(); await page.getByTestId('select-all').uncheck();
  await page.getByTestId('switch-tshirt').click(); // the T-shirt has no verified print area: the server refuses, it stays OFF
  await page.waitForTimeout(800);
  await statusIs('tshirt', 'OFF');
  await page.getByTestId('switch-poster-IN').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="switch-poster-IN"]')?.textContent === 'OFF');
  await page.getByTestId('switch-poster-IN').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="switch-poster-IN"]')?.textContent === 'ON');
  await page.getByRole('tab', { name: 'Audit' }).click();
  const audit = await page.getByTestId('audit').innerText();
  assert.ok((audit.match(/admin\.bulkSwitch/g) || []).length >= 3, 'every change is audited');
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
await step('visibility: Nobody / Admins only / Everyone hides merchandise (menu, pages, buttons) from non-admins as a normal 404, shows the sandbox banner to admins', async () => {
  const setMode = async (mode) => {
    await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin');
    await page.goto(`${BASE}/admin/merch`);
    await page.getByTestId('visible-to').waitFor();
    await page.getByTestId('visible-to').selectOption(mode);
    await page.waitForFunction((m) => document.querySelector('[data-testid="visible-to"]')?.value === m, mode);
    await page.waitForTimeout(400);
  };
  const menuHasMerch = async () => { await page.waitForTimeout(1200); await page.locator('.site-menu-toggle').click(); await page.locator('#site-navigation-menu').waitFor(); const txt = await page.locator('#site-navigation-menu').innerText(); await page.keyboard.press('Escape'); return /Merchandise|Blood Group/i.test(txt); };
  const is404 = async (path) => { await page.goto(`${BASE}${path}`); await page.waitForTimeout(1200); return (await page.locator('body').innerText()).includes('404'); };
  await setMode('nobody');
  assert.equal(await page.getByTestId('sandbox-banner-admin').count(), 1, 'admin sees the sandbox banner on the admin page');
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  for (const p of ['/merch', '/merch/blood-group', '/merch/blood-group/o-positive', '/merch/cart', '/merch/orders', '/merch/returns-policy']) assert.equal(await is404(p), true, p + ' is a 404 for a customer under Nobody');
  await page.goto(`${BASE}/dashboard`); assert.equal(await menuHasMerch(), false, 'no menu link under Nobody');
  await setMode('admins');
  await page.goto(`${BASE}/dashboard`); assert.equal(await menuHasMerch(), true, 'admin sees the menu link');
  assert.equal(await is404('/merch'), false); // (the mock admin has no customer profile, so the page may redirect to the profile form; it is not a 404)
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  assert.equal(await is404('/merch'), true, 'a customer still gets 404 under Admins only');
  await page.goto(`${BASE}/dashboard`); assert.equal(await menuHasMerch(), false);
  await page.evaluate(() => localStorage.removeItem('nv_mock_session'));
  assert.equal(await is404('/merch'), true, 'signed-out gets the 404 page');
  await setMode('everyone');
  await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
  assert.equal(await is404('/merch'), false); await page.goto(`${BASE}/dashboard`); assert.equal(await menuHasMerch(), true);
});
await step('admin print-file storage panel: backend status, test upload, deletion dry run', async () => {
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin'); await page.goto(`${BASE}/admin/merch`); await page.getByTestId('storage-panel').waitFor();
  await page.getByTestId('storage-r2').waitFor(); assert.match(await page.getByTestId('storage-r2').innerText(), /OK/);
  await page.getByTestId('storage-test').click(); await page.getByTestId('storage-test-result').waitFor();
  await page.getByText('ALL PASSED').first().waitFor(); assert.match(await page.getByTestId('storage-test-result').innerText(), /ALL PASSED/);
  assert.equal(await page.getByTestId('var-SUPABASE_URL').count(), 1); // the settings list (names only) is on the page
  await page.getByTestId('file-dry-run').click(); await page.getByTestId('file-report-result').waitFor();
  assert.ok((await page.getByTestId('file-report-result').innerText()).includes('nothing was deleted'));
});
await step('"Apply launch configuration" shows what it did on the page, sets up India with TEST PRICES and the banner, and a second press creates nothing', async () => {
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin'); await page.goto(`${BASE}/admin/merch`); await page.getByTestId('overview').waitFor();
  await page.getByTestId('apply-preset').click(); await page.getByText('Launch configuration applied.').waitFor();
  const first = await page.getByTestId('preset-result').innerText(); assert.match(first, /Created/); assert.match(first, /provider qikink/); assert.match(first, /TEST PRICES/);
  await page.getByRole('tab', { name: 'Global & countries' }).click(); await page.getByTestId('placeholder-banner').waitFor();
  assert.match(await page.getByTestId('placeholder-banner').innerText(), /Placeholder test prices: replace before launch/);
  await page.getByRole('tab', { name: 'Overview' }).click(); await page.getByTestId('apply-preset').click(); await page.getByText('Nothing was missing.').waitFor();
});
await step('admin pages have no horizontal page overflow at 390px', async () => {
  await signIn('mock-admin', 'admin@namevibes.test', 'Super Admin'); await page.goto(`${BASE}/admin/merch`); await page.getByTestId('overview').waitFor();
  await page.getByRole('tab', { name: 'Overview' }).click();
  await noOverflow('admin overview');
});

console.log(`\n${passed} passed`);
console.log('Console/page errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
