import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
for (const [lang, path, ses] of [['ta', '/', null], ['ml', '/', null], ['kn', '/', null], ['ta', '/ambassador', { uid: 'mock-ambassador', email: 'ambassador@namevibes.test', displayName: 'Arjun' }]]) {
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  await p.addInitScript(([l, s]) => { localStorage.setItem('nv_lang', l); if (s) localStorage.setItem('nv_mock_session', JSON.stringify(s)); }, [lang, ses]);
  await p.goto('http://localhost:5199' + path); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 4).map(e => `${e.tagName}.${(e.className || '').toString().slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)} "${(e.innerText || '').slice(0, 30)}"`));
  console.log(lang, path, r);
  await p.close();
}
await b.close();
