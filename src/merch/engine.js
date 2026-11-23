// The merchandise business logic: quotes, checkout, payment confirmation, fulfilment, provider
// webhooks, refunds, commission and admin changes. It is written against small interfaces so the SAME
// code runs in Cloudflare Pages Functions (Firestore REST + real gateways), in Node tests (in-memory
// fakes) and in `npm run dev:mock` (browser mock database + simulated payments):
//
//   ctx.db        { get(path), list(coll), query(coll, field, value), create(coll, id, data), patch(path, data, { ifUpdateTime }) }
//   ctx.env       server secrets (never reach the browser)
//   ctx.who       { uid, email, emailVerified } from a verified Firebase ID token
//   ctx.gateways  { create(order, price), verify(order, body), refund(order, amount) }
//   ctx.providerFor(providerDoc) -> adapter
//   ctx.now() / ctx.id()
// Every handler returns { status, body } and never throws for expected failures.
import { COLL, STATES, TRANSITIONS, PAID_STATES, QUOTE_TTL_MS, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER, MAX_FULFILMENT_ATTEMPTS, COLLECTION_IDS, NAME_ALGORITHM_VERSION } from './constants.js';
import { buildDesign, bloodGroupSlug } from './designs.js';
import { mergeProducts, findVariantOptions, variantId } from './catalog.js';
import { checkAvailability, routeProvider, validateAddress, normaliseAddress } from './availability.js';
import { computeQuote } from './quoteMath.js';
import { computeOrderCommission, reversalAmount } from './commission.js';
import { PROVIDER_STATUS_TO_STATE } from './providers/base.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { resolveGateway, GATEWAY_OVERRIDES } from '../data/gatewayCurrencies.js';

const ok = (body = {}) => ({ status: 200, body });
const fail = (status, code, extra = {}) => ({ status, body: { error: code, ...extra } });
const ms = (t) => (t == null ? 0 : new Date(t).getTime());
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- config loading -------------------------------------------------------------------------------

export async function loadConfig(db) {
  const [settings, countries, providers, products, routes] = await Promise.all([
    db.get(`${COLL.settings}/global`), db.list(COLL.countries), db.list(COLL.providers), db.list(COLL.products), db.list(COLL.routes)
  ]);
  return {
    settings: settings?.data || { enabled: false },
    countries: countries.map((c) => ({ ...c, countryCode: c.countryCode })),
    providers, routes,
    products: mergeProducts(products)
  };
}

const countryOf = (cfg, cc) => cfg.countries.find((c) => c.countryCode === String(cc).toUpperCase());

// ---- audit ----------------------------------------------------------------------------------------

export async function audit(ctx, action, target, detail = {}) {
  const id = ctx.id();
  await ctx.db.create(COLL.auditLogs, id, { id, action, target, actor: ctx.who?.email || 'system', detail, at: ctx.now() });
}

// ---- catalogue (what the destination can buy) -----------------------------------------------------

export async function handleCatalogue(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  const cfg = await loadConfig(ctx.db);
  const cc = String(body?.country || '').toUpperCase();
  const country = countryOf(cfg, cc);
  const globalOn = cfg.settings.enabled === true;
  const out = { globalEnabled: globalOn, message: cfg.settings.message || '', country: cc, countryEnabled: false, collections: {}, products: [] };
  if (!globalOn || !country || country.enabled !== true) return ok(out);
  out.countryEnabled = true;
  out.currency = country.currency;
  out.taxIncluded = country.taxIncluded !== false;
  out.taxPercent = country.taxPercent || 0;
  out.shipping = country.shipping || { flat: 0 };
  for (const col of COLLECTION_IDS) out.collections[col] = country.collections?.[col] === true;
  out.products = Object.values(cfg.products)
    .filter((p) => COLLECTION_IDS.some((col) => out.collections[col] && checkAvailability({ settings: cfg.settings, country, product: p, collection: col }).ok))
    .map((p) => ({
      id: p.id, kind: p.kind, sizes: p.sizes, colors: p.colors, placements: p.placements, price: country.prices[p.id],
      collections: p.collections.filter((col) => out.collections[col] && checkAvailability({ settings: cfg.settings, country, product: p, collection: col }).ok)
    }));
  return ok(out);
}

// ---- quote ------------------------------------------------------------------------------------------

const ERRORS_BLOCKED = { 'global-off': 'merch-off', 'country-off': 'merch-country-off', 'collection-off': 'merch-collection-off', 'product-off': 'merch-product-off', 'product-collection': 'merch-product-off', 'no-pricing': 'merch-product-off' };

