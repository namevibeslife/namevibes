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

const adapter = new QikinkAdapter('qikink', { clientId: id, clientSecret: secret, env: 'sandbox' });
const orderId = `sbx${Date.now().toString(36)}`;
const result = await adapter.submitOrder({
  orderId, attempt: 1, email: 'sandbox-test@example.com', totalValue: 1,
  address: { name: 'Sandbox Test', phone: '9999999999', line1: '1 Test Road', city: 'Pune', state: process.env.QIKINK_TEST_STATE || 'Maharashtra', postalCode: '411001', country: 'IN' },
  items: [{ index: 0, qty: 1, unitPrice: 1, designUrl: url, designSha256: 'f'.repeat(64),
    providerSku: { sku, printTypeId: Number(process.env.QIKINK_TEST_PRINT_TYPE || 1), placementSku: process.env.QIKINK_TEST_PLACEMENT || 'fr', widthInches: 10, heightInches: 10 } }]
});
console.log(JSON.stringify({ orderNumberSent: result.orderNumber, ok: result.ok, providerOrderId: result.providerOrderId, error: result.error, retryable: result.retryable }, null, 2));
process.exit(result.ok ? 0 : 1);
