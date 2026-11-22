import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const [w, locale] of [[1440, 'en-IN'], [390, 'en-US'], [360, 'de-DE']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${w} pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errs.push(`${w} console: ${m.text().slice(0, 140)}`); });
  p.on('requestfailed', r => errs.push(`${w} failed: ${r.url().slice(0, 100)}`));
  await p.goto('https://namasutra.life/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getBoundingClientRect();
    const pk = q('header .language-picker'), h = q('.site-home-link'), m = q('.site-menu-toggle'), l = q('.site-navigation-logo');
    return { header: !!pk, order: pk && h && m && l.right <= pk.left + 1 && pk.right <= h.left + 1 && h.right <= m.left + 1, sameRow: pk && Math.abs(pk.top - m.top) < 12, pickersOnPage: document.querySelectorAll('.language-picker').length, globeButton: document.querySelectorAll('.site-language-toggle').length, overflow: document.documentElement.scrollWidth > innerWidth, options: [...document.querySelectorAll('header .language-picker option')].map(o => o.textContent), firstHero: document.querySelector('.landing-hero')?.firstElementChild?.className };
  });
  const geo = await (await p.request.get('https://namasutra.life/api/geo')).json();
  const price = await p.locator('[data-testid="landing-price"]').count() ? (await p.locator('[data-testid="landing-price"]').innerText()).replace(/\s+/g, ' ') : '(no price box)';
  console.log(`${w}px locale ${locale}: header dropdown=${r.header} order(logo,dropdown,Home,Menu)=${r.order} oneRow=${r.sameRow} pickersOnPage=${r.pickersOnPage} globeButton=${r.globeButton} overflow=${r.overflow} hero=${r.firstHero}`);
  console.log(`   options: ${r.options.join(' | ')}`);
  console.log(`   /api/geo says: ${JSON.stringify(geo)} | landing price: ${price}`);
  if (w === 390) await p.screenshot({ path: 'artifacts/live-landing-390.png', clip: { x: 0, y: 0, width: 390, height: 900 } });
  await ctx.close();
}
const ctx = await b.newContext({ viewport: { width: 390, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push('login pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('login console: ' + m.text().slice(0, 140)); });
await p.goto('https://namasutra.life/login', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
console.log('sign-in page:', (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200), '| google button:', await p.getByRole('button', { name: /google/i }).count());
console.log('errors:', errs.length ? errs : 'none');
await b.close();
