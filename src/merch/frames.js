// Framed-poster designs. Three selectable layouts reproduce the approved reference looks (merch-reference/):
//   elements-gold   Elements Gold: name + element tiles on the gold/ivory theme (the launch default)
//   individual-dark Individual Dark: heading, name, tiles, totals, element meanings, element balance
//   family-dark     Family Dark: 1 to 4 members, each with tiles and totals, shared chemistry, element balance
// The references are LOOKS, never printed. Everything here is computed from the buyer's own data and drawn fresh at print size.
//
// This file is PURE (no DOM): it turns data + a canvas size into a list of drawing operations, so the layout can be tested
// in Node. framePaint.js executes the operations on a canvas (preview and print file use the same operations).
//
// Content rule: only data the app really computes is printed (names, symbols, atomic numbers, element names and categories,
// totals, unique count, dominant type, element meanings, shared elements, element-balance percentages). The reference panels
// with scores and insight text (Namevibes Index, Intellect/Adaptability/Intuition bars, Family Harmony Index, "Your Name
// Insight", "Your Core Element", trait words and quotes) are mock-ups and are deliberately NOT reproduced.
import { ELEMENTS, textColorFor } from '../utils/elements.js';
import { posterColorFor } from '../utils/posterPalette.js';
import { SITE_HOST } from '../config/site.js';

export const FRAME_IDS = ['elements-gold', 'individual-dark', 'family-dark'];
export const DEFAULT_FRAME = 'elements-gold';
export const DEFAULT_FRAME_DESIGNS = { 'elements-gold': true, 'individual-dark': false, 'family-dark': false }; // launch: gold only
// The artwork is printed 10 mm smaller than the frame on every side (one setting, `designInsetMm` on the product, 0 to 30). The 10 mm
// border is a FLAT colour (a mat), not artwork. Edge colours are per design so they are easy to change.
export const DEFAULT_INSET_MM = 10;
export const MAX_INSET_MM = 30;
export const EDGE_COLORS = { 'elements-gold': '#fbf2da', 'individual-dark': '#020204', 'family-dark': '#020204' };
// Paper sizes in mm (the frame). Sizes not listed use the print area itself as the frame.
export const FRAME_MM = { A4: [210, 297], A3: [297, 420] };

/**
 * Where the artwork sits inside the print file, in inches. areaInches = the print area (the full file); the frame is the paper size;
 * the artwork is the STRICTER of (print area) and (frame minus the inset on both sides), centred.
 * -> { artworkInches, insetInches: { x, y }, applied: 'frame-minus-inset' | 'print-area' }
 */
export function artworkInches({ areaInches, size, insetMm = DEFAULT_INSET_MM }) {
  const inset = Math.min(MAX_INSET_MM, Math.max(0, Number(insetMm) || 0)) / 25.4;
  const f = FRAME_MM[size];
  const frame = f ? { width: f[0] / 25.4, height: f[1] / 25.4 } : { width: areaInches.width, height: areaInches.height };
  const byFrame = { width: frame.width - 2 * inset, height: frame.height - 2 * inset };
  const art = { width: Math.min(areaInches.width, byFrame.width), height: Math.min(areaInches.height, byFrame.height) };
  const applied = byFrame.width <= areaInches.width + 1e-9 && byFrame.height <= areaInches.height + 1e-9 ? 'frame-minus-inset' : 'print-area';
  return { artworkInches: art, insetInches: { x: (areaInches.width - art.width) / 2, y: (areaInches.height - art.height) / 2 }, applied };
}

/** The same in pixels for a canvas of width x height px that covers areaInches. The border is the same on both sides. */
export function artworkBox({ width, height, areaInches, size, insetMm = DEFAULT_INSET_MM }) {
  const g = artworkInches({ areaInches, size, insetMm });
  const sx = width / areaInches.width; const sy = height / areaInches.height;
  // When the print area IS the frame (within 1.3 mm of rounding slack) the border is exactly the inset on every side.
  const nominal = Math.min(MAX_INSET_MM, Math.max(0, Number(insetMm) || 0)) / 25.4;
  const f = FRAME_MM[size];
  const close = g.applied === 'frame-minus-inset' && f && Math.abs(areaInches.width - f[0] / 25.4) < 0.05 && Math.abs(areaInches.height - f[1] / 25.4) < 0.05;
  const ix = Math.round((close ? nominal : g.insetInches.x) * sx); const iy = Math.round((close ? nominal : g.insetInches.y) * sy);
  return { x: ix, y: iy, w: width - 2 * ix, h: height - 2 * iy, artworkInches: g.artworkInches, applied: g.applied };
}

