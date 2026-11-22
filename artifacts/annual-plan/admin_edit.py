p = 'src/pages/AdminDashboard.jsx'
s = open(p, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new, count)

# ---- imports
rep("import { ambassadorLabel, codeWithName } from '../utils/payoutLabel';",
    "import { ambassadorLabel, codeWithName } from '../utils/payoutLabel';\nimport AmbassadorProfileView from '../components/AmbassadorProfileView';\nimport AmbassadorChangeLog, { BankChangeFlag } from '../components/AmbassadorChangeLog';")
rep("  Share2\n} from 'lucide-react';", "  Share2,\n  ChevronDown,\n  ChevronRight\n} from 'lucide-react';")

# ---- state / counts
rep("  const [ambTab, setAmbTab] = useState('active');",
    "  const [ambTab, setAmbTab] = useState('active'); // active | invited | deactivated | pending | invite | tools\n  const [ambOpen, setAmbOpen] = useState(false);\n  const [detailFor, setDetailFor] = useState(null);")
rep("  const ambTabs = [",
    """  const ambCounts = {
    active: ambassadors.filter(a => a.isApproved && a.isActive && a.lastLoginAt).length,
    invited: ambassadors.filter(a => a.isApproved && a.isActive && !a.lastLoginAt).length,
    deactivated: ambassadors.filter(a => a.isApproved && !a.isActive).length,
    pending: ambassadors.filter(a => !a.isApproved).length
  };
  const ambTitles = {
    active: 'Active ambassadors', invited: 'Invited – not signed in', deactivated: 'Deactivated ambassadors',
    pending: 'Pending applications', invite: 'Invite ambassador', tools: 'Home content & tools'
  };
  const goAmbassadors = (view) => { setActiveTab('ambassadors'); setAmbTab(view); setAmbOpen(true); };
  const ambTabs = [""")

# ---- sidebar group
a = s.index("            {canViewFeature('ambassadors') && (\n              <button\n                onClick={() => setActiveTab('ambassadors')}")
b = s.index("            {canViewFeature('payments') && (", a)
group = """            {canViewFeature('ambassadors') && (() => {
              const open = ambOpen || activeTab === 'ambassadors';
              const item = (view, label, count) => (
                <button
                  key={view}
                  onClick={() => goAmbassadors(view)}
                  aria-current={activeTab === 'ambassadors' && ambTab === view ? 'page' : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm transition ${
                    activeTab === 'ambassadors' && ambTab === view ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-left">{label}</span>
                  {count !== undefined && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{count}</span>}
                </button>
              );
              return (
                <div>
                  <button
                    onClick={() => (open && activeTab !== 'ambassadors' ? goAmbassadors('active') : activeTab === 'ambassadors' ? setAmbOpen(!ambOpen) : goAmbassadors('active'))}
                    aria-expanded={open}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === 'ambassadors' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <UserCheck size={20} />
                    Ambassadors
                    {stats.pendingAmbassadors > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{stats.pendingAmbassadors}</span>
                    )}
                    {stats.pendingAmbassadors > 0 ? null : <span className="ml-auto" />}
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {open && (
                    <div className="mt-1 ml-3 pl-3 border-l-2 border-brand-100 space-y-1">
                      {item('active', 'Active', ambCounts.active)}
                      {item('invited', 'Invited – not signed in', ambCounts.invited)}
                      {item('deactivated', 'Deactivated', ambCounts.deactivated)}
                      {ambCounts.pending > 0 && item('pending', 'Pending applications', ambCounts.pending)}
                      {item('invite', 'Invite ambassador')}
                      {item('tools', 'Home content & tools')}
                    </div>
                  )}
                </div>
              );
            })()}

"""
s = s[:a] + group + s[b:]

# ---- overview: Active Ambassadors card links to the Active view
rep("""                <div className="bg-paper rounded-xl shadow-lg p-6 border-l-4 border-brand-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Ambassadors</p>""",
    """                <div
                  role={canViewFeature('ambassadors') ? 'link' : undefined}
                  tabIndex={canViewFeature('ambassadors') ? 0 : undefined}
                  onClick={() => canViewFeature('ambassadors') && goAmbassadors('active')}
                  onKeyDown={(e) => { if (canViewFeature('ambassadors') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goAmbassadors('active'); } }}
                  className="bg-paper rounded-xl shadow-lg p-6 border-l-4 border-brand-500 cursor-pointer hover:shadow-xl transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Ambassadors</p>""")
rep("""                    <button
                      onClick={() => setActiveTab('ambassadors')}
                      className="p-4 bg-brand-50 border-2 border-brand-200 rounded-lg hover:bg-brand-100 transition text-left"
                    >
                      <UserCheck className="w-6 h-6 text-brand-600 mb-2" />
                      <p className="font-semibold text-gray-800">Review Ambassadors</p>""",
    """                    <button
                      onClick={() => goAmbassadors(stats.pendingAmbassadors > 0 ? 'pending' : 'active')}
                      className="p-4 bg-brand-50 border-2 border-brand-200 rounded-lg hover:bg-brand-100 transition text-left"
                    >
                      <UserCheck className="w-6 h-6 text-brand-600 mb-2" />
                      <p className="font-semibold text-gray-800">Review Ambassadors</p>""")

# ---- ambassadors section: one view at a time
rep('<h2 className="text-2xl font-bold text-gray-800">Ambassador Management</h2>',
    '<h2 className="text-2xl font-bold text-gray-800">{ambTitles[ambTab] || \'Ambassadors\'}</h2>')
