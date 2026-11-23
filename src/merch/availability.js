// Can this be sold to this destination, and which provider fulfils it? Pure functions over the
// Firestore documents, used by the server for every quote, checkout and fulfilment, and by the
// browser only to hide options (never as the authority).

// Master switch -> country -> collection -> product. Eligibility comes from the SHIPPING destination.
export function checkAvailability({ settings, country, product, collection }) {
  if (!settings || settings.enabled !== true) return { ok: false, reason: 'global-off', message: settings?.message || '' };
  if (!country || country.enabled !== true) return { ok: false, reason: 'country-off' };
  if (!country.collections || country.collections[collection] !== true) return { ok: false, reason: 'collection-off' };
  if (!product || product.enabled === false) return { ok: false, reason: 'product-off' };
  if (!(product.collections || []).includes(collection)) return { ok: false, reason: 'product-collection' };
  if (country.disabledProducts && country.disabledProducts[product.id] === true) return { ok: false, reason: 'product-off' };
  const price = Number(country.prices?.[product.id]);
  if (!(price > 0)) return { ok: false, reason: 'no-pricing' };
  return { ok: true };
}

/**
 * Choose the provider: the product/country route if one exists, else the country's primary then backup.
 * A candidate must be active, serve the destination, support the product, and (unless it is the mock
 * provider) have a SKU mapped for the exact variant. Disabled providers never receive NEW routing.
 */
export function routeProvider({ providers, country, product, variantMap, route, exclude = [] }) {
  const byId = Object.fromEntries((providers || []).map((p) => [p.id, p]));
  const order = [route?.primary, route?.backup, country?.providerPrimary, country?.providerBackup]
    .filter(Boolean)
    .filter((id, i, all) => all.indexOf(id) === i)
    .filter((id) => !exclude.includes(id));
  const rejected = [];
  for (const id of order) {
    const p = byId[id];
    if (!p) { rejected.push({ id, why: 'unknown' }); continue; }
    if (p.active !== true) { rejected.push({ id, why: 'inactive' }); continue; }
    if (!(p.countries || []).includes(country.countryCode)) { rejected.push({ id, why: 'country' }); continue; }
    if (Array.isArray(p.products) && p.products.length && !p.products.includes(product.id)) { rejected.push({ id, why: 'product' }); continue; }
    if (p.adapter !== 'mock' && !variantMap?.providerSkus?.[id]) { rejected.push({ id, why: 'no-sku' }); continue; }
    return { provider: p, backup: order.filter((x) => x !== id), rejected };
  }
  return { provider: null, rejected };
}

export const SHIPPING_ADDRESS_FIELDS = ['name', 'phone', 'line1', 'city', 'state', 'postalCode', 'country'];

export function validateAddress(address) {
  const a = address || {};
  const missing = SHIPPING_ADDRESS_FIELDS.filter((f) => !String(a[f] || '').trim());
  if (missing.length) return { ok: false, missing };
  if (!/^[A-Za-z]{2}$/.test(String(a.country).trim())) return { ok: false, missing: ['country'] };
  return { ok: true };
}

export const normaliseAddress = (a) => ({
  name: String(a.name).trim().slice(0, 100), phone: String(a.phone).trim().slice(0, 25),
  line1: String(a.line1).trim().slice(0, 150), line2: String(a.line2 || '').trim().slice(0, 150),
  city: String(a.city).trim().slice(0, 80), state: String(a.state).trim().slice(0, 80),
  postalCode: String(a.postalCode).trim().slice(0, 20), country: String(a.country).trim().toUpperCase()
});
