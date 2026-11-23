// One design definition -> one drawing, used for BOTH the on-screen preview and the print file, so what
// the customer approves is what is printed. Pure string building (no DOM) so it also runs in Node tests.
import { ELEMENTS, textColorFor } from '../utils/elements.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { bloodGroupSlug, bloodGroupLabel } from './designs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Pick the grid (columns x rows) that makes the tiles largest inside a width x height box.
export function gridFor(n, width, height, gap = 0.08) {
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min(width / (cols + (cols - 1) * gap), height / (rows + (rows - 1) * gap));
    if (!best || size > best.size) best = { cols, rows, size };
  }
  return best;
}

export const inkFor = (colorHex) => (textColorFor(colorHex) === '#ffffff' ? '#FFFFFF' : '#1F2937');

/**
 * The drawing of a design inside a box { x, y, width, height }. Returns SVG markup (a <g>).
 * ink = text colour for the name line (light on dark garments, dark on light ones).
 */
export function designGroup(design, box, { ink = '#1F2937' } = {}) {
  const { x, y, width, height } = box;
  if (design.collection === 'blood_group') {
    const asset = BLOOD_ASSETS[bloodGroupSlug(design.bloodGroup)];
    const href = asset ? asset.path : '';
    return `<g><image href="${esc(href)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/><title>${esc(bloodGroupLabel(design.bloodGroup))}</title></g>`;
  }
  const els = design.elements;
  const nameH = height * 0.14;
  const gridH = height - nameH - height * 0.04;
  const g = gridFor(els.length, width, gridH);
  const gap = g.size * 0.08;
  const rowW = (count) => count * g.size + (count - 1) * gap;
  let out = `<g font-family="Georgia, 'Times New Roman', serif">`;
  els.forEach((e, i) => {
    const row = Math.floor(i / g.cols);
    const inRow = row === g.rows - 1 ? els.length - row * g.cols : g.cols;
    const col = i - row * g.cols;
    const tx = x + (width - rowW(inRow)) / 2 + col * (g.size + gap);
    const ty = y + (gridH - (g.rows * g.size + (g.rows - 1) * gap)) / 2 + row * (g.size + gap);
    const color = ELEMENTS[e.symbol]?.color || '#CCCCCC';
    const fg = textColorFor(color);
    const s = g.size;
    out += `<g><rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="${(s * 0.08).toFixed(1)}" fill="${color}" stroke="#B8860B" stroke-width="${(s * 0.025).toFixed(1)}"/>`
      + `<text x="${(tx + s * 0.08).toFixed(1)}" y="${(ty + s * 0.2).toFixed(1)}" font-size="${(s * 0.15).toFixed(1)}" fill="${fg}">${e.atomicNumber}</text>`
      + `<text x="${(tx + s / 2).toFixed(1)}" y="${(ty + s * 0.62).toFixed(1)}" font-size="${(s * 0.42).toFixed(1)}" font-weight="700" text-anchor="middle" fill="${fg}">${esc(e.symbol)}</text>`
      + `<text x="${(tx + s / 2).toFixed(1)}" y="${(ty + s * 0.86).toFixed(1)}" font-size="${(s * 0.12).toFixed(1)}" text-anchor="middle" fill="${fg}">${esc(e.name)}</text></g>`;
  });
  const fit = Math.min(nameH * 0.8, (width / Math.max(design.name.length, 4)) * 1.6);
  out += `<text x="${x + width / 2}" y="${(y + height - nameH * 0.2).toFixed(1)}" font-size="${fit.toFixed(1)}" font-style="italic" text-anchor="middle" fill="${ink}">${esc(design.name)}</text></g>`;
  return out;
}

// The print file: transparent background, filling the provider print area.
export function printSvg(design, area, opts) {
  const pad = area.width * 0.06;
  const box = { x: pad, y: pad, width: area.width - pad * 2, height: area.height - pad * 2 };
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${area.width}" height="${area.height}" viewBox="0 0 ${area.width} ${area.height}">${designGroup(design, box, opts)}</svg>`;
}

// ---- product mock-ups (simple silhouettes; the design box is where the artwork sits) ----------------
const MOCKUPS = {
  apparel: { w: 400, h: 440, box: { x: 128, y: 118, width: 144, height: 180 },
    shape: (c) => `<path d="M130 40 L70 70 L40 140 L85 160 L95 130 L95 400 L305 400 L305 130 L315 160 L360 140 L330 70 L270 40 C250 62 150 62 130 40 Z" fill="${c}" stroke="#9CA3AF" stroke-width="2"/>` },
  drinkware: { w: 400, h: 440, box: { x: 128, y: 150, width: 120, height: 118 },
    shape: (c) => `<rect x="105" y="110" width="160" height="190" rx="12" fill="${c}" stroke="#9CA3AF" stroke-width="2"/><path d="M265 150 h30 a35 35 0 0 1 0 90 h-30" fill="none" stroke="#9CA3AF" stroke-width="14"/>` },
  stationery: { w: 400, h: 440, box: { x: 130, y: 100, width: 140, height: 190 },
    shape: (c) => `<rect x="100" y="50" width="200" height="320" rx="8" fill="${c}" stroke="#9CA3AF" stroke-width="2"/><rect x="100" y="50" width="22" height="320" rx="6" fill="#00000022"/>` },
  'wall-art': { w: 400, h: 440, box: { x: 128, y: 98, width: 144, height: 232 },
    shape: (c) => `<rect x="90" y="50" width="220" height="330" fill="${c}" stroke="#6B7280" stroke-width="2"/><rect x="110" y="70" width="180" height="290" fill="#FFFFFF"/>` }
};

export function productPreviewSvg(product, colorHex, design) {
  const m = MOCKUPS[product.kind] || MOCKUPS.apparel;
  // wall art is white inside the frame, so its ink is always dark; other products follow their colour
  const ink = product.kind === 'wall-art' ? '#1F2937' : inkFor(colorHex);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w} ${m.h}" role="img">${m.shape(colorHex)}${designGroup(design, m.box, { ink })}</svg>`;
}
