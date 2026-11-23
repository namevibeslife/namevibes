// Where the design sits on the product, and what the product can print. ONE definition used by the designer,
// the preview, the print file and the server, so they cannot disagree.
//
// A layout is { scale, x, y }: the design's WIDTH as a fraction of the print area width (height follows the
// design's own aspect, never taller than the area), and the design's CENTRE as fractions of the print area
// (0 = left/top edge, 1 = right/bottom edge). The print file is a transparent canvas the size of the whole
// print area with the design drawn at this position, because the Qikink API has no x/y field.
import { BLOOD_ASSETS } from './bloodAssets.js';
import { bloodGroupSlug } from './designs.js';

export const DEFAULT_LAYOUT = { scale: 0.8, x: 0.5, y: 0.5 };
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 1;
export const PRINT_DPI = 300;       // preferred resolution of the print file
export const DEFAULT_MIN_DPI = 150; // below this a raster design is blocked (admin can override per product)

// Documented Qikink hard limits (inches) by print_type_id.
export const TYPE_LIMITS = { 1: { width: 16, height: 20 }, 17: { width: 18, height: 20 } };
export const PRINT_TYPE_IDS = [1, 2, 3, 5, 6, 7, 12, 13, 14, 15, 17, 23];
export const PLACEMENT_CODES = ['fr', 'bk', 'lp', 'rp', 'rs', 'ls'];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Natural width/height of a design (raster blood-group art keeps its own shape; the name tile grid is 4:5).
export function designAspect(design) {
  if (design?.collection === 'blood_group') {
    const a = BLOOD_ASSETS[bloodGroupSlug(design.bloodGroup)];
    return a ? a.width / a.height : 1312 / 1199;
  }
  return design?.template === 'poster' ? 210 / 297 : 0.8; // A-series paper for the poster template
}

// Accepts anything, returns a safe layout (also what the server stores).
export function normaliseLayout(raw) {
  const l = raw && typeof raw === 'object' ? raw : {};
  return {
    scale: clamp(num(l.scale, DEFAULT_LAYOUT.scale), MIN_SCALE, MAX_SCALE),
    x: clamp(num(l.x, DEFAULT_LAYOUT.x), 0, 1),
    y: clamp(num(l.y, DEFAULT_LAYOUT.y), 0, 1)
  };
}

/**
 * The design's rectangle in the same units as `area` ({ width, height }), clamped so it never leaves the area.
 * Returns { x, y, width, height } (top-left origin).
 */
export function placementBox(area, layout, aspect) {
  const l = normaliseLayout(layout);
  let width = l.scale * area.width;
  let height = width / aspect;
  if (height > area.height) { height = area.height; width = height * aspect; }
  const x = clamp(l.x * area.width - width / 2, 0, area.width - width);
  const y = clamp(l.y * area.height - height / 2, 0, area.height - height);
  return { x, y, width, height };
}

// Largest centred rectangle of the given aspect (w/h) that fits inside box { x, y, width, height }.
export function fitRect(box, aspect) {
  let width = box.width; let height = width / aspect;
  if (height > box.height) { height = box.height; width = height * aspect; }
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
}

