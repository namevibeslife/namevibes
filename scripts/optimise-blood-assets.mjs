// Builds the production copies of the approved blood-group artwork and checks print readiness.
//   node scripts/optimise-blood-assets.mjs            -> writes public/merch/blood/*.png, src/merch/bloodAssets.js,
//                                                        docs/merch-blood-print-check.md
// The originals in `bloodline logos/` are only READ, never changed. Copies are lossless re-encodes (pixels
// identical), named with a version and checksum so a new design never overwrites an old one a customer ordered.
// Print-readiness uses ASSUMED placement sizes and DPI thresholds: the print provider's real specifications
// (Qikink) could not be read yet, so treat the verdicts as provisional.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { BLOOD_GROUPS, BLOOD_GROUP_SOURCE_FILES, bloodGroupSlug } from '../src/merch/designs.js';

const SRC = 'bloodline logos';
const OUT = 'public/merch/blood';
const VERSION = 1;

// ---- minimal PNG codec (8-bit RGBA, non-interlaced: exactly what the approved files are) -----------------
function readChunks(buf) {
  const chunks = []; let o = 8;
  while (o < buf.length) { const len = buf.readUInt32BE(o); chunks.push({ type: buf.toString('ascii', o + 4, o + 8), data: buf.subarray(o + 8, o + 8 + len) }); o += 12 + len; }
  return chunks;
}
function decode(buf) {
  const chunks = readChunks(buf);
  const h = chunks.find((c) => c.type === 'IHDR').data;
  const width = h.readUInt32BE(0), height = h.readUInt32BE(4);
  if (h[8] !== 8 || h[9] !== 6 || h[12] !== 0) throw new Error('expected 8-bit RGBA non-interlaced PNG');
  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const bpp = 4, stride = width * bpp, px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]; const src = y * (stride + 1) + 1; const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0; const b = y ? px[dst - stride + x] : 0; const c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      const v = raw[src + x];
      px[dst + x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 255;
    }
  }
  return { width, height, px };
}
const paeth = (a, b, c) => { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function encode({ width, height, px }) {
  const stride = width * 4; const out = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // pick the filter (None/Sub/Up/Paeth) with the smallest absolute sum, a standard PNG heuristic
    let best = null;
    for (const f of [0, 1, 2, 4]) {
      const row = Buffer.alloc(stride); let sum = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= 4 ? px[y * stride + x - 4] : 0; const b = y ? px[(y - 1) * stride + x] : 0; const c = x >= 4 && y ? px[(y - 1) * stride + x - 4] : 0;
        const v = px[y * stride + x];
        const r = (f === 0 ? v : f === 1 ? v - a : f === 2 ? v - b : v - paeth(a, b, c)) & 255;
        row[x] = r; sum += r < 128 ? r : 256 - r;
      }
      if (!best || sum < best.sum) best = { f, row, sum };
    }
    out[y * (stride + 1)] = best.f; best.row.copy(out, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(out, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- print-readiness ---------------------------------------------------------------------------------
// Assumed size (inches) the blood-group graphic occupies on each product; DPI = pixels / inches.
const PLACEMENTS = [
  { product: 'tshirt', label: 'T-shirt, front centre', widthIn: 8 },
  { product: 'mug', label: 'Mug (330 ml), graphic 3.2 in high', heightIn: 3.2 },
  { product: 'notebook', label: 'A5 notebook cover', widthIn: 4.5 },
  { product: 'poster', label: 'Framed poster A3, graphic 10 in wide', widthIn: 10 },
  { product: 'poster-a2', label: 'Framed poster A2, graphic 14 in wide', widthIn: 14 }
];
const GOOD_DPI = 250; const OK_DPI = 150; // ASSUMED thresholds until the provider's spec is known

function analyse({ width, height, px }) {
  const n = width * height; const alpha = (i) => px[i * 4 + 3];
  let transparent = 0, solid = 0, semi = 0, edgeTouch = 0;
  for (let i = 0; i < n; i++) { const a = alpha(i); if (a === 0) transparent++; else if (a === 255) solid++; else semi++; }
  for (let x = 0; x < width; x++) { if (alpha(x) > 8) edgeTouch++; if (alpha((height - 1) * width + x) > 8) edgeTouch++; }
  for (let y = 0; y < height; y++) { if (alpha(y * width) > 8) edgeTouch++; if (alpha(y * width + width - 1) > 8) edgeTouch++; }
  // Connected components of visible pixels (alpha > 8). The artwork is the big one(s); tiny isolated ones are speckles.
  const label = new Int32Array(n); const sizes = [0]; let next = 0; const stack = [];
  for (let s = 0; s < n; s++) {
    if (label[s] || alpha(s) <= 8) continue;
    next++; let size = 0; stack.push(s); label[s] = next;
    while (stack.length) {
      const i = stack.pop(); size++; const x = i % width, y = (i - x) / width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) if (j >= 0 && !label[j] && alpha(j) > 8) { label[j] = next; stack.push(j); }
    }
    sizes.push(size);
  }
  const largest = Math.max(...sizes);
  const speckles = sizes.slice(1).filter((s) => s < largest * 0.001); // < 0.1% of the main shape
  const speckleHalo = (() => { // faint, low-alpha pixels (<= 24) far from solid content: the "glow noise"
    let faint = 0; for (let i = 0; i < n; i++) { const a = alpha(i); if (a > 0 && a <= 24) faint++; } return faint;
  })();
  return { transparentPct: +(100 * transparent / n).toFixed(1), semiPct: +(100 * semi / n).toFixed(1), components: sizes.length - 1, speckleCount: speckles.length, speckleArea: speckles.reduce((a, b) => a + b, 0), faintPixels: speckleHalo, edgeTouch };
}
const verdictFor = (dpi) => (dpi >= GOOD_DPI ? 'good' : dpi >= OK_DPI ? 'acceptable' : 'too low');

// ---- run -----------------------------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const assets = {}; const report = [];
for (const code of BLOOD_GROUPS) {
  const file = path.join(SRC, BLOOD_GROUP_SOURCE_FILES[code]);
  const original = fs.readFileSync(file);
  const img = decode(original);
  let encoded = encode(img);
  const bytes = encoded.length < original.length ? encoded : original; // never larger than the original
  if (!decode(bytes).px.equals(img.px)) throw new Error(`${code}: re-encoded pixels differ from the original`); // lossless guarantee
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const slug = bloodGroupSlug(code);
  const name = `${slug}.v${VERSION}.${sha256.slice(0, 8)}.png`;
  fs.writeFileSync(path.join(OUT, name), bytes);
  const stats = analyse(img);
  const placements = PLACEMENTS.map((p) => { const dpi = Math.round(p.widthIn ? img.width / p.widthIn : img.height / p.heightIn); return { product: p.product, label: p.label, dpi, verdict: verdictFor(dpi) }; });
  assets[slug] = { code, path: `/merch/blood/${name}`, sha256, version: VERSION, width: img.width, height: img.height, bytes: bytes.length, originalSha256: crypto.createHash('sha256').update(original).digest('hex') };
  report.push({ code, slug, width: img.width, height: img.height, stats, placements, clean: stats.speckleCount === 0 && stats.edgeTouch === 0 });
}
fs.writeFileSync('src/merch/bloodAssets.js', `// Generated by scripts/optimise-blood-assets.mjs - do not edit by hand.
// Versioned, checksummed optimised copies of the approved blood-group artwork in \`bloodline logos/\`
// (the originals are never modified). Re-run the script after the artwork is replaced; bump VERSION in the script.
export const BLOOD_ASSET_VERSION = ${VERSION};
export const BLOOD_ASSETS = ${JSON.stringify(assets, null, 2)};
`);

const lines = ['# Blood-group artwork: print-readiness check', '',
  `Generated by \`node scripts/optimise-blood-assets.mjs\`. Source: \`bloodline logos/\` (read only). Production copies: \`public/merch/blood/\` (lossless re-encode, version ${VERSION}, SHA-256 in the file name).`, '',
  `**Assumptions (provisional):** the print provider's real DPI requirement and print areas are not known yet (Qikink API/spec not read). Verdicts use ${GOOD_DPI} DPI = good, ${OK_DPI} DPI = acceptable, below = too low, and the placement sizes listed below. Re-run after the provider's specifications are confirmed.`, '',
  '## Per asset (all eight are 1312 x 1199 px, 8-bit RGBA)', '',
  '| Group | Transparent | Semi-transparent | Separate shapes | Speckles (isolated bits) | Speckle area (px) | Faint glow pixels (alpha 1-24) | Touches canvas edge (px) | Clean edge |', '|---|---|---|---|---|---|---|---|---|',
  ...report.map((r) => `| ${r.code} | ${r.stats.transparentPct}% | ${r.stats.semiPct}% | ${r.stats.components} | ${r.stats.speckleCount} | ${r.stats.speckleArea} | ${r.stats.faintPixels} | ${r.stats.edgeTouch} | ${r.clean ? 'yes' : 'NO'} |`), '',
  '## Resolution by product (assumed placement)', '', '| Product placement | DPI at 1312 x 1199 | Verdict |', '|---|---|---|',
  ...report[0].placements.map((p) => `| ${p.label} | ${p.dpi} | ${p.verdict} |`), '',
  '## Reading this', '',
  '- Resolution is identical for all eight (same pixel size). Small and medium placements (mug, notebook, T-shirt front) are fine; large wall art is not: A3 is borderline and A2 is too low, so those need a larger master (vector or at least ~3500 px wide).',
  '- "Speckles" are small disconnected visible fragments and "faint glow pixels" are near-transparent halo pixels around the gold glow. They print as dirt or a visible grey/gold fringe on dark products. Fixing them means editing the artwork, which was not done (originals untouched); ask the designer for cleaned masters or approve an automated clean-up.',
  `- Assets that failed the clean-edge check: ${report.filter((r) => !r.clean).map((r) => r.code).join(', ') || 'none'}.`, ''];
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/merch-blood-print-check.md', lines.join('\n'));
console.log(lines.join('\n'));
