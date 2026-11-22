import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const bad = [];
for (const w of [1440, 768, 390, 375, 360, 352, 345, 340, 320, 300]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  for (const lang of ['en', 'hi', 'ta', 'te', 'kn', 'ml']) {
    const p = await ctx.newPage();
    await p.addInitScript((l) => localStorage.setItem('nv_lang', l), lang);
    await p.goto('http://localhost:5199/'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s)?.getBoundingClientRect();
      const l = q('.site-navigation-logo'), pk = q('header .language-picker'), h = q('.site-home-link'), m = q('.site-menu-toggle');
      return { logoW: Math.round(l.width), pickW: Math.round(pk.width), fits: m.right <= innerWidth && pk.left >= l.right - 1 && pk.right <= h.left + 1 && h.right <= m.left + 1, overflow: document.documentElement.scrollWidth > innerWidth, rowOk: Math.abs(pk.top - m.top) < 12, menuH: Math.round(m.height), pickers: document.querySelectorAll('.language-picker').length };
    });
    if (!(r.fits && !r.overflow && r.logoW >= 80 && r.rowOk && r.pickers === 1)) bad.push(w + ' ' + lang + ' ' + JSON.stringify(r));
    await p.close();
  }
  await ctx.close();
}
console.log(bad.length ? 'PROBLEMS:\n' + bad.join('\n') : 'all fit: 7 widths x 6 languages, logo >= 80px, exactly one picker on the landing page');
await b.close();
