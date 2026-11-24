// Qikink adapter (India). Written from the official "Qikink API - Orders (List) 08-25" documentation
// (https://documenter.getpostman.com/view/26157218/2sBYAysUHS). Nothing here is guessed: where the docs say
// nothing (webhooks, cancel, quotes, SKU catalogue) the adapter says so explicitly. See docs/qikink-adapter.md.
//
//  - Sandbox https://sandbox.qikink.com, live https://api.qikink.com (same paths). Live needs QIKINK_ENV=live AND the
//    provider's `liveEnabled` admin switch (see providers/index.js); both are off by default.
//  - POST /api/token (form body ClientId + client_secret). Each call OVERWRITES the previous token, so exactly one
//    token is cached per adapter, refreshed before it expires, and refreshes are single-flight (never two at once).
//  - POST /api/order/create rejects unknown fields at every level, so the body is built from an allow-list only.
//  - GET /api/order/list is NOT available in the sandbox (documented), only on live. Status mapping and polling are
//    therefore tested with fixtures only.
import { PODProvider, unsupported } from './base.js';
import { COUNTRIES } from '../../data/countries.js';
import { refuseCod } from '../cod.js';

export const QIKINK_BASES = { sandbox: 'https://sandbox.qikink.com', live: 'https://api.qikink.com' };
// Documented limit is 60 requests per 60 seconds; stay a little under it.
export const QIKINK_RATE_LIMIT = { max: 50, perMs: 60 * 1000 };
export const QIKINK_PATHS = { token: '/api/token', create: '/api/order/create', list: '/api/order/list' };

// Print types accepted by the API (documented list). Size limits are documented for DTG (1) and DTF (17) only.
export const PRINT_TYPES = [1, 2, 3, 5, 6, 7, 12, 13, 14, 15, 17, 23];
export const MAX_PRINT_INCHES = { 1: { width: 16, height: 20 }, 17: { width: 18, height: 20 } };
export const PLACEMENTS = ['fr', 'bk', 'lp', 'rp', 'rs', 'ls'];

// ---- top-level / line / design / address fields the API accepts (anything else is a 400) --------------
export const ALLOWED_FIELDS = {
  order: ['order_number', 'qikink_shipping', 'gateway', 'total_order_value', 'line_items', 'shipping_address', 'add_ons', 'brand_logo'],
  line: ['search_from_my_products', 'print_type_id', 'quantity', 'sku', 'price', 'designs'],
  design: ['design_code', 'width_inches', 'height_inches', 'placement_sku', 'design_link', 'mockup_link'],
  address: ['first_name', 'last_name', 'address1', 'address2', 'phone', 'email', 'city', 'zip', 'province', 'country_code']
};

