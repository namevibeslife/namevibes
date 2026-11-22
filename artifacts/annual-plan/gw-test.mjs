import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
const errs = [];
const a = await ctx.newPage();
a.on('pageerror', e => errs.push('admin: ' + e.message));
a.on('dialog', d => d.accept());
await a.addInitScript(() => { localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin' })); });
await a.goto('http://localhost:5199/admin'); await a.waitForTimeout(1200);
await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
const flag = a.getByRole('checkbox');
console.log('flag default checked:', await flag.isChecked());

// add United States USD 25
await a.getByRole('button', { name: /Add Country/ }).first().click(); await a.waitForTimeout(300);
const cb = a.getByRole('combobox', { name: 'Country' });
await cb.click(); await cb.fill('united states'); await a.waitForTimeout(200); await a.keyboard.press('Enter');
await a.getByPlaceholder('Enter the price').fill('25');
console.log('US form notes (flag off):', (await a.getByRole('alert').allInnerTexts()).join(' | '));
await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);

async function userView(uid, email, label) {
  const u = await ctx.newPage();
  u.on('pageerror', e => errs.push(label + ': ' + e.message));
  await u.addInitScript(([uid, email]) => { localStorage.setItem('nv_mock_session', JSON.stringify({ uid, email, displayName: 'T' })); }, [uid, email]);
  await u.goto('http://localhost:5199/pricing'); await u.waitForTimeout(1500);
  const body = (await u.locator('body').innerText()).replace(/\s+/g, ' ');
  const powered = (body.match(/Secure payment powered by \w+/) || [])[0];
  const blocked = /Payments are not available/.test(body);
  const cta = u.getByRole('button', { name: /Activate|Get|Buy|Subscribe|Start|Continue|Choose|Select|Pay/i }).last();
  const disabled = await cta.isDisabled().catch(() => 'n/a');
  let pay = '';
  if (!disabled) {
    await cta.click(); await u.waitForTimeout(1200);
    const pb = (await u.locator('body').innerText()).replace(/\s+/g, ' ');
    pay = (pb.match(/Gateway that would be used: \w+/) || [])[0] || (/Payments are not available/.test(pb) ? 'BLOCKED' : 'no gateway line');
  }
  console.log(`${label}: pricing="${powered || 'none'}" blockedMsg=${blocked} ctaDisabled=${disabled} payment="${pay}"`);
  await u.close();
}
async function edit(fn) {
  await a.reload(); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  await fn();
}
await userView('mock-family', 'family@namevibes.test', 'US/USD flag off');
await userView('mock-unpaid', 'unpaid@namevibes.test', 'IN/INR flag off');

await a.getByRole('checkbox').check(); await a.waitForTimeout(500);
await userView('mock-family', 'family@namevibes.test', 'US/USD flag ON');
await userView('mock-unpaid', 'unpaid@namevibes.test', 'IN/INR flag ON');

// override PayPal for US
await a.locator('button:has(svg.lucide-pen-square), button:has(svg.lucide-edit)').first().click().catch(() => {});
await a.waitForTimeout(400);
console.log('modal open:', await a.getByText('Payment gateway').count() > 0);
const sel = a.locator('select').filter({ hasText: 'Auto (Razorpay' });
await sel.selectOption('paypal'); await a.waitForTimeout(200);
console.log('forced PayPal notes:', (await a.getByRole('alert').allInnerTexts()).join(' | '));
await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
await userView('mock-family', 'family@namevibes.test', 'US/USD flag ON, forced PayPal');

// back to auto, currency AFN (neither gateway) and flag off, then flag on with AED-like (razorpay only)
await a.locator('button:has(svg.lucide-pen-square), button:has(svg.lucide-edit)').first().click(); await a.waitForTimeout(400);
await a.locator('select').filter({ hasText: 'Auto (Razorpay' }).selectOption('auto');
await a.locator('select').filter({ hasText: 'USD' }).first().selectOption('AED'); await a.waitForTimeout(200);
await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
await userView('mock-family', 'family@namevibes.test', 'US/AED flag ON (Razorpay only)');
await a.getByRole('checkbox').uncheck(); await a.waitForTimeout(500);
console.log('card line:', (await a.locator('main').innerText()).match(/Payment gateway\s*[^\n]*\n?[^\n]*/)?.[0]);
await userView('mock-family', 'family@namevibes.test', 'US/AED flag off (no PayPal for AED)');
await a.locator('button:has(svg.lucide-pen-square), button:has(svg.lucide-edit)').first().click(); await a.waitForTimeout(400);
console.log('AED flag-off notes:', (await a.getByRole('alert').allInnerTexts()).join(' | '));
await a.screenshot({ path: 'artifacts/gateway-form.png' });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
