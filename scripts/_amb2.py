from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

p = 'src/components/AmbassadorFollowers.jsx'
sub(p, [
("const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];\n", ""),
("const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });", "const fmt = (n) => formatNumber(Math.round(n * 100) / 100, undefined, { maximumFractionDigits: 2 });"),
("setNotice('Showing each member\\'s latest payment only. Full payment history will appear once it is enabled.');", "setNotice(t('followers.latestOnly'));"),
("setNotice('Could not load your followers. Please refresh the page.');", "setNotice(t('followers.loadFailed'));"),
("by = { country: {}, state: {}, month: {}, gender: { Male: 0, Female: 0, Other: 0 } }", "by = { country: {}, state: {}, month: {}, gender: { Male: 0, Female: 0, Other: 0 } }"),
("const k = `${MONTHS[paid.getMonth()]} ${paid.getFullYear()}`;", "const k = `${paid.getFullYear()}-${String(paid.getMonth() + 1).padStart(2, '0')}`;"),
("<div className=\"py-10 text-center text-gray-600\">Loading your followers...</div>", "<div className=\"py-10 text-center text-gray-600\">{t('followers.loading')}</div>"),
("  const list = (obj) => Object.entries(obj).length", "  const monthLabel = (k) => { const [y, m] = String(k).split('-'); return formatDate(new Date(+y, +m - 1, 1), undefined, { month: 'long', year: 'numeric' }); };\n  const genderLabel = (k) => t(`profileComplete.${String(k).toLowerCase()}`, { defaultValue: k });\n  const list = (obj, labelFn = (k) => (k === 'Unknown' ? t('followers.unknown') : k)) => Object.entries(obj).length"),
("<span className=\"text-gray-700 break-words min-w-0\">{k}</span>", "<span className=\"text-gray-700 break-words min-w-0\">{labelFn(k)}</span>"),
("<p className=\"text-gray-500 text-sm\">No data available</p>", "<p className=\"text-gray-500 text-sm\">{t('followers.noData')}</p>"),
("<Card icon={Users} label=\"Members\" value={totals.members}", "<Card icon={Users} label={t('followers.members')} value={totals.members}"),
("<Card icon={TrendingUp} label=\"Current tier\" value={`${formatRate(totals.rate)} commission`}", "<Card icon={TrendingUp} label={t('followers.currentTier')} value={t('followers.rateCommission', { rate: formatRate(totals.rate) })}"),
("label=\"Total earnings (net of GST)\"", "label={t('followers.totalEarnings')}"),
("label=\"Renewals due (30 days)\"", "label={t('followers.renewalsDue')}"),
(">Your commission tier</h3>", ">{t('followers.tierHeading')}</h3>"),
("          30% on every payment from your first {COMMISSION_TIER1_MAX_MEMBERS} members, then {formatRate(COMMISSION_TIER2_RATE)} from the 301st member onward. Commission is calculated on the amount paid, excluding GST.", "          {t('followers.tierText', { first: formatRate(COMMISSION_TIER1_RATE), max: COMMISSION_TIER1_MAX_MEMBERS, next: COMMISSION_TIER1_MAX_MEMBERS + 1, rate2: formatRate(COMMISSION_TIER2_RATE) })}"),
("aria-label=\"Progress to the 50% tier\"", "aria-label={t('followers.progressAria', { rate: formatRate(COMMISSION_TIER2_RATE) })}"),
("{tier2 ? 'You are on the 50% tier. New members earn you 50%.' : `${totals.membersToNextTier} more member${totals.membersToNextTier === 1 ? '' : 's'} to reach 50%`}", "{tier2 ? t('followers.onTier2', { rate: formatRate(COMMISSION_TIER2_RATE) }) : t('followers.toNextTier', { count: totals.membersToNextTier, rate: formatRate(COMMISSION_TIER2_RATE) })}"),
(">Members and commission</h3>", ">{t('followers.membersHeading')}</h3>"),
("<p className=\"text-gray-500 text-sm\">No payments from your referrals yet. Share your code to get started.</p>", "<p className=\"text-gray-500 text-sm\">{t('followers.noPayments')}</p>"),
("              Example: {commissionExample(rows[0], symbolFor(rows[0].currency))}", "              {t('followers.example', { paid: `${symbolFor(rows[0].currency)}${fmt(rows[0].amount || 0)}`, tax: `${symbolFor(rows[0].currency)}${fmt(rows[0].taxAmount)}`, taxName: taxNameFor(rows[0]), net: `${symbolFor(rows[0].currency)}${fmt(rows[0].netAmount)}`, rate: formatRate(rows[0].rate), commission: `${symbolFor(rows[0].currency)}${fmt(rows[0].commission)}` })}"),
(">Member</th>", ">{t('followers.colMember')}</th>"), (">Paid</th>", ">{t('followers.colPaid')}</th>"),
(">Tax removed</th>", ">{t('followers.colTax')}</th>"), (">Net amount</th>", ">{t('followers.colNet')}</th>"),
(">Rate</th>", ">{t('followers.colRate')}</th>"), (">Commission</th>", ">{t('followers.colCommission')}</th>"),
("{toDate(r.createdAt)?.toLocaleDateString() || '-'}</span>", "{toDate(r.createdAt) ? formatDate(r.createdAt) : '-'}</span>"),
("title={`${taxLabel(countryOf(r))} ${r.gstRate}%`}", "title={`${taxNameFor(r)} ${r.gstRate}%`}"),
(">Payout history</h3>", ">{t('followers.payoutHistory')}</h3>"),
("<th className=\"px-3 py-2\">Month</th><th className=\"px-3 py-2\">Amount</th><th className=\"px-3 py-2\">Status</th><th className=\"px-3 py-2\">Paid on</th><th className=\"px-3 py-2\">Note</th>", "<th className=\"px-3 py-2\">{t('followers.colMonth')}</th><th className=\"px-3 py-2\">{t('followers.colAmount')}</th><th className=\"px-3 py-2\">{t('followers.colStatus')}</th><th className=\"px-3 py-2\">{t('followers.colPaidOn')}</th><th className=\"px-3 py-2\">{t('followers.colNote')}</th>"),
("{MONTHS[p.month - 1]} {p.year}", "{formatDate(new Date(p.year, p.month - 1, 1), undefined, { month: 'long', year: 'numeric' })}"),
("{String(p.status || '').toUpperCase()}", "{t(`followers.status.${p.status}`, { defaultValue: String(p.status || '').toUpperCase() })}"),
("{toDate(p.paidAt)?.toLocaleDateString() || '-'}", "{toDate(p.paidAt) ? formatDate(p.paidAt) : '-'}"),
(">By Country</h3>", ">{t('followers.byCountry')}</h3>"), (">By State</h3>", ">{t('followers.byState')}</h3>"),
(">By Gender</h3>", ">{t('followers.byGender')}</h3>"), (">Month-wise sign-ups</h3>", ">{t('followers.byMonth')}</h3>"),
("{list(breakdown.gender)}", "{list(breakdown.gender, genderLabel)}"), ("{list(breakdown.month)}", "{list(breakdown.month, monthLabel)}"),
(">Upcoming renewals (next 30 days)</h3>", ">{t('followers.upcoming')}</h3>"),
("Expires {r.expiry.toLocaleDateString()} <b className=\"ml-2 text-orange-600\">{r.daysLeft} days left</b>", "{t('followers.expires', { date: formatDate(r.expiry) })} <b className=\"ml-2 text-orange-600\">{t('followers.daysLeft', { count: r.daysLeft })}</b>"),
])
s = open(p, encoding='utf-8').read()
s = s.replace("export default function AmbassadorFollowers({ ambassador }) {", "export default function AmbassadorFollowers({ ambassador }) {\n  const { t } = useTranslation();\n  const taxNameFor = (row) => (String(countryOf(row)).toUpperCase() === 'IN' ? t('followers.gst') : t('followers.tax'));", 1)
s = s.replace("function Card(", "function Card(", 1)
s = s.replace("import React, { useEffect, useMemo, useState } from 'react';", "import React, { useEffect, useMemo, useState } from 'react';\nimport { useTranslation } from 'react-i18next';\nimport { formatDate, formatNumber } from '../i18n/format';", 1)
open(p, 'w', encoding='utf-8').write(s)
X.add([
('followers.latestOnly', "Showing each member's latest payment only. Full payment history will appear once it is enabled."),
('followers.loadFailed', 'Could not load your followers. Please refresh the page.'),
('followers.loading', 'Loading your followers...'), ('followers.unknown', 'Unknown'), ('followers.noData', 'No data available'),
('followers.members', 'Members'), ('followers.currentTier', 'Current tier'), ('followers.rateCommission', '{{rate}} commission'),
('followers.totalEarnings', 'Total earnings (net of GST)'), ('followers.renewalsDue', 'Renewals due (30 days)'),
('followers.tierHeading', 'Your commission tier'),
('followers.tierText', '{{first}} on every payment from your first {{max}} members, then {{rate2}} from the {{next}}st member onward. Commission is calculated on the amount paid, excluding GST.'),
('followers.progressAria', 'Progress to the {{rate}} tier'),
('followers.onTier2', 'You are on the {{rate}} tier. New members earn you {{rate}}.'),
('followers.toNextTier_one', '{{count}} more member to reach {{rate}}'), ('followers.toNextTier_other', '{{count}} more members to reach {{rate}}'),
('followers.membersHeading', 'Members and commission'), ('followers.noPayments', 'No payments from your referrals yet. Share your code to get started.'),
('followers.example', 'Example: {{paid}} paid − {{tax}} {{taxName}} = {{net}} net × {{rate}} = {{commission}}'),
('followers.gst', 'GST'), ('followers.tax', 'tax'),
('followers.colMember', 'Member'), ('followers.colPaid', 'Paid'), ('followers.colTax', 'Tax removed'), ('followers.colNet', 'Net amount'),
('followers.colRate', 'Rate'), ('followers.colCommission', 'Commission'), ('followers.payoutHistory', 'Payout history'),
('followers.colMonth', 'Month'), ('followers.colAmount', 'Amount'), ('followers.colStatus', 'Status'), ('followers.colPaidOn', 'Paid on'), ('followers.colNote', 'Note'),
('followers.status.paid', 'PAID'), ('followers.status.pending', 'PENDING'),
('followers.byCountry', 'By Country'), ('followers.byState', 'By State'), ('followers.byGender', 'By Gender'), ('followers.byMonth', 'Month-wise sign-ups'),
('followers.upcoming', 'Upcoming renewals (next 30 days)'), ('followers.expires', 'Expires {{date}}'),
('followers.daysLeft_one', '{{count}} day left'), ('followers.daysLeft_other', '{{count}} days left'),
])
print('ok')