// ---- order number: <= 15 chars, a-z 0-9 _ only, unique, deterministic from our order id -----------------------
export function qikinkOrderNumber(orderId) {
  const clean = String(orderId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) throw new Error('order id required');
  if (clean.length <= 15) return clean;
  // Longer ids are hashed (53-bit cyrb53 -> base36), so ids differing only in their tail still get different numbers.
  let h1 = 0xdeadbeef; let h2 = 0x41c6ce57;
  for (let i = 0; i < clean.length; i++) { const c = clean.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `nv${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).padStart(11, '0')}`;
}
export const isValidOrderNumber = (n) => /^[a-z0-9_]{1,15}$/.test(String(n));

// ---- status mapping (one table). Raw Qikink status -> our normalised provider status ----------------------
// Normalised values are the keys of PROVIDER_STATUS_TO_STATE in base.js. Anything not listed is "unmapped":
// we keep the raw text, change nothing and alert the admin.
const group = (status, names) => Object.fromEntries(names.map((n) => [n.toLowerCase(), status]));
export const QIKINK_STATUS_MAP = {
  ...group('processing', ['Live', 'To be Printed', 'Printed', 'S-Printed', 'Stitched/QC', 'Partially Printed', 'Partitally Picklisted']),
  ...group('shipped', ['Manifested', 'Dispatch Ready', 'PIcked Up', 'In-Transit', 'Out for Delivery', 'Delivery rescheduled']),
  ...group('delivered', ['Delivered']),
  ...group('cancelled', ['Cancelled']),
  // Needs a person: stock, address, courier or return problems
  ...group('failed', ['Exception', 'Out Of Stock', 'Live-OOS', 'Lost', 'Incorrect/incomplete Address', 'On Hold', 'Consignee unavailable',
    'Maximum attempts reached', 'Misrouted', 'Not attempted', 'ODA', 'Open delivery refused', 'OTP not shared', 'OTP verification cancelled',
    'Refused to accept', 'Residence / office closed', 'Returned', 'Partially Returned', 'Reverse Pickup Initiated', 'RTO Initiated'])
};
// Archived, No-Data, Self collect are deliberately unmapped.
export function mapQikinkStatus(raw) {
  const mapped = QIKINK_STATUS_MAP[String(raw || '').trim().toLowerCase()];
  return mapped ? { status: mapped, raw } : { status: null, unmapped: true, raw };
}

// ---- address normalisation ---------------------------------------------------------------------------------
const INDIA_STATES = COUNTRIES.IN.states;
export function qikinkProvince(value) {
  const v = String(value || '').trim().toLowerCase();
  const hit = INDIA_STATES.find((s) => s.name.toLowerCase() === v || s.code.toLowerCase() === v);
  return hit ? hit.name : null;
}

export function buildShippingAddress(address, email) {
  const parts = String(address.name || '').trim().split(/\s+/);
  const first = parts.shift() || '';
  const last = parts.join(' ');
  const province = qikinkProvince(address.state);
  if (!first) return { error: 'address-name-missing' };
  if (!province) return { error: 'address-province-invalid' };
  const zip = String(address.postalCode || '').replace(/\s+/g, '');
  if (!/^\d{4,10}$/.test(zip)) return { error: 'address-zip-invalid' };
  if (!email) return { error: 'address-email-missing' };
  // address1 holds at most 90 characters; the overflow moves to address2 at a word boundary
  let a1 = String(address.line1 || '').trim();
  let a2 = String(address.line2 || '').trim();
  if (a1.length > 90) {
    const cut = a1.lastIndexOf(' ', 90) > 40 ? a1.lastIndexOf(' ', 90) : 90;
    a2 = `${a1.slice(cut).trim()} ${a2}`.trim();
    a1 = a1.slice(0, cut).trim();
  }
  const out = { first_name: first, address1: a1, phone: String(address.phone).trim(), email, city: String(address.city).trim(), zip, province, country_code: String(address.country).toUpperCase() };
  if (last) out.last_name = last;
  if (a2) out.address2 = a2;
  return { address: out };
}

// ---- create-order payload ------------------------------------------------------------------------------------
// order: { orderId, items[], address, email, totalValue, currency }. Each item: { qty, unitPrice, designUrl, designSha256,
// canvasInches { width, height }, placementSku, providerSku: { sku, printTypeId, plain? }, mockupUrl? }.
// Returns { payload, orderNumber } or { error } (a permanent validation error: never retried blindly).
export function buildOrderPayload(order) {
  // Qikink orders are ALWAYS prepaid: a COD request is refused and `gateway` below is never anything but "Prepaid".
  if (refuseCod(order)) return { error: 'cod-not-allowed' };
  if (String(order.address?.country || '').toUpperCase() !== 'IN') return { error: 'unsupported-country' };
  const orderNumber = qikinkOrderNumber(order.orderId);
  const addr = buildShippingAddress(order.address, order.email);
  if (addr.error) return { error: addr.error };
  const lines = [];
  for (const it of order.items) {
    const m = it.providerSku;
    if (!m || typeof m !== 'object' || !m.sku) return { error: 'sku-mapping-incomplete' };
    if (String(m.sku).length > 50) return { error: 'sku-too-long' };
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 100) return { error: 'bad-quantity' };
    const printType = Number(it.printTypeId || m.printTypeId); // from the product print spec; the mapping value is the older fallback
    if (!PRINT_TYPES.includes(printType)) return { error: 'print-type-invalid' };
    const line = { search_from_my_products: 0, print_type_id: printType, quantity: it.qty, sku: String(m.sku), price: Number(it.unitPrice) };
    if (m.plain === true) {
      line.print_type_id = 1; line.designs = [];
    } else {
      const placement = it.placementSku || m.placementSku; // from the product print spec; a mapping value is the older fallback
      if (!PLACEMENTS.includes(placement)) return { error: 'placement-invalid' };
      if (!it.designUrl || String(it.designUrl).length > 512) return { error: 'design-link-invalid' };
      const mockup = it.mockupUrl || it.designUrl;
      if (String(mockup).length > 512) return { error: 'mockup-link-invalid' };
      // The print file is a canvas the size of the whole print area (the design sits at the customer's position inside it),
      // so the declared size is the canvas size.
      const wIn = Number(it.canvasInches?.width) || Number(m.widthInches) || 0;
      const hIn = Number(it.canvasInches?.height) || Number(m.heightInches) || 0;
      if (!(wIn > 0 && hIn > 0)) return { error: 'design-size-missing' };
      const max = MAX_PRINT_INCHES[printType];
      if (max && (wIn > max.width || hIn > max.height)) return { error: 'design-too-large' };
      const code = `d${it.index ?? 0}_${String(it.designSha256 || '').slice(0, 12)}`.slice(0, 20);
      line.designs = [{ design_code: code, width_inches: +wIn.toFixed(2), height_inches: +hIn.toFixed(2), placement_sku: placement, design_link: it.designUrl, mockup_link: mockup }];
    }
    lines.push(line);
  }
  if (lines.length === 0) return { error: 'no-items' };
  const payload = { order_number: orderNumber, qikink_shipping: 1, gateway: 'Prepaid', total_order_value: Number(order.totalValue), line_items: lines, shipping_address: addr.address };
  return { payload, orderNumber };
}

