// Quote maths. Everything is computed in integer minor units (paise, cents) so rounding never drifts,
// then returned in major units like the rest of the app's payment records.
import { currencyExponent } from '../data/gatewayCurrencies.js';

const toMinor = (amount, exp) => Math.round(Number(amount) * 10 ** exp);
const toMajor = (minor, exp) => minor / 10 ** exp;

// Admin-set price/cost for a product and size: a `product:size` entry wins over the plain `product` entry.
export const lookupBySize = (table, productId, size) => {
  const v = table?.[`${productId}:${size}`] ?? table?.[productId];
  return v === undefined || v === null || v === '' ? undefined : Number(v);
};
// Tax rate for a product: the admin's per-product rate (e.g. posters 18, mugs 5) or else the country rate.
export const taxRateFor = (country, productId) => {
  const r = country.taxByProduct?.[productId];
  return Math.max(0, Number(r !== undefined && r !== null && r !== '' ? r : country.taxPercent) || 0);
};

/**
 * lines: [{ productId, qty, unitPrice, unitCost?, taxPercent? }]  (major units)
 * country: { currency, taxPercent, taxIncluded, shipping: { flat, freeAbove }, paymentFeePercent }
 * Returns totals plus an estimated margin used for reporting and merchandise commission.
 */
export function computeQuote({ lines, country, discountPercent = 0 }) {
  const currency = country.currency;
  const exp = currencyExponent(currency);
  const countryRate = Math.max(0, Number(country.taxPercent) || 0);
  const taxIncluded = country.taxIncluded !== false;
  const taxOf = (minor, rate) => (taxIncluded ? Math.round(minor - minor / (1 + rate / 100)) : Math.round(minor * rate / 100));

  const priced = lines.map((l) => {
    const unitMinor = toMinor(l.unitPrice, exp);
    const gross = unitMinor * l.qty;
    const discount = Math.round(gross * Math.min(100, Math.max(0, discountPercent)) / 100);
    const rate = l.taxPercent !== undefined ? Math.max(0, Number(l.taxPercent) || 0) : countryRate;
    const lineMinor = gross - discount;
    return { ...l, unitMinor, lineMinor, discountMinor: discount, rate, taxMinor: taxOf(lineMinor, rate) };
  });
  const itemsMinor = priced.reduce((s, l) => s + l.lineMinor, 0);
  const discountMinor = priced.reduce((s, l) => s + l.discountMinor, 0);

  const ship = country.shipping || {};
  const free = Number(ship.freeAbove) > 0 && itemsMinor >= toMinor(ship.freeAbove, exp);
  const shippingMinor = free ? 0 : toMinor(ship.flat || 0, exp);

  // Tax is per line (each product has its own rate); shipping uses the country rate.
  const taxMinor = priced.reduce((s, l) => s + (taxIncluded ? l.taxMinor : l.taxMinor), 0) + taxOf(shippingMinor, countryRate);
  const totalMinor = itemsMinor + shippingMinor + (taxIncluded ? 0 : taxMinor);

  // Estimated margin = revenue excluding tax - provider cost estimate - payment fee estimate.
  const costMinor = priced.reduce((s, l) => s + toMinor(l.unitCost ?? country.costs?.[l.productId] ?? 0, exp) * l.qty, 0);
  const feeMinor = Math.round(totalMinor * (Number(country.paymentFeePercent) || 0) / 100);
  const marginMinor = totalMinor - taxMinor - costMinor - feeMinor;

  return {
    currency,
    lines: priced.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: toMajor(l.unitMinor, exp), lineTotal: toMajor(l.lineMinor, exp), taxPercent: l.rate, tax: toMajor(l.taxMinor, exp) })),
    items: toMajor(itemsMinor, exp),
    discount: toMajor(discountMinor, exp),
    shipping: toMajor(shippingMinor, exp),
    tax: toMajor(taxMinor, exp),
    taxIncluded,
    total: toMajor(totalMinor, exp),
    estimatedCost: toMajor(costMinor, exp),
    estimatedFee: toMajor(feeMinor, exp),
    estimatedMargin: toMajor(marginMinor, exp)
  };
}
