// Qikink adapter (India, Phase 1).
//
// STATUS: the transport is complete and tested (client id/secret -> access token cached until it expires,
// 30 requests/minute throttle, 429/5xx back-off). The ORDER endpoints, SKU codes, design/placement fields
// and status values are NOT filled in: the Qikink API documentation
// (https://documenter-api.postman.tech/view/26157218/2sB3QKqpma) could not be read when this was written.
// Until `QIKINK_API.verified` is true, submitOrder/getQuote/getOrderStatus/cancelOrder return a clear
// non-retryable error instead of guessing, so no paid order can be sent with invented fields.
// To finish: paste the docs' endpoint list and example order payload, then fill QIKINK_API and the
// three mapping functions below.
import { PODProvider, unsupported } from './base.js';

export const QIKINK_BASES = { sandbox: 'https://sandbox.qikink.com', live: 'https://api.qikink.com' };
export const QIKINK_RATE_LIMIT = { max: 30, perMs: 60 * 1000 };

export const QIKINK_API = {
  verified: false,
  tokenPath: null,       // e.g. the "get access token" endpoint; exchange ClientId + client secret
  createOrderPath: null,
  orderStatusPath: null,
  cancelOrderPath: null
};

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class QikinkAdapter extends PODProvider {
  constructor(id = 'qikink', { clientId, clientSecret, env = 'sandbox', fetch: f, now = () => Date.now(), sleep = realSleep, api = QIKINK_API } = {}) {
    super(id);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.env = env === 'live' ? 'live' : 'sandbox';
    this.base = QIKINK_BASES[this.env];
    this.fetch = f || ((...a) => globalThis.fetch(...a));
    this.now = now;
    this.sleep = sleep;
    this.api = api;
    this.token = null;      // { value, expiresAt }
    this.stamps = [];       // request times inside the rate window
  }

  // At most QIKINK_RATE_LIMIT.max requests in any rolling minute: wait for room instead of failing.
  async throttle() {
    const { max, perMs } = QIKINK_RATE_LIMIT;
    for (;;) {
      const t = this.now();
      this.stamps = this.stamps.filter((s) => t - s < perMs);
      if (this.stamps.length < max) { this.stamps.push(t); return; }
      await this.sleep(perMs - (t - this.stamps[0]) + 1);
    }
  }

  async accessToken() {
    if (this.token && this.token.expiresAt > this.now() + 5000) return this.token.value;
    if (!this.clientId || !this.clientSecret) throw Object.assign(new Error('qikink-credentials-missing'), { retryable: false });
    if (!this.api.tokenPath) throw Object.assign(new Error('qikink-token-endpoint-unverified'), { retryable: false });
    await this.throttle();
    const res = await this.fetch(`${this.base}${this.api.tokenPath}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ClientId: this.clientId, client_secret: this.clientSecret }).toString()
    });
    if (!res.ok) throw Object.assign(new Error('qikink-token-failed'), { retryable: res.status >= 500 || res.status === 429 });
    const body = await res.json();
    const value = body.Accesstoken || body.access_token || body.token;
    if (!value) throw Object.assign(new Error('qikink-token-missing'), { retryable: false });
    const ttl = Number(body.expires_in) > 0 ? Number(body.expires_in) * 1000 : 50 * 60 * 1000;
    this.token = { value, expiresAt: this.now() + ttl };
    return value;
  }

  // One call with throttling, token reuse, a refreshed token on 401, and exponential back-off on 429/5xx.
  async request(path, init = {}, { retries = 3 } = {}) {
    let wait = 1000;
    for (let attempt = 0; ; attempt++) {
      let token;
      try { token = await this.accessToken(); } catch (e) { return { ok: false, error: e.message, retryable: e.retryable !== false }; }
      await this.throttle();
      let res;
      try {
        res = await this.fetch(`${this.base}${path}`, { ...init, headers: { ...(init.headers || {}), 'Content-Type': 'application/json', Accesstoken: token, ClientId: this.clientId } });
      } catch { res = null; }
      if (res && res.status === 401 && attempt < retries) { this.token = null; continue; }
      if (res && res.ok) return { ok: true, status: res.status, body: await res.json().catch(() => ({})) };
      const transient = !res || res.status === 429 || res.status >= 500;
      if (!transient || attempt >= retries) return { ok: false, error: res ? `qikink-http-${res.status}` : 'timeout', retryable: transient };
      const retryAfter = res && Number(res.headers?.get?.('retry-after')) * 1000;
      await this.sleep(retryAfter > 0 ? retryAfter : wait);
      wait *= 2;
    }
  }

  guard() {
    return this.api.verified ? null : { ok: false, error: 'qikink-endpoints-unverified', retryable: false };
  }

  async getCapabilities() { return { ok: true, products: ['tshirt', 'mug', 'notebook', 'poster'], note: 'unverified-against-docs' }; }
  async getQuote() { return this.guard() || unsupported('getQuote'); }
  async submitOrder(order) {
    const g = this.guard(); if (g) return g;
    // Fill from the docs: map order.items (providerSku, design URL, placement, qty) and order.address to Qikink's payload,
    // sending order.idempotencyKey as the reference so a retry can never create a second order.
    return { ok: false, error: 'qikink-order-mapping-not-written', retryable: false };
  }
  async getOrderStatus() { return this.guard() || { ok: false, error: 'qikink-status-mapping-not-written', retryable: false }; }
  async cancelOrder() { return this.guard() || unsupported('cancelOrder'); }
  async verifyWebhook() { return unsupported('verifyWebhook'); }
}
