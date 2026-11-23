// One design definition -> one drawing, used for BOTH the on-screen preview and the print file, so what
// the customer approves is what is printed. Pure string building (no DOM) so it also runs in Node tests.
import { ELEMENTS, textColorFor } from '../utils/elements.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { bloodGroupSlug, bloodGroupLabel } from './designs.js';
import { placementBox, fitRect, designAspect } from './layout.js';

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

// ---- one layout, two renderers ---------------------------------------------------------------------------------
// The PRINT FILE is a transparent canvas the size of the whole print area with the design at the customer's
// position (the Qikink API has no x/y field). The PREVIEW draws the same print area on the product and puts the
// design at the same fractions of it. Both call placementBox() with the same layout, so they cannot drift apart.
export function printSvg(design, area, { ink, layout } = {}) {
  const box = placementBox(area, layout, designAspect(design));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${area.width}" height="${area.height}" viewBox="0 0 ${area.width} ${area.height}">${designGroup(design, box, { ink })}</svg>`;
}

// ---- product mock-ups (simple silhouettes; `box` is the region of the product where printing happens) ----------
const MOCKUPS = {
  apparel: { w: 400, h: 440, box: { x: 128, y: 98, width: 144, height: 200 },
    shape: (c) => `<path d="M130 40 L70 70 L40 140 L85 160 L95 130 L95 400 L305 400 L305 130 L315 160 L360 140 L330 70 L270 40 C250 62 150 62 130 40 Z" fill="${c}" stroke="#9CA3AF" stroke-width="2"/>` },
  drinkware: { w: 400, h: 440, box: { x: 118, y: 140, width: 140, height: 140 },
    shape: (c) => `<rect x="105" y="110" width="160" height="190" rx="12" fill="${c}" stroke="#9CA3AF" stroke-width="2"/><path d="M265 150 h30 a35 35 0 0 1 0 90 h-30" fill="none" stroke="#9CA3AF" stroke-width="14"/>` },
  stationery: { w: 400, h: 440, box: { x: 125, y: 90, width: 150, height: 210 },
    shape: (c) => `<rect x="100" y="50" width="200" height="320" rx="8" fill="${c}" stroke="#9CA3AF" stroke-width="2"/><rect x="100" y="50" width="22" height="320" rx="6" fill="#00000022"/>` },
  'wall-art': { w: 400, h: 440, box: { x: 120, y: 90, width: 160, height: 250 },
    shape: (c) => `<rect x="90" y="50" width="220" height="330" fill="${c}" stroke="#6B7280" stroke-width="2"/><rect x="110" y="70" width="180" height="290" fill="#FFFFFF"/>` }
};

/**
 * Geometry of a mock-up: { w, h, areaRect, designBox, ink, shapeSvg }.
 * areaRect = the print area drawn on the product (same aspect as the real print area); designBox = where the design sits in it.
 */
export function productMockup(product, colorHex, design, { layout, spec } = {}) {
  const m = MOCKUPS[product.kind] || MOCKUPS.apparel;
  const aspect = spec && Number(spec.maxWidthInches) > 0 && Number(spec.maxHeightInches) > 0 ? Number(spec.maxWidthInches) / Number(spec.maxHeightInches) : m.box.width / m.box.height;
  const areaRect = fitRect(m.box, aspect);
  const local = placementBox({ width: areaRect.width, height: areaRect.height }, layout, designAspect(design));
  const designBox = { x: areaRect.x + local.x, y: areaRect.y + local.y, width: local.width, height: local.height };
  // wall art is white inside the frame, so its ink is always dark; other products follow their colour
  const ink = product.kind === 'wall-art' ? '#1F2937' : inkFor(colorHex);
  return { w: m.w, h: m.h, areaRect, designBox, ink, shapeSvg: m.shape(colorHex) };
}

export function productPreviewSvg(product, colorHex, design, { layout, spec, showArea = false } = {}) {
  const m = productMockup(product, colorHex, design, { layout, spec });
  const outline = showArea ? `<rect x="${m.areaRect.x}" y="${m.areaRect.y}" width="${m.areaRect.width}" height="${m.areaRect.height}" fill="none" stroke="#B8860B" stroke-width="1" stroke-dasharray="4 3" data-print-area="1"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w} ${m.h}" role="img">${m.shapeSvg}${outline}${designGroup(design, m.designBox, { ink: m.ink })}</svg>`;
}
