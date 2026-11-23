// Default product catalogue. Admin switches and prices live in Firestore (merch_products,
// merch_variants, merch_countries); this file only supplies the shape and the starting products so
// hoodies, caps, bottles etc. are added as DATA (an admin-created merch_products document), not code.
//
// LAUNCH SCOPE (India, Qikink, prepaid only): two products are enabled, everything else is disabled until an admin turns it on.
//   poster = Name Elements framed posters A4 / A3 (frame colours Wh, Bk, Yl, Gn, Rb, OG: SKU UFPos-<col>-A4 Frame poster / A3 Frame poster)
//   mug    = Blood Group printed mugs, 11 oz (SKU UWCM-Wh-11 OZ white, UBCM-Bk-11 OZ black)
// Both are "enabled but BLOCKED" until their printSpec is filled in (print_type_id, placement, print area per size): see availability.js.
// tshirt and notebook stay in the config as DISABLED. Only the T-shirt has a seed spec (UNVERIFIED).
//
// printSpec = { printTypeId, allowedPlacements[], minDpi, verified, and either maxWidthInches + maxHeightInches
// or perSize: true with bySize: { A4: { maxWidthInches, maxHeightInches }, ... } } (see layout.js).
export { PRINT_DPI } from './layout.js';

const apparelSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const apparelColors = [
  { id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }, { id: 'navy', hex: '#1B2A49' },
  { id: 'forest', hex: '#14532D' }
];

// Frame colours Qikink lists for the framed-poster SKUs (code = the colour part of the SKU).
export const FRAME_COLORS = [
  { id: 'frame-white', hex: '#FFFFFF', code: 'Wh' }, { id: 'frame-black', hex: '#111111', code: 'Bk' }, { id: 'frame-yellow', hex: '#E7B416', code: 'Yl' },
  { id: 'frame-green', hex: '#0B5D3B', code: 'Gn' }, { id: 'frame-royal-blue', hex: '#1F4FBF', code: 'Rb' }, { id: 'frame-olive', hex: '#6B7035', code: 'OG' }
];

export const DEFAULT_PRODUCTS = {
  poster: {
    id: 'poster', kind: 'wall-art', collections: ['name_elements'], enabled: true,
    sizes: ['A4', 'A3'], colors: FRAME_COLORS.map(({ id, hex }) => ({ id, hex })), placements: ['full']
  },
  mug: {
    id: 'mug', kind: 'drinkware', collections: ['blood_group'], enabled: true,
    sizes: ['11oz'], colors: [{ id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }], placements: ['wrap']
  },
  tshirt: {
    id: 'tshirt', kind: 'apparel', collections: ['name_elements', 'blood_group'], enabled: false,
    sizes: apparelSizes, colors: apparelColors, placements: ['front-center'],
    printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: false }
  },
  notebook: {
    id: 'notebook', kind: 'stationery', collections: ['name_elements', 'blood_group'], enabled: false,
    sizes: ['A5'], colors: [{ id: 'ivory', hex: '#F8F1DD' }, { id: 'black', hex: '#111111' }], placements: ['cover']
  }
};

// Qikink SKU for a variant, from docs/qikink-sku-starter-products.md (UNVERIFIED until checked against the dashboard).
export function starterSku(productId, color, size) {
  if (productId === 'poster') {
    const code = FRAME_COLORS.find((f) => f.id === color)?.code;
    return code ? `UFPos-${code}-${size} Frame poster` : null;
  }
  if (productId === 'mug') return color === 'black' ? 'UBCM-Bk-11 OZ' : 'UWCM-Wh-11 OZ';
  return null;
}

// Merge the built-in defaults with admin-created/edited merch_products documents.
// A document with the same id overrides the default (e.g. { enabled: false }); a new id is a new product.
export function mergeProducts(docs = []) {
  const out = Object.fromEntries(Object.entries(DEFAULT_PRODUCTS).map(([k, v]) => [k, { ...v }]));
  for (const d of docs) {
    if (!d || !d.id) continue;
    out[d.id] = { ...(out[d.id] || {}), ...d };
  }
  return out;
}

export function findVariantOptions(product, { color, size }) {
  const colorOk = (product.colors || []).some((c) => c.id === color);
  const sizeOk = (product.sizes || []).includes(size);
  return { colorOk, sizeOk };
}

// Provider SKU for a variant: admin mapping on a merch_variants document (id `${productId}_${color}_${size}`).
export const variantId = (productId, color, size) => `${productId}_${color}_${size}`;
