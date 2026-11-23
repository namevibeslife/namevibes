// Default product catalogue. Admin switches and prices live in Firestore (merch_products,
// merch_variants, merch_countries); this file only supplies the shape and the starting products so
// hoodies, caps, bottles etc. are added as DATA (an admin-created merch_products document), not code.
//
// printSpec = what the product can print: { printTypeId, allowedPlacements[], maxWidthInches, maxHeightInches, minDpi, verified }.
// ONLY the T-shirt has seed values, and they are UNVERIFIED (12 x 16 in front, DTG): confirm against Qikink before selling.
// Mugs, notebooks and posters have NO printSpec on purpose: their print area, print type and placement are unknown, so
// they cannot be activated (availability.js blocks them) until an admin fills them in. Do not guess values.
export { PRINT_DPI } from './layout.js';

const apparelSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const apparelColors = [
  { id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }, { id: 'navy', hex: '#1B2A49' },
  { id: 'forest', hex: '#14532D' }
];

export const DEFAULT_PRODUCTS = {
  tshirt: {
    id: 'tshirt', kind: 'apparel', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: apparelSizes, colors: apparelColors, placements: ['front-center'],
    printSpec: { printTypeId: 1, allowedPlacements: ['fr'], maxWidthInches: 12, maxHeightInches: 16, minDpi: 150, verified: false }
  },
  mug: {
    id: 'mug', kind: 'drinkware', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['330ml'], colors: [{ id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }], placements: ['wrap']
  },
  notebook: {
    id: 'notebook', kind: 'stationery', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['A5'], colors: [{ id: 'ivory', hex: '#F8F1DD' }, { id: 'black', hex: '#111111' }], placements: ['cover']
  },
  poster: {
    id: 'poster', kind: 'wall-art', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['A3', 'A2'], colors: [{ id: 'black-frame', hex: '#111111' }, { id: 'wood-frame', hex: '#A9753F' }], placements: ['full']
  }
};

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