export const FRAME_MAX_MEMBERS = 4;          // same limit as the Family analysis (FAMILY_MAX_NAMES)
export const FRAME_MAX_ELEMENTS_SINGLE = 24;
export const FRAME_MAX_ELEMENTS_FAMILY = 10; // per member (a card holds four tiles per row)

// Fixed wording (never translated, never changed). The brand taglines are copied from the approved references.
export const HEADINGS = {
  name: 'THE CHEMISTRY OF YOUR NAME', section: 'ELEMENTS IN YOUR NAME', family: 'THE CHEMISTRY OF YOUR FAMILY',
  profile: 'YOUR ELEMENTAL PROFILE', meanings: 'ELEMENT MEANINGS', balance: 'ELEMENT BALANCE', shared: 'YOUR SHARED CHEMISTRY'
};
export const BRAND = { name: 'NAMASUTRA', tagline: 'EVERY NAME HAS A CHEMISTRY', familyTagline: 'DISCOVER THE ELEMENTS THAT CONNECT YOU', footerA: 'MORE THAN A NAME', footerB: 'A HIGHER YOU' };

// ---- chemistry facts computed from the atomic number --------------------------------------------------------------
const set = (...n) => new Set(n);
const ALKALI = set(3, 11, 19, 37, 55, 87); const ALKALINE = set(4, 12, 20, 38, 56, 88);
const NONMETAL = set(1, 6, 7, 8, 9, 15, 16, 17, 34, 35, 53, 85, 117); // halogens are grouped with non-metals, as in the references
const NOBLE = set(2, 10, 18, 36, 54, 86, 118); const METALLOID = set(5, 14, 32, 33, 51, 52);
const POST = set(13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116);
export function categoryOf(n) {
  if (ALKALI.has(n)) return 'Alkali Metal';
  if (ALKALINE.has(n)) return 'Alkaline Earth Metal';
  if (NONMETAL.has(n)) return 'Non-metal';
  if (NOBLE.has(n)) return 'Noble Gas';
  if (METALLOID.has(n)) return 'Metalloid';
  if (POST.has(n)) return 'Post-transition Metal';
  if (n >= 57 && n <= 71) return 'Lanthanide';
  if (n >= 89 && n <= 103) return 'Actinide';
  return 'Transition Metal';
}
const GROUP_OF = { 'Non-metal': 'Non-metals', 'Noble Gas': 'Non-metals', Metalloid: 'Metalloids', 'Transition Metal': 'Transition Metals' };
const groupOf = (category) => GROUP_OF[category] || 'Metals';
const GROUP_COLORS = { 'Non-metals': '#e0b43f', Metals: '#3b8fe0', 'Transition Metals': '#e0589c', Metalloids: '#4caa48' };

// design.people[].elements are { symbol, name, atomicNumber } (verified server-side); enrich with category, colour, meaning.
export function frameData(design) {
  const people = (design.people || [{ name: design.name, elements: design.elements }]).map((p) => ({
    name: p.name, relation: p.relation || '',
    elements: (p.elements || []).map((e) => {
      const info = ELEMENTS[e.symbol] || {};
      const number = e.atomicNumber ?? info.number;
      return { symbol: e.symbol, number, name: e.name || info.name, category: categoryOf(number), color: posterColorFor({ symbol: e.symbol, color: info.color }), meaning: info.meaning || '' };
    })
  }));
  return { frame: design.frame || DEFAULT_FRAME, people, familyName: design.familyName || '' };
}

export function personStats(elements) {
  const total = elements.length;
  const unique = new Set(elements.map((e) => e.symbol)).size;
  const counts = {};
  elements.forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ['', 0];
  // dominant = more than half of the elements share one category; otherwise "Mixed"
  return { total, unique, dominant: total && n / total > 0.5 ? top : 'Mixed' };
}

