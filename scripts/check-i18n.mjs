// Fails the build when a language file is out of step with English (the source of truth):
// invalid JSON, missing or extra keys, changed placeholders/tags, empty values, or values still
// in English where they should be translated. Also checks every literal t('key') in src exists.
import fs from 'node:fs';
import path from 'node:path';

const dirs = [
  { label: 'ui', dir: 'src/locales', base: 'en' },
  { label: 'content', dir: 'src/locales/content', base: 'en' },
];
// Values that legitimately stay identical to English (brand names, abbreviations, symbols).
const SAME_OK = [
  /^followers\.gst$/, /^share\.email$/, /^ai\.promptHarmony$/, /^ambassador\.field\.(instagram|facebook|youtube|twitter)$/,
];
const errors = [];
const fail = (msg) => errors.push(msg);

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`${file}: invalid JSON (${e.message})`); return null; }
}
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = v;
  }
  return out;
}
const tokens = (s) => [...String(s).matchAll(/\{\{\s*[\w.]+\s*\}\}|<\/?[a-z]+>/g)].map(m => m[0].replace(/\s+/g, '')).sort().join('|');
const letters = (s) => String(s).replace(/\{\{[^}]*\}\}|<[^>]+>/g, '').replace(/[^\p{L}]/gu, '');

for (const { label, dir, base } of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const en = readJson(path.join(dir, `${base}.json`));
  if (!en) continue;
  const enFlat = flatten(en);
  delete enFlat['meta.code']; delete enFlat['meta.name']; delete enFlat['meta.script'];
  for (const f of files) {
    const code = f.replace('.json', '');
    if (code === base) continue;
    const data = readJson(path.join(dir, f));
    if (!data) continue;
    const flat = flatten(data);
    if (label === 'ui') {
      for (const need of ['code', 'name', 'script']) if (!data.meta?.[need]) fail(`${label}/${f}: meta.${need} missing`);
      if (data.meta?.code && data.meta.code !== code) fail(`${label}/${f}: meta.code "${data.meta.code}" does not match the file name`);
    }
    delete flat['meta.code']; delete flat['meta.name']; delete flat['meta.script'];
    for (const k of Object.keys(enFlat)) {
      if (!(k in flat)) { fail(`${label}/${f}: missing key ${k}`); continue; }
      const v = flat[k];
      if (typeof v !== 'string' || !v.trim()) { fail(`${label}/${f}: empty value for ${k}`); continue; }
      if (tokens(v) !== tokens(enFlat[k])) fail(`${label}/${f}: placeholders differ for ${k} (en: ${tokens(enFlat[k]) || 'none'}, ${code}: ${tokens(v) || 'none'})`);
      if (v.trim() === String(enFlat[k]).trim() && letters(enFlat[k]).length > 0 && !SAME_OK.some(r => r.test(k)) && !label.startsWith('x')) fail(`${label}/${f}: ${k} is still the English text`);
    }
    for (const k of Object.keys(flat)) if (!(k in enFlat)) fail(`${label}/${f}: extra key ${k}`);
  }
  // content files must exist for every ui language
  if (label === 'content') {
    for (const f of fs.readdirSync('src/locales').filter(x => x.endsWith('.json'))) {
      if (!files.includes(f)) fail(`content/${f}: missing (every language needs a content file)`);
    }
  }
}

// every literal t('key') used in src must exist in English
const en = readJson('src/locales/en.json') || {};
const enContent = readJson('src/locales/content/en.json') || {};
const known = { ...flatten(en), ...flatten(enContent) };
const hasKey = (k) => k in known || `${k}_other` in known || `${k}_one` in known;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) yield p;
  }
}
for (const file of walk('src')) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\b(?:t|i18n\.t)\(\s*'([a-zA-Z][\w]*(?:\.[\w]+)+)'/g)) {
    if (!hasKey(m[1])) fail(`${file}: unknown key ${m[1]}`);
  }
  for (const m of src.matchAll(/i18nKey="([\w.]+)"/g)) if (!hasKey(m[1])) fail(`${file}: unknown key ${m[1]}`);
}

if (errors.length) {
  console.error(errors.slice(0, 80).join('\n'));
  if (errors.length > 80) console.error(`... and ${errors.length - 80} more`);
  console.error(`\ncheck:i18n FAILED (${errors.length} problems)`);
  process.exit(1);
}
const langs = fs.readdirSync('src/locales').filter(f => f.endsWith('.json')).length;
console.log(`check:i18n OK (${langs} languages, ${Object.keys(flatten(en)).length} UI keys, ${Object.keys(flatten(enContent)).length} content keys)`);
