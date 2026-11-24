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
import { buildDesign, bloodGroupSlug, applyTemplate, BLOOD_GROUPS } from './designs.js';
import { SHIPPING_COST_PLACEHOLDER } from './catalog.js';
import { mergeProducts, findVariantOptions, variantId, DEFAULT_PRODUCTS, starterSku, baseCost, colorsFor, isFrameKind, ACRYLIC_STAND } from './catalog.js';
import { checkAvailability, routeProvider, validateAddress, normaliseAddress } from './availability.js';
import { FRAME_IDS, DEFAULT_FRAME, DEFAULT_FRAME_DESIGNS, DEFAULT_INSET_MM, MAX_INSET_MM, artworkInches, minTextMm, MIN_TEXT_MM } from './frames.js';
import { sampleApproved, verificationLevels } from './layout.js';
import { FULL_LAYOUT, normaliseLayout, defaultLayoutFor, effectiveSpec, specProblems, specComplete, sizeReady, readySizes, readiness, designDpi, resolutionStatus, maxScaleForDpi } from './layout.js';
import { computeQuote, lookupBySize, taxRateFor } from './quoteMath.js';
import { computeOrderCommission, reversalAmount } from './commission.js';
import { PROVIDER_STATUS_TO_STATE } from './providers/base.js';
import { findCod, isCod } from './cod.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { resolveGateway, GATEWAY_OVERRIDES } from '../data/gatewayCurrencies.js';
import { uploadFile, checkFileReachable, sweepFiles, fileReport } from './fileOps.js';
import { sha256Bytes } from './storage/stores.js';

const ok = (body = {}) => ({ status: 200, body });
const fail = (status, code, extra = {}) => ({ status, body: { error: code, ...extra } });
const ms = (t) => (t == null ? 0 : new Date(t).getTime());
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- config loading -------------------------------------------------------------------------------

