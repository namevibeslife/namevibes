import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const [label, w, h, signedIn] of [['mobile', 390, 800, false], ['mobile360-signedin', 360, 800, true], ['desktop', 1280, 900, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(label + ': ' + e.message));
  await p.addInitScript(([si]) => { if (si) localStorage.setItem('nv_mock_session', JSON.stringify({ uid: 'mock-unpaid', email: 'unpaid@namevibes.test', displayName: 'U' })); }, [signedIn]);
  for (const route of ['/', '/login', '/pricing']) {
    if (!signedIn && route === '/pricing') continue;
    await p.goto('http://localhost:5199' + route); await p.waitForTimeout(1300);
    const btn = p.locator('.site-language-toggle');
    const box = await btn.boundingBox();
    const bar = await p.locator('.site-navigation-bar').boundingBox();
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const rowOk = await p.evaluate(() => { const a = document.querySelector('.site-navigation-actions').getBoundingClientRect(), l = document.querySelector('.site-navigation-logo').getBoundingClientRect(); return a.left >= l.right - 1 && a.right <= window.innerWidth; });
    console.log(`${label} ${route}: visible=${await btn.isVisible()} ${Math.round(box.width)}x${Math.round(box.height)} barHeight=${Math.round(bar.height)} overflowX=${over} actionsFit=${rowOk} aria="${await btn.getAttribute('aria-label')}"`);
  }
  await p.goto('http://localhost:5199/'); await p.waitForTimeout(1200);
  const btn = p.locator('.site-language-toggle');
  await btn.click(); await p.waitForTimeout(300);
  const menu = p.locator('.site-language-menu');
  const mb = await menu.boundingBox(); const bb = await btn.boundingBox();
  console.log(`${label} open: items=${await menu.locator('button').count()} width=${Math.round(mb.width)} left=${Math.round(mb.x)} right=${Math.round(mb.x + mb.width)} top=${Math.round(mb.y)} (button bottom ${Math.round(bb.y + bb.height)}) names=${(await menu.locator('button').allInnerTexts()).join(' / ')} focusOn=${await p.evaluate(() => document.activeElement.getAttribute('lang'))}`);
  await p.screenshot({ path: `artifacts/lang-btn-${label}-open.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  console.log(`${label} Escape: closed=${await menu.count() === 0} focusOnButton=${await p.evaluate(() => document.activeElement.classList.contains('site-language-toggle'))}`);
  await btn.click(); await p.waitForTimeout(150);
  await p.mouse.click(w / 2, h - 40); await p.waitForTimeout(150);
  console.log(`${label} outside click closes: ${await menu.count() === 0}`);
  // Menu closes language and vice versa
  await btn.click(); await p.getByRole('button', { name: /Menu/ }).click(); await p.waitForTimeout(200);
  console.log(`${label} menu opened -> language list closed: ${await menu.count() === 0}, menu open: ${await p.locator('#site-navigation-menu').count() === 1}`);
  await btn.click(); await p.waitForTimeout(200);
  console.log(`${label} language opened -> menu closed: ${await p.locator('#site-navigation-menu').count() === 0}`);
  // choose Hindi, then Tamil
  for (const [name, code] of [['हिन्दी', 'hi'], ['தமிழ்', 'ta']]) {
    if (await menu.count() === 0) await btn.click();
    await p.locator(`.site-language-menu button[lang="${code}"]`).click(); await p.waitForTimeout(900);
    const o = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`${label} chose ${code}: html lang=${await p.evaluate(() => document.documentElement.lang)} aria="${await btn.getAttribute('aria-label')}" menuBtn="${(await p.locator('.site-menu-toggle').innerText()).trim()}" focusOnButton=${await p.evaluate(() => document.activeElement.classList.contains('site-language-toggle'))} overflowX=${o} stored=${await p.evaluate(() => localStorage.getItem('nv_lang'))}`);
    await p.screenshot({ path: `artifacts/lang-btn-${label}-${code}.png`, clip: { x: 0, y: 0, width: w, height: 400 } });
  }
  await p.reload(); await p.waitForTimeout(1200);
  console.log(`${label} after reload lang=${await p.evaluate(() => document.documentElement.lang)}`);
  await ctx.close();
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
