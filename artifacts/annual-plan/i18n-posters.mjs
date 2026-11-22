import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = 'artifacts/i18n-posters';
fs.mkdirSync(OUT, { recursive: true });
const langs = (process.env.LANGS || 'en,hi,ta,te,kn,ml').split(',');
const browser = await chromium.launch({ executablePath: 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const errs = [];
for (const lang of langs) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', e => errs.push(lang + ': ' + e.message));
  await page.addInitScript(l => localStorage.setItem('nv_lang', l), lang);
  await page.goto('http://localhost:5199/'); await page.waitForTimeout(1500);
  for (const theme of ['gold', 'dark']) {
    for (const kind of ['single', 'family']) {
      const res = await page.evaluate(async ([theme, kind]) => {
        const { parseNameToElements } = await import('/src/utils/elements.js');
        const mk = (n, r) => ({ fullName: n, relation: r, elements: parseNameToElements(n) });
        const people = kind === 'single' ? [mk('Vibes', 'Self')] : [mk('Farah Khan', 'Mother'), mk('Arun Khan', 'Father'), mk('Zara Khan', 'Daughter')];
        const { isComplexLanguage } = await import('/src/i18n/posterFont.js');
        const toB64 = (blob) => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
        const png = kind === 'single'
          ? await (await import('/src/utils/posterImage.js')).buildPosterImage(people[0], false, theme)
          : await (await import('/src/utils/familyPosterImage.js')).buildFamilyPosterImage(people, theme);
        let pdf;
        if (isComplexLanguage()) pdf = await (await import('/src/utils/posterPdfImage.js')).buildPosterImagePDF(people, { theme, family: kind === 'family' });
        else {
          const m = await import('/src/utils/posterReport.js');
          const [logo, artwork] = await Promise.all([m.loadPosterLogo(theme).catch(() => null), m.loadPosterArtwork(theme).catch(() => null)]);
          pdf = m.buildPosterPDF(people, { theme, logo, artwork, family: kind === 'family' });
        }
        return { png: await toB64(png), pdf: await toB64(pdf.output('blob')), pages: pdf.getNumberOfPages(), complex: isComplexLanguage() };
      }, [theme, kind]);
      fs.writeFileSync(`${OUT}/${lang}-${kind}-${theme}.png`, Buffer.from(res.png, 'base64'));
      fs.writeFileSync(`${OUT}/${lang}-${kind}-${theme}.pdf`, Buffer.from(res.pdf, 'base64'));
      console.log(lang, kind, theme, 'pdf pages', res.pages, res.complex ? '(image pdf)' : '(vector pdf)');
    }
  }
  await page.close();
}
await browser.close();
console.log('ERRORS', errs.join('\n') || 'none');