// Percentages by group, summing to exactly 100 (largest remainder), zero groups omitted.
export function elementBalance(elements) {
  const counts = {};
  elements.forEach((e) => { const g = groupOf(e.category); counts[g] = (counts[g] || 0) + 1; });
  const total = elements.length || 1;
  const rows = Object.entries(counts).map(([label, n]) => ({ label, n, raw: (n / total) * 100 }));
  rows.forEach((r) => { r.pct = Math.floor(r.raw); r.rem = r.raw - r.pct; });
  let left = 100 - rows.reduce((s, r) => s + r.pct, 0);
  [...rows].sort((a, b) => b.rem - a.rem).forEach((r) => { if (left > 0) { r.pct += 1; left -= 1; } });
  return rows.sort((a, b) => b.pct - a.pct).map((r) => ({ label: r.label, pct: r.pct, color: GROUP_COLORS[r.label] }));
}

export function sharedElements(people) {
  const per = people.map((p) => new Map(p.elements.map((e) => [e.symbol, e])));
  const all = [];
  const some = [];
  const seen = new Set();
  for (const p of people) for (const e of p.elements) {
    if (seen.has(e.symbol)) continue;
    seen.add(e.symbol);
    const count = per.filter((m) => m.has(e.symbol)).length;
    if (people.length > 1 && count === people.length) all.push({ ...e, count });
    else if (count > 1) some.push({ ...e, count });
  }
  return { all, some };
}

// ---- text size estimates (layout only; the painter measures for real) -----------------------------------------------
const isIndic = (ch) => ch.codePointAt(0) >= 0x0900 && ch.codePointAt(0) <= 0x0dff;
export function estWidth(text, size, { caps = false, spacing = 0, serif = true } = {}) {
  let w = 0;
  for (const ch of String(text)) {
    if (isIndic(ch)) w += 0.85;
    else if (ch === ' ') w += 0.3;
    else if (/[0-9]/.test(ch)) w += 0.56;
    else if (caps || /[A-Z]/.test(ch)) w += serif ? 0.7 : 0.66;
    else w += serif ? 0.52 : 0.56;
  }
  return (w + spacing * [...String(text)].length) * size;
}
const fitSize = (text, size, maxW, o) => { const w = estWidth(text, size, o); return w > maxW ? Math.max(size * (maxW / w), size * 0.35) : size; };

// Split a long name over at most two lines at a space near the middle
function nameLines(name, size, maxW) {
  if (estWidth(name, size) <= maxW || !name.includes(' ')) return [name];
  const words = name.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '); const b = words.slice(i).join(' ');
    const worst = Math.max(estWidth(a, size), estWidth(b, size));
    if (!best || worst < best.worst) best = { lines: [a, b], worst };
  }
  return best.lines;
}

// ---- operations ------------------------------------------------------------------------------------------------------
// text:  { type, text, x, y (baseline), size, weight, italic, serif, color, align, spacing, maxWidth, caps }
// tile / panel / line / donut / logo / chip / dot
const T = (o) => ({ type: 'text', align: 'center', serif: true, weight: 400, color: '#000', ...o });
export function opBounds(op) {
  if (op.type === 'text') {
    const w = Math.min(estWidth(op.text, op.size, { caps: op.caps, spacing: op.spacing || 0, serif: op.serif }), op.maxWidth || Infinity);
    const x = op.align === 'left' ? op.x : op.align === 'right' ? op.x - w : op.x - w / 2;
    return { x, y: op.y - op.size * 0.8, w, h: op.size * 1.0 };
  }
  if (op.type === 'donut') return { x: op.cx - op.r, y: op.cy - op.r, w: op.r * 2, h: op.r * 2 };
  if (op.type === 'logo') return { x: op.x, y: op.y, w: op.w, h: op.w / 2.936 };
  if (op.type === 'line') return { x: Math.min(op.x1, op.x2), y: Math.min(op.y1, op.y2), w: Math.abs(op.x2 - op.x1), h: Math.abs(op.y2 - op.y1) };
  if (op.type === 'chip' || op.type === 'dot') return { x: op.cx - op.r, y: op.cy - op.r, w: op.r * 2, h: op.r * 2 };
  return { x: op.x, y: op.y, w: op.w, h: op.h };
}

