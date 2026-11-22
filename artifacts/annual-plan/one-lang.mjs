import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const w of [1440, 768, 390, 360, 320]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const bad = []; let landingInfo = '';
  for (const lang of ['en', 'hi', 'ta', 'te', 'kn', 'ml']) {
    for (const [route, signed] of [['/', false], ['/login', false], ['/pricing', true]]) {
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(([l, s]) => { localStorage.setItem('nv_lang', l); if (s) localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-family', email: 'family@namevibes.test', displayName: 'F' })); else localStorage.removeItem('nv_mock_session'); }, [lang, signed]);
      await p.goto('http://localhost:5199' + route); await p.waitForTimeout(800);
      const r = await p.evaluate(() => {
        const q = (s) => document.querySelector(s)?.getBoundingClientRect();
        const pick = q('header .language-picker'), home = q('.site-home-link'), m = q('.site-menu-toggle'), logo = q('.site-navigation-logo'), bar = q('.site-navigation-bar');
        const vis = (r) => r && r.width > 0 && r.right <= innerWidth + .5 && r.left >= -.5;
        return { pickers: document.querySelectorAll('.language-picker').length, headerPickers: document.querySelectorAll('header .language-picker').length, globe: document.querySelectorAll('.site-language-toggle').length,
          ok: [pick, home, m].every(vis), order: pick && home && m && pick.right <= home.left + 1 && home.right <= m.left + 1, sameRow: Math.abs(pick.top + pick.height / 2 - (home.top + home.height / 2)) < 3, logoClear: logo.right <= pick.left + 1 && logo.width >= 80, bar: bar.height, overflow: document.documentElement.scrollWidth > innerWidth, pw: Math.round(pick.width), selectVal: document.querySelector('header .language-picker select').value };
      });
      if (route === '/') {
        const hero = await p.evaluate(() => ({ pickersInMain: document.querySelectorAll('.landing-hero .language-picker, main .language-picker').length, first: document.querySelector('.landing-hero')?.firstElementChild?.className }));
        if (lang === 'en') landingInfo = JSON.stringify(hero);
        if (hero.pickersInMain) bad.push('picker in landing body');
      }
      const exp = route === '/login' ? 2 : 1; // sign-in page keeps its own picker (not part of this change)
      if (!(r.ok && r.order && r.sameRow && r.logoClear && r.bar <= 80 && !r.overflow && r.headerPickers === 1 && r.globe === 0 && r.pickers === exp && r.selectVal === lang)) bad.push(`${lang}${route} ${JSON.stringify(r)}`);
      await p.close();
    }
  }
  console.log(`width ${w}: ${bad.length ? 'PROBLEMS ' + bad.slice(0, 4).join(' ; ') : 'ok (6 languages x landing, sign-in, pricing)'} | landing hero first element: ${landingInfo}`);
  await ctx.close();
}
// behaviour: choose language in header persists
const ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/'); await p.waitForTimeout(1000);
await p.locator('header .language-picker select').selectOption('ta'); await p.waitForTimeout(900);
console.log('choose Tamil in header: html lang', await p.evaluate(() => document.documentElement.lang), '| saved', await p.evaluate(() => localStorage.getItem('nv_lang')));
await p.reload(); await p.waitForTimeout(1000);
console.log('after reload:', await p.evaluate(() => document.documentElement.lang), '| options:', await p.locator('header .language-picker option').allInnerTexts());
await p.screenshot({ path: 'artifacts/one-lang-360.png', clip: { x: 0, y: 0, width: 360, height: 520 } });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
