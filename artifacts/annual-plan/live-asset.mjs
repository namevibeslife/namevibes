import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
for (let i = 0; i < 4; i++) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US' });
  const p = await ctx.newPage();
  const seen = [];
  p.on('response', async r => { if (/\/assets\/(en|hi)-/.test(r.url()) || /\/assets\/.*\.js$/.test(r.url()) && r.headers()['content-type']?.includes('html')) seen.push(`${r.status()} ${r.headers()['content-type']} ${r.url().split('/').pop()} cf=${r.headers()['cf-cache-status']}`); });
  await p.goto('https://namasutra.life/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const sw = await p.evaluate(async () => (await navigator.serviceWorker?.getRegistrations?.())?.length);
  console.log(`run ${i}: sw=${sw} header=${await p.locator('header .language-picker').count()} responses: ${seen.join(' ; ')}`);
  await ctx.close();
}
await b.close();
