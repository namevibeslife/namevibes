# Design placement, print areas, resolution and mock-ups

**Placement is unverified until a physical sample has been printed.** The Qikink create-order API has no x/y field (only `placement_sku`, `width_inches`, `height_inches`, `design_link`, `mockup_link`) and the docs do not say how a design is positioned inside a placement.

## How it works

- **One layout, two renderers** (`src/merch/layout.js`, `render.js`, `printCanvas.js`). A layout is `{ scale, x, y }`: the design's width as a fraction of the print area, and its centre as fractions of the area. `placementBox()` turns it into a rectangle that can never leave the area. The preview and the print file both call it.
- **Print file** = a transparent canvas the size of the whole print area (inches x 300 DPI, scaled down only to stay under ~16 megapixels for phones) with the design drawn at the customer's position and scale. The declared `width_inches` x `height_inches` sent to Qikink is that canvas size, so any centring Qikink does applies to the whole canvas and leaves the design where the customer put it.
- **Mock-up** = the product silhouette with the print area outlined and the design at the same fractions, rendered to an 800 x 880 PNG and uploaded next to the print file (`merch/mockup/...`). It is sent as `mockup_link` through a signed link (kind `m`). If the browser cannot make one, the print file is sent instead and `mockupSources: ['print-fallback']` is recorded on the fulfilment.
- **Designer bounds**: the customer can change size and position with sliders, but the design cannot leave the dashed print area shown on the preview. The server clamps the layout again and stores it with the order.

## Per-product print spec (admin: Merchandise -> Products)

`printSpec = { printTypeId, allowedPlacements[], maxWidthInches, maxHeightInches, minDpi, verified }`, with optional per-SKU overrides on the Qikink variant mapping. Documented hard limits are enforced: DTG (type 1) at most 16 x 20 in, DTF (type 17) at most 18 x 20 in.

| Product | Status |
|---|---|
| T-shirt | Seed spec **UNVERIFIED**: DTG (1), placement `fr`, 12 x 16 in, min 150 DPI. Confirm with Qikink and a sample. |
| Mug | **BLOCKED** - print type, print area and placement unknown |
| Notebook | **BLOCKED** - unknown |
| Poster / framed poster | **BLOCKED** - unknown |

A blocked product is hidden from the shop, cannot be quoted, and an admin cannot switch it on until a complete valid spec is saved. Starter SKUs are seeded as unverified variants in mock mode only (`UWCM-Wh-11 OZ`, `UNotebook-Wh-Notebook Ruled`, `UFPos-Bk-A3 Frame poster`, `MRnHs-Wh-M`).

## Resolution

DPI = artwork pixels / printed inches. Name tiles are vector (always 300). The blood-group masters are 1312 x 1199 px, so on a 12 in wide print they are about 109 DPI. Below the product's `minDpi` (default 150) the design is blocked with a message and a suggested maximum size ("Use that size" button); between `minDpi` and 300 the customer sees a softness warning. An admin can allow below-minimum per product (`dpiOverride`). The default layout for a raster design is automatically sized so it is not blocked.

## First physical sample checklist

1. Order one T-shirt with the design deliberately **off-centre** (top-left) and one centred; compare to the preview.
2. Measure the distance from the collar and from the side seams to the design; compare to the preview's dashed area.
3. Measure the printed width and height against the declared inches.
4. Check the colour of the tiles / the red and gold of the blood-group art on white and on a dark shirt (the name line switches ink colour for dark garments).
5. Check sharpness of the blood-group art at the size used (it is the lowest-resolution asset).
6. Confirm whether Qikink centres the canvas, prints it from a corner, or scales it; if it does anything other than "print the canvas at its declared size at the placement origin", the placement logic must change.
7. Confirm what Qikink shows for `mockup_link` and whether it affects production.

## Sandbox cases

`node scripts/qikink-sandbox-check.mjs` sends two orders (off-centre canvas and full-area canvas) and writes the responses to `artifacts/qikink-sandbox-results.json`. It needs `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET`, `QIKINK_TEST_SKU`, a public `QIKINK_TEST_DESIGN_URL` (or `_OFFCENTRE` / `_FULL`), and optionally `QIKINK_TEST_CANVAS` (e.g. `12x16`). It has NOT been run (no credentials on this machine), and the sandbox cannot show the printed result anyway.
