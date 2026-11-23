# Qikink adapter

Source: "Qikink API - Orders (List) 08-25" (https://documenter.getpostman.com/view/26157218/2sBYAysUHS). Code: `src/merch/providers/qikink.js`.
Tests: `npm run test:qikink` (fake Qikink server built from the docs). Real sandbox check: `scripts/qikink-sandbox-check.mjs`.

## What the adapter does

| Area | Behaviour |
|---|---|
| Environments | Sandbox `https://sandbox.qikink.com`, live `https://api.qikink.com`. Live needs `QIKINK_ENV=live` **and** the provider's `liveEnabled` admin switch; both off by default. |
| Token | `POST /api/token` (form: `ClientId`, `client_secret`). Every request overwrites the previous token, so one token is cached, refreshed 60 s before expiry, refreshes are single-flight, a 401 refreshes once and retries once. |
| Rate limit | Documented 60 per minute; the shared limiter allows 50 and waits for room. Rate-limit responses back off (1 s, 2 s, 4 s) and stop after 3 retries. |
| Create order | `POST /api/order/create`, body built from an allow-list (`design_link`, `mockup_link`, never `*_url`). 400 = permanent (exception queue, no retry). 5xx/network = retryable but a create is never re-sent inside one attempt. |
| Order number | Max 15 chars, `[a-z0-9_]`, deterministic from our order id (ids over 15 chars are hashed). Stored on the fulfilment as `providerOrderNumber`; it is the idempotency key. |
| Duplicate protection | On any retry (attempt 2+) the adapter first looks the order up with `order_reference_no`; if found it is adopted, no second create. On live a failed lookup holds the retry back. In the sandbox the list API does not work, so the retry proceeds without lookup. |
| Status | Polling only: `GET /api/order/list` with `ids` (10 per call, batched). One mapping table (`QIKINK_STATUS_MAP`): Live / To be Printed / Printed / S-Printed / Stitched/QC / Partially Printed / Partitally Picklisted -> in production; Manifested / Dispatch Ready / PIcked Up / In-Transit / Out for Delivery / Delivery rescheduled -> shipped; Delivered; Cancelled; stock, address, courier and return problems -> exception. Archived, No-Data, Self collect and any new text are "unmapped": state unchanged, raw text kept, admin alert once. |
| Tracking | `awb`, `tracking_link`, `courier_provider_name` saved on the order and fulfilment and shown to the customer. |
| Quotes | No quote endpoint: `getQuote` is "unsupported" and quotes use admin-set costs and shipping, marked `source: configured`. A per-country margin floor % blocks sales below it. |
| Cancel / webhooks | Not documented: both "unsupported". Admin cancels in the Qikink dashboard; polling picks up "Cancelled"; refunds stay on our side. |
| Countries | India only. |

## Admin set-up needed (the API has no SKU catalogue)

Admin -> Merchandise -> Products -> "Provider SKU mapping": for each variant enter the Qikink `sku`, `print_type_id`, `placement_sku` and design size in inches
(DTG type 1 max 16 x 20 in, DTF type 17 max 18 x 20 in). Copy these from "SKU Descriptions" in the Qikink dashboard. The mock seed contains one
clearly marked placeholder (`PLACEHOLDER-REPLACE-ME`, inactive provider); it is not a real SKU.

## Decisions made where the docs are silent (please confirm)

- `mockup_link` is required by Qikink but we have no separate mock-up image, so the print file URL is sent for both.
- Signed print-file links now last 72 hours (was 6) because Qikink may fetch the file well after submission.
- `phone` is passed as the customer typed it; `province` must match an Indian state name (a state code such as MH is converted); invalid values stop the order before anything is sent.
- `total_order_value` is what the customer paid us; `price` is our unit price; `gateway` is always `Prepaid`; `qikink_shipping` is 1.
- The pagination field names of the list response are not documented; the code follows `pagination.total_pages` / `last_page` if present and otherwise stops when a page has fewer than 10 rows.

## Still unverified (no real Qikink call has been made)

Live behaviour; the sandbox create-order call (needs credentials, a real SKU and a public design URL); tracking sync (sandbox cannot do it); real SKUs and print areas;
whether Qikink rejects a repeated `order_number`; the exact wording of rate-limit errors; response pagination shape.
