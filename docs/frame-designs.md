# Framed poster designs (Elements Gold, Individual Dark, Family Dark)

Reference looks: `merch-reference/` (never printed, never an input). Code: `src/merch/frames.js` (pure layout), `src/merch/framePaint.js` (canvas painter), wiring in `designs.js`, `printCanvas.js`, `engine.js`, `MerchStore.jsx`. Tests: `scripts/test-frames.mjs` (in `npm run test:merch`), `scripts/test-launch.mjs`, browser test.

## How an order's file is made

The buyer's own data (names, relations, family title) goes to the server, which recomputes every person's elements with the existing element engine. The browser then paints the poster **fresh at print size** (`renderFrameCanvas`): the print area in inches x 300 DPI (A4 about 2480 x 3508, A3 about 3508 x 4961, or the Qikink print area once confirmed), opaque, with a code-painted background, border, crystal tiles and text. Preview and print file execute the same list of drawing operations. If a phone cannot make a canvas that large, it retries smaller and reports the DPI reached; the server refuses a file below the product's minimum DPI (default 150). The reference images are 1024 px wide and are never upscaled or printed.

## The three designs

| Design | Content | Default |
|---|---|---|
| Elements Gold (launch default) | logo, THE CHEMISTRY OF YOUR NAME, the name, ELEMENTS IN YOUR NAME, element tiles, MORE THAN A NAME / A HIGHER YOU, domain | ON |
| Individual Dark | the same header, name box, tiles with category, totals (total / unique / dominant type), element meanings, element balance | OFF |
| Family Dark | THE CHEMISTRY OF YOUR FAMILY, optional family title, 1-4 member cards (relation as typed, name, tiles, totals), shared chemistry (common to all, or shared by two or more), element balance | OFF |

Admin: Merchandise -> Products -> the framed poster's card -> "Frame designs customers can choose" (audited, with before/after). The server refuses a disabled design even by direct API call. A4 and A3 use the same designs; each has its own print area (`perSize`). The designs adapt to any print-area aspect ratio (A-series is 1:1.414; the dark references were 1:1.5 and were re-laid out, not stretched).

## Branding and wording

Printed text says NAMASUTRA (approved logo `public/brand/namasutra-logo.png`) and the domain comes from `SITE_URL` (`src/config/site.js`), never hard-coded. The headings are fixed strings: THE CHEMISTRY OF YOUR NAME, ELEMENTS IN YOUR NAME, THE CHEMISTRY OF YOUR FAMILY (the gold reference said ELEMENTS IN MY NAME; the launch wording wins). Brand taglines copied from the references: EVERY NAME HAS A CHEMISTRY, DISCOVER THE ELEMENTS THAT CONNECT YOU, MORE THAN A NAME / A HIGHER YOU (`BRAND` in frames.js; remove there if you do not want them).

## Reference panels deliberately NOT reproduced (mock-up content, not app data)

Namevibes Index 88% with its Intellect / Adaptability / Intuition bars; "Your Chemistry Profile" icon wheel; "Your Name Insight" paragraph; "Your Core Element" panel (its description is invented); Family Harmony Index 84%; the five trait icons under Shared Chemistry (Intelligence, Adaptability, Bonding, Strength); the per-person trait words (Vision / Transformation / Strength ...); the family quote; the side texts ("Names are not just letters...", "A name / a vibration..."); Know / Understand / Align / Grow; "Four unique chemistries, one powerful bond".

What IS printed (all computed): names, element tiles (symbol, atomic number, name, category), total / unique counts, dominant type (more than half of one category, otherwise Mixed), element meanings (the app's own `ELEMENTS` data, English), shared elements, and element-balance percentages (they always add up to 100).

Note: the reference tiles for "Sreshan S Nair" (S Re S H N Sn I) are NOT what the app computes for that name (Sr Es H N S Na Ir). Printed posters follow the app, so a sample and a real poster for the same name can differ.

## Samples

`public/merch/samples/frame-*.jpg` (700 px JPEG copies of the references) are shown on the product page with a "Sample" label. They still carry the old NAMEVIBES branding and mock panels; replace them with renders of our own designs before launch if that matters (the page can use any three images at those paths). The live preview is always the buyer's own data.

## Open questions

- Qikink's real print area for A4 / A3 (the designs scale to whatever it is) and whether it wants a bleed.
- Family titles: the buyer types the family name (e.g. "Nair Family"); nothing is derived from the names.
- Element meanings are English only (the app's translated meanings could be used for non-English posters).
