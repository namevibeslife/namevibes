import assert from 'node:assert/strict';
import { computeCommissions, commissionExample, COMMISSION_TIER1_RATE as T1, COMMISSION_TIER2_RATE as T2 } from '../src/utils/commission.js';

const pay = (member, t, amount = 100) => ({ userId: member, amount, createdAt: new Date(2026, 0, 1, 0, 0, t), status: 'success' });
const members = (n) => Array.from({ length: n }, (_, i) => pay('m' + String(i).padStart(4, '0'), i));

// zero payments
let r = computeCommissions([]);
assert.deepEqual(r.totals, { members: 0, tier: 1, rate: T1, totalCommission: 0, membersToNextTier: 301 });

// 1 member
r = computeCommissions([pay('a', 1, 399)]);
assert.equal(r.payments[0].rate, T1);
assert.equal(r.payments[0].commission, 119.7);
assert.equal(r.totals.members, 1);
assert.equal(r.totals.membersToNextTier, 300);

// 300 members: all 30%, still tier 1, one more to go
r = computeCommissions(members(300));
assert.ok(r.payments.every(p => p.rate === T1));
assert.equal(r.totals.tier, 1);
assert.equal(r.totals.membersToNextTier, 1);
assert.equal(r.totals.totalCommission, 9000);

// 301st member earns 50%, the 300th still 30%; input order irrelevant
const list = members(301).reverse();
r = computeCommissions(list);
assert.equal(r.payments.find(p => p.userId === 'm0300').rate, T2);
assert.equal(r.payments.find(p => p.userId === 'm0299').rate, T1);
assert.equal(r.totals.tier, 2);
assert.equal(r.totals.membersToNextTier, 0);
assert.equal(r.totals.totalCommission, 300 * 30 + 50);

// renewals keep the rank's rate: rank 5 stays 30%, rank 301 stays 50% (even a later renewal after more members join)
const base = members(301);
const withRenewals = [...base, pay('m0004', 9000), pay('m0300', 9001)];
r = computeCommissions(withRenewals);
assert.equal(r.payments[301].rate, T1);
assert.equal(r.payments[302].rate, T2);
assert.equal(r.payments[301].rank, 5);

// two payments with the same timestamp (two members): deterministic order, same-member payments share a rank
r = computeCommissions([pay('b', 5), pay('a', 5), pay('a', 5)]);
assert.equal(r.totals.members, 2);
assert.equal(r.payments[1].rank, 1);
assert.equal(r.payments[0].rank, 2);
assert.equal(r.payments[2].rank, 1);

// failed payments are ignored; firestore-style timestamps work
r = computeCommissions([{ userId: 'x', amount: 50, status: 'failed', createdAt: 1 }, { userId: 'y', amount: 50, createdAt: { toDate: () => new Date(5) } }]);
assert.equal(r.totals.members, 1);
assert.equal(r.payments[0].commission, 0);
assert.equal(r.payments[1].commission, 15);

// India: Rs 399 with 10% off = Rs 359 paid; net of 18% GST = 304.24; 30% = 91.27, 50% = 152.12
const inPay = (member, t, extra = {}) => ({ userId: member, amount: 359, currency: 'INR', countryCode: 'IN', createdAt: new Date(2026, 0, 1, 0, 0, t), status: 'success', ...extra });
r = computeCommissions([inPay('a', 1)]);
assert.equal(r.payments[0].gstRate, 18);
assert.equal(r.payments[0].netAmount, 304.24);
assert.equal(r.payments[0].commission, 91.27);
assert.equal(r.totals.totalCommission, 91.27);

// the 301st India member earns 50% of the net amount; renewals use the same rule and rate
const india = Array.from({ length: 301 }, (_, i) => inPay('i' + String(i).padStart(4, '0'), i));
r = computeCommissions([...india, inPay('i0000', 9000), inPay('i0300', 9001)]);
assert.equal(r.payments[300].commission, 152.12);
assert.equal(r.payments[299].commission, 91.27);
assert.equal(r.payments[301].commission, 91.27);   // renewal of rank 1
assert.equal(r.payments[302].commission, 152.12);  // renewal of rank 301

// INR payment with no countryCode (older records) is still India
r = computeCommissions([{ userId: 'x', amount: 359, currency: 'INR', createdAt: 1 }]);
assert.equal(r.payments[0].commission, 91.27);

// US $25, no tax set: commission on the full amount paid (30% = 7.50)
r = computeCommissions([{ userId: 'u', amount: 25, currency: 'USD', countryCode: 'US', createdAt: 1 }]);
assert.equal(r.payments[0].gstRate, 0);
assert.equal(r.payments[0].taxAmount, 0);
assert.equal(r.payments[0].netAmount, 25);
assert.equal(r.payments[0].commission, 7.5);

// UAE 50 AED at 5% VAT (admin setting taxPercent): net 47.62, tax 2.38, 30% = 14.29, 50% = 23.81
const ae = { userId: 'e', amount: 50, currency: 'AED', countryCode: 'AE', createdAt: 1 };
r = computeCommissions([ae], { taxRates: { AE: 5 } });
assert.equal(r.payments[0].gstRate, 5);
assert.equal(r.payments[0].taxAmount, 2.38);
assert.equal(r.payments[0].netAmount, 47.62);
assert.equal(r.payments[0].commission, 14.29);
const ae301 = [...Array.from({ length: 300 }, (_, i) => ({ userId: 'f' + i, amount: 50, currency: 'AED', countryCode: 'AE', createdAt: i })), { ...ae, createdAt: 999 }];
assert.equal(computeCommissions(ae301, { taxRates: { AE: 5 } }).payments[300].commission, 23.81);
// not set => fallback (0 for AE); a setting of 0 is respected; admin setting overrides India's default
assert.equal(computeCommissions([ae]).payments[0].commission, 15);
assert.equal(computeCommissions([ae], { taxRates: { AE: 0 } }).payments[0].gstRate, 0);
assert.equal(computeCommissions([inPay('z', 1)], { taxRates: { IN: 12 } }).payments[0].gstRate, 12);
assert.equal(computeCommissions([inPay('z', 1)], { taxRates: {} }).payments[0].gstRate, 18);

// the example line uses the same computed numbers as the table
r = computeCommissions([inPay('a', 1)]);
assert.equal(commissionExample(r.payments[0], '₹'), '₹359 paid − ₹54.76 GST = ₹304.24 net × 30% = ₹91.27');

console.log('commission tests passed');
