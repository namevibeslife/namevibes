# Launch scope v3: India, Qikink, prepaid only, two products

Server code stays Cloudflare Pages Functions (not Firebase Cloud Functions). Payments: Razorpay (INR) for India; Stripe is not in this repo (PayPal is), so the earlier reuse decision stands.

## What is enabled

| Product | Collection | Sizes / variants | Qikink SKU (UNVERIFIED starter data) | Status |
|---|---|---|---|---|
| Framed poster | Name Elements only | A4, A3 x six frame colours (Wh, Bk, Yl, Gn, Rb, OG) | `UFPos-<col>-A4 Frame poster`, `UFPos-<col>-A3 Frame poster` | ON, **blocked: print spec missing** |
| Blood Group mug | Blood Group only (all eight, approved masters) | 11 oz white / black | `UWCM-Wh-11 OZ`, `UBCM-Bk-11 OZ` | ON, **blocked: print spec missing** |
| T-shirt, notebook | | | | OFF (kept in config) |

Everything else (hoodies, caps, totes, other merchandise) does not exist in config; adding one is a `merch_products` document. All other countries are disabled by default. **Admin -> Merchandise -> Overview -> "Apply launch configuration"** writes this configuration without overwriting anything: global switch OFF, India OFF, no prices, Qikink provider inactive with live submission off, product switches as above, and unverified starter SKUs for the 14 variants.

A product is purchasable only when its own switch, the country switch, the collection switch and the global switch are ON **and** its print spec is complete **and** it has a price. Admin shows "ENABLED BUT BLOCKED: print spec missing" until then.

## Fields you must still fill (Admin -> Products -> print spec, and prices in Global & countries)

