// The ONE place the ambassador commission rule lives. Every screen (ambassador dashboard, admin
// payout calculation, accounts) calls computeCommissions so the numbers always match.
//
// Rule (all countries, all ambassadors): rank each referred paying member by the time of their
// FIRST successful payment. Members ranked 1..300 earn the ambassador 30% on ALL of that member's
// payments (first purchase and every renewal); members ranked 301 and later earn 50% on all of
// theirs. The commission base is the amount actually paid (after the referral discount) divided by
// (1 + GST rate). A member's rate is fixed once they are ranked, so history never changes.
export const COMMISSION_TIER1_RATE = 0.30;
export const COMMISSION_TIER1_MAX_MEMBERS = 300;
export const COMMISSION_TIER2_RATE = 0.50;

// GST/VAT included in the price, by country (percent). Commission is worked out on the amount
// paid EXCLUDING this tax. Only India is known; every other country is 0 until a rate is supplied
// (do not guess VAT for the US, EU or UAE).
export const GST_RATE_BY_COUNTRY = { IN: 18 };

// Older payment records carry no countryCode; an INR payment is an India payment.
const countryOf = (p) => String(p.countryCode || (p.currency === 'INR' ? 'IN' : '')).toUpperCase();
export const gstRateFor = (p) => GST_RATE_BY_COUNTRY[countryOf(p)] || 0;

const toMillis = (value) => {
  if (value == null) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const money = (n) => Math.round(n * 100) / 100;

// Which member a payment belongs to: explicit memberId, else the paying user's id or email.
const memberKey = (p) => String(p.memberId ?? p.userId ?? p.userEmail ?? p.email ?? '').toLowerCase();

/**
 * @param {Array} payments  one ambassador's payments, any order. Each needs an amount, a time
 *                          (createdAt) and a member identity (userId / userEmail / memberId).
 *                          Payments with status other than 'success' (when a status is present)
 *                          are ignored.
 * @returns {{ payments: Array, totals: { members, tier, rate, totalCommission, membersToNextTier } }}
 *          payments keeps the input order, each entry extended with { rank, rate, commission }.
 */
export function computeCommissions(payments = []) {
  const valid = (payments || []).filter(p => p && (p.status == null || p.status === 'success'));

  // Earliest payment time per member
  const first = new Map();
  valid.forEach((p) => {
    const key = memberKey(p);
    const t = toMillis(p.createdAt);
    if (!first.has(key) || t < first.get(key)) first.set(key, t);
  });

  // Rank by first payment time; identical times fall back to the member id so the order is stable
  const ranked = [...first.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const rankOf = new Map(ranked.map(([key], i) => [key, i + 1]));

  let totalCommission = 0;
  const out = (payments || []).map((p) => {
    if (!p || !valid.includes(p)) return { ...p, rank: null, rate: 0, gstRate: 0, netAmount: 0, commission: 0 };
    const rank = rankOf.get(memberKey(p));
    const rate = rank <= COMMISSION_TIER1_MAX_MEMBERS ? COMMISSION_TIER1_RATE : COMMISSION_TIER2_RATE;
    const gstRate = gstRateFor(p);
    const net = (Number(p.amount) || 0) / (1 + gstRate / 100);
    const commission = money(net * rate);
    totalCommission += commission;
    return { ...p, rank, rate, gstRate, netAmount: money(net), commission };
  });

  const members = ranked.length;
  const tier2 = members > COMMISSION_TIER1_MAX_MEMBERS;
  return {
    payments: out,
    totals: {
      members,
      tier: tier2 ? 2 : 1,
      rate: tier2 ? COMMISSION_TIER2_RATE : COMMISSION_TIER1_RATE,
      totalCommission: money(totalCommission),
      // members still needed until the next member to arrive would earn 50% (the 301st)
      membersToNextTier: tier2 ? 0 : COMMISSION_TIER1_MAX_MEMBERS + 1 - members
    }
  };
}

export const formatRate = (rate) => `${Math.round(rate * 100)}%`;
