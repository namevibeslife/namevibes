import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const [label, w, h] of [['390', 390, 800], ['desktop', 1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  // --- language switching (signed out) ---
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(label + ': ' + e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:5199/'); await p.waitForTimeout(1200);
  const btn = p.locator('.site-language-toggle');
  await btn.click(); await p.locator('.site-language-menu button[lang="hi"]').click(); await p.waitForTimeout(900);
  const hi = await p.evaluate(() => [document.documentElement.lang, document.querySelector('h1')?.innerText.slice(0, 30), document.documentElement.scrollWidth > innerWidth]);
  await btn.click(); await p.locator('.site-language-menu button[lang="ta"]').click(); await p.waitForTimeout(900);
  const ta = await p.evaluate(() => [document.documentElement.lang, document.querySelector('h1')?.innerText.slice(0, 30), document.documentElement.scrollWidth > innerWidth]);
  console.log(label, 'language hi:', JSON.stringify(hi), 'ta:', JSON.stringify(ta));

  // --- mock payment as unpaid IN user, in Tamil, via gateway-routed page ---
  const u = await ctx.newPage();
  u.on('pageerror', e => errs.push(label + ' pay: ' + e.message)); u.on('dialog', d => d.accept());
  await u.addInitScript(() => { localStorage.setItem('nv_lang', 'ta'); localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-unpaid', email: 'unpaid@namevibes.test', displayName: 'U' })); });
  await u.goto('http://localhost:5199/pricing'); await u.waitForTimeout(1500);
  const powered = (await u.locator('body').innerText()).match(/Razorpay|PayPal/)?.[0];
  await u.getByRole('button').filter({ hasText: /./ }).last().click().catch(() => {});
  await u.locator('button.bg-paper').first().click().catch(() => {});
  await u.waitForTimeout(1200);
  const onPay = u.url().includes('/payment');
  const gw = (await u.locator('body').innerText()).match(/Razorpay|PayPal/)?.[0];
  await u.locator('button.bg-green-600').first().click(); await u.waitForTimeout(1500);
  console.log(label, `payment: pricing gateway=${powered} onPaymentPage=${onPay} gateway=${gw} -> ${u.url().replace('http://localhost:5199', '')}`);

  // --- Country Pricing admin ---
  const a = await ctx.newPage();
  a.on('pageerror', e => errs.push(label + ' admin: ' + e.message)); a.on('dialog', d => d.accept());
  await a.addInitScript(() => { localStorage.setItem('nv_lang', 'en'); localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin' })); });
  await a.goto('http://localhost:5199/admin'); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  console.log(label, 'flag default off:', !(await a.getByRole('checkbox').isChecked()));
  await a.getByRole('button', { name: /Add Country/ }).first().click(); await a.waitForTimeout(300);
  const cb = a.getByRole('combobox', { name: 'Country' });
  await cb.click(); await cb.fill('swe'); await a.waitForTimeout(200); await a.keyboard.press('Enter');
  const cur = await a.locator('select').filter({ hasText: 'SEK' }).first().inputValue();
  await a.getByPlaceholder('Enter the price').fill('250');
  const note = (await a.getByRole('alert').allInnerTexts()).join(' | ').slice(0, 90);
  await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
  const listed = /Sweden/.test(await a.locator('main').innerText());
  console.log(label, `country pricing: Sweden currency=${cur} note="${note}" listed=${listed}`);
  const s = await ctx.newPage();
  s.on('pageerror', e => errs.push(label + ' signup: ' + e.message));
  await s.addInitScript(() => { localStorage.setItem('nv_lang', 'hi'); localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-new', email: 'newuser@namevibes.test', displayName: 'N' })); });
  await s.goto('http://localhost:5199/profile-complete'); await s.waitForTimeout(1500);
  await s.locator('input[type=text]').nth(1).click(); await s.waitForTimeout(300);
  console.log(label, 'sign-up picker (hi) lists:', await s.locator('div.max-h-60 .font-medium').allInnerTexts());
  await ctx.close();
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
