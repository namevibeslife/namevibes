// Product catalogue (India, Qikink). Admin switches, prices and print specs live in Firestore (merch_products, merch_variants,
// merch_countries); this file supplies the shape, the Qikink SKU table (read from Qikink's own SKU list on 24 Nov 2026) and the
// base prices, so a new product or variant is DATA, not new code.
//
// EVERYTHING STARTS DISABLED. A product can only be switched on when its print spec is complete AND verified (print_type_id,
// placement and print area from Qikink); only the white 11 oz mug is confirmed so far (sandbox: print type 5, placement fr,
// 8.5 x 3.5 in). Tax % for the bottles was not in the data we have and must be set by the owner (taxUnverified).
//
// printSpec = { printTypeId, allowedPlacements[], minDpi, verified, and either maxWidthInches + maxHeightInches or
// perSize: true with bySize: { A4: { maxWidthInches, maxHeightInches, verified }, ... } } (see layout.js).
//
// Design sources (collections): framed/acrylic posters carry Elements designs (the buyer's own name, generated on demand); mugs and
// bottles carry the Bloodline designs ONLY (the 8 approved logos). `collections` = what the product can carry; `designSources` = what
// admin has switched on (the server enforces both).
export { PRINT_DPI } from './layout.js';

const apparelSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const apparelColors = [
  { id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }, { id: 'navy', hex: '#1B2A49' },
  { id: 'forest', hex: '#14532D' }
];

// ---- framed posters ----------------------------------------------------------------------------------------------------------
export const FRAME_COLORS = [
  { id: 'frame-white', hex: '#FFFFFF', code: 'Wh' }, { id: 'frame-black', hex: '#111111', code: 'Bk' }, { id: 'frame-yellow', hex: '#E7B416', code: 'Yl' },
  { id: 'frame-green', hex: '#0B5D3B', code: 'Gn' }, { id: 'frame-royal-blue', hex: '#1F4FBF', code: 'Rb' }, { id: 'frame-olive', hex: '#6B7035', code: 'OG' }
];
export const FRAMED_SIZES = ['A4', 'A3', '8x8', '8x10', '10x10', '11x14', '12x12', '12x16', '12x18'];
const FRAMED_SKU = { A4: 'A4 Frame poster', A3: 'A3 Frame poster', '8x8': '8x8FPoster', '8x10': '8x10fpos', '10x10': '10x10fpos', '11x14': '11x14Fpos', '12x12': '12x12FPoster', '12x16': '12x16Fpos', '12x18': '12x18Fpos' };
export const FRAMED_BASE = { A4: 212, A3: 326, '8x8': 173, '8x10': 188, '10x10': 212, '11x14': 282, '12x12': 248, '12x16': 299, '12x18': 321 };
// A4/A3 come in six frame colours; the other sizes only in white and black (from docs/qikink-sku-starter-products.md; re-check on the SKU list)
const FRAMED_COLOR_IDS = { A4: FRAME_COLORS.map((c) => c.id), A3: FRAME_COLORS.map((c) => c.id) };
for (const s of FRAMED_SIZES.slice(2)) FRAMED_COLOR_IDS[s] = ['frame-white', 'frame-black'];

// ---- acrylic posters ---------------------------------------------------------------------------------------------------------
export const ACRYLIC_SIZES = ['A4', 'A3', '8x8', '12x12', '16x16', '16x24'];
const ACRYLIC_SKU = { A4: 'A4 poster', A3: 'A3 poster', '8x8': '8x8inches', '12x12': '12x12inches', '16x16': '16x16inches', '16x24': '16x24Inches' };
export const ACRYLIC_BASE = { A4: 179, A3: 317, '8x8': 140, '12x12': 250, '16x16': 417, '16x24': 599 };
export const ACRYLIC_STAND = { sku: 'UAcryDiSt-Wh-NA', base: 120 }; // Acrylic Display Stand: its own Qikink line item, the optional "Add stand"