i_inv = s.index("              <AmbassadorInvite\n")
i_susp = s.index("              <Suspense fallback={null}>\n                <AmbassadorContentAdmin")
i_fp = s.index('              <FilterPanel\n                filterType="ambassadors"')
end_marker = "            </div>\n          )}\n\n          {/* PAYMENTS TAB"
i_end = s.index(end_marker, i_fp)
chunk1 = s[i_inv:i_susp]
chunk2 = s[i_susp:i_fp]
chunk3 = s[i_fp:i_end]
s = (s[:i_inv]
     + "              {ambTab === 'invite' && (\n                <>\n" + chunk1 + "                </>\n              )}\n\n"
     + "              {ambTab === 'tools' && (\n                <>\n" + chunk2 + "                </>\n              )}\n\n"
     + "              {!['invite', 'tools'].includes(ambTab) && (\n                <>\n" + chunk3 + "                </>\n              )}\n"
     + s[i_end:])

# replace the tab strip with a search row (the sidebar now holds the navigation)
a = s.index('              <div className="flex flex-wrap items-center gap-2 mb-4" role="tablist"')
b = s.index("              {ambTab !== 'pending' ? (", a)
s = s[:a] + """              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="text-sm text-gray-600">{ambLists[ambTab]?.length ?? 0} shown</p>
                <input
                  type="search"
                  value={ambSearch}
                  onChange={(e) => setAmbSearch(e.target.value)}
                  placeholder="Search name, email or code"
                  aria-label="Search ambassadors"
                  className="w-full sm:w-64 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                />
              </div>

""" + s[b:]

# details button in rows
rep("""                                <div className="flex flex-wrap gap-2">
                                  {ambTab === 'invited' && (""",
    """                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setDetailFor(a)} className="px-3 py-2 min-h-[44px] rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-nowrap">Details</button>
                                  {ambTab === 'invited' && (""")

# detail modal, appended before the share payout modal
rep("      {/* Share Payout Modal */}",
    """      {/* Ambassador detail view (profile + change history) */}
      {detailFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setDetailFor(null)}>
          <div role="dialog" aria-modal="true" aria-label="Ambassador details" className="bg-paper rounded-2xl shadow-2xl w-full max-w-3xl p-5 sm:p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-gray-800 break-words">{detailFor.fullName || detailFor.email}</h3>
                <p className="text-sm text-gray-600 break-all">{detailFor.email}</p>
              </div>
              <button onClick={() => setDetailFor(null)} className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Close</button>
            </div>
            {detailFor.detailsCompleted
              ? <AmbassadorProfileView ambassador={detailFor} compact />
              : <p className="text-sm text-gray-600 mb-4">This ambassador has not submitted their details yet. Code: <span className="font-mono font-bold">{detailFor.referralCode}</span></p>}
            <div className="mt-4"><AmbassadorChangeLog ambassadorId={detailFor.id} /></div>
          </div>
        </div>
      )}

      {/* Share Payout Modal */}""")

# bank-change flag in the share modal
rep("""              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Tax removed:</span>""",
    """              <BankChangeFlag ambassadorEmail={selectedPayoutData.ambassadorEmail} />
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Tax removed:</span>""")
open(p, 'w', encoding='utf-8').write(s)

# ---- AdminPanel: payout rows carry the ambassador email
p = 'src/pages/AdminPanel.jsx'
t = open(p, encoding='utf-8').read()
old = "[a.referralCode, a.legacyCode].filter(Boolean).forEach(c => { nameByCode[String(c).replace(/\\s+/g, '').toUpperCase()] = ambassadorLabel(a); });"
assert old in t
t = t.replace(old, "[a.referralCode, a.legacyCode].filter(Boolean).forEach(c => { nameByCode[String(c).replace(/\\s+/g, '').toUpperCase()] = ambassadorLabel(a); emailByCode[String(c).replace(/\\s+/g, '').toUpperCase()] = a.email || ''; });")
t = t.replace("      const nameByCode = {};", "      const nameByCode = {};\n      const emailByCode = {};", 1)
t = t.replace("            ambassadorName: nameByCode[code] || '',", "            ambassadorName: nameByCode[code] || '',\n            ambassadorEmail: emailByCode[code] || '',", 1)
open(p, 'w', encoding='utf-8').write(t)

# ---- PayoutManagement + Accounts: flag in the detail
p = 'src/components/PayoutManagement.jsx'
t = open(p, encoding='utf-8').read()
t = t.replace("import { payoutCodeLabel } from '../utils/payoutLabel';", "import { payoutCodeLabel } from '../utils/payoutLabel';\nimport { BankChangeFlag } from './AmbassadorChangeLog';", 1)
old = '''              <div className="info-row">
                <span className="info-label">Tax removed / Net amount:</span>'''
assert old in t
t = t.replace(old, "              <BankChangeFlag ambassadorEmail={selectedPayout.ambassadorEmail} />\n" + old, 1)
open(p, 'w', encoding='utf-8').write(t)

p = 'src/pages/AccountsDashboard.jsx'
t = open(p, encoding='utf-8').read()
t = t.replace("import { payoutCodeLabel } from '../utils/payoutLabel';", "import { payoutCodeLabel } from '../utils/payoutLabel';\nimport { BankChangeFlag } from '../components/AmbassadorChangeLog';", 1)
old = "<p><strong>Referral Code – Ambassador:</strong> {payoutCodeLabel(selectedPayout)}</p>"
assert old in t
t = t.replace(old, old + "\n              <BankChangeFlag ambassadorEmail={selectedPayout.ambassadorEmail} />", 1)
open(p, 'w', encoding='utf-8').write(t)
print('ok')
