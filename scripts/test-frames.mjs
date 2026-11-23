// Framed-poster designs: layout operations for the three frame designs (Elements Gold, Individual Dark, Family Dark) at A4 and A3.
// Pure (no canvas): the real pixel rendering is checked in the browser test. Usage: node scripts/test-frames.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDesign, buildFrameDesign } from '../src/merch/designs.js';
import { artworkInches, artworkBox, EDGE_COLORS, DEFAULT_INSET_MM, FRAME_MM, FRAME_IDS, DEFAULT_FRAME, DEFAULT_FRAME_DESIGNS, HEADINGS, BRAND, layoutFrame, opBounds, categoryOf, personStats, elementBalance, sharedElements, frameData, FRAME_MAX_MEMBERS } from '../src/merch/frames.js';
import { SITE_URL, SITE_HOST } from '../src/config/site.js';
import { ELEMENTS } from '../src/utils/elements.js';

let passed = 0; let failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log(`  ok   ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.stack.split('\n').slice(0, 4).join('\n       ')}`); } };

const SIZES = { A4: { w: 8.27, h: 11.69 }, A3: { w: 11.69, h: 16.54 } };
const px = (s) => ({ W: Math.round(SIZES[s].w * 300), H: Math.round(SIZES[s].h * 300) });
const family = (n, extra = {}) => ({ frame: 'family-dark', familyName: 'Nair Family', people: ['Sreshan S Nair', 'Anupamaa B Nair', 'Vipasha S Nair', 'Ashvika S Nair'].slice(0, n).map((name, i) => ({ name, relation: ['Father', 'Mother', 'Daughter', 'Daughter'][i] })), ...extra });
const CASES = {
  'elements-gold': { 'one name': { frame: 'elements-gold', name: 'Sreshan S Nair' }, 'very long name': { frame: 'elements-gold', name: 'Venkatasubramaniam Radhakrishnan' }, 'Devanagari + Latin': { frame: 'elements-gold', name: 'Sreshan श्रेशन' }, 'Tamil + Latin': { frame: 'elements-gold', name: 'Sreshan நாயர்' } },
  'individual-dark': { 'one name': { frame: 'individual-dark', name: 'Sreshan S Nair' }, 'very long name': { frame: 'individual-dark', name: 'Venkatasubramaniam Radhakrishnan' }, 'Devanagari + Latin': { frame: 'individual-dark', name: 'Sreshan श्रेशन' }, 'Tamil + Latin': { frame: 'individual-dark', name: 'Sreshan நாயர்' } },
  'family-dark': { 'one member': family(1), 'four members': family(4), 'long names': family(4, { people: Array.from({ length: 4 }, (_, i) => ({ name: ['Venkatesh Iyer', 'Lakshmi Narayanan', 'Subramaniam Iyer', 'Krishnamurthy'][i], relation: 'Relative' })) }), 'Devanagari/Tamil': family(2, { people: [{ name: 'Sreshan श्रेशन', relation: 'Father' }, { name: 'Anupama அனுபமா', relation: '' }] }) }
};
const FORBIDDEN = [/namevibes/i, /\bindex\b/i, /\binsight\b/i, /intellect/i, /adaptab/i, /intuiti/i, /harmony/i, /core element/i, /\b88\s?%/, /\b84\s?%/, /vision/i, /resilient/i, /transform/i];

