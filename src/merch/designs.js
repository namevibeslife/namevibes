// What goes on the product. Name Elements designs are built ONLY from the existing Namasutra element
// engine; blood-group designs are one of exactly eight fixed choices.
import { ELEMENTS, analyzeName } from '../utils/elements.js';
import { NAME_ALGORITHM_VERSION, DESIGN_TEMPLATE_VERSION } from './constants.js';

export const MAX_NAME_LENGTH = 40;
export const MAX_DESIGN_ELEMENTS = 24; // long names must still fit a framed poster; tiles shrink to fit

/*
 * Name Elements matching policy (documented and tested; the owner still has to approve it):
 *  - The existing analyzeName() decides everything: each word of the name is split into element symbols
 *    so that as many letters as possible are covered (ties favour fewer, i.e. two-letter, symbols).
 *  - Symbols never overlap, repeated symbols are kept, order is the order in the name, letters no
 *    element can cover are listed as `unmatched` and left out. Nothing is ever invented.
 */
export function buildNameElementsDesign(name) {
  const clean = String(name || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!clean) return { error: 'name-required' };
  if (clean.length > MAX_NAME_LENGTH) return { error: 'name-too-long' };
  const { elements, unmatched } = analyzeName(clean);
  if (elements.length === 0) return { error: 'no-elements' };
  if (elements.length > MAX_DESIGN_ELEMENTS) return { error: 'too-many-elements' };
  return {
    design: {
      collection: 'name_elements',
      name: clean,
      algorithmVersion: NAME_ALGORITHM_VERSION,
      templateVersion: DESIGN_TEMPLATE_VERSION,
      elements: elements.map((e, i) => ({ position: i, symbol: e.symbol, name: e.name, atomicNumber: e.number })),
      unmatched
    }
  };
}

// A client may send the elements it already verified. Never trust them: recompute from the name and
// require every submitted symbol to be a real element, in the same order.
export function verifyClientElements(name, submitted) {
  const built = buildNameElementsDesign(name);
  if (built.error) return built;
  if (Array.isArray(submitted)) {
    const symbols = submitted.map((e) => (typeof e === 'string' ? e : e?.symbol));
    if (symbols.some((s) => typeof s !== 'string' || !Object.prototype.hasOwnProperty.call(ELEMENTS, s))) return { error: 'invalid-symbol' };
    const mine = built.design.elements.map((e) => e.symbol).join(',');
    if (symbols.join(',') !== mine) return { error: 'elements-mismatch' };
  }
  return built;
}

// ---- Blood group -------------------------------------------------------------------------------------
// Approved artwork lives in `bloodline logos/` (originals are never edited). The Unicode-minus file is
// mapped explicitly. Optimised, checksummed copies are in public/merch/ (scripts/optimise-blood-assets.mjs).
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const BLOOD_GROUP_SOURCE_FILES = {
  'A+': 'A+.png', 'A-': 'A-.png', 'B+': 'B+.png', 'B-': 'B-.png',
  'AB+': 'AB+.png', 'AB-': 'AB−.png', 'O+': 'O+.png', 'O-': 'O-.png'
};
const SLUGS = { 'A+': 'a-pos', 'A-': 'a-neg', 'B+': 'b-pos', 'B-': 'b-neg', 'AB+': 'ab-pos', 'AB-': 'ab-neg', 'O+': 'o-pos', 'O-': 'o-neg' };
export const bloodGroupSlug = (code) => SLUGS[code];
// Display uses the true minus sign; codes stored and compared use the ASCII hyphen.
export const bloodGroupLabel = (code) => String(code).replace('-', '−');

export function buildBloodGroupDesign(code, { confirmed } = {}) {
  const normalised = String(code || '').trim().toUpperCase().replace(/[−–—]/g, '-');
  if (!BLOOD_GROUPS.includes(normalised)) return { error: 'invalid-blood-group' };
  if (confirmed !== true) return { error: 'blood-group-not-confirmed' };
  return { design: { collection: 'blood_group', bloodGroup: normalised, templateVersion: DESIGN_TEMPLATE_VERSION } };
}

// Validate one line's design input. Returns { design } or { error }.
export function buildDesign(collection, input = {}) {
  if (collection === 'name_elements') return verifyClientElements(input.name, input.elements);
  if (collection === 'blood_group') return buildBloodGroupDesign(input.bloodGroup, { confirmed: input.confirmed });
  return { error: 'unknown-collection' };
}

// Name designs are drawn with the poster template on wall art (headings + name + element tiles) and the compact template elsewhere.
export function applyTemplate(design, product) {
  if (!design || design.collection !== 'name_elements') return design;
  return { ...design, template: product?.kind === 'wall-art' ? 'poster' : 'compact' };
}
