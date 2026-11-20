// Lists visible English text still hard-coded in user-facing JSX (text nodes, placeholder, title,
// aria-label, alt, label, alert/confirm/notify strings). Admin and staff screens, the clear-cache
// utility page and the dev-only mock layer are intentionally English and are skipped.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const SKIP = [
  /pages[\\/]Admin/, /pages[\\/]Accounts/, /components[\\/]PayoutManagement/, /components[\\/]FilterPanel/,
  /components[\\/]AmbassadorContentAdmin/, /components[\\/]AmbassadorInvite/, /components[\\/]InviteMessageBox/, /pages[\\/]ClearCache/, /[\\/]mock[\\/]/,
];
// text that is data or brand, not language
const ALLOW = new Set(['you@example.com', 'IN482913', 'support@namevibes.life', 'BLESSINGS → B – Li – Es – S – In – G – S', 'Namasutra', 'NAMASUTRA', 'WhatsApp', 'Facebook', 'Instagram', 'Telegram', 'LinkedIn', 'Messenger', 'Outlook', 'Razorpay', 'PayPal', 'Claude', 'ChatGPT', 'Gemini', 'X', 'Vibes', 'Ctrl+V']);

// Data, not language: element names/symbols, nakshatra names and their syllables stay as they are
const dataNames = new Set([
  ...[...fs.readFileSync('src/utils/elements.js', 'utf8').matchAll(/name: '([^']+)', number/g)].map(m => m[1]),
  ...[...fs.readFileSync('src/utils/hindu-astrology.js', 'utf8').matchAll(/name: '([^']+)', syllables/g)].map(m => m[1]),
]);
const isData = (text) => dataNames.has(text) || /^[A-Z][a-z]?$/.test(text) || /^[A-Za-z]+(, [A-Za-z]+)+$/.test(text);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(jsx)$/.test(e.name)) yield p;
  }
}

const findings = [];
for (const file of walk(ROOT)) {
  if (SKIP.some(r => r.test(file))) continue;
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const rel = path.relative(process.cwd(), file);
  // JSX text nodes between a tag end and the next tag start, without expressions
  const re = />([^<>{}=][^<>{}]*)</g;
  let m;
  while ((m = re.exec(src))) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]{2,}/.test(text)) continue;
    if (ALLOW.has(text) || isData(text)) continue;
    if (/[;?()=]|return|&&|\|\|/.test(text)) continue; // JavaScript between tags, not text
    if (/^(&\w+;|[\d\s.,:;()\-+/%·•→←×|*]+)$/.test(text)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    findings.push([rel, line, 'text', text]);
  }
  const attr = /\b(placeholder|title|aria-label|alt|label)="([^"{}]*[A-Za-z]{2,}[^"{}]*)"/g;
  while ((m = attr.exec(src))) {
    if (ALLOW.has(m[2])) continue;
    findings.push([rel, src.slice(0, m.index).split('\n').length, m[1], m[2]]);
  }
  const call = /\b(alert|confirm|notify|showToast|setNotice|setMessage|setError|flash)\(\s*(['"`])((?:(?!\2).)*[A-Za-z]{3,}(?:(?!\2).)*)\2/g;
  while ((m = call.exec(src))) {
    if (/^[a-z]+\.[A-Za-z.]+$/.test(m[3])) continue; // translation key
    findings.push([rel, src.slice(0, m.index).split('\n').length, m[1] + '()', m[3]]);
  }
}
for (const f of findings) console.log(`${f[0]}:${f[1]}  [${f[2]}]  ${f[3].slice(0, 110)}`);
console.log(`\n${findings.length} hard-coded visible strings`);
process.exit(findings.length ? 1 : 0);
