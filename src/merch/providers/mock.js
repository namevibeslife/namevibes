// Simulated provider for tests and `npm run dev:mock`. Behaves like a real partner, including
// duplicate-submission protection by idempotency key, and can be told to fail or time out.
import { PODProvider, unsupported } from './base.js';
import { refuseCod } from '../cod.js';

const ORDER = ['received', 'processing', 'shipped', 'delivered'];

export class MockProviderAdapter extends PODProvider {
  constructor(id = 'mock', { secret = 'mock-webhook-secret' } = {}) {
    super(id);
    this.secret = secret;
    this.orders = new Map();      // providerOrderId -> { status, key, tracking }
    this.byKey = new Map();       // idempotencyKey -> providerOrderId
    this.failures = [];           // queued behaviours for the next submitOrder calls: 'timeout' | 'error' | 'reject'
    this.submitCalls = 0;
    this.n = 0;
  }

  failNext(kind = 'timeout', times = 1) { for (let i = 0; i < times; i++) this.failures.push(kind); }

  async getCapabilities() { return { ok: true, products: ['tshirt', 'mug', 'notebook', 'poster'], note: 'mock' }; }
  async getQuote({ items }) { return { ok: true, cost: 0, shipping: 0, currency: null, days: 5, items: items?.length || 0 }; }

  async submitOrder(order) {
    this.submitCalls += 1;
    const cod = refuseCod(order); if (cod) return cod;
    const fail = this.failures.shift();
    if (fail === 'timeout') return { ok: false, error: 'timeout', retryable: true };
    if (fail === 'error') return { ok: false, error: 'provider-5xx', retryable: true };
    if (fail === 'reject') return { ok: false, error: 'rejected-design', retryable: false };
    const existing = this.byKey.get(order.idempotencyKey);
    if (existing) return { ok: true, providerOrderId: existing, duplicate: true };
    const providerOrderId = `MOCK-${++this.n}-${order.idempotencyKey.slice(-6)}`;
    this.byKey.set(order.idempotencyKey, providerOrderId);
    this.orders.set(providerOrderId, { status: 'received', key: order.idempotencyKey, tracking: null });
    return { ok: true, providerOrderId };
  }

  // Test helper: move an order along received -> processing -> shipped -> delivered
  advance(providerOrderId) {
    const o = this.orders.get(providerOrderId);
    if (!o) return null;
    const next = ORDER[Math.min(ORDER.indexOf(o.status) + 1, ORDER.length - 1)];
    o.status = next;
    if (next === 'shipped' || next === 'delivered') o.tracking = { carrier: 'MockExpress', number: `MX${providerOrderId.slice(-6)}`, url: null };
    return o;
  }

  async getOrderStatus(providerOrderId) {
    const o = this.orders.get(providerOrderId);
    if (!o) return { ok: false, error: 'not-found', retryable: false };
    return { ok: true, status: o.status, tracking: o.tracking };
  }

  async cancelOrder(providerOrderId) {
    const o = this.orders.get(providerOrderId);
    if (!o) return { ok: false, error: 'not-found', retryable: false };
    if (o.status === 'shipped' || o.status === 'delivered') return { ok: false, error: 'too-late', retryable: false };
    o.status = 'cancelled';
    return { ok: true };
  }

  // Webhook body: { id, providerOrderId, status, tracking? }; header x-mock-signature must equal the secret.
  async verifyWebhook(headers, rawBody) {
    const sig = headers?.get ? headers.get('x-mock-signature') : headers?.['x-mock-signature'];
    if (sig !== this.secret) return { ok: false, error: 'bad-signature', retryable: false };
    try {
      const e = JSON.parse(rawBody);
      return { ok: true, event: { id: e.id, providerOrderId: e.providerOrderId, status: e.status, tracking: e.tracking || null } };
    } catch { return { ok: false, error: 'bad-body', retryable: false }; }
  }
}

export { unsupported };
