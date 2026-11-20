import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COUNTRIES, getCountry, getPricing, defaultPriceFor, CURRENCY_SYMBOLS, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';
import { GATEWAY_OVERRIDES, resolveGateway } from '../data/gatewayCurrencies';

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

/**
 * The Annual Plan for a country: the admin's active countrySettings entry if there is one,
 * otherwise the built-in defaults. Returns { currency, symbol, plan: { price, discountPercent } }.
 */
export async function loadCountryPricing(countryCode) {
  const country = getCountry(countryCode) || COUNTRIES.US;
  const base = getPricing(countryCode);
  const fallback = {
    currency: base.currency,
    symbol: base.symbol,
    plan: { price: base.price, discountPercent: DEFAULT_REFERRAL_DISCOUNT }
  };

  try {
    const snapshot = await getDocs(query(collection(db, 'countrySettings'), where('countryCode', '==', countryCode)));
    const settings = snapshot.docs.map(d => d.data()).find(s => s.isActive);
    if (!settings) return fallback;
    const plan = readPlanSettings(settings, country.currency);
    const override = GATEWAY_OVERRIDES.includes(settings.gatewayOverride) ? settings.gatewayOverride : 'auto';
    return { currency: plan.currency, symbol: plan.symbol, plan: { price: plan.price, discountPercent: plan.discountPercent }, gatewayOverride: override };
  } catch (error) {
    console.error('Error loading country pricing:', error);
    return fallback;
  }
}

export function discountedPrice(plan) {
  return Math.round(plan.price * (1 - plan.discountPercent / 100));
}

// { IN: 18, AE: 5, ... } from Admin -> Country Pricing `taxPercent`; countries without one fall back
// to GST_RATE_BY_COUNTRY inside computeCommissions. Settings are readable by any signed-in user.
export async function loadTaxRates() {
  try {
    const snapshot = await getDocs(collection(db, 'countrySettings'));
    const rates = {};
    snapshot.docs.forEach(d => {
      const s = d.data();
      if (s.countryCode && Number.isFinite(Number(s.taxPercent)) && s.taxPercent !== '' && s.taxPercent !== null) rates[s.countryCode] = Number(s.taxPercent);
    });
    return rates;
  } catch (error) {
    console.error('Error loading tax rates:', error);
    return {};
  }
}

// Admin -> Country Pricing -> "Razorpay: International payments enabled" (paymentSettings/razorpay).
// Missing, unreadable (rules not published yet) or false = off, so non-INR countries keep using PayPal.
export async function loadInternationalEnabled() {
  try {
    const snap = await getDoc(doc(db, 'paymentSettings', 'razorpay'));
    return snap.exists() && snap.data().internationalEnabled === true;
  } catch {
    return false;
  }
}

// Which gateway a user's checkout uses: { gateway, via, reason?, currency, gatewayOverride }
export async function loadGatewayChoice(countryCode, pricing) {
  const p = pricing || await loadCountryPricing(countryCode);
  const internationalEnabled = await loadInternationalEnabled();
  return { ...resolveGateway({ currency: p.currency, override: p.gatewayOverride, internationalEnabled }), currency: p.currency, gatewayOverride: p.gatewayOverride };
}
