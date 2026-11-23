// Quote maths. Everything is computed in integer minor units (paise, cents) so rounding never drifts,
// then returned in major units like the rest of the app's payment records.
import { currencyExponent } from '../data/gatewayCurrencies.js';

const toMinor = (amount, exp) => Math.round(Number(amount) * 10 ** exp);
const toMajor = (minor, exp) => minor / 10 ** exp;

/**
 * lines: [{ productId, qty, unitPrice }]  (unitPrice from merch_countries.prices, major units)
 * country: { currency, taxPercent, taxIncluded, shipping: { flat, freeAbove } , costs, paymentFeePercent }
 * Returns totals plus an estimated margin used for reporting and merchandise commission.
 */
export function computeQuote({ lines, country, discountPercent = 0 }) {
  const currency = country.currency;
  const exp = currencyExponent(currency);
  const rate = Math.max(0, Number(country.taxPercent) || 0);
  const taxIncluded = country.taxIncluded !== false;

  const priced = lines.map((l) => {
    const unitMinor = toMinor(l.unitPrice, exp);
    const gross = unitMinor * l.qty;
    const discount = Math.round(gross * Math.min(100, Math.max(0, discountPercent)) / 100);
    return { ...l, unitMinor, lineMinor: gross - discount, discountMinor: discount };
  });
  const itemsMinor = priced.reduce((s, l) => s + l.lineMinor, 0);
  const discountMinor = priced.reduce((s, l) => s + l.discountMinor, 0);

  const ship = country.shipping || {};
  const free = Number(ship.freeAbove) > 0 && itemsMinor >= toMinor(ship.freeAbove, exp);
  const shippingMinor = free ? 0 : toMinor(ship.flat || 0, exp);

  // Tax: prices either already include it (extract it) or it is added on top (items + shipping).
  const taxableMinor = itemsMinor + shippingMinor;
  const taxMinor = taxIncluded ? Math.round(taxableMinor - taxableMinor / (1 + rate / 100)) : Math.round(taxableMinor * rate / 100);
  const totalMinor = taxIncluded ? taxableMinor : taxableMinor + taxMinor;

  // Estimated margin = revenue excluding tax - provider cost estimate - payment fee estimate.
  const costMinor = priced.reduce((s, l) => s + toMinor(country.costs?.[l.productId] || 0, exp) * l.qty, 0);
  const feeMinor = Math.round(totalMinor * (Number(country.paymentFeePercent) || 0) / 100);
  const marginMinor = totalMinor - taxMinor - costMinor - feeMinor;

  return {
    currency,
    lines: priced.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: toMajor(l.unitMinor, exp), lineTotal: toMajor(l.lineMinor, exp) })),
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
