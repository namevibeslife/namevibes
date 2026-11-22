import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const BASE = 'http://localhost:5199';
const OUT = 'artifacts/i18n';
fs.mkdirSync(OUT, { recursive: true });
const langs = (process.env.LANGS || 'hi,ta,te,kn,ml').split(',');
const widths = (process.env.WIDTHS || '390,1440').split(',').map(Number);
const ses = {
  none: null,
  newu: { uid: 'mock-new', email: 'newuser@namevibes.test', displayName: 'New User' },
  unpaid: { uid: 'mock-unpaid', email: 'unpaid@namevibes.test', displayName: 'Unpaid User' },
  indiv: { uid: 'mock-individual', email: 'individual@namevibes.test', displayName: 'Indira Individual' },
  family: { uid: 'mock-family', email: 'family@namevibes.test', displayName: 'Farah Family' },
  amb: { uid: 'mock-ambassador', email: 'ambassador@namevibes.test', displayName: 'Arjun Ambassador' },
};
const STOP = new Set('the and your you to of for with is are this that in on a an be can it as at or by from will'.split(' '));
const ALLOW_WORDS = new Set(['a', 'an', 'in', 'is', 'to', 'of', 'at', 'as', 'it', 'or', 'be', 'by']); // too short to be a signal
const problems = [];
const errors = [];
const summary = [];

async function leftover(page) {
  const text = await page.evaluate(() => document.body.innerText);
  const words = text.replace(/[^A-Za-z' ]+/g, ' ').split(/\s+/).filter(Boolean).map(w => w.toLowerCase());
  const hits = {};
  for (const w of words) if (STOP.has(w) && !ALLOW_WORDS.has(w)) hits[w] = (hits[w] || 0) + 1;
  return hits;
}

async function visit(browser, lang, width, name, session, path, act) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 900 : 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${lang}/${width}/${name}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|net::ERR/.test(m.text())) errors.push(`${lang}/${width}/${name}: console ${m.text().slice(0, 120)}`); });
  await page.addInitScript(([l, s]) => { try { localStorage.setItem('nv_lang', l); if (s) localStorage.setItem('nv_mock_session', JSON.stringify(s)); } catch (e) {} }, [lang, session]);
  await page.goto(BASE + path);
  await page.waitForTimeout(1400);
  if (act) await act(page, lang);
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  const left = await leftover(page);
  const bad = Object.entries(left).filter(([, n]) => n >= 2);
  await page.screenshot({ path: `${OUT}/${lang}-${width}-${name}.png`, fullPage: true });
  summary.push(`${lang} ${width} ${name}: overflow=${overflow} htmlLang=${htmlLang} english=${bad.map(([w, n]) => w + ':' + n).join(',') || '-'}`);
  if (overflow) problems.push(`${lang}/${width}/${name}: horizontal overflow`);
  if (htmlLang !== lang) problems.push(`${lang}/${width}/${name}: html lang=${htmlLang}`);
  if (bad.length) problems.push(`${lang}/${width}/${name}: possible English: ${bad.map(([w, n]) => w + ':' + n).join(',')}`);
  await ctx.close();
}

const browser = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
for (const lang of langs) {
  const tr = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`, 'utf8'));
  for (const width of widths) {
    await visit(browser, lang, width, 'landing', ses.none, '/');
    await visit(browser, lang, width, 'signin', ses.none, '/login');
    await visit(browser, lang, width, 'profile-complete', ses.newu, '/profile-complete');
    await visit(browser, lang, width, 'pricing-nocode', ses.unpaid, '/pricing');
    await visit(browser, lang, width, 'pricing-code', ses.unpaid, '/', async (p) => {
      await p.evaluate(async () => { const f = await import('/src/firebase.js'); const m = await import('/src/mock/firestore.js'); await m.updateDoc(m.doc(f.db, 'users', 'mock-unpaid'), { referralCodeUsed: 'IN988595' }); });
      await p.goto(BASE + '/pricing'); await p.waitForTimeout(1200);
    });
    await visit(browser, lang, width, 'payment', ses.unpaid, '/pricing', async (p) => {
      await p.getByRole('button', { name: tr.pricing.cta }).click(); await p.waitForTimeout(1200);
    });
    await visit(browser, lang, width, 'dashboard', ses.family, '/dashboard');
    await visit(browser, lang, width, 'analyze-result', ses.indiv, '/analyze', async (p) => {
      await p.locator('input[type=text]').first().fill('Vibes'); await p.getByRole('button', { name: tr.analyze.button }).click(); await p.waitForTimeout(1200);
    });
    await visit(browser, lang, width, 'family-result', ses.family, '/family', async (p) => {
      const inputs = p.locator('input[type=text]');
      await inputs.nth(0).fill('Farah'); await inputs.nth(2).fill('Khan');
      await p.getByRole('button', { name: tr.family.addName.replace('{{n}}', '1').replace('{{max}}', '4') }).click();
      await p.waitForTimeout(300);
      const all = p.locator('input[type=text]');
      await all.nth(3).fill('Arun'); await all.nth(5).fill('Khan');
      await p.getByRole('button', { name: tr.family.analyzeAll }).click(); await p.waitForTimeout(1500);
    });
    await visit(browser, lang, width, 'hora', ses.family, '/hora-muhurat');
    await visit(browser, lang, width, 'profile', ses.family, '/profile');
    await visit(browser, lang, width, 'settings', ses.family, '/settings');
    await visit(browser, lang, width, 'menu', ses.family, '/', async (p) => { await p.locator('button[aria-controls="site-navigation-menu"]').click(); await p.waitForTimeout(500); });
    await visit(browser, lang, width, 'ambassador', ses.amb, '/ambassador');
  }
}
await browser.close();
fs.writeFileSync(`${OUT}/summary-${langs.join('')}.txt`, summary.join('\n'));
console.log(summary.filter(s => /overflow=true|english=[a-z]/.test(s) || true).length, 'pages checked');
console.log('PROBLEMS:'); console.log(problems.join('\n') || 'none');
console.log('ERRORS:'); console.log([...new Set(errors)].slice(0, 25).join('\n') || 'none');
