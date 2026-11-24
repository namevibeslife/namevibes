# Framed poster designs (Elements Gold, Individual Dark, Family Dark)

Reference looks: `merch-reference/` (never printed, never an input). Code: `src/merch/frames.js` (pure layout), `src/merch/framePaint.js` (canvas painter), wiring in `designs.js`, `printCanvas.js`, `engine.js`, `MerchStore.jsx`. Tests: `scripts/test-frames.mjs` (in `npm run test:merch`), `scripts/test-launch.mjs`, browser test.

## How an order's file is made

The buyer's own data (names, relations, family title) goes to the server, which recomputes every person's elements with the existing element engine. The browser then paints the poster **fresh at print size** (`renderFrameCanvas`): the print area in inches x 300 DPI (A4 about 2480 x 3508, A3 about 3508 x 4961, or the Qikink print area once confirmed), opaque, with a code-painted background, border, crystal tiles and text. Preview and print file execute the same list of drawing operations. If a phone cannot make a canvas that large, it retries smaller and reports the DPI reached; the server refuses a file below the product's minimum DPI (default 150). The reference images are 1024 px wide and are never upscaled or printed.

## Inset from the frame (designInsetMm)

The artwork is printed smaller than the frame by the same amount on all four sides. One per-product setting, **`designInsetMm`** (default **10**, validated 0 to 30, Admin -> Products -> framed poster card, audited as `admin.setProduct`), applies to all three designs.

| Size | Frame | Artwork at 10 mm |
|---|---|---|
| A4 | 210 x 297 mm | 190 x 277 mm |
| A3 | 297 x 420 mm | 277 x 400 mm |

- The print file stays the **full print area** (A4 about 2480 x 3508 px, A3 about 3508 x 4961 px at 300 DPI; 10 mm = 118 px), so `design_link`, `mockup_link` and the Qikink width/height inches keep describing the whole file. The artwork is centred in it and the border around it is a **flat colour, not artwork** (a mat): ivory `#fbf2da` for Elements Gold, near-black `#020204` for Individual Dark and Family Dark (`EDGE_COLORS` in `frames.js`).
- The design is **re-laid out inside the smaller area** (`layoutFrame` is called with the artwork size), it is not a scaled-down copy: type keeps its proportions and every operation stays inside the artwork's safe area.
- If the confirmed print area is smaller than the frame, the **stricter of (print area) and (frame minus inset)** is used per side; each order item records `designInsetMm`, `artworkInches` and `insetApplied` (`frame-minus-inset` or `print-area`). Sizes without a nominal frame (not A4/A3) use the print area as the frame.
- Resolution: the artwork is vector and painted at the file's DPI, so it is measured on its printed size (190 x 277 mm and 277 x 400 mm); the server still refuses a file below the product's minimum DPI.
- The customer preview, the product-page mock-up and the print file all use the same inset, so the proof the buyer sees is the file that is sent.
- Open choice: the border colour is flat ivory / near-black so it reads as a mat. Say if you want white, or the background art to run to the edge (set the inset to 0 for that).

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

`public/merch/samples/frame-{elements-gold,individual-dark,family-dark}.jpg` are shown on the product page with a "Sample" label. They are now **renders of our own designs** (the real element engine, the real layouts and the 10 mm inset; 700 px JPEG, web size) made by `scripts/make-frame-samples.mjs` (start `npm run dev:mock -- --port 5190`, then run it). Elements Gold and Individual Dark use the name "Vibes"; Family Dark uses a made-up "Sample Family" (Sam, Alex, Jamie and Robin Rivers, labelled Parent / Parent / Child / Child), so no real person appears. The script refuses to write a sample that contains `namevibes` text or lacks the Namasutra domain. The old reference-based samples (NAMEVIBES branding, mock panels) are gone; `merch-reference/` is not committed. The live preview is always the buyer's own data.

## Open questions

- Qikink's real print area for A4 / A3 (the designs scale to whatever it is) and whether it wants a bleed.
- Family titles: the buyer types the family name (e.g. "Nair Family"); nothing is derived from the names.
- Element meanings are English only (the app's translated meanings could be used for non-English posters).

## Sizes and acrylic (24 November 2026)
The frame designs now lay out for all nine framed and six acrylic sizes using a composition box fitted inside the artwork area (`compositionBox`, `layoutFrameIn`). Minimum text is 1.5 mm (`MIN_TEXT_MM`); a size that cannot meet it, or the product's minimum DPI, is refused. Framed posters default to a 10 mm inset; acrylic defaults to 0.
