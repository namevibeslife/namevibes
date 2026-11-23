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
page.on('dialog', (d) => d.accept());

let passed = 0;
const step = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); await page.screenshot({ path: `artifacts/merch/fail-${passed}.png` }).catch(() => {}); throw e; } };
const signIn = async (uid, email, name) => { await page.evaluate(([u, e, n]) => localStorage.setItem('nv_mock_session', JSON.stringify({ uid: u, email: e, displayName: n })), [uid, email, name]); };
const noOverflow = async (label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow: ${label}`);

await page.goto(`${BASE}/`);
await page.evaluate(() => { localStorage.removeItem('nv_mock_db'); localStorage.setItem('nv_lang', 'en'); });

console.log('Customer (India)');
await signIn('mock-individual', 'individual@namevibes.test', 'Indira Individual');
await step('"Make My Merchandise" on the results screen carries the name and verified elements into the designer', async () => {
  await page.goto(`${BASE}/analyze`);
  await page.locator('input').first().fill('Vibes');
  await page.getByRole('button', { name: /analy/i }).first().click();
  await page.getByTestId('make-merch').click();
  await page.waitForURL('**/merch');
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
await step('add a T-shirt, get a server-calculated quote, pay (simulated), order is confirmed and sent to the provider', async () => {
  await page.getByTestId('merch-name').fill('Vibes');
  await page.getByTestId('add-to-cart').click();
  await page.getByText(/Added to your cart/).waitFor();
  await page.goto(`${BASE}/merch/cart`);
  await page.getByTestId('cart-lines').waitFor();
  for (const [f, v] of [['name', 'Test Buyer'], ['phone', '9999999999'], ['line1', '1 Road'], ['city', 'Pune'], ['state', 'MH'], ['postalCode', '411001']]) await page.getByTestId(`addr-${f}`).fill(v);
  await page.getByTestId('get-quote').click();
  await page.getByTestId('quote-box').waitFor();
  assert.match(await page.getByTestId('quote-total').innerText(), /859/); // 799 + 60 shipping, GST included
  await noOverflow('cart 390');
  await page.getByTestId('pay').click();
  await page.waitForURL('**/merch/orders/**', { timeout: 15000 });
  assert.match(await page.getByTestId('order-status').innerText(), /Sent to production/);
  await noOverflow('order 390');
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
