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
