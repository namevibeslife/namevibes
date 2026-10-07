import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { COUNTRIES, getPricing } from '../data/countries';

// Defaults when an admin hasn't configured a country under Admin → Country Pricing
const DEFAULT_DISCOUNTS = { individual: 10, family: 20 };

/**
 * Prices for a country: the admin's active countrySettings entry if there is one,
 * otherwise the built-in prices. Returns { currency, symbol, plans: { individual, family } }
 * where each plan is { price, discountPercent }.
 */
export async function loadCountryPricing(countryCode) {
  const country = COUNTRIES[countryCode] || COUNTRIES.US;
  const fallback = {
    currency: country.currency,
    symbol: country.symbol,
    plans: {
      individual: { price: getPricing(countryCode, 'individual').price, discountPercent: DEFAULT_DISCOUNTS.individual },
      family: { price: getPricing(countryCode, 'family').price, discountPercent: DEFAULT_DISCOUNTS.family }
    }
  };

  try {
    const snapshot = await getDocs(query(collection(db, 'countrySettings'), where('countryCode', '==', countryCode)));
    const settings = snapshot.docs.map(d => d.data()).find(s => s.isActive);
    if (!settings) return fallback;

    const valid = (n) => Number.isFinite(n) && n >= 0;
    return {
      currency: settings.currency || fallback.currency,
      symbol: settings.symbol || fallback.symbol,
      plans: {
        individual: {
          price: valid(settings.individualPrice) && settings.individualPrice > 0 ? settings.individualPrice : fallback.plans.individual.price,
          discountPercent: valid(settings.individualDiscount) ? settings.individualDiscount : DEFAULT_DISCOUNTS.individual
        },
        family: {
          price: valid(settings.familyPrice) && settings.familyPrice > 0 ? settings.familyPrice : fallback.plans.family.price,
          discountPercent: valid(settings.familyDiscount) ? settings.familyDiscount : DEFAULT_DISCOUNTS.family
        }
      }
    };
  } catch (error) {
    console.error('Error loading country pricing:', error);
    return fallback;
  }
}

export function discountedPrice(plan) {
  return Math.round(plan.price * (1 - plan.discountPercent / 100));
}