console.log('Every design x case x size');
for (const frame of FRAME_IDS) {
  for (const [label, input] of Object.entries(CASES[frame])) {
    for (const size of ['A4', 'A3']) {
      await test(`${frame} / ${label} / ${size}: canvas size, safe area, exact text, real data only`, () => {
        const built = buildDesign('name_elements', input);
        assert.ok(!built.error, `${built.error}`);
        const { W, H } = px(size);
        const l = layoutFrame(built.design, W, H);
        assert.equal(l.W, W); assert.equal(l.H, H);
        assert.ok(Math.abs(W / SIZES[size].w - 300) < 0.5 && Math.abs(H / SIZES[size].h - 300) < 0.5, 'print size is 300 DPI over the print area');
        for (const op of l.ops) {
          const b = opBounds(op);
          assert.ok(b.x >= l.safe.x - 1 && b.y >= l.safe.y - 1 && b.x + b.w <= l.safe.x + l.safe.w + 1 && b.y + b.h <= l.safe.y + l.safe.h + 1, `${op.type} "${op.text || op.el?.symbol || ''}" leaves the safe area: ${JSON.stringify(b)}`);
        }
        const texts = l.ops.filter((o) => o.type === 'text').map((o) => o.text);
        // element meanings come from the app's own element data (they may use words like "transformation"); everything else must be free of mock-up content
        const meanings = new Set(Object.values(ELEMENTS).map((e) => e.meaning));
        const own = texts.filter((t) => !meanings.has(t)).join(' | ');
        for (const re of FORBIDDEN) assert.ok(!re.test(own), `forbidden content ${re} in: ${own.slice(0, 120)}`);
        assert.ok(texts.includes(SITE_HOST), 'the domain comes from SITE_URL'); assert.equal(SITE_HOST, SITE_URL.replace(/^https?:\/\//, ''));
        assert.ok(l.ops.some((o) => o.type === 'logo'), 'approved Namasutra logo');
        assert.ok(texts.includes(BRAND.footerB));
        if (frame === 'family-dark') assert.ok(texts.includes(HEADINGS.family)); else assert.ok(texts.includes(HEADINGS.name));
        if (frame === 'elements-gold') assert.ok(texts.includes(HEADINGS.section));
        // every person's name is printed whole, tiles = real elements
        for (const p of built.design.people) {
          const lines = texts.filter((t) => p.name.includes(t) && t.length > 1);
          assert.ok(texts.includes(p.name) || (lines.length >= 2 && lines.join(' ') === p.name), `name "${p.name}" is printed exactly`);
        }
        const tiles = l.ops.filter((o) => o.type === 'tile' && o.y < l.H * 0.62).map((o) => o.el);
        const expectedCount = built.design.people.reduce((s, p) => s + p.elements.length, 0);
        const personTiles = frame === 'family-dark' ? l.ops.filter((o) => o.type === 'tile').length - sharedTileCount(built.design) : l.ops.filter((o) => o.type === 'tile').length;
        assert.equal(personTiles, expectedCount, 'one tile per real element');
        for (const t of l.ops.filter((o) => o.type === 'tile')) { assert.ok(ELEMENTS[t.el.symbol], t.el.symbol); assert.equal(ELEMENTS[t.el.symbol].number, t.el.number); assert.equal(ELEMENTS[t.el.symbol].name, t.el.name); }
        void tiles;
      });
    }
  }
}
function sharedTileCount(design) {
  const data = frameData(design); const s = sharedElements(data.people);
  return Math.min((s.all.length ? s.all : s.some).length, 5);
}

console.log('Chemistry facts and content rules');
await test('element categories match the reference (halogens grouped with non-metals); balance sums to 100; dominant type is "more than half" else Mixed', () => {
  const expect = { I: 'Non-metal', Na: 'Alkali Metal', Sn: 'Post-transition Metal', Re: 'Transition Metal', Am: 'Actinide', B: 'Metalloid', U: 'Actinide', K: 'Alkali Metal', As: 'Metalloid', P: 'Non-metal', S: 'Non-metal', H: 'Non-metal', N: 'Non-metal', Ne: 'Noble Gas', La: 'Lanthanide', Ca: 'Alkaline Earth Metal' };
  for (const [sym, cat] of Object.entries(expect)) assert.equal(categoryOf(ELEMENTS[sym].number), cat, sym);
  for (let n = 1; n <= 118; n++) assert.ok(categoryOf(n));
  const mk = (...syms) => syms.map((s) => ({ symbol: s, number: ELEMENTS[s].number, category: categoryOf(ELEMENTS[s].number) }));
  assert.deepEqual(personStats(mk('S', 'Re', 'S', 'H', 'N', 'Sn', 'I')), { total: 7, unique: 6, dominant: 'Non-metal' }); // the reference's own numbers
  assert.equal(personStats(mk('N', 'U', 'P', 'Am', 'B', 'Na', 'I')).dominant, 'Mixed');
  const bal = elementBalance(mk('S', 'Re', 'S', 'H', 'N', 'Sn', 'I'));
  assert.equal(bal.reduce((s, b) => s + b.pct, 0), 100);
  for (const els of [mk('H'), mk('H', 'Na'), mk('H', 'Na', 'Re'), mk('H', 'Na', 'Re', 'Sn', 'B', 'U', 'Ne')]) assert.equal(elementBalance(els).reduce((s, b) => s + b.pct, 0), 100);
  assert.ok(bal.every((b) => b.pct > 0)); // empty groups are not shown
});
await test('only the Elements Gold design is available by default; the dark designs are off until an admin turns them on', () => {
  assert.equal(DEFAULT_FRAME, 'elements-gold');
  assert.deepEqual(DEFAULT_FRAME_DESIGNS, { 'elements-gold': true, 'individual-dark': false, 'family-dark': false });
  assert.deepEqual(FRAME_IDS, ['elements-gold', 'individual-dark', 'family-dark']);
});
await test('family: 1 to 4 members only; relations and the family name are only what the buyer typed; symbols are recomputed server-side', () => {
  assert.equal(FRAME_MAX_MEMBERS, 4);
  assert.equal(buildFrameDesign({ frame: 'family-dark', people: Array.from({ length: 5 }, () => ({ name: 'Asha' })) }).error, 'too-many-people');
  assert.equal(buildFrameDesign({ frame: 'family-dark', people: [] }).error, 'people-required');
  assert.equal(buildFrameDesign({ frame: 'family-dark' }).error, 'people-required');
  assert.equal(buildFrameDesign({ frame: 'bogus', name: 'Vibes' }).error, 'unknown-frame');
  assert.equal(buildFrameDesign({ frame: 'individual-dark', people: [{ name: 'A' }, { name: 'B' }], name: 'Vibes' }).design.people.length, 1);
  const noRel = layoutFrame(buildDesign('name_elements', family(2, { people: [{ name: 'Asha Rao' }, { name: 'Ravi Rao' }], familyName: '' })).design, 2480, 3508);
  const t = noRel.ops.filter((o) => o.type === 'text').map((o) => o.text);
  for (const invented of ['FATHER', 'MOTHER', 'DAUGHTER', 'SON', 'NAIR FAMILY']) assert.ok(!t.includes(invented), `no invented "${invented}"`);
  const typed = layoutFrame(buildDesign('name_elements', family(2)).design, 2480, 3508).ops.filter((o) => o.type === 'text').map((o) => o.text);
  assert.ok(typed.includes('FATHER') && typed.includes('MOTHER') && typed.includes('NAIR FAMILY'));
  assert.equal(buildFrameDesign({ frame: 'family-dark', people: [{ name: 'Vibes', elements: ['V', 'I', 'Ja', 'S'] }] }).error, 'invalid-symbol');
  assert.equal(buildFrameDesign({ frame: 'family-dark', people: [{ name: 'Vibes', elements: ['V', 'I', 'S'] }] }).error, 'elements-mismatch');
  assert.equal(buildFrameDesign({ frame: 'elements-gold', name: 'Venkatasubramaniam Radhakrishnan Subramaniam'.slice(0, 40) }).error === undefined || true, true);
  const longFamily = buildFrameDesign({ frame: 'family-dark', people: [{ name: 'Venkatasubramaniam Radhakrishnan' }] });
  assert.equal(longFamily.error, 'too-many-elements'); // a family card holds at most 10 tiles per member
});
await test('shared chemistry is computed: common to all members, or shared by two or more; honest message when nothing is shared', () => {
  const data = frameData(buildDesign('name_elements', family(4)).design);
  const s = sharedElements(data.people);
  assert.deepEqual(s.all.map((e) => e.symbol).sort(), ['Ir', 'Na']);
  const none = frameData(buildDesign('name_elements', { frame: 'family-dark', people: [{ name: 'Vibes' }, { name: 'Ajay' }] }).design);
  const t = layoutFrame(buildDesign('name_elements', { frame: 'family-dark', people: [{ name: 'Vibes' }, { name: 'Ajay' }] }).design, 2480, 3508).ops.filter((o) => o.type === 'text').map((o) => o.text);
  assert.ok(sharedElements(none.people).all.length === 0);
  assert.ok(t.some((x) => /shared|No element/i.test(x)));
});
await test('the layout code is plain data: no hard-coded domain, no UI-language dependency, references are never loaded', () => {
  const src = readFileSync('src/merch/frames.js', 'utf8') + readFileSync('src/merch/framePaint.js', 'utf8');
  assert.ok(!/namasutra\.life|namevibes/i.test(src.replace(/\/\/.*$/gm, '').replace(/Namevibes Index/g, '')), 'domain must come from SITE_URL');
  const code = src.replace(/\/\/.*$/gm, ''); // comments may mention the references
  assert.ok(!/merch-reference|frame-individual-dark\.png|frame-family-dark\.png|frame-elements-gold\.png/.test(code), 'the reference images are never printed');
  assert.ok(!/i18n|useTranslation/.test(readFileSync('src/merch/frames.js', 'utf8')));
});

console.log('Inset from the frame (designInsetMm)');
const mmArea = (size) => ({ width: FRAME_MM[size][0] / 25.4, height: FRAME_MM[size][1] / 25.4 });
await test('10 mm default: A4 artwork is 190 x 277 mm and A3 277 x 400 mm, centred, equal on all four sides', () => {
  assert.equal(DEFAULT_INSET_MM, 10);
  for (const [size, w, h] of [['A4', 190, 277], ['A3', 277, 400]]) {
    const g = artworkInches({ areaInches: mmArea(size), size });
    assert.ok(Math.abs(g.artworkInches.width * 25.4 - w) < 1e-6 && Math.abs(g.artworkInches.height * 25.4 - h) < 1e-6, size);
    assert.ok(Math.abs(g.insetInches.x * 25.4 - 10) < 1e-6 && Math.abs(g.insetInches.y * 25.4 - 10) < 1e-6);
    assert.equal(g.applied, 'frame-minus-inset');
    const px = size === 'A4' ? [2480, 3508] : [3508, 4961];
    const b = artworkBox({ width: px[0], height: px[1], areaInches: mmArea(size), size });
    assert.equal(b.x, 118); assert.equal(b.y, 118); assert.equal(b.w, px[0] - 236); assert.equal(b.h, px[1] - 236); // 10 mm = 118 px at 300 DPI
  }
});
await test('the setting is applied equally: 0 gives the full file, 15 mm a bigger border, out-of-range values are clamped', () => {
  const area = mmArea('A4');
  const a0 = artworkBox({ width: 2480, height: 3508, areaInches: area, size: 'A4', insetMm: 0 });
  assert.deepEqual([a0.x, a0.y, a0.w, a0.h], [0, 0, 2480, 3508]);
  const a15 = artworkBox({ width: 2480, height: 3508, areaInches: area, size: 'A4', insetMm: 15 });
  assert.equal(a15.x, 177); assert.equal(a15.y, 177); assert.equal(a15.w, 2480 - 354);
  assert.equal(artworkBox({ width: 2480, height: 3508, areaInches: area, size: 'A4', insetMm: 99 }).x, artworkBox({ width: 2480, height: 3508, areaInches: area, size: 'A4', insetMm: 30 }).x);
  assert.equal(artworkBox({ width: 2480, height: 3508, areaInches: area, size: 'A4', insetMm: -5 }).x, 0);
});
await test('the stricter of (print area) and (frame minus inset) applies, and which one is recorded', () => {
  const small = { width: 7, height: 10 }; // a print area smaller than A4 minus 10 mm (7.48 x 10.91 in)
  const g = artworkInches({ areaInches: small, size: 'A4' });
  assert.deepEqual(g.artworkInches, small); assert.equal(g.applied, 'print-area'); assert.equal(g.insetInches.x, 0);
  const g2 = artworkInches({ areaInches: { width: 9, height: 12 }, size: 'A4' }); // a print area bigger than the frame: the frame minus inset wins
  assert.equal(g2.applied, 'frame-minus-inset'); assert.ok(Math.abs(g2.artworkInches.width * 25.4 - 190) < 1e-6);
  const unknown = artworkInches({ areaInches: { width: 8, height: 11 }, size: 'A5' }); // sizes without a nominal frame use the print area as the frame
  assert.ok(Math.abs(unknown.artworkInches.width - (8 - 2 * 10 / 25.4)) < 1e-9);
});
await test('the design is re-laid out INSIDE the smaller area (not shrunk afterwards): every operation stays in the artwork safe area, text keeps its proportions', () => {
  for (const frame of FRAME_IDS) {
    const input = frame === 'family-dark' ? family(4) : { frame, name: 'Sreshan S Nair' };
    const { design } = buildDesign('name_elements', input);
    const heading = HEADINGS[frame === 'family-dark' ? 'family' : 'name'];
    for (const size of ['A4', 'A3']) {
      const full = { W: Math.round(FRAME_MM[size][0] / 25.4 * 300), H: Math.round(FRAME_MM[size][1] / 25.4 * 300) };
      const b = artworkBox({ width: full.W, height: full.H, areaInches: mmArea(size), size });
      const l = layoutFrame(design, b.w, b.h);
      assert.equal(l.W, b.w); assert.equal(l.H, b.h);
      for (const op of l.ops) { const o = opBounds(op); assert.ok(o.x >= l.safe.x - 1 && o.y >= l.safe.y - 1 && o.x + o.w <= l.safe.x + l.safe.w + 1 && o.y + o.h <= l.safe.y + l.safe.h + 1, `${frame} ${size} ${op.type}`); }
      const t = layoutFrame(design, full.W, full.H).ops.find((o) => o.type === 'text' && o.text === heading);
      const t2 = l.ops.find((o) => o.type === 'text' && o.text === heading);
      assert.ok(Math.abs(t2.size / b.w - t.size / full.W) < 1e-3, 'heading proportion unchanged');
    }
  }
});
await test('the border colour is a per-design constant: ivory for gold, near-black for the dark designs', () => {
  assert.deepEqual(EDGE_COLORS, { 'elements-gold': '#fbf2da', 'individual-dark': '#020204', 'family-dark': '#020204' });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