// Test helper: true when every key at every level is one the API documents.
export function unknownFields(payload) {
  const bad = [];
  const check = (obj, allowed, where) => Object.keys(obj).forEach((k) => { if (!allowed.includes(k)) bad.push(`${where}.${k}`); });
  check(payload, ALLOWED_FIELDS.order, 'order');
  check(payload.shipping_address || {}, ALLOWED_FIELDS.address, 'shipping_address');
  (payload.line_items || []).forEach((l, i) => { check(l, ALLOWED_FIELDS.line, `line_items[${i}]`); (l.designs || []).forEach((d, j) => check(d, ALLOWED_FIELDS.design, `line_items[${i}].designs[${j}]`)); });
  return bad;
}

// UNVERIFIED: the docs show a `pagination` object in the list response but not its fields. This is the ONLY place that
// guesses: it follows total_pages / last_page when present, and otherwise stops when a page has fewer than 10 rows (the
// documented page size). Replace it once a real response has been seen.
export function hasMorePages(body, page) {
  const pg = body?.pagination || {};
  const last = Number(pg.total_pages ?? pg.last_page ?? 0);
  if (last > 0) return page < last;
  return (body?.data || []).length >= 10;
}

// UNVERIFIED wording of an "insufficient wallet balance" error; override with the `fundsPattern` option / QIKINK_FUNDS_ERROR_PATTERN.
export const DEFAULT_FUNDS_PATTERN = /(insufficient|wallet|balance|lows*fund)/i;

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRateLimitBody = (b) => /rate limit/i.test(String(b?.error || b?.message || ''));

export class QikinkAdapter extends PODProvider {
  constructor(id = 'qikink', { clientId, clientSecret, env = 'sandbox', fetch: f, now = () => Date.now(), sleep = realSleep, fundsPattern = DEFAULT_FUNDS_PATTERN } = {}) {
    super(id);
    this.fundsPattern = fundsPattern;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.env = env === 'live' ? 'live' : 'sandbox';
    this.base = QIKINK_BASES[this.env];
    this.fetch = f || ((...a) => globalThis.fetch(...a));
    this.now = now;
    this.sleep = sleep;
    this.token = null;        // { value, expiresAt }: the ONE valid token
    this.tokenPromise = null; // single-flight refresh
    this.stamps = [];
  }