function palette(theme) {
  return theme === 'gold'
    ? { heading: '#6b4a0f', text: '#2b1d05', soft: '#7a5a1e', rule: '#b8860b', panel: '#fff8e6', panelLine: '#c9a24a', accent: '#8a6a12', panelAlpha: 0.55 }
    : { heading: '#f1cf7a', text: '#f4ead2', soft: '#cdb987', rule: '#c79a35', panel: '#0a0f1c', panelLine: '#b8862b', accent: '#f1cf7a', panelAlpha: 0.78 };
}

function header({ W, H, ops, theme, heading, tagline, logoPlate, y0 = 0.045, headingBaseline = 0.155, taglineBaseline = 0.18 }) {
  const c = palette(theme);
  const lw = 0.3 * W;
  ops.push({ type: 'logo', x: (W - lw) / 2, y: y0 * H, w: lw, plate: logoPlate });
  const size = fitSize(heading, 0.047 * W, 0.86 * W, { caps: true, spacing: 0.04 });
  ops.push(T({ text: heading, x: W / 2, y: headingBaseline * H, size, weight: 700, color: c.heading, spacing: 0.04, caps: true, maxWidth: 0.86 * W }));
  if (tagline) ops.push(T({ text: tagline, x: W / 2, y: taglineBaseline * H, size: 0.0165 * W, serif: false, color: c.soft, spacing: 0.22, caps: true, maxWidth: 0.8 * W }));
}

function footer({ W, H, ops, theme, y = 0.905 }) {
  const c = palette(theme);
  ops.push({ type: 'line', x1: 0.2 * W, y1: y * H, x2: 0.8 * W, y2: y * H, color: c.rule, width: 0.0018 * W });
  ops.push(T({ text: BRAND.footerA, x: W / 2, y: (y + 0.03) * H, size: 0.0175 * W, serif: false, color: c.soft, spacing: 0.3, caps: true, maxWidth: 0.7 * W }));
  ops.push(T({ text: BRAND.footerB, x: W / 2, y: (y + 0.057) * H, size: 0.034 * W, weight: 700, color: c.heading, caps: true, maxWidth: 0.7 * W }));
  ops.push(T({ text: SITE_HOST, x: W / 2, y: (y + 0.081) * H, size: 0.0155 * W, serif: false, color: c.soft, spacing: 0.1, maxWidth: 0.7 * W }));
}

// Rows of tiles centred inside area { x, y, w, h } (and vertically too with vcenter); returns the height used.
function tileGrid({ ops, els, area, perRow, aspect, showCategory, maxTile, vcenter }) {
  const rows = Math.ceil(els.length / perRow);
  const gap = area.w * 0.012;
  let tw = Math.min((area.w - (perRow - 1) * gap) / perRow, maxTile || Infinity);
  let th = tw * aspect;
  const maxH = (area.h - (rows - 1) * gap) / rows;
  if (th > maxH) { th = maxH; tw = th / aspect; }
  const used = rows * th + (rows - 1) * gap;
  const top = area.y + (vcenter ? (area.h - used) / 2 : 0);
  els.forEach((el, i) => {
    const r = Math.floor(i / perRow);
    const inRow = r === rows - 1 ? els.length - r * perRow : perRow;
    const rowW = inRow * tw + (inRow - 1) * gap;
    ops.push({ type: 'tile', x: area.x + (area.w - rowW) / 2 + (i - r * perRow) * (tw + gap), y: top + r * (th + gap), w: tw, h: th, el, showCategory: showCategory && th >= tw * 1.25 });
  });
  return { used, tw, th };
}