// Validates every line, routes one provider for the whole order, recomputes the price. Used by quote AND
// re-run at checkout and before fulfilment, so the answer is never taken from the browser.
export async function priceItems(ctx, cfg, rawItems, address, { skipDesign = false } = {}) {
  const addr = validateAddress(address);
  if (!addr.ok) return fail(400, 'address-incomplete', { missing: addr.missing });
  const shipTo = normaliseAddress(address);
  const country = countryOf(cfg, shipTo.country);
  if (!cfg.settings || cfg.settings.enabled !== true) return fail(409, 'merch-off', { message: cfg.settings?.message || '' });
  if (!country || country.enabled !== true) return fail(409, 'merch-country-off');
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_ITEMS_PER_ORDER) return fail(400, 'bad-items');

  const items = [];
  let providerId = null;
  let backups = [];
  for (const raw of rawItems) {
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) return fail(400, 'bad-quantity');
    const product = cfg.products[raw.productId];
    if (!product) return fail(400, 'unknown-product');
    const collection = raw.collection;
    if (!COLLECTION_IDS.includes(collection)) return fail(400, 'unknown-collection');
    const avail = checkAvailability({ settings: cfg.settings, country, product, collection });
    if (!avail.ok) return fail(409, ERRORS_BLOCKED[avail.reason] || 'merch-unavailable', { reason: avail.reason });
    const opts = findVariantOptions(product, raw);
    if (!opts.colorOk || !opts.sizeOk) return fail(400, 'bad-variant');
    const built = skipDesign ? { design: raw.design } : buildDesign(collection, raw.design || {});
    if (built.error) return fail(400, built.error);

    const vdoc = (await ctx.db.get(`${COLL.variants}/${variantId(product.id, raw.color, raw.size)}`))?.data;
    const route = cfg.routes.find((r) => r.countryCode === country.countryCode && r.productId === product.id);
    const routed = routeProvider({ providers: cfg.providers, country, product, variantMap: vdoc, route, exclude: providerId ? [] : [] });
    if (!routed.provider) return fail(409, 'no-provider', { rejected: routed.rejected });
    if (providerId && routed.provider.id !== providerId) {
      // One provider per order: try the first line's provider for this line, otherwise refuse
      const same = routeProvider({ providers: cfg.providers, country, product, variantMap: vdoc, route: { primary: providerId } });
      if (!same.provider || same.provider.id !== providerId) return fail(409, 'mixed-providers');
    } else if (!providerId) { providerId = routed.provider.id; backups = routed.backup; }
    items.push({
      productId: product.id, collection, color: raw.color, size: raw.size, qty, design: built.design,
      providerSku: vdoc?.providerSkus?.[providerId] || null, unitPrice: Number(country.prices[product.id])
    });
  }
  const quote = computeQuote({ lines: items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })), country });
  return { ok: true, items, quote, providerId, backups, country, shipTo };
}

const publicQuote = (q) => ({ currency: q.currency, lines: q.lines, items: q.items, discount: q.discount, shipping: q.shipping, tax: q.tax, taxIncluded: q.taxIncluded, total: q.total });

export async function handleQuote(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  const cfg = await loadConfig(ctx.db);
  const priced = await priceItems(ctx, cfg, body?.items, body?.address);
  if (!priced.ok) return priced;
  const id = ctx.id();
  const now = ctx.now();
  await ctx.db.create(COLL.quotes, id, {
    id, uid: ctx.who.uid, status: 'open', items: priced.items, address: priced.shipTo, countryCode: priced.shipTo.country,
    providerId: priced.providerId, backups: priced.backups, totals: priced.quote, createdAt: now, expiresAt: new Date(ms(now) + QUOTE_TTL_MS)
  });
  return ok({ quoteId: id, expiresAt: new Date(ms(now) + QUOTE_TTL_MS).toISOString(), quote: publicQuote(priced.quote), providerId: priced.providerId });
}

// ---- checkout ---------------------------------------------------------------------------------------

async function referralSnapshot(db, uid) {
  const user = (await db.get(`users/${uid}`))?.data;
  const claimed = String(user?.referralCodeUsed || user?.referralCode || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!claimed) return null;
  const ref = (await db.get(`referralCodes/${claimed}`))?.data;
  if (!ref || ref.active !== true) return null;
  return { code: claimed, ambassadorEmail: ref.ambassadorEmail || null, ambassadorId: ref.ambassadorId || null };
}