  // At most QIKINK_RATE_LIMIT.max requests in any rolling minute: wait for room rather than fail.
  async throttle() {
    const { max, perMs } = QIKINK_RATE_LIMIT;
    for (;;) {
      const t = this.now();
      this.stamps = this.stamps.filter((s) => t - s < perMs);
      if (this.stamps.length < max) { this.stamps.push(t); return; }
      await this.sleep(perMs - (t - this.stamps[0]) + 1);
    }
  }

  async fetchToken() {
    { // names only, never values
      const bad = [!this.clientId && 'QIKINK_CLIENT_ID', !this.clientSecret && 'QIKINK_CLIENT_SECRET'].filter(Boolean);
      if (bad.length) throw Object.assign(new Error(`qikink-credentials-missing: ${bad.join(' and ')} blank`), { retryable: false });
    }
    await this.throttle();
    let res;
    try {
      res = await this.fetch(`${this.base}${QIKINK_PATHS.token}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ClientId: this.clientId, client_secret: this.clientSecret }).toString() });
    } catch { throw Object.assign(new Error('qikink-token-network'), { retryable: true }); }
    const body = await res.json().catch(() => ({}));
    // keep Qikink's own wording (e.g. "Invalid client_id or client_secret") so a failed sign-in can be explained; it never contains our secret
    if (!res.ok) throw Object.assign(new Error(`qikink-token-failed: ${String(body?.error || `HTTP ${res.status}`).slice(0, 120)}`), { retryable: res.status >= 500 || res.status === 429 });
    if (!body.Accesstoken) throw Object.assign(new Error('qikink-token-missing'), { retryable: false });
    const ttl = Number(body.expires_in) > 0 ? Number(body.expires_in) * 1000 : 3600 * 1000;
    this.token = { value: body.Accesstoken, expiresAt: this.now() + ttl };
    return this.token.value;
  }

  // Never two token requests at once: a second one would invalidate the first.
  async accessToken({ force = false } = {}) {
    if (!force && this.token && this.token.expiresAt - 60_000 > this.now()) return this.token.value;
    if (!this.tokenPromise) this.tokenPromise = this.fetchToken().finally(() => { this.tokenPromise = null; });
    return this.tokenPromise;
  }

  /**
   * One authenticated call. Waits for the rate limiter; refreshes the token once on 401; backs off and retries on
   * rate-limit responses (the request was not processed). With retryServerErrors (reads only) 5xx/network errors are
   * retried too; a create is NEVER blindly re-sent after an ambiguous failure.
   */
  async request(path, init = {}, { retryServerErrors = false, retries = 3 } = {}) {
    let wait = 1000; let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      let token;
      try { token = await this.accessToken(); } catch (e) { return { ok: false, error: e.message, retryable: e.retryable !== false }; }
      await this.throttle();
      let res = null; let body = {};
      try {
        res = await this.fetch(`${this.base}${path}`, { ...init, headers: { ...(init.headers || {}), 'Content-Type': 'application/json', ClientId: this.clientId, Accesstoken: token } });
        body = await res.json().catch(() => ({}));
      } catch { res = null; }
      if (res && (res.status === 401 || res.status === 403) && !refreshed) { refreshed = true; this.token = null; try { await this.accessToken({ force: true }); } catch (e) { return { ok: false, error: e.message, retryable: e.retryable !== false }; } continue; }
      if (res && res.status === 401) return { ok: false, error: 'qikink-auth-failed', retryable: false };
      if (res && res.ok && !isRateLimitBody(body)) return { ok: true, status: res.status, body };
      const limited = (res && res.status === 429) || isRateLimitBody(body);
      const server = !res || res.status >= 500;
      if (limited || (server && retryServerErrors)) {
        if (attempt >= retries) return { ok: false, error: limited ? 'qikink-rate-limited' : (res ? `qikink-http-${res.status}` : 'timeout'), retryable: true };
        const ra = res && Number(res.headers?.get?.('retry-after')) * 1000;
        await this.sleep(ra > 0 ? ra : wait); wait *= 2; continue;
      }
      if (server) return { ok: false, error: res ? `qikink-http-${res.status}` : 'timeout', retryable: true, ambiguous: true };
      return { ok: false, status: res.status, error: String(body?.error || `qikink-http-${res.status}`), retryable: false, body };
    }
  }

  async getCapabilities(country) {
    if (String(country || '').toUpperCase() !== 'IN') return { ok: false, unsupported: true, error: 'unsupported:country', retryable: false };
    return { ok: true, products: ['tshirt', 'mug', 'notebook', 'poster'], note: 'India only; SKUs come from the admin mapping' };
  }
  // The docs have no quote, shipping-rate or serviceability endpoint: costs and shipping are admin-configured.
  async getQuote() { return { ...unsupported('getQuote'), source: 'configured' }; }
  // No cancel endpoint is documented: an admin cancels in the Qikink dashboard and polling picks up "Cancelled".
  async cancelOrder() { return unsupported('cancelOrder'); }
  // No webhooks are documented: status arrives by polling (see getOrderStatuses and the cron endpoint).
  async verifyWebhook() { return unsupported('verifyWebhook'); }

  // order: the fulfilment payload built by the engine. order.attempt > 1 means an earlier attempt may have reached Qikink.
  async submitOrder(order) {
    const cod = refuseCod(order); if (cod) return cod;
    const built = buildOrderPayload({ ...order, orderId: order.orderId });
    if (built.error) return { ok: false, error: built.error, retryable: false };
    const { payload, orderNumber } = built;

    // After an ambiguous failure, look the order up by its reference number before creating anything again.
    if ((order.attempt || 1) > 1) {
      const found = await this.findByReference(orderNumber);
      if (found.ok && found.order) return { ok: true, providerOrderId: String(found.order.order_id), orderNumber, duplicate: true };
      // The list API does not work in the sandbox; on live a failed lookup must not risk a duplicate.
      if (!found.ok && this.env === 'live') return { ok: false, error: 'lookup-failed', retryable: true };
    }

    const res = await this.request(QIKINK_PATHS.create, { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      const id = res.body?.order_id;
      if (id === undefined || id === null) return { ok: false, error: 'qikink-no-order-id', retryable: true, ambiguous: true };
      return { ok: true, providerOrderId: String(id), orderNumber };
    }
    // Qikink is prepaid by wallet credit. The docs do not give the exact error text for an empty wallet, so this pattern is a
    // configurable GUESS (unverified); any other 400 stays a permanent failure.
    if (!res.retryable && this.fundsPattern.test(String(res.error || ''))) return { ok: false, error: res.error, retryable: false, heldFunds: true, orderNumber };
    return { ok: false, error: res.error, retryable: res.retryable, orderNumber };
  }

  async list(params) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`${QIKINK_PATHS.list}?${qs}`, { method: 'GET' }, { retryServerErrors: true });
  }

  async findByReference(orderNumber) {
    const res = await this.list({ order_reference_no: orderNumber });
    if (!res.ok) return res;
    // Qikink stores the number prefixed with our ClientId
    const hit = (res.body?.data || []).find((o) => [orderNumber, `${this.clientId}_${orderNumber}`].includes(String(o.number || '')));
    return { ok: true, order: hit || null };
  }

  static normalise(o) {
    const mapped = mapQikinkStatus(o.status);
    const s = o.shipping || {};
    const tracking = (s.awb || s.tracking_link) ? { carrier: s.courier_provider_name || '', number: s.awb || '', url: s.tracking_link || null } : null;
    return { ...mapped, tracking, deliveredOn: o.delivered_on || null };
  }

  async getOrderStatus(providerOrderId) {
    const res = await this.list({ id: String(providerOrderId) });
    if (!res.ok) return res;
    const o = (res.body?.data || []).find((x) => String(x.order_id) === String(providerOrderId));
    return o ? { ok: true, ...QikinkAdapter.normalise(o) } : { ok: false, error: 'not-found', retryable: false };
  }

  // Batched polling: `ids` (comma-separated), 10 per page, following the pagination. -> { ok, orders: { [id]: status } }
  async getOrderStatuses(ids) {
    const orders = {};
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      for (let page = 1; ; page++) {
        const res = await this.list({ ids: chunk.join(','), page_no: String(page) });
        if (!res.ok) return res;
        for (const o of res.body?.data || []) orders[String(o.order_id)] = QikinkAdapter.normalise(o);
        if (!hasMorePages(res.body, page)) break;
      }
    }
    return { ok: true, orders };
  }
}
