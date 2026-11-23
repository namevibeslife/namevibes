// One real Qikink SANDBOX call: get a token, then create a small test order. Never prints secrets.
//   set QIKINK_CLIENT_ID, QIKINK_CLIENT_SECRET (sandbox secret), QIKINK_TEST_SKU (a real SKU from your dashboard's
//   "SKU Descriptions" page) and QIKINK_TEST_DESIGN_URL (a publicly reachable https PNG), then:
//   node scripts/qikink-sandbox-check.mjs
// Optional: QIKINK_TEST_PRINT_TYPE (default 1), QIKINK_TEST_PLACEMENT (default fr), QIKINK_TEST_STATE (default Maharashtra).
// Refuses to run against live. The sandbox has no working order-list API, so this checks token + create only.
import { QikinkAdapter } from '../src/merch/providers/qikink.js';

const { QIKINK_CLIENT_ID: id, QIKINK_CLIENT_SECRET: secret, QIKINK_TEST_SKU: sku, QIKINK_TEST_DESIGN_URL: url } = process.env;
if (process.env.QIKINK_ENV === 'live') { console.error('Refusing to run: QIKINK_ENV=live. This check is sandbox only.'); process.exit(2); }
const missing = [['QIKINK_CLIENT_ID', id], ['QIKINK_CLIENT_SECRET', secret], ['QIKINK_TEST_SKU', sku], ['QIKINK_TEST_DESIGN_URL', url]].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`Not run. Set: ${missing.join(', ')}`); process.exit(2); }

// Two placement cases (sandbox cannot show the printed result, only whether Qikink accepts the order):
//   offcentre: a print-area canvas with the design deliberately in a corner; full: a canvas filled edge to edge.
// Give each its own public PNG (QIKINK_TEST_DESIGN_URL_OFFCENTRE / QIKINK_TEST_DESIGN_URL_FULL); QIKINK_TEST_DESIGN_URL is the fallback for both.
// QIKINK_TEST_CANVAS is the print area in inches, WIDTHxHEIGHT (default 12x16, an UNVERIFIED T-shirt front).
const [cw, ch] = String(process.env.QIKINK_TEST_CANVAS || '12x16').split('x').map(Number);
const cases = [['offcentre', process.env.QIKINK_TEST_DESIGN_URL_OFFCENTRE || url], ['full', process.env.QIKINK_TEST_DESIGN_URL_FULL || url]];
const adapter = new QikinkAdapter('qikink', { clientId: id, clientSecret: secret, env: 'sandbox' });
const results = [];
for (const [name, designUrl] of cases) {
  const orderId = `sbx${name.slice(0, 3)}${Date.now().toString(36)}`;
  const r = await adapter.submitOrder({
    orderId, attempt: 1, email: 'sandbox-test@example.com', totalValue: 1,
    address: { name: 'Sandbox Test', phone: '9999999999', line1: '1 Test Road', city: 'Pune', state: process.env.QIKINK_TEST_STATE || 'Maharashtra', postalCode: '411001', country: 'IN' },
    items: [{ index: 0, qty: 1, unitPrice: 1, designUrl, mockupUrl: designUrl, designSha256: 'f'.repeat(64), canvasInches: { width: cw, height: ch }, placementSku: process.env.QIKINK_TEST_PLACEMENT || 'fr',
      providerSku: { sku, printTypeId: Number(process.env.QIKINK_TEST_PRINT_TYPE || 1) } }]
  });
  results.push({ case: name, canvasInches: `${cw}x${ch}`, orderNumberSent: r.orderNumber, ok: r.ok, providerOrderId: r.providerOrderId, error: r.error, retryable: r.retryable });
}
console.log(JSON.stringify(results, null, 2));
const { mkdirSync, writeFileSync } = await import('node:fs');
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/qikink-sandbox-results.json', JSON.stringify({ at: new Date().toISOString(), env: 'sandbox', results }, null, 2)); // no secrets in here
process.exit(results.every((r) => r.ok) ? 0 : 1);
