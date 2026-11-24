// Safety rules for owner-only testing: Qikink sandbox, simulated or blocked payments, no live Qikink without BOTH switches.
import assert from 'node:assert/strict';
import { gatewaysFor, isSandbox, paymentsSimulated } from '../functions/_lib/merchCtx.js';
import { createProvider } from '../src/merch/providers/index.js';

let passed = 0, failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log('  ok  ', name); } catch (e) { failed++; console.log('  FAIL', name, '\n      ', e.message); } };
const order = { id: 'o1', amount: 599, currency: 'INR', uid: 'u1' };

await test('QIKINK_ENV unset or sandbox => sandbox; only the exact word "live" is live', () => {
  for (const v of [undefined, '', 'sandbox', 'LIVE', 'prod', 'true']) assert.equal(isSandbox({ QIKINK_ENV: v }), true, String(v));
  assert.equal(isSandbox({ QIKINK_ENV: 'live' }), false);
});
await test('sandbox without TEST_PAYMENTS: merch checkout is BLOCKED and no gateway is ever called', async () => {
  const realFetch = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; throw new Error('network'); };
  try {
    const g = gatewaysFor({ RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's', PAYPAL_CLIENT_ID: 'c', PAYPAL_CLIENT_SECRET: 's' });
    for (const gateway of ['razorpay', 'paypal']) { const r = await g.create(order, { gateway }); assert.equal(r.error, 'sandbox-payments-blocked'); assert.equal(r.status, 409); }
    assert.equal((await g.verify({ ...order, orderId: 'sim_o1', gateway: 'razorpay' }, {})).error, 'sandbox-payments-blocked');
    assert.equal((await g.refund(order, 10)).error, 'sandbox-payments-blocked');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = realFetch; }
});
await test('sandbox + TEST_PAYMENTS=true: payments are simulated (no gateway call, no charge); a real gateway order id is never accepted', async () => {
  const realFetch = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; throw new Error('network'); };
  try {
    const env = { TEST_PAYMENTS: 'true', RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 's' };
    assert.equal(paymentsSimulated(env), true);
    const g = gatewaysFor(env);
    const r = await g.create(order, { gateway: 'razorpay' });
    assert.equal(r.client.gateway, 'mock'); assert.ok(r.orderId.startsWith('sim_'));
    assert.ok((await g.verify({ ...order, orderId: r.orderId }, {})).transactionId.startsWith('sim_tx_'));
    assert.equal((await g.verify({ ...order, orderId: 'order_real123' }, {})).error, 'sandbox-payments-blocked');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = realFetch; }
});
await test('TEST_PAYMENTS does nothing once Qikink is live (real gateways only)', () => {
  assert.equal(paymentsSimulated({ QIKINK_ENV: 'live', TEST_PAYMENTS: 'true' }), false);
});
await test('Qikink live needs BOTH QIKINK_ENV=live and the provider liveEnabled switch (default off)', () => {
  const doc = { id: 'qikink', adapter: 'qikink', active: true, liveEnabled: false };
  const keys = { QIKINK_CLIENT_ID: 'x', QIKINK_CLIENT_SECRET: 'y' };
  assert.equal(createProvider(doc, { ...keys, QIKINK_ENV: 'live' }).env, 'sandbox'); // env says live but the admin switch is off
  assert.equal(createProvider({ ...doc, liveEnabled: true }, keys).env, 'sandbox'); // admin switch on but QIKINK_ENV unset
  assert.equal(createProvider({ ...doc, liveEnabled: true }, { ...keys, QIKINK_ENV: 'sandbox' }).env, 'sandbox');
  assert.equal(createProvider({ ...doc, liveEnabled: true }, { ...keys, QIKINK_ENV: 'live' }).env, 'live'); // only both together
  assert.match(createProvider(doc, keys).base, /sandbox.qikink.com/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