export async function handleCheckout(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  const found = await ctx.db.get(`${COLL.quotes}/${body?.quoteId}`);
  const quote = found?.data;
  if (!quote || quote.uid !== ctx.who.uid) return fail(404, 'quote-not-found');
  if (quote.status !== 'open') return fail(409, 'quote-used');
  if (ms(quote.expiresAt) < ms(ctx.now())) return fail(409, 'quote-expired');

  // Revalidate everything immediately before payment (switches, provider, prices) from the stored lines.
  const cfg = await loadConfig(ctx.db);
  const priced = await priceItems(ctx, cfg, quote.items.map((i) => ({ ...i, design: i.design })), quote.address, { skipDesign: true });
  if (!priced.ok) return priced;
  if (priced.quote.total !== quote.totals.total || priced.providerId !== quote.providerId) return fail(409, 'quote-changed');

  const country = priced.country;
  const flag = (await ctx.db.get('paymentSettings/razorpay'))?.data;
  const override = GATEWAY_OVERRIDES.includes(country.gatewayOverride) ? country.gatewayOverride : 'auto';
  const choice = resolveGateway({ currency: country.currency, override, internationalEnabled: flag?.internationalEnabled === true });
  if (!choice.gateway) return fail(409, 'gateway-unavailable', { reason: choice.reason });

  const referral = await referralSnapshot(ctx.db, ctx.who.uid);
  const orderId = ctx.id();
  // Lock the snapshot: price, shipping, provider, destination, design and algorithm versions.
  const order = {
    id: orderId, uid: ctx.who.uid, email: ctx.who.email || '', status: 'payment_pending', quoteId: quote.id,
    items: priced.items.map((i, n) => ({ ...i, index: n, artwork: i.collection === 'blood_group' ? bloodArtwork(i.design.bloodGroup) : null })),
    address: priced.shipTo, countryCode: priced.shipTo.country, currency: country.currency,
    totals: priced.quote, amount: priced.quote.total, providerId: priced.providerId, backups: priced.backups,
    gateway: choice.gateway, referral, algorithmVersion: NAME_ALGORITHM_VERSION,
    timeline: [{ state: 'payment_pending', at: ctx.now() }], refundedAmount: 0, createdAt: ctx.now()
  };
  const gw = await ctx.gateways.create({ ...order, orderId }, choice);
  if (gw.error) return fail(gw.status || 502, gw.error);
  order.gatewayOrderId = gw.orderId;
  await ctx.db.create(COLL.orders, orderId, order);
  await ctx.db.patch(`${COLL.quotes}/${quote.id}`, { status: 'used', orderId }, { ifUpdateTime: found.updateTime }).catch(() => {});
  const needsArtwork = order.items.filter((i) => !i.artwork).map((i) => i.index);
  return ok({ orderId, gateway: choice.gateway, gatewayOrder: gw.client, total: order.amount, currency: order.currency, needsArtwork });
}

// Approved blood-group artwork is a fixed, versioned, checksummed file (never a customer upload).
function bloodArtwork(code) {
  const a = BLOOD_ASSETS[bloodGroupSlug(code)];
  return a ? { kind: 'static', path: a.path, sha256: a.sha256, version: a.version, width: a.width, height: a.height } : null;
}

// The browser renders the personalised print PNG from the SAME design definition, uploads it, and tells
// us its checksum. The design itself (symbols) was already verified server-side; the file is what the
// customer saw in the preview. Allowed only while the order has not been submitted to a provider.
export async function handleAttachArtwork(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  const found = await ctx.db.get(`${COLL.orders}/${body?.orderId}`);
  const order = found?.data;
  if (!order || order.uid !== ctx.who.uid) return fail(404, 'order-not-found');
  if (!['payment_pending', 'paid', 'fulfillment_pending', 'exception'].includes(order.status)) return fail(409, 'order-locked');
  const items = clone(order.items);
  for (const a of body.items || []) {
    const it = items[a.index];
    if (!it || it.collection !== 'name_elements') return fail(400, 'bad-artwork-index');
    if (!/^[a-f0-9]{64}$/.test(String(a.sha256 || ''))) return fail(400, 'bad-checksum');
    if (!a.path || !String(a.path).startsWith(`merch/print/${ctx.who.uid}/${order.id}/`)) return fail(400, 'bad-artwork-path');
    it.artwork = { kind: 'upload', path: a.path, sha256: a.sha256, version: it.design.templateVersion, width: Number(a.width) || null, height: Number(a.height) || null };
  }
  await ctx.db.patch(`${COLL.orders}/${order.id}`, { items });
  return ok({ ok: true });
}

// ---- payment confirmation (exactly once) ------------------------------------------------------------

const nextTimeline = (ctx, order, state, extra = {}) => [...(order.timeline || []), { state, at: ctx.now(), ...extra }];

