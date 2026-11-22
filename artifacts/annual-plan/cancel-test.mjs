import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const [lang, w] of [['en', 390], ['ta', 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([l]) => { localStorage.setItem('nv_lang', l); localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-family', email: 'family@namevibes.test', displayName: 'F' })); }, [lang]);
  const grab = async (route) => { await p.goto('http://localhost:5199' + route); await p.waitForTimeout(1400); return (await p.locator('body').innerText()).replace(/\s+/g, ' '); };
  const pricing = await grab('/pricing');
  console.log(lang, w, 'pricing card:', pricing.match(/One yearly payment\. No automatic renewal\.|ஆண்டுக்கு ஒருமுறை கட்டணம்\. தானியங்கிப் புதுப்பிப்பு இல்லை\./)?.[0]);
  await p.locator('button.bg-paper').first().click().catch(() => {}); await p.waitForTimeout(1200);
  console.log(lang, w, 'payment page has full sentence:', /You pay once for the year|ஒரே முறை செலுத்துகிறீர்கள்/.test((await p.locator('body').innerText()).replace(/\s+/g, ' ')));
  console.log(lang, w, 'profile has full sentence:', /You pay once for the year|ஒரே முறை செலுத்துகிறீர்கள்/.test(await grab('/profile')));
  console.log(lang, w, 'dashboard plan line:', (await grab('/dashboard')).match(/Annual Plan[^]{0,40}|ஆண்டுத் திட்டம்[^]{0,40}/)?.[0]);
  await ctx.close();
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