// ---- mugs (11 oz) ------------------------------------------------------------------------------------------------------------
export const MUG_VARIANTS = [
  { id: 'white', hex: '#FFFFFF', sku: 'UWCM-Wh-11 OZ', base: 115, on: true },
  { id: 'black', hex: '#111111', sku: 'UBCM-Bk-11 OZ', base: 174, on: false },
  ...[['green', '#2E8B57', 'Green'], ['skyblue', '#87CEEB', 'SkyBlue'], ['orange', '#F28C28', 'Orange'], ['black', '#222222', 'Black'], ['darkblue', '#1B3A6B', 'DarkBlue'], ['red', '#C62828', 'Red'], ['yellow', '#F4D03F', 'Yellow'], ['lightpink', '#F4B6C2', 'LightPink']]
    .map(([k, hex, label]) => ({ id: `colour-${k}`, hex, sku: `UCCM-Wh-${label}`, base: 174, on: false })),
  { id: 'magic-black', hex: '#1A1A1A', sku: 'UMCM-Wh-11oz Black', base: 174, on: false }, { id: 'magic-red', hex: '#B71C1C', sku: 'UMCM-Wh-11oz Red', base: 174, on: false },
  { id: 'magic-green', hex: '#1B5E20', sku: 'UMCM-Wh-11ozGreen', base: 174, on: false }, { id: 'magic-royalblue', hex: '#1F4FBF', sku: 'UMCM-Wh-11ozRoyalBlue', base: 174, on: false },
  { id: 'enamel-white', hex: '#F5F5F5', sku: 'UWECM-Wh-11oz', base: 254, on: false }
];

// ---- bottles -----------------------------------------------------------------------------------------------------------------
export const BOTTLES = {
  'steel-bottle': { sku: 'UWtrbtl-Bk-750ml', base: 213, size: '750ml', color: { id: 'black', hex: '#111111' } },
  'sipper-bottle': { sku: 'USSBl-Wh-750ml', base: 216, size: '750ml', color: { id: 'white', hex: '#FFFFFF' } },
  tumbler: { sku: 'UTumb-Wh-20oz', base: 408, size: '20oz', color: { id: 'white', hex: '#FFFFFF' } }
};

const BOTH = ['name_elements', 'blood_group'];
export const DEFAULT_PRODUCTS = {
  poster: {
    id: 'poster', kind: 'wall-art', category: 'poster', collections: BOTH, designSources: { name_elements: true, blood_group: false }, enabled: false,
    sizes: FRAMED_SIZES, colors: FRAME_COLORS.map(({ id, hex }) => ({ id, hex, on: true })), colorsBySize: FRAMED_COLOR_IDS, placements: ['full'], defaultInsetMm: 10
  },
  acrylic: {
    id: 'acrylic', kind: 'acrylic', category: 'poster', collections: BOTH, designSources: { name_elements: true, blood_group: false }, enabled: false,
    sizes: ACRYLIC_SIZES, colors: [{ id: 'white', hex: '#FFFFFF', on: true }], placements: ['full'], defaultInsetMm: 0,
    standSku: ACRYLIC_STAND.sku // the optional "Add stand" is a SEPARATE Qikink line item (plain product, same quantity)
  },
  'acrylic-frame': {
    id: 'acrylic-frame', kind: 'acrylic', category: 'poster', collections: BOTH, designSources: { name_elements: true, blood_group: false }, enabled: false,
    sizes: ['NA'], colors: [{ id: 'white', hex: '#FFFFFF', on: true }], placements: ['full'], defaultInsetMm: 0 // Acrylic Photo Frame with Stand (AF22), a separate product
  },
  mug: {
    id: 'mug', kind: 'drinkware', category: 'mug', collections: ['blood_group'], designSources: { blood_group: true }, enabled: false,
    sizes: ['11oz'], colors: MUG_VARIANTS.map(({ id, hex, on }) => ({ id, hex, on })), placements: ['wrap'],
    // CONFIRMED in the Qikink sandbox (24 Nov 2026): print_type_id 5, placement fr, 8.5 x 3.5 in. Placement on a real mug is not proven until a sample is printed.
    printSpec: { printTypeId: 5, allowedPlacements: ['fr'], maxWidthInches: 8.5, maxHeightInches: 3.5, minDpi: 150, verified: true }
  },
  ...Object.fromEntries(Object.entries(BOTTLES).map(([id, b]) => [id, {
    id, kind: 'bottle', category: 'bottle', collections: ['blood_group'], designSources: { blood_group: true }, enabled: false,
    sizes: [b.size], colors: [{ ...b.color, on: true }], placements: ['wrap'], taxUnverified: true // wrap print area and GST % are NOT known yet
  }])),
  tshirt: {
    id: 'tshirt', kind: 'apparel', category: 'apparel', collections: BOTH, designSources: { name_elements: true, blood_group: true }, enabled: false,
    sizes: apparelSizes, colors: apparelColors.map((c) => ({ ...c, on: true })), placements: ['front-center'],
    printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: false }
  },
  notebook: {
    id: 'notebook', kind: 'stationery', category: 'stationery', collections: BOTH, designSources: { name_elements: true, blood_group: true }, enabled: false,
    sizes: ['A5'], colors: [{ id: 'ivory', hex: '#F8F1DD', on: true }, { id: 'black', hex: '#111111', on: true }], placements: ['cover']
  }
};