// payment_pending -> paid, claimed with an updateTime precondition so two verifies/webhooks racing give one winner.
export async function markPaid(ctx, orderId, { transactionId, via }) {
  const found = await ctx.db.get(`${COLL.orders}/${orderId}`);
  if (!found) return { error: 'order-not-found' };
  const order = found.data;
  if (order.status !== 'payment_pending') return { already: true, order };
  try {
    await ctx.db.patch(`${COLL.orders}/${orderId}`, {
      status: 'paid', transactionId, paidVia: via, paidAt: ctx.now(), timeline: nextTimeline(ctx, order, 'paid')
    }, { ifUpdateTime: found.updateTime });
  } catch { return { already: true, order }; }

  // One fulfilment job per order: the document id is the order id, so a replay cannot create a second.
  try {
    await ctx.db.create(COLL.fulfillments, orderId, {
      id: orderId, orderId, uid: order.uid, providerId: order.providerId, status: 'pending', attempts: 0,
      idempotencyKey: `nv-${orderId}`, createdAt: ctx.now(), nextRetryAt: ctx.now()
    });
  } catch { /* already exists */ }
  await createCommission(ctx, { ...order, status: 'paid' });
  return { order: { ...order, status: 'paid' }, newlyPaid: true };
}

async function createCommission(ctx, order) {
  if (!order.referral?.ambassadorEmail) return;
  const policy = (await ctx.db.get(`${COLL.settings}/commission`))?.data;
  const lines = order.items.map((i) => {
    const line = order.totals.lines[i.index];
    const share = order.totals.items > 0 ? line.lineTotal / order.totals.items : 0;
    const margin = order.totals.estimatedMargin * share;
    return { productId: i.productId, collection: i.collection, qty: i.qty, lineMargin: margin };
  });
  const calc = computeOrderCommission(policy, { currency: order.currency, countryCode: order.countryCode, lines });
  if (!(calc.amount > 0)) return;
  // No personal data here: ambassadors may read their own commission rows, never the order, address or blood group.
  try {
    await ctx.db.create(COLL.commissions, order.id, {
      id: order.id, orderId: order.id, ambassadorEmail: order.referral.ambassadorEmail, referralCode: order.referral.code,
      currency: order.currency, amount: calc.amount, reversedAmount: 0, status: 'pending', createdAt: ctx.now()
    });
  } catch { /* already created */ }
}

export async function handleVerify(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  const found = await ctx.db.get(`${COLL.orders}/${body?.orderId}`);
  const order = found?.data;
  if (!order || order.uid !== ctx.who.uid) return fail(404, 'order-not-found');
  if (order.status !== 'payment_pending') return ok({ ok: true, already: true });
  if (order.items.some((i) => i.collection === 'name_elements' && !i.artwork)) return fail(409, 'artwork-missing');
  const res = await ctx.gateways.verify({ ...order, orderId: order.gatewayOrderId, uid: order.uid }, body.proof || {});
  if (res.error) return fail(res.status || 400, res.error);
  const paid = await markPaid(ctx, order.id, { transactionId: res.transactionId, via: 'verify' });
  if (paid.error) return fail(404, paid.error);
  if (paid.newlyPaid) await runFulfilment(ctx, order.id);
  return ok({ ok: true });
}

// Razorpay webhook: a signed server-to-server confirmation. Replays (same event id) are acknowledged and ignored.
export async function handlePaymentWebhook(ctx, { eventId, event }) {
  if (!eventId) return fail(400, 'no-event-id');
  try { await ctx.db.create(COLL.webhookEvents, `pay_${eventId}`, { id: `pay_${eventId}`, source: 'payment', type: event?.event || '', at: ctx.now() }); }
  catch { return ok({ ok: true, duplicate: true }); }
  if (event?.event !== 'payment.captured') return ok({ ok: true, ignored: true });
  const payment = event.payload?.payment?.entity;
  const [order] = payment?.order_id ? await ctx.db.query(COLL.orders, 'gatewayOrderId', payment.order_id) : [];
  if (!order) return ok({ ok: true, ignored: true });
  const res = await ctx.gateways.checkCaptured(order, payment);
  if (res.error) return fail(400, res.error);
  const paid = await markPaid(ctx, order.id, { transactionId: payment.id, via: 'webhook' });
  if (paid.newlyPaid) await runFulfilment(ctx, order.id);
  return ok({ ok: true, duplicate: !paid.newlyPaid });
}

// ---- fulfilment ---------------------------------------------------------------------------------------

const backoffMs = (attempts) => Math.min(60, 2 ** attempts) * 60 * 1000;

async function setState(ctx, orderId, from, to, patch = {}, extra = {}) {
  const found = await ctx.db.get(`${COLL.orders}/${orderId}`);
  const order = found?.data;
  if (!order) return null;
  if (order.status === to) return order;
  if (from && order.status !== from) return order;
  if (!(TRANSITIONS[order.status] || []).includes(to)) return order;
  try {
    await ctx.db.patch(`${COLL.orders}/${orderId}`, { status: to, ...patch, timeline: nextTimeline(ctx, order, to, extra) }, { ifUpdateTime: found.updateTime });
  } catch { return (await ctx.db.get(`${COLL.orders}/${orderId}`))?.data || order; }
  return { ...order, status: to, ...patch };
}

