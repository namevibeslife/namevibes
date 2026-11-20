// Pure plan-price maths, shared by the browser (utils/pricing.js) and the payment server functions
// (functions/api/pay), so the amount the server charges is computed exactly the way the page shows it.
import { defaultPriceFor, CURRENCY_SYMBOLS, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries.js';

const positive = (n) => Number.isFinite(n) && n > 0;
const nonNegative = (n) => Number.isFinite(n) && n >= 0;

/**
 * Normalises a countrySettings document to the single-plan shape { currency, symbol, price,
 * discountPercent }. New docs use `price` / `referralDiscount`; older docs only have the
 * familyPrice / familyDiscount fields, which are read as a fallback (never overwritten).
 */
export function readPlanSettings(settings, fallbackCurrency = 'USD') {
  const currency = settings?.currency || fallbackCurrency || 'USD';
  const price = [settings?.price, settings?.familyPrice].find(positive);
  const discount = [settings?.referralDiscount, settings?.familyDiscount].find(nonNegative);
  return {
    currency,
    symbol: settings?.symbol || CURRENCY_SYMBOLS[currency] || '$',
    price: price ?? defaultPriceFor(currency),
    discountPercent: discount ?? DEFAULT_REFERRAL_DISCOUNT
  };
}


export function discountedPrice(plan) {
  return Math.round(plan.price * (1 - plan.discountPercent / 100));
}
