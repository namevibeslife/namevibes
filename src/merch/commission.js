// Merchandise ambassador commission. Completely separate from the subscription commission in
// src/utils/commission.js (30% / 50%), which this file never touches.
//
// Policy document (merch_settings/commission), all optional:
//   { enabled, type: 'fixed' | 'percent_margin', value, cap, overrides: { 'country:IN': {...}, 'collection:blood_group': {...}, 'product:mug': {...} } }
// Specificity: product > collection > country > default. An override may set any of enabled/type/value/cap.
import { currencyExponent } from '../data/gatewayCurrencies.js';

export const DEFAULT_COMMISSION_POLICY = { enabled: false, type: 'percent_margin', value: 0, cap: 0, holdDays: 14, overrides: {} };

export function resolvePolicy(policy, { countryCode, collection, productId }) {
  const base = { ...DEFAULT_COMMISSION_POLICY, ...(policy || {}) };
  const o = base.overrides || {};
  return [`country:${countryCode}`, `collection:${collection}`, `product:${productId}`]
    .reduce((acc, key) => (o[key] ? { ...acc, ...o[key] } : acc), base);
}

const toMinor = (n, exp) => Math.round(Number(n) * 10 ** exp);

/**
 * order: { currency, countryCode, lines: [{ productId, collection, qty, lineMargin }] } (margin in major units)
 * Returns { amount, lines[] }. Commission never exceeds the eligible margin and is 0 on a loss.
 */
export function computeOrderCommission(policy, order) {
  const exp = currencyExponent(order.currency);
  let total = 0;
  const lines = order.lines.map((l) => {
    const p = resolvePolicy(policy, { countryCode: order.countryCode, collection: l.collection, productId: l.productId });
    if (!p.enabled) return { productId: l.productId, minor: 0 };
    const margin = Math.max(0, toMinor(l.lineMargin, exp));
    let minor = p.type === 'fixed' ? toMinor(p.value, exp) * l.qty : Math.round(margin * (Number(p.value) || 0) / 100);
    minor = Math.min(minor, margin);
    const cap = toMinor(p.cap || 0, exp);
    if (cap > 0) minor = Math.min(minor, cap * (p.type === 'fixed' ? l.qty : 1));
    total += minor;
    return { productId: l.productId, minor };
  });
  return { amount: total / 10 ** exp, lines: lines.map((l) => ({ productId: l.productId, amount: l.minor / 10 ** exp })) };
}

// Proportional reversal for a refund: refundedAmount of orderTotal. Returns the amount to reverse.
export function reversalAmount({ commissionAmount, alreadyReversed = 0, refundedAmount, orderTotal, currency }) {
  const exp = currencyExponent(currency);
  if (!(orderTotal > 0) || !(commissionAmount > 0)) return 0;
  const ratio = Math.min(1, Math.max(0, refundedAmount / orderTotal));
  const targetMinor = Math.round(toMinor(commissionAmount, exp) * ratio);
  return Math.max(0, targetMinor - toMinor(alreadyReversed, exp)) / 10 ** exp;
}