async function raiseException(ctx, orderId, reason) {
  await setState(ctx, orderId, null, 'exception', { exceptionReason: reason }, { reason });
  await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: 'exception', lastError: reason });
  // Alert: paid but not with a provider. The admin Orders view lists these first.
  await audit({ ...ctx, who: null }, 'alert.paid-not-submitted', orderId, { reason });
}

/**
 * Send a paid order to its provider. Safe to call repeatedly: the idempotency key is fixed per order, the
 * provider adapter must honour it, and a submitted order is never sent again.
 */
export async function runFulfilment(ctx, orderId, { force = false } = {}) {
  const ofound = await ctx.db.get(`${COLL.orders}/${orderId}`);
  const order = ofound?.data;
  const ffound = await ctx.db.get(`${COLL.fulfillments}/${orderId}`);
  if (!order || !ffound) return { error: 'not-found' };
  const ff = ffound.data;
  if (['submitted', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status) || ff.providerOrderId) return { skipped: order.status };
  if (!['paid', 'fulfillment_pending', 'exception'].includes(order.status)) return { skipped: order.status };
  if (order.status === 'exception' && !force) return { skipped: 'exception' };
  if (!force && ms(ff.nextRetryAt) > ms(ctx.now())) return { skipped: 'not-due' };

  const missing = order.items.find((i) => !i.artwork);
  if (missing) { await raiseException(ctx, orderId, 'artwork-missing'); return { exception: 'artwork-missing' }; }

  const cfgProviders = await ctx.db.list(COLL.providers);
  const pdoc = cfgProviders.find((p) => p.id === order.providerId);
  // Disabled provider: no new routing. The paid order stays manageable (admin can reroute or refund).
  if (!pdoc || pdoc.active !== true) { await raiseException(ctx, orderId, 'provider-disabled'); return { exception: 'provider-disabled' }; }
  const adapter = ctx.providerFor(pdoc);
  if (!adapter) { await raiseException(ctx, orderId, 'no-adapter'); return { exception: 'no-adapter' }; }

  await setState(ctx, orderId, null, 'fulfillment_pending');
  const attempts = (ff.attempts || 0) + 1;
  const payload = {
    idempotencyKey: ff.idempotencyKey, orderId, address: order.address, currency: order.currency,
    items: await Promise.all(order.items.map(async (i) => ({
      index: i.index, productId: i.productId, color: i.color, size: i.size, qty: i.qty, providerSku: i.providerSku, placement: 'default',
      designUrl: await ctx.artworkUrl(order, i), designSha256: i.artwork.sha256
    })))
  };
  let res;
  try { res = await adapter.submitOrder(payload); } catch (e) { res = { ok: false, error: 'exception', retryable: true }; }

  if (res.ok) {
    await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: 'submitted', providerOrderId: res.providerOrderId, attempts, submittedAt: ctx.now(), lastError: null });
    await setState(ctx, orderId, null, 'submitted', { providerOrderId: res.providerOrderId });
    return { submitted: true, providerOrderId: res.providerOrderId };
  }
  if (res.retryable && attempts < MAX_FULFILMENT_ATTEMPTS) {
    await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: 'pending', attempts, lastError: res.error, nextRetryAt: new Date(ms(ctx.now()) + backoffMs(attempts)) });
    return { queued: true, attempts, error: res.error };
  }
  await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { attempts });
  await raiseException(ctx, orderId, res.error || 'provider-error');
  return { exception: res.error || 'provider-error' };
}

// Retry every queued job that is due (called by an admin action or a scheduler).
export async function retryDue(ctx) {
  const queued = await ctx.db.query(COLL.fulfillments, 'status', 'pending');
  const out = [];
  for (const ff of queued) if (ms(ff.nextRetryAt) <= ms(ctx.now())) out.push({ orderId: ff.orderId, ...(await runFulfilment(ctx, ff.orderId)) });
  return out;
}

// ---- provider status / webhooks ----------------------------------------------------------------------

export async function applyProviderStatus(ctx, orderId, { status, tracking }) {
  const target = PROVIDER_STATUS_TO_STATE[status];
  if (!target) return { ignored: 'unknown-status' };
  const order = (await ctx.db.get(`${COLL.orders}/${orderId}`))?.data;
  if (!order) return { ignored: 'no-order' };
  const rank = (s) => ['submitted', 'in_production', 'shipped', 'delivered'].indexOf(s);
  if (target === 'exception' || target === 'cancelled') {
    const res = await setState(ctx, orderId, null, target, { providerStatus: status }, { providerStatus: status });
    return { state: res?.status };
  }
  if (rank(target) <= rank(order.status)) return { ignored: 'not-forward' };
  const patch = { providerStatus: status };
  if (tracking) patch.tracking = tracking;
  if (target === 'delivered') patch.deliveredAt = ctx.now();
  const res = await setState(ctx, orderId, null, target, patch, { providerStatus: status });
  if (tracking) await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { tracking, status: target });
  return { state: res?.status };
}

