import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getCountry } from '../data/countries';
import { GATEWAY_OVERRIDES, resolveGateway } from '../data/gatewayCurrencies';
import { GST_RATE_BY_COUNTRY } from './commission';
import { detectBrowserCountry } from './countryDetect';

import { readPlanSettings, discountedPrice } from './planMath.js';
export { readPlanSettings, discountedPrice };

// ---- Prices come from Country Pricing records only --------------------------------------------
// A country is "priced" when its record is Active and has a price above 0. There are no built-in
// fallback prices: a country without such a record has no price anywhere in the app.
const isPriced = (s) => s && s.isActive && Number(readPlanSettings(s, getCountry(s.countryCode)?.currency).price) > 0;

// Signed-in users read Country Pricing from Firestore. Signed-out visitors cannot (rules), so they get
// the public fields (never admin fields) from /api/pricing. Anything unreachable = no price.
async function publicApi(query) {
  try {
    const res = await fetch(`/api/pricing${query}`, { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toPricing(s) {
  const plan = readPlanSettings(s, getCountry(s.countryCode)?.currency);
  const set = Number(s.taxPercent);
  const taxPercent = s.taxPercent !== '' && s.taxPercent !== null && s.taxPercent !== undefined && Number.isFinite(set) ? set : (GST_RATE_BY_COUNTRY[s.countryCode] || 0);
  return {
    countryCode: s.countryCode,
    currency: plan.currency,
    symbol: plan.symbol,
    plan: { price: plan.price, discountPercent: plan.discountPercent },
    taxPercent,
    gatewayOverride: GATEWAY_OVERRIDES.includes(s.gatewayOverride) ? s.gatewayOverride : 'auto'
  };
}

/**
 * The Annual Plan for a country from its ACTIVE Country Pricing record, or null when the country has
 * none (not Active, or no price). Returns { countryCode, currency, symbol, plan: { price, discountPercent },
 * taxPercent, gatewayOverride }.
 */
export async function loadCountryPricing(countryCode) {
  const code = String(countryCode || '').toUpperCase();
  if (!code) return null;
  try {
    if (auth.currentUser) {
      const snapshot = await getDocs(query(collection(db, 'countrySettings'), where('countryCode', '==', code)));
      const settings = snapshot.docs.map(d => d.data()).find(isPriced);
      return settings ? toPricing(settings) : null;
    }
    const data = await publicApi(`?country=${encodeURIComponent(code)}`);
    if (data) return data.pricing && isPriced({ ...data.pricing, isActive: true }) ? toPricing({ ...data.pricing, isActive: true }) : null;
    // No /api/pricing (local dev / mock): read Country Pricing directly. Production rules refuse this for
    // signed-out visitors, which then simply see no price.
    const snapshot = await getDocs(query(collection(db, 'countrySettings'), where('countryCode', '==', code)));
    const settings = snapshot.docs.map(d => d.data()).find(isPriced);
    return settings ? toPricing(settings) : null;
  } catch (error) {
    console.error('Error loading country pricing:', error);
    return null;
  }
}

// Countries that have an Active priced record: [{ code, name }] sorted by name. These are the only
// countries a visitor can pick on a price picker.
export async function loadPricedCountries() {
  try {
    let rows;
    if (auth.currentUser) {
      const snapshot = await getDocs(collection(db, 'countrySettings'));
      rows = snapshot.docs.map(d => d.data()).filter(isPriced).map(s => ({ code: s.countryCode, name: s.countryName || getCountry(s.countryCode)?.name || s.countryCode }));
    } else {
      const data = await publicApi('');
      if (data) rows = data.countries || [];
      else {
        const snapshot = await getDocs(collection(db, 'countrySettings'));
        rows = snapshot.docs.map(d => d.data()).filter(isPriced).map(s => ({ code: s.countryCode, name: s.countryName || getCountry(s.countryCode)?.name || s.countryCode }));
      }
    }
    const seen = new Set();
    return rows.filter(r => r.code && !seen.has(r.code) && seen.add(r.code)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error loading priced countries:', error);
    return [];
  }
}

// Which country's price this viewer sees: the signed-in profile country; otherwise a country they picked
// on this device; otherwise Cloudflare's country (/api/geo); otherwise the browser locale.
const CHOSEN_KEY = 'nv_price_country';
export const chosenPriceCountry = () => { try { return localStorage.getItem(CHOSEN_KEY) || null; } catch { return null; } };
export const rememberPriceCountry = (code) => { try { localStorage.setItem(CHOSEN_KEY, code); } catch { /* private mode */ } };
export async function viewerCountry(profileCountry) {
  if (profileCountry) return { code: String(profileCountry).toUpperCase(), source: 'profile' };
  const chosen = chosenPriceCountry();
  if (chosen) return { code: chosen, source: 'chosen' };
  const detected = await detectBrowserCountry();
  return { code: detected, source: 'detected' };
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
  if (!p) return { gateway: null, reason: 'no-pricing' };
  const internationalEnabled = await loadInternationalEnabled();
  return { ...resolveGateway({ currency: p.currency, override: p.gatewayOverride, internationalEnabled }), currency: p.currency, gatewayOverride: p.gatewayOverride };
}
