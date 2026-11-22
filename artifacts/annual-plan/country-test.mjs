import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
const errs = [];
const a = await ctx.newPage();
a.on('pageerror', e => errs.push(e.message));
a.on('dialog', d => { console.log('  dialog:', d.message()); d.accept(); });
await a.addInitScript(() => { if (!localStorage.getItem('nv_mock_session')) localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin' })); });
await a.goto('http://localhost:5199/admin'); await a.waitForTimeout(1200);
await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
await a.getByRole('button', { name: /Add Country/ }).click(); await a.waitForTimeout(400);
const cb = a.getByRole('combobox', { name: 'Country' });
await cb.click(); await cb.fill('swe'); await a.waitForTimeout(300);
const opts = await a.getByRole('option').allInnerTexts();
console.log('1 typing "swe" shows:', opts.map(o => o.replace(/\s+/g, ' ')));
await a.keyboard.press('Enter'); await a.waitForTimeout(300);
console.log('2 picked:', await cb.inputValue(), '| currency:', await a.locator('select').filter({ hasText: 'SEK' }).first().inputValue());
console.log('3 price starts empty:', JSON.stringify(await a.getByPlaceholder('Enter the price').inputValue()));
console.log('4 gateway message:', (await a.getByRole('alert').allInnerTexts()).join(' | ') || 'none (SEK is supported by PayPal)');
// save without a price
await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(500);
await a.getByPlaceholder('Enter the price').fill('250');
// unsupported currency warning
const cur = a.locator('select').filter({ hasText: 'SEK' }).first();
await cur.selectOption('AED'); await a.waitForTimeout(200);
console.log('5 AED warning:', (await a.getByRole('alert').allInnerTexts()).join(' | '));
await cur.selectOption('SEK'); await a.waitForTimeout(200);
await a.screenshot({ path: 'artifacts/country-picker-form.png' });
await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(900);
const table = (await a.locator('main').innerText()).replace(/\s+/g, ' ');
console.log('6 listed after save:', /Sweden/.test(table), /SEK/.test(table));
// sign-up picker as a new user
const u = await ctx.newPage();
u.on('pageerror', e => errs.push(e.message));
await u.addInitScript(() => localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-new', email: 'newuser@namevibes.test', displayName: 'New User' })));
await u.goto('http://localhost:5199/profile-complete'); await u.waitForTimeout(1500);
await u.getByPlaceholder('Type to search country...').click(); await u.waitForTimeout(300);
const names = (await u.locator('div.max-h-60 .font-medium').allInnerTexts());
console.log('7 sign-up picker lists:', names);
await u.getByPlaceholder('Type to search country...').fill('swe'); await u.waitForTimeout(300);
await u.locator('div.max-h-60 .font-medium', { hasText: 'Sweden' }).click(); await u.waitForTimeout(300);
console.log('8 Sweden selected, state field is free text:', await u.getByText('State/Province (optional)').count());
await u.screenshot({ path: 'artifacts/country-picker-signup.png' });
// pricing for a Swedish user
await u.getByPlaceholder('Enter your full name').fill('Test Svensson');
console.log('errors:', errs.length ? errs : 'none');
await b.close();