// Donut + legend. A wide panel puts the legend beside the donut, a tall one underneath it; text is never allowed to overlap.
function donutPanel({ ops, theme, W, x, y, w, h, balance }) {
  const c = palette(theme);
  ops.push({ type: 'panel', x, y, w, h, theme });
  const tSize = fitSize(HEADINGS.balance, 0.0215 * W, w * 0.9, { caps: true, spacing: 0.1 });
  ops.push(T({ text: HEADINGS.balance, x: x + w / 2, y: y + 0.034 * W, size: tSize, weight: 700, color: c.heading, spacing: 0.1, caps: true, maxWidth: w * 0.9 }));
  const bodyTop = y + 0.05 * W; const bodyH = h - 0.05 * W - 0.012 * W;
  if (h > w * 1.15) {
    const legendRow = Math.min(0.0205 * W, bodyH * 0.08);
    const legendH = balance.length * legendRow * 1.5;
    const r = Math.max(0.01 * W, Math.min(w * 0.3, (bodyH - legendH) / 2));
    const cy = bodyTop + r;
    ops.push({ type: 'donut', cx: x + w / 2, cy, r, slices: balance, theme });
    balance.forEach((b, i) => {
      const ly = cy + r + legendRow * 1.6 + i * legendRow * 1.5;
      ops.push({ type: 'dot', cx: x + w * 0.1, cy: ly - legendRow * 0.3, r: legendRow * 0.32, color: b.color });
      ops.push(T({ text: `${b.pct}%  ${b.label}`, x: x + w * 0.16, y: ly, size: legendRow, serif: false, color: c.text, align: 'left', maxWidth: w * 0.78 }));
    });
  } else {
    const r = Math.min(w * 0.22, bodyH / 2);
    const cy = bodyTop + bodyH / 2;
    ops.push({ type: 'donut', cx: x + w * 0.27, cy, r, slices: balance, theme });
    const row = Math.min(0.0175 * W, bodyH / (balance.length * 1.7));
    const startY = cy - (balance.length * row * 1.7) / 2 + row * 1.2;
    balance.forEach((b, i) => {
      const ly = startY + i * row * 1.7;
      ops.push({ type: 'dot', cx: x + w * 0.55, cy: ly - row * 0.3, r: row * 0.32, color: b.color });
      ops.push(T({ text: `${b.pct}%  ${b.label}`, x: x + w * 0.6, y: ly, size: row, serif: false, color: c.text, align: 'left', maxWidth: w * 0.37 }));
    });
  }
}

// ---- layouts ---------------------------------------------------------------------------------------------------------
function layoutGold(data, W, H) {
  const ops = []; const c = palette('gold'); const p = data.people[0]; const els = p.elements;
  header({ W, H, ops, theme: 'gold', heading: HEADINGS.name, tagline: null, logoPlate: false, headingBaseline: 0.165 });
  ops.push({ type: 'line', x1: 0.2 * W, y1: 0.19 * H, x2: 0.8 * W, y2: 0.19 * H, color: c.rule, width: 0.0018 * W, diamond: true });
  const base = 0.095 * W;
  const lines = nameLines(p.name, base, 0.86 * W);
  const nameSize = Math.min(base, ...lines.map((l) => fitSize(l, base, 0.86 * W, { caps: false })));
  const nameTop = 0.26 * H;
  lines.forEach((l, i) => ops.push(T({ text: l, x: W / 2, y: nameTop + i * nameSize * 1.1, size: nameSize, weight: 700, color: c.text, maxWidth: 0.86 * W })));
  const afterName = nameTop + (lines.length - 1) * nameSize * 1.1;
  ops.push(T({ text: HEADINGS.section, x: W / 2, y: afterName + 0.05 * H, size: 0.022 * W, serif: false, color: c.soft, spacing: 0.3, caps: true, maxWidth: 0.8 * W }));
  const perRow = els.length <= 8 ? 4 : els.length <= 15 ? 5 : 6;
  const gridTop = afterName + 0.075 * H;
  const gridBottom = 0.84 * H;
  tileGrid({ ops, els, area: { x: 0.07 * W, y: gridTop, w: 0.86 * W, h: gridBottom - gridTop }, perRow, aspect: 1.15, showCategory: false, maxTile: 0.205 * W, vcenter: true });
  footer({ W, H, ops, theme: 'gold', y: 0.875 });
  return { ops, bg: 'gold' };
}

function statsStrip({ ops, theme, W, x, y, w, h, stats }) {
  const c = palette(theme);
  ops.push({ type: 'panel', x, y, w, h, theme });
  const cells = [['TOTAL ELEMENTS', String(stats.total)], ['UNIQUE ELEMENTS', String(stats.unique)], ['DOMINANT TYPE', stats.dominant.toUpperCase()]];
  const cw = w / 3;
  cells.forEach(([label, value], i) => {
    const text = `${label}:  ${value}`;
    ops.push(T({ text, x: x + cw * i + cw / 2, y: y + h * 0.64, size: fitSize(text, 0.0185 * W, cw * 0.92, { serif: false, caps: true, spacing: 0.04 }), serif: false, color: c.text, spacing: 0.04, caps: true, maxWidth: cw * 0.92 }));
  });
}

