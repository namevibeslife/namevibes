// Public price lookup for visitors who are not signed in (Firestore rules keep Country Pricing readable
// by signed-in users only). Returns ONLY public fields of Active, priced countries; never admin fields
// such as the gateway override. No built-in prices: whatever Country Pricing holds is what is returned.
//   GET /api/pricing                -> { countries: [{ code, name }] }
//   GET /api/pricing?country=SE     -> { pricing: { countryCode, countryName, currency, symbol, price,
//                                       referralDiscount, taxPercent } | null }
import { json, firestore } from '../_lib/server.js';

const hasPrice = (s) => [s.price, s.familyPrice].some((n) => Number.isFinite(Number(n)) && Number(n) > 0);

export async function onRequestGet({ request, env }) {
  try {
    const db = await firestore(env);
    const active = (await db.list('countrySettings')).filter((s) => s.isActive && s.countryCode && hasPrice(s));
    const country = new URL(request.url).searchParams.get('country');
    if (!country) {
      const seen = new Set();
      const countries = active
        .filter((s) => !seen.has(s.countryCode) && seen.add(s.countryCode))
        .map((s) => ({ code: s.countryCode, name: s.countryName || s.countryCode }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return json({ countries });
    }
    const s = active.find((x) => x.countryCode === String(country).toUpperCase());
    if (!s) return json({ pricing: null });
    const price = [s.price, s.familyPrice].find((n) => Number(n) > 0);
    const discount = [s.referralDiscount, s.familyDiscount].find((n) => Number.isFinite(Number(n)) && n !== null && n !== '' && Number(n) >= 0);
    return json({
      pricing: {
        countryCode: s.countryCode,
        countryName: s.countryName || s.countryCode,
        currency: s.currency || 'USD',
        symbol: s.symbol || '',
        price: Number(price),
        referralDiscount: discount === undefined ? 10 : Number(discount),
        taxPercent: s.taxPercent ?? null
      }
    });
  } catch {
    return json({ countries: [], pricing: null }, 200);
  }
}