export async function handleProviderWebhook(ctx, providerId, headers, rawBody) {
  const pdoc = (await ctx.db.list(COLL.providers)).find((p) => p.id === providerId);
  const adapter = pdoc && ctx.providerFor(pdoc);
  if (!adapter) return fail(404, 'unknown-provider');
  const v = await adapter.verifyWebhook(headers, rawBody);
  if (!v.ok) return fail(v.unsupported ? 501 : 401, 'bad-webhook');
  const e = v.event;
  try { await ctx.db.create(COLL.webhookEvents, `${providerId}_${e.id}`, { id: `${providerId}_${e.id}`, source: providerId, at: ctx.now() }); }
  catch { return ok({ ok: true, duplicate: true }); }
  const [ff] = await ctx.db.query(COLL.fulfillments, 'providerOrderId', e.providerOrderId);
  if (!ff) return ok({ ok: true, ignored: true });
  return ok({ ok: true, ...(await applyProviderStatus(ctx, ff.orderId, e)) });
}

// Poll providers for orders whose webhooks were missed or delayed.
export async function syncTracking(ctx) {
  const out = [];
  for (const st of ['submitted', 'in_production', 'shipped']) {
    for (const order of await ctx.db.query(COLL.orders, 'status', st)) {
      const ff = (await ctx.db.get(`${COLL.fulfillments}/${order.id}`))?.data;
      const pdoc = (await ctx.db.list(COLL.providers)).find((p) => p.id === order.providerId);
      const adapter = pdoc && ctx.providerFor(pdoc);
      if (!ff?.providerOrderId || !adapter) continue;
      const s = await adapter.getOrderStatus(ff.providerOrderId);
      if (s.ok) out.push({ orderId: order.id, ...(await applyProviderStatus(ctx, order.id, s)) });
    }
  }
  return out;
}

// ---- refunds, cancellations, commission -------------------------------------------------------------

export async function refundOrder(ctx, orderId, { amount, reason } = {}) {
  const found = await ctx.db.get(`${COLL.orders}/${orderId}`);
  const order = found?.data;
  if (!order) return fail(404, 'order-not-found');
  if (!order.transactionId) return fail(409, 'not-paid');
  const remaining = Math.round((order.amount - (order.refundedAmount || 0)) * 100) / 100;
  const want = amount == null ? remaining : Math.round(Number(amount) * 100) / 100;
  if (!(want > 0) || want > remaining) return fail(400, 'bad-refund-amount', { remaining });
  const res = await ctx.gateways.refund(order, want);
  if (res.error) return fail(res.status || 502, res.error);
  const refunded = Math.round(((order.refundedAmount || 0) + want) * 100) / 100;
  const full = refunded >= order.amount;
  let state = order.status;
  if (full && order.status !== 'refunded') {
    // Best effort: stop production if the provider has not shipped yet
    const ff = (await ctx.db.get(`${COLL.fulfillments}/${orderId}`))?.data;
    if (ff?.providerOrderId && ['submitted', 'in_production'].includes(order.status)) {
      const pdoc = (await ctx.db.list(COLL.providers)).find((p) => p.id === order.providerId);
      const adapter = pdoc && ctx.providerFor(pdoc);
      const c = adapter ? await adapter.cancelOrder(ff.providerOrderId) : null;
      await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { cancelResult: c ? (c.ok ? 'cancelled' : c.error) : 'no-adapter' });
    }
    state = 'refunded';
  }
  await ctx.db.patch(`${COLL.orders}/${orderId}`, {
    refundedAmount: refunded, status: state, timeline: [...(order.timeline || []), { state: full ? 'refunded' : 'partial_refund', at: ctx.now(), amount: want, reason: reason || '' }],
    ...(full ? { refundedAt: ctx.now() } : {})
  });
  const c = (await ctx.db.get(`${COLL.commissions}/${orderId}`))?.data;
  if (c) {
    const rev = reversalAmount({ commissionAmount: c.amount, alreadyReversed: c.reversedAmount, refundedAmount: refunded, orderTotal: order.amount, currency: order.currency });
    const reversedAmount = Math.round((c.reversedAmount + rev) * 100) / 100;
    await ctx.db.patch(`${COLL.commissions}/${orderId}`, { reversedAmount, status: reversedAmount >= c.amount ? 'reversed' : c.status });
  }
  return ok({ ok: true, refunded, status: state });
}

