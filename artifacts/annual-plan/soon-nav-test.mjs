import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
const URL = 'http://localhost:5199';
const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
const ADMIN = { uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin' };
const FAMILY = { uid: 'mock-family', email: 'family@namevibes.test', displayName: 'F' };
async function page(ctx, label, session, lang = 'en') {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(label + ': ' + e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(([s, l]) => { localStorage.setItem('nv_lang', l); if (s) localStorage.setItem('nv_mock_session', JSON.stringify(s)); else localStorage.removeItem('nv_mock_session'); }, [session, lang]);
  return p;
}

// ---- 1. top bar: Home + globe + Menu never wrap or vanish ----
console.log('TOP BAR');
for (const w of []) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const bad = [];
  for (const lang of ['en', 'ta', 'ml', 'hi', 'te', 'kn']) {
    for (const [route, session] of [['/', null], ['/login', null], ['/pricing', FAMILY]]) {
      const p = await page(ctx, `nav ${w} ${lang}`, session, lang);
      await p.goto(URL + route); await p.waitForTimeout(900);
      const r = await p.evaluate(() => {
        const q = (s) => document.querySelector(s)?.getBoundingClientRect();
        const bar = q('.site-navigation-bar'), home = q('.site-home-link'), g = q('.site-language-toggle'), m = q('.site-menu-toggle'), logo = q('.site-navigation-logo');
        const vis = (r) => r && r.width > 0 && r.height > 0 && r.right <= innerWidth + 0.5 && r.left >= -0.5;
        return { bar: bar.height, ok: [home, g, m].every(vis), sameRow: Math.abs(home.top - g.top) < 2 && Math.abs(g.top - m.top) < 2, noOverlap: home.right <= g.left + 1 && g.right <= m.left + 1 && logo.right <= home.left + 1, gw: g.width, gh: g.height, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      if (!(r.ok && r.sameRow && r.noOverlap && r.bar <= 80 && !r.overflow && r.gw >= 44 && r.gh >= 44)) bad.push(`${lang}${route} ${JSON.stringify(r)}`);
      await p.close();
    }
  }
  console.log(`  width ${w}: ${bad.length ? 'PROBLEMS ' + bad.join(' ; ') : 'ok in 6 languages x 3 pages (one row, 44px globe, no overlap, no overflow)'}`);
  await ctx.close();
}

// ---- 2. coming soon (Razorpay-only currency while International Payments is off) ----
for (const [vp, w, h] of [['desktop', 1280, 900]]) {
  console.log(`\nCOMING SOON ${vp}`);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'en-US' });
  const a = await page(ctx, 'admin', ADMIN);
  await a.goto(URL + '/admin'); await a.waitForTimeout(1200);
  await a.getByRole('button', { name: /Country Pricing/ }).first().click(); await a.waitForTimeout(500);
  const card = (name) => a.locator('h3', { hasText: name }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  console.log('  switch default off:', !(await a.getByRole('checkbox').first().isChecked()));
  await card('United States').locator('button').first().click(); await a.waitForTimeout(300);
  await a.locator('select').filter({ hasText: 'USD' }).first().selectOption('AED');
  console.log('  admin note:', (await a.getByRole('alert').allInnerTexts()).join(' | ').slice(0, 150));
  await a.getByRole('button', { name: 'Save Country' }).click(); await a.waitForTimeout(800);
  console.log('  card shows:', (await card('United States').innerText()).replace(/\s+/g, ' ').match(/Payment gateway[^]{0,40}/)?.[0]);

  const u = await page(ctx, 'uae-user', FAMILY);
  await u.goto(URL + '/pricing'); await u.waitForTimeout(1600);
  let t = await body(u);
  console.log('  pricing: coming-soon notice:', /Payments for your country are coming soon/.test(t), '| notify form:', await u.getByRole('button', { name: 'Notify me' }).count(), '| pay button present:', await u.getByRole('button', { name: 'Get the Annual Plan' }).count());
  await u.getByPlaceholder('Your email').fill('someone@example.com');
  await u.getByRole('button', { name: 'Notify me' }).click(); await u.waitForTimeout(700);
  console.log('  after notify:', (await body(u)).match(/Thank you[^.]*\./)?.[0]);
  await u.screenshot({ path: `artifacts/coming-soon-${vp}.png` });
  // direct payment page visit (no state) bounces to pricing; with state it must also show coming soon
  await u.goto(URL + '/pricing'); await u.waitForTimeout(500);

  // flip the single admin switch ON: country moves to Razorpay with nothing else changed
  await a.getByRole('checkbox').first().check(); await a.waitForTimeout(600);
  await u.goto(URL + '/pricing'); await u.waitForTimeout(1600);
  t = await body(u);
  console.log('  switch ON -> coming soon gone:', !/coming soon/.test(t), '| button:', await u.getByRole('button', { name: 'Get the Annual Plan' }).count(), '| gateway text:', t.match(/Razorpay|PayPal/)?.[0]);
  await u.getByRole('button', { name: 'Get the Annual Plan' }).click(); await u.waitForTimeout(1200);
  console.log('  payment page gateway line:', (await body(u)).match(/Gateway that would be used: \w+/)?.[0]);
  // and off again
  await a.getByRole('checkbox').first().uncheck(); await a.waitForTimeout(600);
  await ctx.close();
}
console.log('\nerrors:', errs.length ? errs : 'none');
await b.close();
