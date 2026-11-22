import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
const URL = 'http://localhost:5199';
const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

async function page(ctx, label, session, lang = 'en') {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(label + ': ' + e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(([s, l]) => {
    localStorage.setItem('nv_lang', l);
    if (s) localStorage.setItem('nv_mock_session', JSON.stringify(s)); else localStorage.removeItem('nv_mock_session');
  }, [session, lang]);
  return p;
}
const ADMIN = { uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin' };
const FAMILY = { uid: 'mock-family', email: 'family@namevibes.test', displayName: 'F' };
const UNPAID = { uid: 'mock-unpaid', email: 'unpaid@namevibes.test', displayName: 'U' };

async function landing(ctx, label, lang = 'en') {
  const p = await page(ctx, label, null, lang);
  await p.goto(URL + '/'); await p.waitForTimeout(1800);
  const box = p.locator('[data-testid="landing-price"]');
  const present = await box.count();
  const text = present ? (await box.innerText()).replace(/\s+/g, ' ') : '(no price box)';
  console.log(`  ${label}: ${text}`);
  return p;
}

for (const [vp, w, h] of [['390', 390, 850], ['desktop', 1280, 900]]) {
  console.log(`\n===== ${vp} =====`);
  // ---- signed out, detected from browser locale ----
  let ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'en-IN' });
  console.log('signed out, locale en-IN (India active):');
  let p = await landing(ctx, 'landing');
  console.log('  change-country link visible:', await p.getByRole('button', { name: 'Change country' }).isVisible());
  await p.getByRole('button', { name: 'Change country' }).click(); await p.waitForTimeout(300);
  const cb = p.getByRole('combobox');
  await cb.click(); await p.waitForTimeout(200);
  console.log('  picker lists only Active countries:', (await p.getByRole('option').allInnerTexts()).map(s => s.replace(/\s+/g, ' ')));
  await p.getByRole('option', { name: /United States/ }).click(); await p.waitForTimeout(800);
  console.log('  after choosing US:', (await p.locator('[data-testid="landing-price"]').innerText()).replace(/\s+/g, ' '));
  await p.reload(); await p.waitForTimeout(1500);
  console.log('  choice remembered after reload:', (await p.locator('[data-testid="landing-price-amount"]').innerText()).trim());
  await p.screenshot({ path: `artifacts/price-landing-${vp}.png` });
  console.log('  page lists several countries prices at once?', /₹.*\$|\$.*₹/.test(await body(p)));
  await ctx.close();

  ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'en-US' });
  console.log('signed out, locale en-US:'); await landing(ctx, 'landing');
  await ctx.close();

  // ---- Sweden: not active -> message + picker; admin activates -> price appears ----
  ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'sv-SE' });
  console.log('signed out, locale sv-SE (Sweden NOT active):');
  p = await landing(ctx, 'landing');
  console.log('  picker offered, Sweden not in it:', !(await p.getByRole('combobox').count() === 0), 'no price amount shown:', await p.locator('[data-testid="landing-price-amount"]').count() === 0);
  const a = await page(ctx, 'admin', ADMIN);
  await a.goto(URL + '/admin'); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  await a.getByRole('button', { name: /Add Country/ }).first().click(); await a.waitForTimeout(300);
  const acb = a.getByRole('combobox', { name: 'Country' });
  await acb.click(); await acb.fill('swe'); await a.waitForTimeout(200); await a.keyboard.press('Enter');
  await a.getByPlaceholder('Enter the price').fill('250');
  await a.locator('input[placeholder="0"]').fill('25').catch(() => {});
  await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(1500);
  console.log('after admin activates Sweden:'); console.log('  ', (await p.locator('[data-testid="landing-price"]').innerText()).replace(/\s+/g, ' '));
  await p.screenshot({ path: `artifacts/price-sweden-${vp}.png` });

  // ---- locale fr-FR, no France pricing ----
  const f = await b.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR' });
  console.log('signed out, locale fr-FR (France NOT active, nothing seeded for it):');
  await landing(f, 'landing'); await f.close();

  // ---- signed-in pricing pages ----
  console.log('signed in:');
  for (const [label, session] of [['India user', UNPAID], ['US user', FAMILY]]) {
    const u = await page(ctx, label, session);
    await u.goto(URL + '/pricing'); await u.waitForTimeout(1600);
    const t = await body(u);
    console.log(`  ${label} /pricing:`, (t.match(/Price for [^/]*?\/ year|Price for .{0,60}/) || ['?'])[0], '|', (t.match(/Includes \d+% (GST|tax)/) || ['no tax note'])[0], '|', (t.match(/Razorpay|PayPal/) || ['no gateway'])[0], '| Sweden price visible:', /kr\s?250|250\s?kr/.test(t));
    await u.close();
  }

  // ---- US user: deactivate US -> country picker limited to Active; choose India saves profile ----
  await a.reload(); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  const card = (name) => a.locator('h3', { hasText: name }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await card('United States').locator('button').first().click(); await a.waitForTimeout(300);
  await a.locator('input[type=checkbox]').last().uncheck();
  await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
  const us = await page(ctx, 'us-inactive', FAMILY);
  await us.goto(URL + '/pricing'); await us.waitForTimeout(1600);
  console.log('US user while US is not Active:', (await body(us)).slice(0, 220));
  await us.getByRole('combobox').click(); await us.waitForTimeout(200);
  console.log('  picker lists:', (await us.getByRole('option').allInnerTexts()).map(s => s.replace(/\s+/g, ' ')));
  await us.getByRole('option', { name: /India/ }).click(); await us.waitForTimeout(1800);
  console.log('  after choosing India:', (await body(us)).match(/Price for India[^]{0,60}/)?.[0]);

  // ---- coming soon: set India user's currency to AED (Razorpay-only), switch off ----
  await a.reload(); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  await card('Sweden').locator('button').first().click(); await a.waitForTimeout(300);
  await a.locator('select').filter({ hasText: 'SEK' }).first().selectOption('AED');
  await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
  // make the family user a Swedish user
  const sw = await page(ctx, 'sweden-user', FAMILY);
  await sw.goto(URL + '/pricing'); await sw.waitForTimeout(800);
  // (profile country is India now after the picker step; point the user at Sweden through Settings-free path: use the picker on a fresh unpriced state)
  await sw.close();
  console.log('--');
  await ctx.close();
}
console.log('\nerrors:', errs.length ? errs : 'none');
await b.close();