export async function sweepCommissions(ctx) {
  const policy = (await ctx.db.get(`${COLL.settings}/commission`))?.data;
  const hold = Number(policy?.holdDays ?? 14);
  const out = [];
  for (const c of await ctx.db.query(COLL.commissions, 'status', 'pending')) {
    const order = (await ctx.db.get(`${COLL.orders}/${c.orderId}`))?.data;
    if (!order || order.status !== 'delivered' || !order.deliveredAt) continue;
    if (ms(order.deliveredAt) + hold * 86400000 > ms(ctx.now())) continue;
    await ctx.db.patch(`${COLL.commissions}/${c.id}`, { status: 'eligible', eligibleAt: ctx.now() });
    out.push(c.id);
  }
  return out;
}

// ---- admin ------------------------------------------------------------------------------------------

export async function requireAdmin(ctx) {
  if (!ctx.who?.email || ctx.who.emailVerified === false) return false;
  return !!(await ctx.db.get(`admins/${ctx.who.email.toLowerCase()}`));
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o && o[k] !== undefined).map((k) => [k, o[k]]));
const bool = (v) => v === true;
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

const ADMIN_ACTIONS = {
  async setGlobal(ctx, b) {
    const patch = { enabled: bool(b.enabled), message: String(b.message || '').slice(0, 300), updatedAt: ctx.now() };
    return { path: `${COLL.settings}/global`, patch };
  },
  async setCountry(ctx, b) {
    const cc = String(b.countryCode || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return { error: 'bad-country' };
    const col = b.collections || {};
    const patch = {
      countryCode: cc, enabled: bool(b.enabled), currency: String(b.currency || '').toUpperCase(),
      taxPercent: num(b.taxPercent) ?? 0, taxIncluded: b.taxIncluded !== false,
      collections: { name_elements: bool(col.name_elements), blood_group: bool(col.blood_group) },
      prices: Object.fromEntries(Object.entries(b.prices || {}).filter(([, v]) => num(v) !== undefined).map(([k, v]) => [k, Number(v)])),
      costs: Object.fromEntries(Object.entries(b.costs || {}).filter(([, v]) => num(v) !== undefined).map(([k, v]) => [k, Number(v)])),
      disabledProducts: Object.fromEntries(Object.entries(b.disabledProducts || {}).filter(([, v]) => v === true)),
      shipping: { flat: num(b.shipping?.flat) ?? 0, freeAbove: num(b.shipping?.freeAbove) ?? 0 },
      paymentFeePercent: num(b.paymentFeePercent) ?? 0,
      providerPrimary: b.providerPrimary || null, providerBackup: b.providerBackup || null,
      gatewayOverride: GATEWAY_OVERRIDES.includes(b.gatewayOverride) ? b.gatewayOverride : 'auto',
      updatedAt: ctx.now()
    };
    if (!patch.currency) return { error: 'currency-required' };
    return { path: `${COLL.countries}/${cc}`, patch };
  },
  async setProvider(ctx, b) {
    if (!/^[a-z0-9_-]{2,30}$/.test(String(b.id || ''))) return { error: 'bad-provider-id' };
    const patch = { id: b.id, name: String(b.name || b.id).slice(0, 60), adapter: ['mock', 'qikink'].includes(b.adapter) ? b.adapter : 'mock', active: bool(b.active), liveEnabled: bool(b.liveEnabled), countries: (b.countries || []).map((c) => String(c).toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)), products: b.products || [], updatedAt: ctx.now() };
    return { path: `${COLL.providers}/${b.id}`, patch };
  },
  async setProduct(ctx, b) {
    if (!/^[a-z0-9_-]{2,30}$/.test(String(b.id || ''))) return { error: 'bad-product-id' };
    const patch = { id: b.id, ...pick(b, ['kind', 'sizes', 'colors', 'placements', 'printArea', 'collections']), enabled: b.enabled !== false, updatedAt: ctx.now() };
    return { path: `${COLL.products}/${b.id}`, patch };
  },
  async setRoute(ctx, b) {
    const cc = String(b.countryCode || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc) || !b.productId) return { error: 'bad-route' };
    const id = `${cc}_${b.productId}`;
    return { path: `${COLL.routes}/${id}`, patch: { id, countryCode: cc, productId: b.productId, primary: b.primary || null, backup: b.backup || null, updatedAt: ctx.now() } };
  },
  async setVariant(ctx, b) {
    const id = variantId(b.productId, b.color, b.size);
    return { path: `${COLL.variants}/${id}`, patch: { id, productId: b.productId, color: b.color, size: b.size, providerSkus: b.providerSkus || {}, enabled: b.enabled !== false, updatedAt: ctx.now() } };
  },
  async setCommissionPolicy(ctx, b) {
    const patch = { enabled: bool(b.enabled), type: b.type === 'fixed' ? 'fixed' : 'percent_margin', value: num(b.value) ?? 0, cap: num(b.cap) ?? 0, holdDays: num(b.holdDays) ?? 14, overrides: b.overrides || {}, updatedAt: ctx.now() };
    return { path: `${COLL.settings}/commission`, patch };
  }
};