// Kinds whose designs are full-sheet "frame designs" (posters)
export const FRAME_KINDS = ['wall-art', 'acrylic'];
export const isFrameKind = (kind) => FRAME_KINDS.includes(kind);

// Qikink SKU for a variant (UNVERIFIED until checked against the dashboard) and Qikink's base price in INR.
export function starterSku(productId, color, size) {
  if (productId === 'poster') { const code = FRAME_COLORS.find((f) => f.id === color)?.code; return code && FRAMED_SKU[size] ? `UFPos-${code}-${FRAMED_SKU[size]}` : null; }
  if (productId === 'acrylic') return ACRYLIC_SKU[size] ? `UAcryPos-Wh-${ACRYLIC_SKU[size]}` : null;
  if (productId === 'acrylic-frame') return 'UAcryFrmStd-Wh-NA';
  if (productId === 'mug') return MUG_VARIANTS.find((m) => m.id === color)?.sku || null;
  return BOTTLES[productId]?.sku || null;
}
export function baseCost(productId, color, size) {
  if (productId === 'poster') return FRAMED_BASE[size];
  if (productId === 'acrylic') return ACRYLIC_BASE[size];
  if (productId === 'acrylic-frame') return 164;
  if (productId === 'mug') return MUG_VARIANTS.find((m) => m.id === color)?.base;
  return BOTTLES[productId]?.base;
}

// The colours of a product that exist for a size (framed posters: only white/black beyond A4/A3), minus any a variant document has switched off.
export function colorsFor(product, size, variantDocs = {}) {
  const allowed = product.colorsBySize?.[size];
  return (product.colors || []).filter((c) => (!allowed || allowed.includes(c.id)) && (variantDocs[`${product.id}_${c.id}_${size}`]?.enabled ?? c.on) !== false);
}

// Merge the built-in defaults with admin-created/edited merch_products documents.
// A document with the same id overrides the default (e.g. { enabled: true }); a new id is a new product.
export function mergeProducts(docs = []) {
  const out = Object.fromEntries(Object.entries(DEFAULT_PRODUCTS).map(([k, v]) => [k, { ...v }]));
  for (const d of docs) {
    if (!d || !d.id) continue;
    out[d.id] = { ...(out[d.id] || {}), ...d };
    if (d.designSources) out[d.id].designSources = { ...(DEFAULT_PRODUCTS[d.id]?.designSources || {}), ...d.designSources };
  }
  return out;
}

export function findVariantOptions(product, { color, size }) {
  const sizeOk = (product.sizes || []).includes(size);
  const colorOk = (product.colors || []).some((c) => c.id === color) && (!product.colorsBySize?.[size] || product.colorsBySize[size].includes(color));
  return { colorOk, sizeOk };
}

// Provider SKU for a variant: admin mapping on a merch_variants document (id `${productId}_${color}_${size}`).
export const variantId = (productId, color, size) => `${productId}_${color}_${size}`;
