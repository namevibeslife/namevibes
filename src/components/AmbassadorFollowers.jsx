import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '../i18n/format';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, TrendingUp, Calendar, Globe, MapPin } from 'lucide-react';
import { computeCommissions, countryOf, formatRate, COMMISSION_TIER1_RATE, COMMISSION_TIER1_MAX_MEMBERS, COMMISSION_TIER2_RATE } from '../utils/commission';
import { CURRENCY_SYMBOLS, COUNTRIES } from '../data/countries';
import { loadTaxRates } from '../utils/pricing';
import { maskEmail, maskName } from '../utils/ambassadorInvite';

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const symbolFor = (currency) => CURRENCY_SYMBOLS[currency] || (currency ? `${currency} ` : '');
const fmt = (n) => formatNumber(Math.round(n * 100) / 100, undefined, { maximumFractionDigits: 2 });

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
  const { t } = useTranslation();
  const taxNameFor = (row) => (String(countryOf(row)).toUpperCase() === 'IN' ? t('followers.gst') : t('followers.tax'));
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
          setNotice(t('followers.latestOnly'));
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
        if (!cancelled) setNotice(t('followers.loadFailed'));
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
      if (paid) { const k = `${paid.getFullYear()}-${String(paid.getMonth() + 1).padStart(2, '0')}`; by.month[k] = (by.month[k] || 0) + 1; }
      const expiry = toDate(u.planExpiry);
      if (expiry && expiry > new Date() && expiry < soon) {
        renewals.push({ name: maskName(u.fullName || u.firstName), expiry, daysLeft: Math.ceil((expiry - new Date()) / 86400000) });
      }
    });
    return { ...by, renewals };
  }, [users]);

  if (loading) return <div className="py-10 text-center text-gray-600">{t('followers.loading')}</div>;

  const tier2 = totals.tier === 2;
  const progress = Math.min(100, Math.round((totals.members / (COMMISSION_TIER1_MAX_MEMBERS + 1)) * 100));
  const monthLabel = (k) => { const [y, m] = String(k).split('-'); return formatDate(new Date(+y, +m - 1, 1), undefined, { month: 'long', year: 'numeric' }); };
  const genderLabel = (k) => t(`profileComplete.${String(k).toLowerCase()}`, { defaultValue: k });
  const list = (obj, labelFn = (k) => (k === 'Unknown' ? t('followers.unknown') : k)) => Object.entries(obj).length
    ? Object.entries(obj).map(([k, v]) => (
      <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 gap-3">
        <span className="text-gray-700 break-words min-w-0">{labelFn(k)}</span><span className="font-bold text-brand-600">{v}</span>
      </div>))
    : <p className="text-gray-500 text-sm">{t('followers.noData')}</p>;

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">{notice}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label={t('followers.members')} value={totals.members} border="border-ocean-500" />
        <Card icon={TrendingUp} label={t('followers.currentTier')} value={t('followers.rateCommission', { rate: formatRate(totals.rate) })} border="border-brand-500" />
        <Card icon={TrendingUp} label={t('followers.totalEarnings')} value={earningText} border="border-green-500" />
        <Card icon={Calendar} label={t('followers.renewalsDue')} value={breakdown.renewals.length} border="border-orange-500" />
      </div>

      <section className="bg-paper rounded-xl shadow-lg p-5" aria-labelledby="tier-heading">
        <h3 id="tier-heading" className="text-lg font-bold text-gray-800 mb-1">{t('followers.tierHeading')}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {t('followers.tierText', { first: formatRate(COMMISSION_TIER1_RATE), max: COMMISSION_TIER1_MAX_MEMBERS, next: COMMISSION_TIER1_MAX_MEMBERS + 1, rate2: formatRate(COMMISSION_TIER2_RATE) })}
        </p>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={COMMISSION_TIER1_MAX_MEMBERS + 1} aria-valuenow={Math.min(totals.members, COMMISSION_TIER1_MAX_MEMBERS + 1)} aria-label={t('followers.progressAria', { rate: formatRate(COMMISSION_TIER2_RATE) })}>
          <div className="h-full bg-gradient-to-r from-brand-600 to-ocean-600" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm font-semibold text-gray-800 mt-2">
          {tier2 ? t('followers.onTier2', { rate: formatRate(COMMISSION_TIER2_RATE) }) : t('followers.toNextTier', { count: totals.membersToNextTier, rate: formatRate(COMMISSION_TIER2_RATE) })}
        </p>
      </section>

      <section className="bg-paper rounded-xl shadow-lg p-5" aria-labelledby="members-heading">
        <h3 id="members-heading" className="text-lg font-bold text-gray-800 mb-3">{t('followers.membersHeading')}</h3>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('followers.noPayments')}</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 bg-brand-50 border border-brand-200 rounded-lg p-3 mb-3 break-words" data-testid="commission-example">
              {t('followers.example', { paid: `${symbolFor(rows[0].currency)}${fmt(rows[0].amount || 0)}`, tax: `${symbolFor(rows[0].currency)}${fmt(rows[0].taxAmount)}`, taxName: taxNameFor(rows[0]), net: `${symbolFor(rows[0].currency)}${fmt(rows[0].netAmount)}`, rate: formatRate(rows[0].rate), commission: `${symbolFor(rows[0].currency)}${fmt(rows[0].commission)}` })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">{t('followers.colMember')}</th>
                    <th className="px-3 py-2 text-right">{t('followers.colPaid')}</th>
                    <th className="px-3 py-2 text-right">{t('followers.colTax')}</th>
                    <th className="px-3 py-2 text-right">{t('followers.colNet')}</th>
                    <th className="px-3 py-2 text-right">{t('followers.colRate')}</th>
                    <th className="px-3 py-2 text-right">{t('followers.colCommission')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-800">{maskName(r.user?.fullName || r.user?.firstName)}</span>
                        <span className="block text-xs text-gray-500">{maskEmail(r.user?.email || r.userEmail)} · {toDate(r.createdAt) ? formatDate(r.createdAt) : '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{symbolFor(r.currency)}{fmt(r.amount || 0)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" title={`${taxNameFor(r)} ${r.gstRate}%`}>{symbolFor(r.currency)}{fmt(r.taxAmount)}</td>
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
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('followers.payoutHistory')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <tr><th className="px-3 py-2">{t('followers.colMonth')}</th><th className="px-3 py-2">{t('followers.colAmount')}</th><th className="px-3 py-2">{t('followers.colStatus')}</th><th className="px-3 py-2">{t('followers.colPaidOn')}</th><th className="px-3 py-2">{t('followers.colNote')}</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(new Date(p.year, p.month - 1, 1), undefined, { month: 'long', year: 'numeric' })}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold">{p.currencySymbol || symbolFor(p.currency)}{p.commissionAmount}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t(`followers.status.${p.status}`, { defaultValue: String(p.status || '').toUpperCase() })}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{toDate(p.paidAt) ? formatDate(p.paidAt) : '-'}</td>
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
          <div className="flex items-center gap-2 mb-3"><Globe className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-gray-800">{t('followers.byCountry')}</h3></div>
          {list(breakdown.country)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-3"><MapPin className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-gray-800">{t('followers.byState')}</h3></div>
          {list(breakdown.state)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('followers.byGender')}</h3>
          {list(breakdown.gender, genderLabel)}
        </section>
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('followers.byMonth')}</h3>
          {list(breakdown.month, monthLabel)}
        </section>
      </div>

      {breakdown.renewals.length > 0 && (
        <section className="bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('followers.upcoming')}</h3>
          <div className="space-y-2">
            {breakdown.renewals.map((r, i) => (
              <div key={i} className="flex flex-wrap justify-between items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="font-medium text-gray-800">{r.name}</span>
                <span className="text-sm text-gray-600">{t('followers.expires', { date: formatDate(r.expiry) })} <b className="ml-2 text-orange-600">{t('followers.daysLeft', { count: r.daysLeft })}</b></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