export async function loadConfig(db) {
  const bloodDesigns = (await db.get(`${COLL.settings}/bloodDesigns`))?.data || {};
  const [settings, countries, providers, products, routes, variants] = await Promise.all([
    db.get(`${COLL.settings}/global`), db.list(COLL.countries), db.list(COLL.providers), db.list(COLL.products), db.list(COLL.routes), db.list(COLL.variants)
  ]);
  return {
    settings: settings?.data || { enabled: false },
    countries: countries.map((c) => ({ ...c, countryCode: c.countryCode })),
    providers, routes, bloodDesigns,
    variants: Object.fromEntries(variants.filter((v) => v?.id).map((v) => [v.id, v])),
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
    .map((p) => {
      // only sizes with a verified print area, and within them only the colours that are switched on and priced
      const colorsBySize = {}; const variantPrices = {}; const prices = {};
      const everyone = cfg.settings.visibleTo === 'everyone';
      for (const sz of readySizes(p).filter((s) => !everyone || sampleApproved(p, s))) { // Everyone: only sizes whose physical sample the owner approved
        const cols = colorsFor(p, sz, cfg.variants).filter((c) => lookupBySize(country.prices, p.id, sz, c.id) > 0);
        if (!cols.length) continue;
        colorsBySize[sz] = cols.map(({ id, hex }) => ({ id, hex }));
        for (const c of cols) variantPrices[`${sz}|${c.id}`] = lookupBySize(country.prices, p.id, sz, c.id);
        prices[sz] = variantPrices[`${sz}|${cols[0].id}`];
      }
      const sizes = Object.keys(colorsBySize);
      const stand = p.standSku ? lookupBySize(country.prices, `${p.id}-stand`, undefined) : undefined;
      return {
        id: p.id, kind: p.kind, category: p.category, sizes, colors: p.colors, colorsBySize, placements: p.placements, printSpec: p.printSpec, dpiOverride: p.dpiOverride === true,
        designInsetMm: isFrameKind(p.kind) ? insetFor(p) : undefined, frames: isFrameKind(p.kind) ? { ...DEFAULT_FRAME_DESIGNS, ...(p.frameDesigns || {}) } : undefined,
        price: prices[sizes[0]], prices, variantPrices, standPrice: stand > 0 ? stand : undefined,
        collections: p.collections.filter((col) => out.collections[col] && checkAvailability({ settings: cfg.settings, country, product: p, collection: col }).ok)
      };
    })
    .filter((p) => p.sizes.length > 0);
  // Bloodline designs: a design is shown only if admin has not hidden it AND at least one available product carries it
  const bloodProducts = out.products.filter((p) => p.collections.includes('blood_group')).map((p) => p.id);
  out.bloodDesigns = BLOOD_GROUPS.map((code) => ({ code, slug: bloodGroupSlug(code), visible: cfg.bloodDesigns.hidden?.[code] !== true && bloodProducts.length > 0, products: bloodProducts }))
    .filter((d) => d.visible).map(({ code, slug, products }) => ({ code, slug, products }));
  return ok(out);
}

// ---- quote ------------------------------------------------------------------------------------------

// The inset default is per product (framed posters 10 mm, acrylic 0); admin can change it.
const insetFor = (p) => (Number.isFinite(Number(p.designInsetMm)) ? Number(p.designInsetMm) : Number.isFinite(Number(p.defaultInsetMm)) ? Number(p.defaultInsetMm) : DEFAULT_INSET_MM);

const ERRORS_BLOCKED = { 'design-source-off': 'design-source-off', 'print-area-unverified': 'merch-product-off', 'global-off': 'merch-off', 'country-off': 'merch-country-off', 'collection-off': 'merch-collection-off', 'product-off': 'merch-product-off', 'product-collection': 'merch-product-off', 'no-pricing': 'merch-product-off', 'print-area-missing': 'merch-product-off' };

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
    // Framed posters use a "frame design" (Elements Gold by default). Which ones are on is a per-product admin option.
    let input = raw.design || {};
    if (!skipDesign && isFrameKind(product.kind) && collection === 'name_elements') input = { frame: DEFAULT_FRAME, ...input };
    if (!skipDesign && input.frame) {
      if (!isFrameKind(product.kind)) return fail(400, 'frame-design-unavailable');
      if (FRAME_IDS.includes(input.frame) && !(product.frameDesigns?.[input.frame] ?? DEFAULT_FRAME_DESIGNS[input.frame])) return fail(409, 'frame-design-off', { frame: input.frame });
    }
    const built = skipDesign ? { design: raw.design } : buildDesign(collection, input);
    if (built.error) return fail(400, built.error);
    if (collection === 'blood_group' && cfg.bloodDesigns.hidden?.[built.design.bloodGroup] === true) return fail(409, 'design-hidden');
    const design = skipDesign ? built.design : applyTemplate(built.design, product);

    const vdoc = cfg.variants[variantId(product.id, raw.color, raw.size)];
    const colorOn = product.colors.find((c) => c.id === raw.color)?.on;
    if ((vdoc?.enabled ?? colorOn) === false) return fail(409, 'merch-product-off', { reason: 'variant-off' });
    const ready = sizeReady(product, raw.size);
    if (!ready.ok) return fail(409, 'merch-product-off', { reason: ready.reason, problems: ready.problems });
    if (cfg.settings.visibleTo === 'everyone' && !sampleApproved(product, raw.size)) return fail(409, 'merch-product-off', { reason: 'sample-not-approved' });
    if (product.taxUnverified && lookupBySize(country.taxByProduct, product.id, raw.size, raw.color) === undefined) return fail(409, 'merch-product-off', { reason: 'tax-not-set' });
    const route = cfg.routes.find((r) => r.countryCode === country.countryCode && r.productId === product.id);
    const routed = routeProvider({ providers: cfg.providers, country, product, variantMap: vdoc, route, exclude: providerId ? [] : [] });
    if (!routed.provider) return fail(409, 'no-provider', { rejected: routed.rejected });
    if (providerId && routed.provider.id !== providerId) {
      // One provider per order: try the first line's provider for this line, otherwise refuse
      const same = routeProvider({ providers: cfg.providers, country, product, variantMap: vdoc, route: { primary: providerId } });
      if (!same.provider || same.provider.id !== providerId) return fail(409, 'mixed-providers');
    } else if (!providerId) { providerId = routed.provider.id; backups = routed.backup; }
    // Print area for this SKU (product spec, with any per-SKU numbers from the mapping), the customer's layout, and the
    // resolution of the artwork at the chosen size. Nothing here is guessed: an incomplete spec blocks the sale.
    const mapping = vdoc?.providerSkus?.[providerId] || null;
    const spec = effectiveSpec(product.printSpec, mapping, raw.size);
    if (specProblems(spec).length) return fail(409, 'merch-product-off', { reason: 'print-area-missing', problems: specProblems(spec) });
    // a frame design fills the whole print area: its position and size are fixed
    const layout = design.template === 'frame' ? { ...FULL_LAYOUT } : raw.layout ? normaliseLayout(raw.layout) : defaultLayoutFor(design, spec);
    const res = designDpi({ design: design, spec, layout });
    const status = resolutionStatus(res.dpi, { minDpi: Number(spec.minDpi) });
    if (status === 'blocked' && product.dpiOverride !== true) {
      return fail(409, 'resolution-too-low', { dpi: res.dpi, minDpi: Number(spec.minDpi), maxScale: +maxScaleForDpi({ design: design, spec, minDpi: Number(spec.minDpi) }).toFixed(2) });
    }
    const unitPrice = lookupBySize(country.prices, product.id, raw.size, raw.color);
    if (!(unitPrice > 0)) return fail(409, 'merch-product-off', { reason: 'no-pricing' });
    // Frame designs are printed inset from the frame on every side (product setting, default 10 mm). The print file stays the full print area;
    // we record the artwork size, the inset and which rule applied (the stricter of the print area and the frame minus the inset).
    const insetMm = design.template === 'frame' ? insetFor(product) : null;
    const artwork = insetMm === null ? null : artworkInches({ areaInches: { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) }, size: raw.size, insetMm });
    // Optional "Add stand" (acrylic): a SEPARATE Qikink line item (the stand SKU, same quantity), priced as its own quote line.
    let stand = null;
    if (raw.addStand === true) {
      const standPrice = product.standSku ? lookupBySize(country.prices, `${product.id}-stand`) : undefined;
      if (!product.standSku || product.standAsLine !== true || !(standPrice > 0)) return fail(409, 'stand-unavailable'); // two-line-item stand only behind the flag
      stand = { standSku: product.standSku, standPrice, standCost: lookupBySize(country.costs, `${product.id}-stand`) ?? 0, standTaxPercent: taxRateFor(country, `${product.id}-stand`, undefined, undefined) };
      if (country.taxByProduct?.[`${product.id}-stand`] === undefined) stand.standTaxPercent = taxRateFor(country, product.id, raw.size, raw.color);
    }
    // the smallest printed text must stay readable on every size and ratio (the design is laid out inside the area, never scaled down after)
    if (artwork) { const fit = minTextMm(design, artwork.artworkInches); if (!fit.ok && product.minTextOverride !== true) return fail(409, 'text-too-small', { size: raw.size, minMm: +fit.mm.toFixed(2), needMm: MIN_TEXT_MM, where: fit.where }); }
    items.push({
      ...(stand ? { addStand: true, ...stand } : {}),
      productId: product.id, collection, color: raw.color, size: raw.size, qty, design: design, layout,
      canvasInches: { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) },
      ...(artwork ? { designInsetMm: insetMm, artworkInches: artwork.artworkInches, insetApplied: artwork.applied } : {}),
      placementSku: spec.allowedPlacements[0], printTypeId: Number(spec.printTypeId), minDpi: Number(spec.minDpi), dpi: res.dpi, resolution: status,
      providerSku: mapping, unitPrice, unitCost: lookupBySize(country.costs, product.id, raw.size, raw.color) ?? 0, taxPercent: taxRateFor(country, product.id, raw.size, raw.color)
    });
  }
  const lines = [];
  for (const i of items) {
    i.lineIndex = lines.length;
    lines.push({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice, unitCost: i.unitCost, taxPercent: i.taxPercent });
    if (i.addStand) { i.standLineIndex = lines.length; lines.push({ productId: `${i.productId}-stand`, qty: i.qty, unitPrice: i.standPrice, unitCost: i.standCost, taxPercent: i.standTaxPercent }); }
  }
  const quote = computeQuote({ lines, country });
  // Costs and shipping are admin-configured (no provider quote API), and a sale below the configured margin floor is refused.
  quote.source = 'configured';
  const floor = Number(country.marginFloorPercent);
  if (floor > 0 && quote.total - quote.tax > 0 && (quote.estimatedMargin / (quote.total - quote.tax)) * 100 < floor) return fail(409, 'margin-below-floor');
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
  return ok({ resolution: priced.items.map((i, n) => ({ index: n, dpi: i.dpi, status: i.resolution })), quoteId: id, expiresAt: new Date(ms(now) + QUOTE_TTL_MS).toISOString(), quote: publicQuote(priced.quote), providerId: priced.providerId });
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
    items: priced.items.map((i, n) => ({ ...i, index: n, artwork: null, mockup: null, sourceAsset: i.collection === 'blood_group' ? bloodSourceAsset(i.design.bloodGroup) : null })),
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