function meaningsPanel({ ops, theme, W, x, y, w, h, elements }) {
  const c = palette(theme);
  ops.push({ type: 'panel', x, y, w, h, theme });
  ops.push(T({ text: HEADINGS.meanings, x: x + w / 2, y: y + 0.034 * W, size: fitSize(HEADINGS.meanings, 0.0215 * W, w * 0.9, { caps: true, spacing: 0.1 }), weight: 700, color: c.heading, spacing: 0.1, caps: true, maxWidth: w * 0.9 }));
  const seen = new Set(); const uniq = [];
  elements.forEach((e) => { if (!seen.has(e.symbol)) { seen.add(e.symbol); uniq.push(e); } });
  const top = y + 0.056 * W; const avail = y + h - top - 0.012 * W;
  const minRow = 0.044 * W;
  // one column when everything fits, otherwise two columns; whatever still does not fit is counted ("+ N more")
  const oneCap = Math.max(1, Math.floor(avail / minRow));
  const cols = uniq.length > oneCap ? 2 : 1;
  const colW = (w - 0.03 * W) / cols;
  const rowsNeeded = Math.ceil(uniq.length / cols);
  const rowH = Math.max(minRow, Math.min(0.075 * W, avail / Math.max(rowsNeeded, 1)));
  const cap = Math.max(1, Math.floor(avail / rowH)) * cols;
  const shown = uniq.length > cap ? uniq.slice(0, cap - 1) : uniq;
  const size = Math.min(0.0205 * W, rowH * 0.34) * (cols === 2 ? 0.92 : 1);
  const perCol = Math.ceil(Math.max(shown.length, 1) / cols);
  shown.forEach((e, i) => {
    const col = Math.floor(i / perCol); const row = i % perCol;
    const cx0 = x + 0.015 * W + col * colW; const ry = top + row * rowH;
    ops.push({ type: 'chip', cx: cx0 + colW * 0.07, cy: ry + rowH * 0.42, r: Math.min(rowH * 0.38, colW * 0.05), color: e.color, symbol: e.symbol });
    ops.push(T({ text: e.name, x: cx0 + colW * 0.15, y: ry + rowH * 0.34, size, serif: false, weight: 700, color: c.text, align: 'left', maxWidth: colW * 0.8 }));
    ops.push(T({ text: e.meaning, x: cx0 + colW * 0.15, y: ry + rowH * 0.72, size: size * 0.9, serif: false, color: c.soft, align: 'left', maxWidth: colW * 0.82 }));
  });
  if (uniq.length > shown.length) {
    const i = shown.length; const col = Math.floor(i / perCol); const row = i % perCol;
    ops.push(T({ text: `+ ${uniq.length - shown.length} more`, x: x + 0.015 * W + col * colW + colW * 0.15, y: top + row * rowH + rowH * 0.45, size, serif: false, color: c.soft, align: 'left', maxWidth: colW * 0.6 }));
  }
}

