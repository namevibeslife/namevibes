import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
for (const sw of ['allow', 'block']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US', serviceWorkers: sw });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 90)); });
  p.on('response', async r => { if (/\/assets\/en-/.test(r.url())) { const body = await r.text().catch(() => ''); errs.push(`RESP ${r.status()} ${r.headers()['content-type']} fromSW=${r.fromServiceWorker()} bodyStart=${JSON.stringify(body.slice(0, 40))} reqHeaders=${JSON.stringify(await r.request().allHeaders().catch(() => ({})))}`.slice(0, 600)); } });
  await p.goto('https://namasutra.life/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  console.log(`serviceWorkers=${sw}: header dropdown=${await p.locator('header .language-picker').count()}`); errs.forEach(e => console.log('   ', e));
  await ctx.close();
}
await b.close();