// Blood-group designs are composited by the browser too (the customer chooses the position), but only ever from the
// approved, versioned, checksummed master; we record which one so a reprint can be traced.
function bloodSourceAsset(code) {
  const a = BLOOD_ASSETS[bloodGroupSlug(code)];
  return a ? { path: a.path, sha256: a.sha256, version: a.version, width: a.width, height: a.height } : null;
}

// The browser renders the personalised print PNG from the SAME design definition, uploads it, and tells
// us its checksum. The design itself (symbols) was already verified server-side; the file is what the
// customer saw in the preview. Allowed only while the order has not been submitted to a provider.
export async function handleAttachArtwork(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  if (ctx.files) return fail(400, 'use-upload'); // with a file store the server records the metadata itself while storing the file
  const found = await ctx.db.get(`${COLL.orders}/${body?.orderId}`);
  const order = found?.data;
  if (!order || order.uid !== ctx.who.uid) return fail(404, 'order-not-found');
  if (!['payment_pending', 'paid', 'fulfillment_pending', 'exception'].includes(order.status)) return fail(409, 'order-locked');
  const items = clone(order.items);
  for (const a of body.items || []) {
    const it = items[a.index];
    if (!it) return fail(400, 'bad-artwork-index');
    if (!/^[a-f0-9]{64}$/.test(String(a.sha256 || ''))) return fail(400, 'bad-checksum');
    if (!a.path || !String(a.path).startsWith(`merch/print/${ctx.who.uid}/${order.id}/`)) return fail(400, 'bad-artwork-path');
    // the declared pixel size must reach the product's minimum DPI over the print area (a phone may have had to render smaller)
    const dpi = Number(a.width) && it.canvasInches?.width ? Number(a.width) / it.canvasInches.width : null;
    if (dpi !== null && it.minDpi && dpi < it.minDpi * 0.99) return fail(400, 'resolution-too-low', { dpi: Math.round(dpi), minDpi: it.minDpi });
    it.artwork = { kind: 'upload', path: a.path, sha256: a.sha256, version: it.design.templateVersion, width: Number(a.width) || null, height: Number(a.height) || null, layout: it.layout };
    // Optional mock-up image (product with the design at the customer's position) for Qikink's mockup_link
    if (a.mockup) {
      if (!/^[a-f0-9]{64}$/.test(String(a.mockup.sha256 || '')) || !String(a.mockup.path || '').startsWith(`merch/mockup/${ctx.who.uid}/${order.id}/`)) return fail(400, 'bad-mockup');
      it.mockup = { path: a.mockup.path, sha256: a.mockup.sha256 };
    }
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
    const line = order.totals.lines[i.lineIndex ?? i.index];
    const standTotal = i.standLineIndex !== undefined ? order.totals.lines[i.standLineIndex].lineTotal : 0;
    const share = order.totals.items > 0 ? (line.lineTotal + standTotal) / order.totals.items : 0;
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
  if (order.items.some((i) => !i.artwork)) return fail(409, 'artwork-missing');
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
  if (isCod(payment?.method)) { await audit({ ...ctx, who: null }, 'alert.cod-rejected', 'payment-webhook', { method: payment.method }); return fail(400, 'cod-not-allowed'); }
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
  if (!['paid', 'fulfillment_pending', 'exception', 'held_provider_funds'].includes(order.status)) return { skipped: order.status };
  if (['exception', 'held_provider_funds'].includes(order.status) && !force) return { skipped: order.status };
  // Payment must have been verified server-side before ANY submission; unverified or failed payments never reach a provider.
  if (!order.transactionId || order.paidAt == null) { await raiseException(ctx, orderId, 'payment-not-verified'); return { exception: 'payment-not-verified' }; }
  if (!force && ms(ff.nextRetryAt) > ms(ctx.now())) return { skipped: 'not-due' };

  const missing = order.items.find((i) => !i.artwork || i.artwork.fileDeletedAt);
  if (missing) { await raiseException(ctx, orderId, 'artwork-missing'); return { exception: 'artwork-missing' }; }
  // With a file store: GET each signed link as the provider will (no login) and check status, PNG type, size and hash BEFORE submitting.
  const urls = {};
  if (ctx.files) {
    for (const i of order.items) {
      const p = i.artwork.key ? await checkFileReachable(ctx, order, i, 'print') : { ok: true };
      if (p.error) { await raiseException(ctx, orderId, p.error); return { exception: p.error }; }
      urls[i.index] = { print: p.url };
      if (i.mockup?.key && !i.mockup.fileDeletedAt) { const m = await checkFileReachable(ctx, order, i, 'mockup'); if (m.ok) urls[i.index].mockup = m.url; }
    }
  }

  const cfgProviders = await ctx.db.list(COLL.providers);
  const pdoc = cfgProviders.find((p) => p.id === order.providerId);
  // Disabled provider: no new routing. The paid order stays manageable (admin can reroute or refund).
  if (!pdoc || pdoc.active !== true) { await raiseException(ctx, orderId, 'provider-disabled'); return { exception: 'provider-disabled' }; }
  const adapter = ctx.providerFor(pdoc);
  if (!adapter) { await raiseException(ctx, orderId, 'no-adapter'); return { exception: 'no-adapter' }; }

  await setState(ctx, orderId, null, 'fulfillment_pending');
  const attempts = (ff.attempts || 0) + 1;
  const products = mergeProducts(await ctx.db.list(COLL.products));
  const payload = {
    idempotencyKey: ff.idempotencyKey, orderId, attempt: attempts, paymentMethod: 'prepaid', address: order.address, email: order.email, currency: order.currency, totalValue: order.amount,
    items: (await Promise.all(order.items.map(async (i) => [{
      index: i.index, productId: i.productId, color: i.color, size: i.size, qty: i.qty, unitPrice: i.unitPrice, providerSku: i.providerSku, placement: 'default',
      layout: i.layout, canvasInches: i.canvasInches, placementSku: i.placementSku, printTypeId: i.printTypeId,
      designUrl: urls[i.index]?.print || await ctx.artworkUrl(order, i, 'print'), designSha256: i.artwork.sha256,
      // a real mock-up when the browser made one; otherwise the print file (recorded below as the fallback)
      mockupUrl: urls[i.index]?.mockup || (i.mockup && !ctx.files ? await ctx.artworkUrl(order, i, 'mockup') : null)
    }, ...(i.addStand ? [{ index: `${i.index}s`, productId: `${i.productId}-stand`, qty: i.qty, unitPrice: i.standPrice, printTypeId: 1, providerSku: { sku: i.standSku, printTypeId: 1, plain: true } }] : [])]))).flat()
  };
  let res;
  try { res = await adapter.submitOrder(payload); } catch (e) { res = { ok: false, error: 'exception', retryable: true }; }

  if (res.ok) {
    await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: 'submitted', providerOrderId: res.providerOrderId, providerOrderNumber: res.orderNumber || null, mockupSources: order.items.map((i) => (i.mockup ? 'mockup' : 'print-fallback')), attempts, submittedAt: ctx.now(), lastError: null });
    await setState(ctx, orderId, null, 'submitted', { providerOrderId: res.providerOrderId });
    return { submitted: true, providerOrderId: res.providerOrderId };
  }
  if (res.heldFunds) {
    // Provider wallet is empty: hold the PAID order (no retry loop, no duplicate), alert admin once, wait for the admin's retry after a top-up.
    await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: 'held', attempts, lastError: res.error });
    await setState(ctx, orderId, null, 'held_provider_funds', { heldReason: 'provider-funds' }, { reason: 'provider-funds' });
    if (order.status !== 'held_provider_funds') await audit({ ...ctx, who: null }, 'alert.provider-funds', orderId, { provider: order.providerId, error: String(res.error).slice(0, 200) });
    return { held: true, error: res.error };
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

