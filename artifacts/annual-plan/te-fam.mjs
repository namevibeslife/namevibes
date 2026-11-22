import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => localStorage.setItem('nv_lang', 'te'));
await p.goto('http://localhost:5199/'); await p.waitForTimeout(1500);
const t0 = Date.now();
const r = await Promise.race([
  p.evaluate(async () => {
    const { parseNameToElements } = await import('/src/utils/elements.js');
    const mk = (n, r) => ({ fullName: n, relation: r, elements: parseNameToElements(n) });
    const people = [mk('Farah Khan', 'Mother'), mk('Arun Khan', 'Father'), mk('Zara Khan', 'Daughter')];
    const f = await (await import('/src/utils/familyPosterImage.js')).buildFamilyPosterImage(people, 'gold');
    return f.size;
  }),
  new Promise(r => setTimeout(() => r('TIMEOUT'), 60000)),
]);
console.log(r, Date.now() - t0);
await b.close();