**Framed poster** (per-size print areas): `print_type_id` for the framed-poster SKUs; allowed `placement_sku`; **maximum print width and height in inches for A4 and for A3** (Qikink's print-area guide; documented ceilings are DTG 16 x 20 in, DTF 18 x 20 in); minimum DPI (default 150). Prices for A4 and A3 (and cost estimates), GST (suggested 18%).

**Blood Group mug**: `print_type_id` for the mug SKUs; allowed `placement_sku`; **maximum print width and height in inches of the mug print area** (the area may be a wrap; confirm with Qikink); minimum DPI. Price (and cost estimate) per mug variant, GST (suggested 5%).

Also: shipping charge, payment-fee estimate, India switch and global switch (after QA), and a Qikink account with wallet credit. GST treatment must be confirmed with your accountant.

## No cash on delivery (anywhere)

- Every request is scanned at the single server entry point (`handleMerch`): any COD / cash / pay-on-delivery method, flag or alias, at any depth, is refused with `cod-not-allowed` and an `alert.cod-rejected` audit entry. A Razorpay webhook for a COD payment is refused and never marks an order paid.
- Every adapter refuses COD (`refuseCod`, contract test over the mock and Qikink adapters). Qikink payloads always carry `gateway: "Prepaid"`.
- A provider is only called after payment was verified server-side; an unverified order goes to the exception queue instead.

## Qikink wallet

If Qikink answers a 400 whose text matches the configurable pattern (default `insufficient|wallet|balance|low fund`, **unverified**; override with `QIKINK_FUNDS_ERROR_PATTERN`), the paid order is put in the distinct state `held_provider_funds`: one admin alert (`alert.provider-funds`), no automatic retry, no duplicate (the order number is reused and looked up before any repeat). Admin Overview shows the count; after you top up the wallet press **Retry after wallet top-up** on the order. Any other 400 stays a permanent exception. Customers see "Being checked by our team".

## Admin Product Management

One table (products x Everywhere / each country) with checkboxes, **Select All**, **Activate Selected**, **Deactivate Selected**, collection, country and whole-module switches. Every change is previewed by the server (`bulkSwitch` with `dryRun`), shown in a confirmation, applied by the server and written to the audit log with before/after. Disabling blocks new quotes and checkouts (also existing quotes and direct API calls) but never cancels or hides paid orders, tracking or refunds. Staff can also record complaints and replacements on an order (stored on the admin-only fulfilment record).

## Poster artwork

`THE CHEMISTRY OF YOUR NAME`, the customer's name, `ELEMENTS IN YOUR NAME`, then the real element tiles (symbol, name, atomic number). The two headings are constants (never translated, never changed); long names shrink the type and tiles (up to 24 elements). The element-matching rules are unchanged.

## Draft policy

`/merch/returns-policy` (linked from the cart and order pages): a returns/refunds/replacement policy for personalised goods in India, **marked as a draft for legal review**.

## Not available from Qikink's documented API

Supported variants, fulfilment charges and quotes: there is no catalogue, rate or quote endpoint, so variants live in the admin SKU mapping and costs/shipping are admin-set.

## Unverified

Live Qikink behaviour, real payments, placement until a physical sample is printed, the exact wallet error text, all print specs for posters and mugs, SKU/print-type pairs, GST treatment.

## Full catalogue (24 November 2026) - supersedes "two launch products enabled"

- EVERYTHING now starts DISABLED (global switch, India, every product, Qikink). Nothing unverified can be switched on: the server refuses (`not-ready`, single and bulk) any product whose print type, placement or print area is missing or not marked verified. Only the white 11 oz mug is verified by default (print type 5, placement `fr`, 8.5 x 3.5 in, confirmed in the Qikink sandbox).
- Catalogue: framed posters (9 sizes, base Rs 173-326; A4/A3 in six frame colours), acrylic posters (6 sizes, base Rs 140-599) with an optional "Add stand" (Rs 120 base, sent to Qikink as a SEPARATE plain line item), acrylic photo frame AF22 (Rs 164), mugs 11 oz (white on at launch; black, colour, magic, enamel are admin-enableable), bottles (steel 750 ml Rs 213, sipper 750 ml Rs 216, tumbler 20 oz Rs 408).
- Design sources are enforced on the server: mugs and bottles carry Bloodline (blood group) art only; posters carry Name Elements (Bloodline on posters exists but is OFF until an admin turns it on). Admin can show/hide each of the 8 Bloodline designs; the Blood Group shop lists a design only if it is visible AND an enabled product carries it.
- Elements posters are visible to the buyer only after generating from a name (the "Sample" images stay as examples).
- Admin variant table: SKU, base cost, price, shipping, GST, enable, design source, inset, print area, verified. A warning shows when price <= cost + shipping + tax. All changes are audited.
- Layout: every aspect ratio is fitted inside the artwork box; a minimum text size (1.5 mm) and the DPI check refuse a size rather than shrink silently. Bloodline art is about 1300 px, so large posters are refused for blur.
- Still unknown / blocked: print type, placement and print area for posters, acrylic, stand, frame AF22 and bottles; GST for bottles (left unset, so they cannot be quoted); real Qikink behaviour for the stand pairing.

## Owner-only testing release (24 November 2026)

- **Who sees merchandise**: Firestore `merch_settings/global.visibleTo` = `nobody` (default, also when missing) / `admins` / `everyone`. Enforced on the server for every merchandise API (catalogue, quote, checkout, artwork, verify, visibility): anyone not allowed gets a plain 404 `not-found`. In the UI the routes under `/merch` render the normal 404 page, the menu links ("Merchandise", "Blood Group") and the "Frame My Elements" button disappear. Admin actions (`/admin/merch`) are never gated so the setting can always be changed. Paid-order webhooks, the cron and the signed print-file link are not gated (they are signed or secret-protected).
- **Hide merchandise instantly (no deploy)**: sign in as admin -> /admin/merch -> Overview -> "Merchandise visible to" -> Nobody. Effective at once.
- **Sandbox safety**: Qikink is live only when BOTH `QIKINK_ENV=live` AND the provider's `liveEnabled` admin switch are on (both default off); anything else is the sandbox. While Qikink is on the sandbox, merchandise payments are never real: with `TEST_PAYMENTS=true` they are SIMULATED (no gateway call, nobody charged); without it merchandise checkout is BLOCKED (`sandbox-payments-blocked`). Admins see a "SANDBOX: no real order will be printed or shipped" banner. Tests: `scripts/test-sandbox.mjs`.
- **Rules**: `firestore.rules` and `storage.rules` are NOT published by Claude. Until the owner publishes them in the Firebase console: admin screens and admin carts work (existing admin catch-all), but customer reads/writes of `merch_*` data and the Storage upload of print files are refused, so a real checkout cannot complete (it stops before payment; the cart/order screens show a generic error, nothing breaks, no data is lost).
- **Roll the site back**: Cloudflare Pages -> namasutra project -> Deployments -> choose the last successful deployment before the merge -> Rollback; or `git revert -m 1 <merge commit>` on `main` and push. Merge commit: `efb3d66` (revert with `git revert -m 1 efb3d66`). Previous production commit: `307540c`.
