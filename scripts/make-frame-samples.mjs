// Makes the three "Sample" images shown on the framed-poster product page from OUR OWN designs (the real element engine, the
// real frame layouts and the 10 mm inset), so they carry NAMASUTRA branding and no mock panels. Web size, not print size.
//   1. npm run dev:mock -- --port 5190      2. node scripts/make-frame-samples.mjs
// Writes public/merch/samples/frame-{elements-gold,individual-dark,family-dark}.jpg (the paths the product page reads).
// Env: PLAYWRIGHT_MODULE, CHROME, BASE_URL (as in test-merch-browser.mjs).
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs');
const BASE = process.env.BASE_URL || 'http://localhost:5190';
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const page = await browser.newPage();
await page.goto(`${BASE}/`);

// Neutral, made-up names and generic relation labels: no real people.
const SAMPLES = {
  'elements-gold': { frame: 'elements-gold', name: 'Vibes' },
  'individual-dark': { frame: 'individual-dark', name: 'Vibes' },
  'family-dark': { frame: 'family-dark', familyName: 'Sample Family', people: [{ name: 'Sam Rivers', relation: 'Parent' }, { name: 'Alex Rivers', relation: 'Parent' }, { name: 'Jamie Rivers', relation: 'Child' }, { name: 'Robin Rivers', relation: 'Child' }] }
};
const out = await page.evaluate(async (samples) => {
  const D = await import('/src/merch/designs.js'); const F = await import('/src/merch/framePaint.js'); const Fr = await import('/src/merch/frames.js');
  const W = 700; const H = Math.round(W * 297 / 210);
  const result = {};
  for (const [id, input] of Object.entries(samples)) {
    const { design, error } = D.buildDesign('name_elements', input);
    if (error) { result[id] = { error }; continue; }
    const art = Fr.artworkBox({ width: W, height: H, areaInches: { width: 210 / 25.4, height: 297 / 25.4 }, size: 'A4', insetMm: Fr.DEFAULT_INSET_MM });
    const r = await F.renderFrameCanvas({ design, width: W, height: H, art });
    result[id] = { jpg: r.canvas.toDataURL('image/jpeg', 0.85).split(',')[1], texts: r.metrics.map((m) => m.text), inset: art.x };
  }
  return result;
}, SAMPLES);
await browser.close();

fs.mkdirSync('public/merch/samples', { recursive: true });
for (const [id, o] of Object.entries(out)) {
  if (o.error) throw new Error(`${id}: ${o.error}`);
  if (o.texts.some((t) => /namevibes/i.test(t))) throw new Error(`${id}: old branding in the sample`);
  if (!o.texts.some((t) => /namasutra/i.test(t))) throw new Error(`${id}: expected the Namasutra domain in the sample`);
  const file = `public/merch/samples/frame-${id}.jpg`;
  fs.writeFileSync(file, Buffer.from(o.jpg, 'base64'));
  console.log(`${file}  ${Math.round(fs.statSync(file).size / 1024)} KB  (inset ${o.inset}px)`);
}