// ---- print spec (per product; a variant mapping may override the numbers) -----------------------------------
// { printTypeId, allowedPlacements[], minDpi, verified?, and EITHER maxWidthInches + maxHeightInches
//   OR perSize: true with bySize: { A4: { maxWidthInches, maxHeightInches }, A3: {...} } }.
// perSize is for products whose print area depends on the size (framed posters); apparel uses one area for all sizes.
const dimsProblems = (d, label, p) => {
  if (!(Number(d?.maxWidthInches) > 0)) p.push(label ? `${label}:maxWidthInches` : 'maxWidthInches');
  if (!(Number(d?.maxHeightInches) > 0)) p.push(label ? `${label}:maxHeightInches` : 'maxHeightInches');
};
export function specProblems(spec, sizes) {
  const p = [];
  if (!spec || typeof spec !== 'object') return ['missing'];
  if (!PRINT_TYPE_IDS.includes(Number(spec.printTypeId))) p.push('printTypeId');
  if (!Array.isArray(spec.allowedPlacements) || spec.allowedPlacements.length === 0 || spec.allowedPlacements.some((x) => !PLACEMENT_CODES.includes(x))) p.push('allowedPlacements');
  if (!(Number(spec.minDpi) > 0)) p.push('minDpi');
  const lim = TYPE_LIMITS[Number(spec.printTypeId)];
  const over = (d) => lim && (Number(d.maxWidthInches) > lim.width || Number(d.maxHeightInches) > lim.height);
  if (spec.perSize) {
    const list = Array.isArray(sizes) && sizes.length ? sizes : Object.keys(spec.bySize || {});
    if (!list.length) p.push('bySize');
    for (const sz of list) {
      const d = spec.bySize?.[sz];
      const before = p.length;
      dimsProblems(d, `size ${sz}`, p);
      if (p.length === before && over(d)) p.push('exceedsTypeLimit');
    }
  } else {
    const before = p.length;
    dimsProblems(spec, '', p);
    if (p.length === before && over(spec)) p.push('exceedsTypeLimit');
  }
  return p;
}
export const specComplete = (spec, sizes) => specProblems(spec, sizes).length === 0;

// The flat spec for ONE size: product spec, with the size's print area (perSize) and any per-SKU numbers from the variant mapping laid over it.
export function effectiveSpec(productSpec, mapping, size) {
  const m = mapping && typeof mapping === 'object' ? mapping : {};
  let base = { ...(productSpec || {}) };
  if (base.perSize) {
    const d = base.bySize?.[size];
    base = { ...base, ...(d || {}), perSize: false };
    delete base.bySize;
  }
  const o = {};
  for (const k of ['printTypeId', 'allowedPlacements', 'maxWidthInches', 'maxHeightInches', 'minDpi']) if (m[k] !== undefined && m[k] !== null && m[k] !== '') o[k] = m[k];
  return { ...base, ...o };
}

// ---- resolution ------------------------------------------------------------------------------------------------
// Effective DPI of the design at the chosen size. Vector designs (the name tiles) print at the canvas DPI;
// raster designs (blood-group art) are limited by their pixels.
export function designDpi({ design, spec, layout }) {
  const area = { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) };
  const box = placementBox(area, layout, designAspect(design));
  if (design.collection === 'blood_group') {
    const a = BLOOD_ASSETS[bloodGroupSlug(design.bloodGroup)];
    const px = a ? a.width : 1312;
    return { dpi: Math.round(px / box.width), widthInches: +box.width.toFixed(2), heightInches: +box.height.toFixed(2), vector: false };
  }
  return { dpi: PRINT_DPI, widthInches: +box.width.toFixed(2), heightInches: +box.height.toFixed(2), vector: true };
}

// 'ok' at or above the preferred DPI, 'low' (warn) between the minimum and preferred, 'blocked' below the minimum.
export function resolutionStatus(dpi, { minDpi = DEFAULT_MIN_DPI, preferredDpi = PRINT_DPI } = {}) {
  if (dpi >= preferredDpi) return 'ok';
  return dpi >= minDpi ? 'low' : 'blocked';
}

// The largest scale at which a raster design still meets minDpi (for the customer's hint).
export function maxScaleForDpi({ design, spec, minDpi }) {
  if (design.collection !== 'blood_group') return MAX_SCALE;
  const a = BLOOD_ASSETS[bloodGroupSlug(design.bloodGroup)];
  const px = a ? a.width : 1312;
  const widthIn = px / minDpi;
  return clamp(widthIn / Number(spec.maxWidthInches), 0, MAX_SCALE);
}

// The layout used when the customer has not moved anything: centred, at 80% of the print area, but never so large that a
// raster design drops below the minimum DPI.
export function defaultLayoutFor(design, spec) {
  if (!design || !spec) return { ...DEFAULT_LAYOUT };
  const cap = Math.floor(maxScaleForDpi({ design, spec, minDpi: Number(spec.minDpi) || DEFAULT_MIN_DPI }) * 100) / 100;
  return { scale: Math.max(MIN_SCALE, Math.min(DEFAULT_LAYOUT.scale, cap)), x: 0.5, y: 0.5 };
}