function layoutIndividual(data, W, H) {
  const ops = []; const c = palette('dark'); const p = data.people[0]; const els = p.elements; const stats = personStats(els);
  header({ W, H, ops, theme: 'dark', heading: HEADINGS.name, tagline: BRAND.tagline, logoPlate: true });
  // name box
  const boxY = 0.2 * H; const boxH = 0.085 * H;
  ops.push({ type: 'panel', x: 0.07 * W, y: boxY, w: 0.86 * W, h: boxH, theme: 'dark', strong: true });
  const base = 0.075 * W; const lines = nameLines(p.name, base, 0.78 * W);
  const size = Math.min(base, ...lines.map((l) => fitSize(l, base, 0.78 * W))) * (lines.length > 1 ? 0.8 : 1);
  lines.forEach((l, i) => ops.push(T({ text: l, x: W / 2, y: boxY + boxH * (lines.length > 1 ? 0.42 : 0.66) + i * size * 1.02, size, weight: 700, color: c.heading, maxWidth: 0.78 * W })));
  ops.push(T({ text: HEADINGS.profile, x: W / 2, y: boxY + boxH + 0.026 * H, size: 0.019 * W, serif: false, color: c.soft, spacing: 0.22, caps: true, maxWidth: 0.7 * W }));
  // tiles
  const perRow = els.length <= 7 ? els.length : Math.ceil(els.length / Math.ceil(els.length / 7));
  const tilesTop = boxY + boxH + 0.04 * H;
  const rows = Math.ceil(els.length / perRow);
  const tilesH = rows === 1 ? 0.2 * H : 0.3 * H;
  const g = tileGrid({ ops, els, area: { x: 0.04 * W, y: tilesTop, w: 0.92 * W, h: tilesH }, perRow, aspect: rows === 1 ? 1.5 : 1.3, showCategory: true, maxTile: rows === 1 ? 0.135 * W : 0.11 * W });
  const afterTiles = tilesTop + g.used;
  const statsY = afterTiles + 0.02 * H; const statsH = 0.048 * H;
  statsStrip({ ops, theme: 'dark', W, x: 0.04 * W, y: statsY, w: 0.92 * W, h: statsH, stats });
  const panelsY = statsY + statsH + 0.02 * H; const panelsH = 0.865 * H - panelsY;
  meaningsPanel({ ops, theme: 'dark', W, x: 0.04 * W, y: panelsY, w: 0.56 * W, h: panelsH, elements: els });
  donutPanel({ ops, theme: 'dark', W, x: 0.62 * W, y: panelsY, w: 0.34 * W, h: panelsH, balance: elementBalance(els) });
  footer({ W, H, ops, theme: 'dark', y: 0.885 });
  return { ops, bg: 'dark' };
}

