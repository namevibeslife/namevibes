import assert from 'node:assert/strict';
import { computeCommissions, COMMISSION_TIER1_RATE as T1, COMMISSION_TIER2_RATE as T2 } from '../src/utils/commission.js';

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

// 0% GST (any other country): commission is on the full amount paid
r = computeCommissions([{ userId: 'u', amount: 12, currency: 'USD', countryCode: 'US', createdAt: 1 }]);
assert.equal(r.payments[0].gstRate, 0);
assert.equal(r.payments[0].netAmount, 12);
assert.equal(r.payments[0].commission, 3.6);

console.log('commission tests passed');