export async function applyProviderStatus(ctx, orderId, { status, tracking, raw, unmapped }) {
  const shownRaw = raw || status;
  const ffDoc = (await ctx.db.get(`${COLL.fulfillments}/${orderId}`))?.data;
  // Remember the provider's own wording and alert only when it changes (polling repeats the same answer).
  if (shownRaw && ffDoc && ffDoc.providerRawStatus !== shownRaw) {
    await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { providerRawStatus: shownRaw });
    if (unmapped || !PROVIDER_STATUS_TO_STATE[status]) await audit({ ...ctx, who: null }, 'alert.unmapped-provider-status', orderId, { raw: shownRaw });
  }
  if (tracking && ffDoc) await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { tracking });
  const target = PROVIDER_STATUS_TO_STATE[status];
  if (!target) return { ignored: 'unknown-status', raw: shownRaw };
  const order = (await ctx.db.get(`${COLL.orders}/${orderId}`))?.data;
  if (!order) return { ignored: 'no-order' };
  const rank = (s) => ['submitted', 'in_production', 'shipped', 'delivered'].indexOf(s);
  if (target === 'exception' || target === 'cancelled') {
    const res = await setState(ctx, orderId, null, target, { providerStatus: shownRaw }, { providerStatus: shownRaw });
    return { state: res?.status };
  }
  if (rank(target) <= rank(order.status)) return { ignored: 'not-forward' };
  const patch = { providerStatus: shownRaw };
  if (tracking) patch.tracking = tracking;
  if (target === 'delivered') patch.deliveredAt = ctx.now();
  const res = await setState(ctx, orderId, null, target, patch, { providerStatus: shownRaw });
  if (tracking) await ctx.db.patch(`${COLL.fulfillments}/${orderId}`, { status: target });
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
  const providers = await ctx.db.list(COLL.providers);
  const open = [];
  for (const st of ['submitted', 'in_production', 'shipped']) open.push(...(await ctx.db.query(COLL.orders, 'status', st)));
  const byProvider = {};
  for (const order of open) (byProvider[order.providerId] = byProvider[order.providerId] || []).push(order);
  for (const [pid, orders] of Object.entries(byProvider)) {
    const pdoc = providers.find((p) => p.id === pid);
    const adapter = pdoc && ctx.providerFor(pdoc);
    if (!adapter) continue;
    const jobs = [];
    for (const order of orders) {
      const ff = (await ctx.db.get(`${COLL.fulfillments}/${order.id}`))?.data;
      if (ff?.providerOrderId) jobs.push({ order, providerOrderId: String(ff.providerOrderId) });
    }
    // Batch when the adapter can (Qikink: 10 orders per call, 60 calls/minute limit); else one call per order.
    let statuses = null;
    if (typeof adapter.getOrderStatuses === 'function' && jobs.length) {
      const batch = await adapter.getOrderStatuses(jobs.map((j) => j.providerOrderId));
      if (batch.ok) statuses = batch.orders;
    }
    for (const j of jobs) {
      const s = statuses ? statuses[j.providerOrderId] && { ok: true, ...statuses[j.providerOrderId] } : await adapter.getOrderStatus(j.providerOrderId);
      if (s?.ok) out.push({ orderId: j.order.id, ...(await applyProviderStatus(ctx, j.order.id, s)) });
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
  async setStorage(ctx, b) {
    const patch = { updatedAt: ctx.now() };
    if (b.primary !== undefined) { if (!['r2', 'supabase'].includes(b.primary)) return { error: 'bad-storage-primary' }; patch.primary = b.primary; }
    if (b.mirror !== undefined) patch.mirror = b.mirror === true;
    if (b.ttlHours !== undefined) { const n = Number(b.ttlHours); if (!(n >= 1 && n <= 168)) return { error: 'bad-ttl' }; patch.ttlHours = n; }
    if (b.retentionDays !== undefined) { const n = Number(b.retentionDays); if (!(Number.isInteger(n) && n >= 0 && n <= 365)) return { error: 'bad-retention' }; patch.retentionDays = n; }
    if (b.retentionByProduct !== undefined) {
      const entries = Object.entries(b.retentionByProduct || {});
      if (entries.some(([, v]) => !(Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 365))) return { error: 'bad-retention' };
      patch.retentionByProduct = Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
    }
    return { path: `${COLL.settings}/storage`, patch };
  },
  // Verification levels: specConfirmed (Qikink in writing) / sandboxAccepted / sampleApproved (owner approved a physical sample). Audited.
  async setVerification(ctx, b) {
    if (!['specConfirmed', 'sandboxAccepted', 'sampleApproved'].includes(b.level) || typeof b.value !== 'boolean') return { error: 'bad-verification' };
    const found = await ctx.db.get(`${COLL.products}/${b.productId}`);
    const product = mergeProducts(found ? [found.data] : [])[b.productId];
    if (!product) return { error: 'product-not-found' };
    const cur = clone(product.verification || {});
    const source = String(b.source || '').slice(0, 200);
    if (b.size) { cur.bySize = cur.bySize || {}; cur.bySize[b.size] = { ...(cur.bySize[b.size] || {}), [b.level]: b.value }; } else cur[b.level] = b.value;
    if (source) cur.source = source;
    return { path: `${COLL.products}/${b.productId}`, patch: { id: b.productId, verification: cur, updatedAt: ctx.now() } };
  },
  async setOpenCase(ctx, b) {
    const found = await ctx.db.get(`${COLL.orders}/${b.orderId}`);
    if (!found) return { error: 'order-not-found' };
    return { path: `${COLL.orders}/${b.orderId}`, patch: b.open === true ? { openCase: true } : { openCase: false, caseClosedAt: ctx.now() } };
  },
  async setVisibility(ctx, b) {
    if (!VISIBLE_TO.includes(b.visibleTo)) return { error: 'bad-visibility' };
    return { path: `${COLL.settings}/global`, patch: { visibleTo: b.visibleTo, updatedAt: ctx.now() } };
  },
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
      taxByProduct: Object.fromEntries(Object.entries(b.taxByProduct || {}).filter(([, v]) => num(v) !== undefined).map(([k, v]) => [k, Number(v)])),
      collections: { name_elements: bool(col.name_elements), blood_group: bool(col.blood_group) },
      prices: Object.fromEntries(Object.entries(b.prices || {}).filter(([, v]) => num(v) !== undefined).map(([k, v]) => [k, Number(v)])),
      costs: Object.fromEntries(Object.entries(b.costs || {}).filter(([, v]) => num(v) !== undefined).map(([k, v]) => [k, Number(v)])),
      disabledProducts: Object.fromEntries(Object.entries(b.disabledProducts || {}).filter(([, v]) => v === true)),
      shipping: { flat: num(b.shipping?.flat) ?? 0, freeAbove: num(b.shipping?.freeAbove) ?? 0 },
      ...(b.shippingCost ? { shippingCost: {
        slabs: (b.shippingCost.slabs || []).filter((s) => num(s.upToGrams) > 0 && num(s.amount) !== undefined).slice(0, 12)
          .map((s) => ({ upToGrams: Number(s.upToGrams), amount: Number(s.amount), method: String(s.method || 'surface').slice(0, 12), confirmed: s.confirmed === true })),
        note: String(b.shippingCost.note || '').slice(0, 300) } } : {}),
      paymentFeePercent: num(b.paymentFeePercent) ?? 0, marginFloorPercent: num(b.marginFloorPercent) ?? 0,
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
    const patch = { id: b.id, ...pick(b, ['kind', 'sizes', 'colors', 'placements', 'printSpec', 'collections', 'frameDesigns', 'designInsetMm', 'designSources']), dpiOverride: b.dpiOverride === true, enabled: b.enabled !== false, updatedAt: ctx.now() };
    if (b.designInsetMm !== undefined && b.designInsetMm !== null && b.designInsetMm !== '' && !(Number(b.designInsetMm) >= 0 && Number(b.designInsetMm) <= MAX_INSET_MM)) return { error: 'bad-inset' };
    if (patch.designInsetMm !== undefined) patch.designInsetMm = patch.designInsetMm === '' || patch.designInsetMm === null ? DEFAULT_INSET_MM : Number(patch.designInsetMm);
    // A spec that is given must be valid (documented DTG/DTF limits, known print type, placement codes).
    // Switching a product ON needs a complete AND verified print spec (confirmed from Qikink); nothing unverified is ever enabled.
    // a per-size spec may be filled in size by size: only the sizes given are checked here (readiness decides what is sellable)
    const given = b.printSpec?.perSize ? Object.keys(b.printSpec.bySize || {}) : undefined;
    if (b.printSpec && specProblems(b.printSpec, given).length) return { error: 'print-spec-invalid', problems: specProblems(b.printSpec, given) };
    if (patch.enabled) { const cur = (await loadConfig(ctx.db)).products[b.id] || {}; const r = readiness({ ...cur, ...pick(b, ['printSpec', 'sizes']) }); if (!r.ok) return { error: 'not-ready', reason: r.reason, problems: r.problems }; }
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

// ---- Product Management: single and bulk switches (product x country matrix, collections, countries, global) ----------
// scope: 'products' { productIds[], countryCode? } | 'collection' { collection, countryCodes[]|'all' } | 'country' { countryCodes[] } | 'global'.
// dryRun returns what WOULD change (the admin screen shows it in a confirmation); the real call applies it and writes ONE
// audit entry holding every before/after. Disabling only blocks NEW quotes and checkouts: paid orders are never touched.
export async function bulkSwitch(ctx, input) {
  const enabled = input.enabled;
  if (typeof enabled !== 'boolean') return { error: 'enabled-required' };
  const cfg = await loadConfig(ctx.db);
  const changes = [];
  const countryDocs = Object.fromEntries(cfg.countries.map((c) => [c.countryCode, c]));
  const pickCountries = (list) => (list === 'all' || !list ? Object.keys(countryDocs) : [].concat(list).map((c) => String(c).toUpperCase()));
  const add = (path, label, field, before, after, patch) => changes.push({ path, label, field, before, after, noop: before === after, patch });

  if (input.scope === 'products') {
    const ids = [].concat(input.productIds || []);
    if (!ids.length) return { error: 'nothing-selected' };
    for (const id of ids) {
      if (!cfg.products[id]) return { error: 'unknown-product' };
      // nothing unverified is ever switched on
      if (enabled) { const r = readiness(cfg.products[id]); if (!r.ok) return { error: 'not-ready', productId: id, reason: r.reason }; }
      if (input.countryCode) {
        const cc = String(input.countryCode).toUpperCase();
        const c = countryDocs[cc];
        if (!c) return { error: 'unknown-country' };
        const off = { ...(c.disabledProducts || {}) };
        const before = off[id] !== true;
        if (enabled) delete off[id]; else off[id] = true;
        add(`${COLL.countries}/${cc}`, `${id} in ${cc}`, 'product-in-country', before, enabled, { disabledProducts: off });
        countryDocs[cc] = { ...c, disabledProducts: off };
      } else {
        add(`${COLL.products}/${id}`, `${id} (everywhere)`, 'product', cfg.products[id].enabled !== false, enabled, { id, enabled });
      }
    }
  } else if (input.scope === 'collection') {
    if (!COLLECTION_IDS.includes(input.collection)) return { error: 'unknown-collection' };
    for (const cc of pickCountries(input.countryCodes)) {
      const c = countryDocs[cc];
      if (!c) return { error: 'unknown-country' };
      add(`${COLL.countries}/${cc}`, `${input.collection} in ${cc}`, 'collection', c.collections?.[input.collection] === true, enabled, { collections: { name_elements: c.collections?.name_elements === true, blood_group: c.collections?.blood_group === true, [input.collection]: enabled } });
    }
  } else if (input.scope === 'country') {
    const list = pickCountries(input.countryCodes);
    if (!list.length) return { error: 'nothing-selected' };
    for (const cc of list) {
      const c = countryDocs[cc];
      if (!c) return { error: 'unknown-country' };
      add(`${COLL.countries}/${cc}`, `country ${cc}`, 'country', c.enabled === true, enabled, { enabled });
    }
  } else if (input.scope === 'global') {
    add(`${COLL.settings}/global`, 'whole merchandise module', 'global', cfg.settings.enabled === true, enabled, { enabled, updatedAt: ctx.now() });
  } else return { error: 'unknown-scope' };

  const summary = changes.map(({ label, field, before, after, noop }) => ({ label, field, before, after, noop }));
  if (input.dryRun) return { dryRun: true, changes: summary };
  for (const ch of changes) { if (!ch.noop) await ctx.db.patch(ch.path, { ...ch.patch, updatedAt: ctx.now() }); }
  await audit(ctx, 'admin.bulkSwitch', input.scope, { enabled, changes: summary });
  return { applied: summary.filter((c) => !c.noop).length, changes: summary };
}

// Writes the launch configuration (India, Qikink, poster + mug enabled, everything else disabled) WITHOUT overwriting anything that exists.
// The global switch and the India switch stay OFF; no prices are set (nothing can be sold until an admin prices it); every Qikink SKU is
// marked unverified and has no print type, so the products stay blocked until the print spec is filled in.
export async function applyLaunchPreset(ctx) {
  const created = [];
  const putIfAbsent = async (path, data) => { if (!(await ctx.db.get(path))) { await ctx.db.patch(path, { ...data, createdAt: ctx.now() }); created.push(path); } };
  await putIfAbsent(`${COLL.settings}/global`, { enabled: false, message: '' });
  await putIfAbsent(`${COLL.providers}/qikink`, { id: 'qikink', name: 'Qikink', adapter: 'qikink', active: false, liveEnabled: false, countries: ['IN'], products: [] });
  // Qikink base prices become our cost estimates (editable); NO selling prices are set, so nothing can be sold until the owner prices it.
  const costs = {}; const taxByProduct = { poster: 18, acrylic: 18, 'acrylic-stand': 18, 'acrylic-frame': 18, mug: 5 }; // bottles: GST % NOT known, left for the owner
  for (const p of Object.values(DEFAULT_PRODUCTS)) {
    if (!p.standSku && !p.id.match(/^(poster|acrylic|acrylic-frame|mug|steel-bottle|sipper-bottle|tumbler)$/)) continue;
    for (const size of p.sizes) for (const c of p.colors) { const cost = baseCost(p.id, c.id, size); if (cost) costs[p.id === 'mug' || p.id.endsWith('bottle') || p.id === 'tumbler' ? `${p.id}:${size}:${c.id}` : `${p.id}:${size}`] = cost; }
  }
  costs['acrylic-stand'] = ACRYLIC_STAND.base;
  await putIfAbsent(`${COLL.countries}/IN`, {
    countryCode: 'IN', enabled: false, currency: 'INR', taxPercent: 18, taxIncluded: true, taxByProduct,
    collections: { name_elements: true, blood_group: true }, prices: {}, costs, disabledProducts: {},
    shipping: { flat: 0, freeAbove: 0 }, shippingCost: SHIPPING_COST_PLACEHOLDER, paymentFeePercent: 0, marginFloorPercent: 0, providerPrimary: 'qikink', providerBackup: null, gatewayOverride: 'auto'
  });
  for (const p of Object.values(DEFAULT_PRODUCTS)) await putIfAbsent(`${COLL.products}/${p.id}`, { id: p.id, enabled: false, ...(isFrameKind(p.kind) ? { frameDesigns: { ...DEFAULT_FRAME_DESIGNS } } : {}) });
  for (const p of Object.values(DEFAULT_PRODUCTS)) {
    if (!['poster', 'acrylic', 'acrylic-frame', 'mug', 'steel-bottle', 'sipper-bottle', 'tumbler'].includes(p.id)) continue;
    for (const size of p.sizes) for (const c of colorsFor(p, size, {}).concat(p.colors.filter((x) => x.on === false && !colorsFor(p, size, {}).some((y) => y.id === x.id)))) {
      const sku = starterSku(p.id, c.id, size); if (!sku) continue;
      const id = variantId(p.id, c.id, size);
      await putIfAbsent(`${COLL.variants}/${id}`, { id, productId: p.id, color: c.id, size, enabled: c.on !== false, providerSkus: { qikink: { sku, unverified: true } } });
    }
  }
  await audit(ctx, 'admin.applyLaunchPreset', 'launch', { created: created.length });
  return { created };
}

const cfgProductIsWallArt = (cfg, id) => isFrameKind(cfg.products[id]?.kind);

export async function handleAdmin(ctx, body) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  if (!(await requireAdmin(ctx))) return fail(403, 'not-admin');
  const action = body?.action;
  const input = body?.data || {};

  if (ADMIN_ACTIONS[action]) {
    const r = await ADMIN_ACTIONS[action](ctx, input);
    if (r.error) return fail(400, r.error, { reason: r.reason, problems: r.problems });
    const before = (await ctx.db.get(r.path))?.data || null;
    await ctx.db.patch(r.path, r.patch);
    await audit(ctx, `admin.${action}`, r.path, { before, after: clone(r.patch) });
    return ok({ ok: true });
  }
  if (action === 'storageHealth') {
    const settings = (await ctx.db.get(`${COLL.settings}/storage`))?.data || {};
    const status = (await ctx.db.get(`${COLL.settings}/storageStatus`))?.data || {};
    return ok({ backends: ctx.files ? await ctx.files.health() : {}, primary: settings.primary || null, mirror: settings.mirror === true, ttlHours: settings.ttlHours || 24, retentionDays: settings.retentionDays ?? 30, retentionByProduct: settings.retentionByProduct || {}, lastFailover: status.lastFailover || null, configured: ctx.files ? ctx.files.names() : [] });
  }
  if (action === 'storageTest') {
    if (!ctx.files) return fail(503, 'storage-not-configured');
    const results = {};
    for (const name of ctx.files.names()) {
      const store = ctx.files.stores[name]; const key = `merch/print/healthcheck/test/${ctx.id()}.png`;
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89]);
      // Each step is reported as pass/fail; no key and no link is ever returned or logged.
      const steps = {};
      try {
        await store.put(key, png, 'image/png'); steps.write = true;
        const back = await store.get(key);
        steps.read = !!back && back.bytes.length === png.length && (await sha256Bytes(back.bytes)) === (await sha256Bytes(png));
        const dl = await ctx.files.fetchUrl(await store.getSignedUrl(key, 120));
        steps.signedDownload = dl.status === 200 && !!dl.bytes && dl.bytes.length === png.length && /image\/png/i.test(dl.contentType);
        const open = await ctx.files.fetchUrl(store.publicUrl(key)).catch(() => ({ status: 0 }));
        steps.privateBucket = open.status !== 200; // the plain address without a signature must be refused
      } catch (e) { steps.error = String(e.message).slice(0, 80); }
      try { await store.delete(key); steps.deleted = true; steps.gone = (await store.exists(key)) === false; } catch (e) { steps.deleted = false; steps.error = steps.error || String(e.message).slice(0, 80); }
      results[name] = { ok: steps.write === true && steps.read === true && steps.signedDownload === true && steps.privateBucket === true && steps.deleted === true && steps.gone === true, ...steps };
    }
    await audit(ctx, 'admin.storageTest', 'storage', { results });
    return ok({ results });
  }
  if (action === 'fileReport') return ok(await fileReport(ctx));
  if (action === 'sweepFiles') {
    const r = await sweepFiles(ctx, { dryRun: input.dryRun !== false }); // dry run unless explicitly turned off
    if (r.error) return fail(503, r.error);
    await audit(ctx, input.dryRun === false ? 'admin.sweepFiles' : 'admin.sweepFilesDryRun', 'storage', { due: r.due, deleted: r.deleted, failed: r.failed });
    return ok(r);
  }
  if (action === 'setFrameDesign') {
    // per-product option: which frame designs customers may choose (launch: Elements Gold only)
    if (!FRAME_IDS.includes(input.frame) || typeof input.enabled !== 'boolean' || !cfgProductIsWallArt(await loadConfig(ctx.db), input.productId)) return fail(400, 'bad-frame-design');
    const doc = (await ctx.db.get(`${COLL.products}/${input.productId}`))?.data || {};
    const before = { ...DEFAULT_FRAME_DESIGNS, ...(doc.frameDesigns || {}) };
    const after = { ...before, [input.frame]: input.enabled };
    await ctx.db.patch(`${COLL.products}/${input.productId}`, { id: input.productId, frameDesigns: after, updatedAt: ctx.now() });
    await audit(ctx, 'admin.setFrameDesign', input.productId, { before, after });
    return ok({ ok: true });
  }
  if (action === 'setDesignSource') {
    const cfg = await loadConfig(ctx.db); const p = cfg.products[input.productId];
    if (!p || !COLLECTION_IDS.includes(input.source) || typeof input.enabled !== 'boolean' || !(p.collections || []).includes(input.source)) return fail(400, 'bad-design-source');
    const before = { ...(p.designSources || {}) }; const after = { ...before, [input.source]: input.enabled };
    await ctx.db.patch(`${COLL.products}/${p.id}`, { id: p.id, designSources: after, updatedAt: ctx.now() });
    await audit(ctx, 'admin.setDesignSource', p.id, { before, after });
    return ok({ ok: true });
  }
  if (action === 'setBloodDesign') {
    if (!BLOOD_GROUPS.includes(input.code) || typeof input.visible !== 'boolean') return fail(400, 'bad-blood-design');
    const cur = (await ctx.db.get(`${COLL.settings}/bloodDesigns`))?.data || {};
    const before = { ...(cur.hidden || {}) }; const after = { ...before, [input.code]: !input.visible };
    await ctx.db.patch(`${COLL.settings}/bloodDesigns`, { hidden: after, updatedAt: ctx.now() });
    await audit(ctx, 'admin.setBloodDesign', input.code, { before: before[input.code] !== true, after: input.visible });
    return ok({ ok: true });
  }
  if (action === 'bulkSwitch') { const r = await bulkSwitch(ctx, input); return r.error ? fail(400, r.error, { productId: r.productId, reason: r.reason }) : ok(r); }
  if (action === 'applyLaunchPreset') return ok(await applyLaunchPreset(ctx));
  if (action === 'addOrderNote') {
    // Complaints, replacements and other notes live on the fulfilment record (admin-only), never on the order the customer can read.
    const type = ['complaint', 'replacement', 'note'].includes(input.type) ? input.type : 'note';
    const text = String(input.text || '').trim().slice(0, 500);
    const ff = (await ctx.db.get(`${COLL.fulfillments}/${input.orderId}`))?.data;
    if (!text || !ff) return fail(400, 'bad-note');
    await ctx.db.patch(`${COLL.fulfillments}/${input.orderId}`, { notes: [...(ff.notes || []), { type, text, by: ctx.who.email, at: ctx.now() }] });
    await audit(ctx, 'admin.orderNote', input.orderId, { type });
    return ok({ ok: true });
  }
  if (action === 'refund') { const r = await refundOrder(ctx, input.orderId, input); await audit(ctx, 'admin.refund', input.orderId, { amount: input.amount ?? 'full', reason: input.reason || '', result: r.body?.error || 'ok' }); return r; }
  if (action === 'retry') { const r = await runFulfilment(ctx, input.orderId, { force: true }); await audit(ctx, 'admin.retry', input.orderId, r); return ok(r); }
  if (action === 'reroute') {
    const found = await ctx.db.get(`${COLL.orders}/${input.orderId}`);
    const order = found?.data;
    if (!order || !['exception', 'paid', 'fulfillment_pending', 'held_provider_funds'].includes(order.status)) return fail(409, 'cannot-reroute');
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

/** POST /api/merch/upload (binary body). Same visibility rule as every customer action. */
export async function handleUpload(ctx, params) {
  const v = await merchVisibility(ctx);
  if (!v.visible) return fail(404, 'not-found');
  return uploadFile(ctx, params);
}

export const VISIBLE_TO = ['nobody', 'admins', 'everyone'];
export async function merchVisibility(ctx) {
  const s = (await ctx.db.get(`${COLL.settings}/global`))?.data || {};
  const mode = VISIBLE_TO.includes(s.visibleTo) ? s.visibleTo : 'nobody';
  const admin = await requireAdmin(ctx);
  return { mode, admin, visible: mode === 'everyone' || (mode === 'admins' && admin) };
}

export async function handleMerch(ctx, action, body) {
  // Cash on Delivery is prohibited everywhere: refuse it here, before any handler, and keep a record.
  const cod = findCod(body);
  if (cod) {
    await audit(ctx, 'alert.cod-rejected', action, { key: cod.key, value: cod.value }).catch(() => {});
    return fail(400, 'cod-not-allowed');
  }
  // Who may see merchandise at all (global setting "visibleTo": nobody | admins | everyone, default nobody).
  // Anyone else gets the same 404 as if the feature did not exist. Admin actions are exempt so the setting can be changed.
  if (action !== 'admin') {
    const v = await merchVisibility(ctx);
    // admins can always ask (to show the sandbox banner and the setting); everyone else gets the 404 below
    if (action === 'visibility' && v.admin) return ok({ visible: v.visible, admin: true, mode: v.mode, sandbox: ctx.sandbox === true, paymentsSimulated: ctx.paymentsSimulated === true });
    if (!v.visible) return fail(404, 'not-found');
    if (action === 'visibility') return ok({ visible: true, admin: false, mode: v.mode, sandbox: ctx.sandbox === true, paymentsSimulated: ctx.paymentsSimulated === true });
  }
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

export { STATES, PAID_STATES, sweepFiles, fileReport };
