import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, TrendingUp, Calendar, Globe, MapPin } from 'lucide-react';
import { computeCommissions, commissionExample, taxLabel, countryOf, formatRate, COMMISSION_TIER1_MAX_MEMBERS, COMMISSION_TIER2_RATE } from '../utils/commission';
import { CURRENCY_SYMBOLS, COUNTRIES } from '../data/countries';
import { loadTaxRates } from '../utils/pricing';
import { maskEmail, maskName } from '../utils/ambassadorInvite';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const symbolFor = (currency) => CURRENCY_SYMBOLS[currency] || (currency ? `${currency} ` : '');
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

function Card({ icon: Icon, label, value, border }) {
  return (
    <div className={`bg-paper rounded-xl shadow-lg p-5 border-l-4 ${border} min-w-0`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">{value}</p>
        </div>
        <Icon className="w-10 h-10 text-gray-400 opacity-30 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

// "My Followers": members who joined with the ambassador's code, subscriptions, tiered earnings
// (src/utils/commission.js) and payouts.
export default function AmbassadorFollowers({ ambassador }) {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [taxRates, setTaxRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotice('');
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('ambassadorEmail', '==', ambassador.email)));
        const userList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let paymentList;
        try {
          const codes = [ambassador.referralCode, ambassador.legacyCode].filter(Boolean);
          const snaps = await Promise.all(codes.map(code => getDocs(query(collection(db, 'payments'), where('referralCode', '==', code)))));
          paymentList = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
          // Payment history isn't readable (database rules not updated yet): fall back to each
          // member's latest payment from their profile, which can't show renewals.
          console.warn('Payments not readable, using member profiles:', error.code || error.message);
          setNotice('Showing each member\'s latest payment only. Full payment history will appear once it is enabled.');
          paymentList = userList.filter(u => u.paidAmount && u.paidAt).map(u => ({
            id: `u_${u.id}`, userId: u.id, userEmail: u.email, amount: u.paidAmount, createdAt: u.paidAt,
            currency: u.currency, planType: u.planType, status: 'success'
          }));
        }

        const payoutSnap = await getDocs(query(collection(db, 'payoutRequests'), where('ambassadorEmail', '==', ambassador.email)));
        const payoutList = payoutSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.year - a.year) || (b.month - a.month));

        const rates = await loadTaxRates();
        if (!cancelled) { setUsers(userList); setPayments(paymentList); setPayouts(payoutList); setTaxRates(rates); }
      } catch (error) {
        console.error('Error loading followers:', error);
        if (!cancelled) setNotice('Could not load your followers. Please refresh the page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (ambassador?.email) load();
    return () => { cancelled = true; };
  }, [ambassador.email, ambassador.referralCode]);

  const country = COUNTRIES[ambassador.countryCode];
  const ownCurrency = payments.find(p => p.currency)?.currency || country?.currency || 'USD';

  const { rows, totals, byCurrency } = useMemo(() => {
    const usersById = new Map(users.map(u => [u.id, u]));
    const result = computeCommissions(payments.map(p => ({ ...p, memberId: p.userId || p.userEmail })), { taxRates });
    const rows = result.payments
      .map(p => ({ ...p, user: usersById.get(p.userId), currency: p.currency || ownCurrency }))
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
    const byCurrency = {};
    rows.forEach(r => { byCurrency[r.currency] = (byCurrency[r.currency] || 0) + r.commission; });
    return { rows, totals: result.totals, byCurrency };
  }, [payments, users, ownCurrency, taxRates]);

  const earningLines = Object.entries(byCurrency).sort(([a], [b]) => (a === ownCurrency ? -1 : b === ownCurrency ? 1 : 0));
  const earningText = earningLines.length
    ? earningLines.map(([c, v]) => `${symbolFor(c)}${fmt(v)}`).join(' + ')
    : `${symbolFor(ownCurrency)}0`;

  const breakdown = useMemo(() => {
    const by = { country: {}, state: {}, month: {}, gender: { Male: 0, Female: 0, Other: 0 } };
    const soon = new Date(Date.now() + 30 * 86400000);
    const renewals = [];
    users.forEach(u => {
      by.country[u.countryName || 'Unknown'] = (by.country[u.countryName || 'Unknown'] || 0) + 1;
      by.state[u.stateName || 'Unknown'] = (by.state[u.stateName || 'Unknown'] || 0) + 1;
      by.gender[u.gender || 'Other'] = (by.gender[u.gender || 'Other'] || 0) + 1;
      const paid = toDate(u.paidAt);
      if (paid) { const k = `${MONTHS[paid.getMonth()]} ${paid.getFullYear()}`; by.month[k] = (by.month[k] || 0) + 1; }
      const expiry = toDate(u.planExpiry);
      if (expiry && expiry > new Date() && expiry < soon) {
        renewals.push({ name: maskName(u.fullName || u.firstName), expiry, daysLeft: Math.ceil((expiry - new Date()) / 86400000) });
      }
    });
    return { ...by, renewals };
  }, [users]);

  if (loading) return <div className="py-10 text-center text-gray-600">Loading your followers...</div>;

  const tier2 = totals.tier === 2;
  const progress = Math.min(100, Math.round((totals.members / (COMMISSION_TIER1_MAX_MEMBERS + 1)) * 100));
  const list = (obj) => Object.entries(obj).length
    ? Object.entries(obj).map(([k, v]) => (
      <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 gap-3">
        <span className="text-gray-700 break-words min-w-0">{k}</span><span className="font-bold text-brand-600">{v}</span>
      </div>))
    : <p className="text-gray-500 text-sm">No data available</p>;

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">{notice}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label="Members" value={totals.members} border="border-ocean-500" />
        <Card icon={TrendingUp} label="Current tier" value={`${formatRate(totals.rate)} commission`} border="border-brand-500" />
        <Card icon={TrendingUp} label="Total earnings (net of GST)" value={earningText} border="border-green-500" />
        <Card icon={Calendar} label="Renewals due (30 days)" value={breakdown.renewals.length} border="border-orange-500" />
      </div>

      <section className="bg-paper rounded-xl shadow-lg p-5" aria-labelledby="tier-heading">
        <h3 id="tier-heading" className="text-lg font-bold text-gray-800 mb-1">Your commission tier</h3>
        <p className="text-sm text-gray-600 mb-3">
          30% on every payment from your first {COMMISSION_TIER1_MAX_MEMBERS} members, then {formatRate(COMMISSION_TIER2_RATE)} from the 301st member onward. Commission is calculated on the amount paid, excluding GST.
        </p>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={COMMISSION_TIER1_MAX_MEMBERS + 1} aria-valuenow={Math.min(totals.members, COMMISSION_TIER1_MAX_MEMBERS + 1)} aria-label="Progress to the 50% tier">
          <div className="h-full bg-gradient-to-r from-brand-600 to-ocean-600" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm font-semibold text-gray-800 mt-2">
          {tier2 ? 'You are on the 50% tier. New members earn you 50%.' : `${totals.membersToNextTier} more member${totals.membersToNextTier === 1 ? '' : 's'} to reach 50%`}
        </p>
      </section>

      <section className="bg-paper rounded-xl shadow-lg p-5" aria-labelledby="members-heading">
        <h3 id="members-heading" className="text-lg font-bold text-gray-800 mb-3">Members and commission</h3>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments from your referrals yet. Share your code to get started.</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 bg-brand-50 border border-brand-200 rounded-lg p-3 mb-3 break-words" data-testid="commission-example">
              Example: {commissionExample(rows[0], symbolFor(rows[0].currency))}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Tax removed</th>
                    <th className="px-3 py-2 text-right">Net amount</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-800">{maskName(r.user?.fullName || r.user?.firstName)}</span>
                        <span className="block text-xs text-gray-500">{maskEmail(r.user?.email || r.userEmail)} · {toDate(r.createdAt)?.toLocaleDateString() || '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{symbolFor(r.currency)}{fmt(r.amount || 0)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" title={`${taxLabel(countryOf(r))} ${r.gstRate}%`}>{symbolFor(r.currency)}{fmt(r.taxAmount)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{symbolFor(r.currency)}{fmt(r.netAmount)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatRate(r.rate)}</td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{symbolFor(r.currency)}{fmt(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {payouts.length > 0 && (
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Payout history</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <tr><th className="px-3 py-2">Month</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Paid on</th><th className="px-3 py-2">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{MONTHS[p.month - 1]} {p.year}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold">{p.currencySymbol || symbolFor(p.currency)}{p.commissionAmount}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{String(p.status || '').toUpperCase()}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{toDate(p.paidAt)?.toLocaleDateString() || '-'}</td>
                    <td className="px-3 py-2">{p.paymentNote || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-3"><Globe className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-gray-800">By Country</h3></div>
          {list(breakdown.country)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-3"><MapPin className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-gray-800">By State</h3></div>
          {list(breakdown.state)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">By Gender</h3>
          {list(breakdown.gender)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Month-wise sign-ups</h3>
          {list(breakdown.month)}
        </section>
      </div>

      {breakdown.renewals.length > 0 && (
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Upcoming renewals (next 30 days)</h3>
          <div className="space-y-2">
            {breakdown.renewals.map((r, i) => (
              <div key={i} className="flex flex-wrap justify-between items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="font-medium text-gray-800">{r.name}</span>
                <span className="text-sm text-gray-600">Expires {r.expiry.toLocaleDateString()} <b className="ml-2 text-orange-600">{r.daysLeft} days left</b></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
