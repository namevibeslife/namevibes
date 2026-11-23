// Default product catalogue. Admin switches and prices live in Firestore (merch_products,
// merch_variants, merch_countries); this file only supplies the shape and the starting products so
// hoodies, caps, bottles etc. are added as DATA (an admin-created merch_products document), not code.
//
// printArea sizes are in pixels at 300 DPI and are PROVISIONAL: confirm them against the provider's
// real specifications before ordering samples (Qikink's docs could not be read when this was written).

export const PRINT_DPI = 300;

const apparelSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const apparelColors = [
  { id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }, { id: 'navy', hex: '#1B2A49' },
  { id: 'forest', hex: '#14532D' }
];

export const DEFAULT_PRODUCTS = {
  tshirt: {
    id: 'tshirt', kind: 'apparel', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: apparelSizes, colors: apparelColors, placements: ['front-center'],
    printArea: { 'front-center': { width: 3600, height: 4800 } }
  },
  mug: {
    id: 'mug', kind: 'drinkware', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['330ml'], colors: [{ id: 'white', hex: '#FFFFFF' }, { id: 'black', hex: '#111111' }], placements: ['wrap'],
    printArea: { wrap: { width: 2550, height: 1050 } }
  },
  notebook: {
    id: 'notebook', kind: 'stationery', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['A5'], colors: [{ id: 'ivory', hex: '#F8F1DD' }, { id: 'black', hex: '#111111' }], placements: ['cover'],
    printArea: { cover: { width: 1500, height: 2100 } }
  },
  poster: {
    id: 'poster', kind: 'wall-art', collections: ['name_elements', 'blood_group'], enabled: true,
    sizes: ['A3', 'A2'], colors: [{ id: 'black-frame', hex: '#111111' }, { id: 'wood-frame', hex: '#A9753F' }], placements: ['full'],
    printArea: { full: { width: 3508, height: 4961 } }
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
