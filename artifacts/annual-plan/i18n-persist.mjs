import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
const p = await ctx.newPage();
await p.addInitScript(() => { if (!localStorage.getItem('nv_mock_session')) localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-family', email: 'family@namevibes.test', displayName: 'Farah Family' })); });
const state = async () => p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, saved: localStorage.getItem('nv_lang'), home: document.querySelector('.site-home-link')?.textContent }));
await p.goto('http://localhost:5199/'); await p.waitForTimeout(1500);
console.log('1 first visit (en browser, no saved):', await state());
await p.locator('button[aria-controls="site-navigation-menu"]').click();
const t0 = Date.now();
await p.locator('#site-navigation-menu select').selectOption('te');
await p.waitForFunction(() => document.documentElement.lang === 'te');
console.log('2 switched to Telugu in', Date.now() - t0, 'ms:', await state());
await p.waitForTimeout(800);
const prof = await p.evaluate(() => { const db = JSON.parse(localStorage.getItem('nv_mock_db') || '{}'); const k = Object.keys(db).find(x => x.includes('users/mock-family') && !x.includes('analyses')); return k ? db[k].language : 'no doc'; });
console.log('3 language saved on the profile document:', prof);
await p.reload(); await p.waitForTimeout(1500);
console.log('4 after reload:', await state());
// "new device": same account (same database), no local choice
await p.evaluate(() => localStorage.removeItem('nv_lang'));
await p.reload(); await p.waitForTimeout(2200);
console.log('5 new device (nv_lang cleared, profile says te):', await state());
// a different saved local choice wins and is written back
await p.locator('button[aria-controls="site-navigation-menu"]').click();
await p.locator('#site-navigation-menu select').selectOption('ml'); await p.waitForTimeout(800);
const prof2 = await p.evaluate(() => { const db = JSON.parse(localStorage.getItem('nv_mock_db') || '{}'); const k = Object.keys(db).find(x => x.includes('users/mock-family') && !x.includes('analyses')); return db[k].language; });
console.log('6 changed to Malayalam, profile now:', prof2);
// India visitor with no saved choice and Hindi browser: spec says English
const c2 = await b.newContext({ locale: 'hi-IN' }); const p2 = await c2.newPage();
await p2.route('**/api/geo', r => r.fulfill({ json: { country: 'IN' } }));
await p2.goto('http://localhost:5199/'); await p2.waitForTimeout(1500);
console.log('7 India + Hindi browser, nothing saved:', await p2.evaluate(() => ({ lang: document.documentElement.lang, pickerShown: !!document.querySelector('.language-picker-prominent') })));
const c3 = await b.newContext({ locale: 'ta-LK' }); const p3 = await c3.newPage();
await p3.route('**/api/geo', r => r.fulfill({ json: { country: 'LK' } }));
await p3.goto('http://localhost:5199/'); await p3.waitForTimeout(1500);
console.log('8 non-India + Tamil browser, nothing saved:', await p3.evaluate(() => document.documentElement.lang));
await b.close();