function layoutFamily(data, W, H) {
  const ops = []; const c = palette('dark'); const people = data.people.slice(0, FRAME_MAX_MEMBERS);
  header({ W, H, ops, theme: 'dark', heading: HEADINGS.family, tagline: BRAND.familyTagline, logoPlate: true });
  let y = 0.2 * H;
  const label = data.familyName ? data.familyName : '';
  if (label) {
    ops.push({ type: 'panel', x: 0.1 * W, y, w: 0.8 * W, h: 0.07 * H, theme: 'dark', strong: true });
    ops.push(T({ text: label.toUpperCase(), x: W / 2, y: y + 0.052 * H, size: fitSize(label.toUpperCase(), 0.062 * W, 0.74 * W, { caps: true, spacing: 0.02 }), weight: 700, color: c.heading, caps: true, spacing: 0.02, maxWidth: 0.74 * W }));
    y += 0.085 * H;
  }
  ops.push(T({ text: `${people.length} ${people.length === 1 ? 'MEMBER' : 'MEMBERS'}`, x: W / 2, y: y + 0.012 * H, size: 0.0175 * W, serif: false, color: c.soft, spacing: 0.28, caps: true, maxWidth: 0.6 * W }));
  y += 0.025 * H;
  // member cards
  const cardsBottom = 0.655 * H; const gap = 0.02 * W;
  const cols = people.length <= 2 ? 1 : 2; const rows = Math.ceil(people.length / cols);
  const cw = (0.92 * W - (cols - 1) * gap) / cols; const ch = (cardsBottom - y - (rows - 1) * gap) / rows;
  people.forEach((p, i) => {
    const r = Math.floor(i / cols); const col = i % cols;
    const inRow = r === rows - 1 ? people.length - r * cols : cols;
    const x0 = 0.04 * W + (0.92 * W - (inRow * cw + (inRow - 1) * gap)) / 2 + col * (cw + gap);
    const y0 = y + r * (ch + gap);
    ops.push({ type: 'panel', x: x0, y: y0, w: cw, h: ch, theme: 'dark' });
    const nameSize = Math.min(0.034 * W, fitSize(p.name, 0.034 * W, cw * 0.9), ch * 0.1);
    let ty = y0 + ch * 0.1;
    if (p.relation) { ops.push(T({ text: p.relation.toUpperCase(), x: x0 + cw * 0.05, y: ty, size: nameSize * 0.6, serif: false, color: c.soft, spacing: 0.2, caps: true, align: 'left', maxWidth: cw * 0.9 })); ty += nameSize * 1.05; }
    ops.push(T({ text: p.name, x: x0 + cw * 0.05, y: ty, size: nameSize, color: c.text, align: 'left', maxWidth: cw * 0.9 }));
    const st = personStats(p.elements);
    const statSize = Math.min(0.0165 * W, ch * 0.055);
    const stText = `Total: ${st.total}  |  Unique: ${st.unique}  |  Dominant: ${st.dominant}`;
    const tilesTop = ty + nameSize * 0.5; const tilesBottom = y0 + ch - statSize * 2.4;
    tileGrid({ ops, els: p.elements, area: { x: x0 + cw * 0.03, y: tilesTop, w: cw * 0.94, h: tilesBottom - tilesTop }, perRow: p.elements.length <= 4 ? p.elements.length : p.elements.length <= 8 ? 4 : 5, aspect: 1.2, showCategory: true, maxTile: 0.095 * W });
    ops.push(T({ text: stText, x: x0 + cw / 2, y: y0 + ch - statSize * 0.8, size: fitSize(stText, statSize, cw * 0.92, { serif: false }), serif: false, color: c.text, maxWidth: cw * 0.92 }));
  });
  // shared chemistry + element balance
  const sy = 0.67 * H; const sh = 0.195 * H;
  ops.push({ type: 'panel', x: 0.04 * W, y: sy, w: 0.58 * W, h: sh, theme: 'dark' });
  ops.push(T({ text: HEADINGS.shared, x: 0.04 * W + 0.29 * W, y: sy + sh * 0.14, size: fitSize(HEADINGS.shared, 0.027 * W, 0.54 * W, { caps: true, spacing: 0.06 }), weight: 700, color: c.heading, caps: true, spacing: 0.06, maxWidth: 0.54 * W }));
  const sh2 = sharedElements(people);
  const cx = 0.04 * W + 0.29 * W;
  if (sh2.all.length || sh2.some.length) {
    const list = sh2.all.length ? sh2.all : sh2.some;
    const cap = sh2.all.length ? `COMMON ELEMENT${list.length > 1 ? 'S' : ''} IN ALL ${people.length} MEMBERS` : 'ELEMENTS SHARED BY MORE THAN ONE MEMBER';
    const shown = list.slice(0, 5);
    tileGrid({ ops, els: shown, area: { x: 0.06 * W, y: sy + sh * 0.2, w: 0.54 * W, h: sh * 0.5 }, perRow: shown.length, aspect: 1.2, showCategory: false, maxTile: 0.1 * W });
    ops.push(T({ text: cap, x: cx, y: sy + sh * 0.8, size: fitSize(cap, 0.0155 * W, 0.54 * W, { serif: false, caps: true, spacing: 0.06 }), serif: false, color: c.text, caps: true, spacing: 0.06, maxWidth: 0.54 * W }));
    const names = shown.map((e) => `${e.name} (${e.symbol}${sh2.all.length ? '' : ` x${e.count}`})`).join('  ·  ');
    ops.push(T({ text: names, x: cx, y: sy + sh * 0.93, size: fitSize(names, 0.0145 * W, 0.54 * W, { serif: false }), serif: false, color: c.soft, maxWidth: 0.54 * W }));
  } else {
    const msg = people.length > 1 ? 'No element is shared between these names.' : 'Add family members to see shared elements.';
    ops.push(T({ text: msg, x: cx, y: sy + sh * 0.55, size: fitSize(msg, 0.02 * W, 0.52 * W, { serif: false }), serif: false, color: c.soft, maxWidth: 0.52 * W }));
  }
  donutPanel({ ops, theme: 'dark', W, x: 0.64 * W, y: sy, w: 0.32 * W, h: sh, balance: elementBalance(people.flatMap((p) => p.elements)) });
  footer({ W, H, ops, theme: 'dark', y: 0.885 });
  return { ops, bg: 'dark' };
}

/**
 * Operations for one frame design on a canvas of W x H (any size; sizes scale with W). The safe area keeps content away from
 * the edge and the border; the tests check every operation stays inside it.
 */
export function layoutFrame(design, W, H) {
  const data = frameData(design);
  const out = data.frame === 'family-dark' ? layoutFamily(data, W, H) : data.frame === 'individual-dark' ? layoutIndividual(data, W, H) : layoutGold(data, W, H);
  return { ...out, W, H, data, safe: { x: 0.03 * W, y: 0.025 * H, w: 0.94 * W, h: 0.95 * H } };
}

export { textColorFor };