export async function handleAdmin(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  if (!(await requireAdmin(ctx))) return fail(403, 'not-admin');
  const action = body?.action;
  const input = body?.data || {};

  if (ADMIN_ACTIONS[action]) {
    const r = await ADMIN_ACTIONS[action](ctx, input);
    if (r.error) return fail(400, r.error);
    const before = (await ctx.db.get(r.path))?.data || null;
    await ctx.db.patch(r.path, r.patch);
    await audit(ctx, `admin.${action}`, r.path, { before, after: clone(r.patch) });
    return ok({ ok: true });
  }
  if (action === 'refund') { const r = await refundOrder(ctx, input.orderId, input); await audit(ctx, 'admin.refund', input.orderId, { amount: input.amount ?? 'full', reason: input.reason || '', result: r.body?.error || 'ok' }); return r; }
  if (action === 'retry') { const r = await runFulfilment(ctx, input.orderId, { force: true }); await audit(ctx, 'admin.retry', input.orderId, r); return ok(r); }
  if (action === 'reroute') {
    const found = await ctx.db.get(`${COLL.orders}/${input.orderId}`);
    const order = found?.data;
    if (!order || !['exception', 'paid', 'fulfillment_pending'].includes(order.status)) return fail(409, 'cannot-reroute');
    const pdoc = (await ctx.db.list(COLL.providers)).find((p) => p.id === input.providerId);
    if (!pdoc || pdoc.active !== true || !(pdoc.countries || []).includes(order.countryCode)) return fail(409, 'provider-not-usable');
    const needsSku = pdoc.adapter !== 'mock';
    const items = [];
    for (const i of order.items) {
      const v = (await ctx.db.get(`${COLL.variants}/${variantId(i.productId, i.color, i.size)}`))?.data;
      if (needsSku && !v?.providerSkus?.[pdoc.id]) return fail(409, 'no-sku-for-provider', { productId: i.productId });
      items.push({ ...i, providerSku: v?.providerSkus?.[pdoc.id] || null });
    }
    await ctx.db.patch(`${COLL.orders}/${order.id}`, { providerId: pdoc.id, items, rerouted: { from: order.providerId, by: ctx.who.email, at: ctx.now() } });
    await ctx.db.patch(`${COLL.fulfillments}/${order.id}`, { providerId: pdoc.id, attempts: 0 });
    await audit(ctx, 'admin.reroute', order.id, { from: order.providerId, to: pdoc.id });
    return ok(await runFulfilment(ctx, order.id, { force: true }));
  }
  if (action === 'retryDue') return ok({ results: await retryDue(ctx) });
  if (action === 'syncTracking') return ok({ results: await syncTracking(ctx) });
  if (action === 'sweepCommissions') { const ids = await sweepCommissions(ctx); await audit(ctx, 'admin.sweepCommissions', 'merch_commissions', { ids }); return ok({ eligible: ids }); }
  if (action === 'commissionStatus') {
    if (!['payable', 'paid'].includes(input.status)) return fail(400, 'bad-status');
    const c = (await ctx.db.get(`${COLL.commissions}/${input.id}`))?.data;
    const allowed = { payable: ['eligible'], paid: ['payable'] }[input.status];
    if (!c || !allowed.includes(c.status)) return fail(409, 'bad-transition');
    await ctx.db.patch(`${COLL.commissions}/${input.id}`, { status: input.status, [`${input.status}At`]: ctx.now() });
    await audit(ctx, 'admin.commissionStatus', input.id, { from: c.status, to: input.status });
    return ok({ ok: true });
  }
  return fail(400, 'unknown-action');
}

// ---- dispatcher -------------------------------------------------------------------------------------

export async function handleMerch(ctx, action, body) {
  switch (action) {
    case 'catalogue': return handleCatalogue(ctx, body);
    case 'quote': return handleQuote(ctx, body);
    case 'checkout': return handleCheckout(ctx, body);
    case 'artwork': return handleAttachArtwork(ctx, body);
    case 'verify': return handleVerify(ctx, body);
    case 'admin': return handleAdmin(ctx, body);
    default: return fail(404, 'unknown-action');
  }
}

export { STATES, PAID_STATES };
