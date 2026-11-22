p = 'src/pages/AdminDashboard.jsx'
s = open(p, encoding='utf-8').read()

state = """  } = props;

  // Ambassadors tab: split the (already filtered) list by where each person is in the journey.
  const [ambTab, setAmbTab] = useState('active');
  const [ambSearch, setAmbSearch] = useState('');
  const term = ambSearch.trim().toLowerCase();
  const matchesSearch = (a) => !term || [a.fullName, a.email, a.referralCode].some(v => String(v || '').toLowerCase().includes(term));
  const ambLists = {
    active: ambassadors.filter(a => a.isApproved && a.isActive && a.lastLoginAt && matchesSearch(a)),
    invited: ambassadors.filter(a => a.isApproved && a.isActive && !a.lastLoginAt && matchesSearch(a)),
    deactivated: ambassadors.filter(a => a.isApproved && !a.isActive && matchesSearch(a)),
    pending: ambassadors.filter(a => !a.isApproved && matchesSearch(a))
  };
  const ambTabs = [
    ['active', 'Active'], ['invited', 'Invited – not signed in'], ['deactivated', 'Deactivated'],
    ...(ambLists.pending.length ? [['pending', 'Pending applications']] : [])
  ];
  const ambEmpty = {
    active: 'No active ambassadors yet',
    invited: 'No invites waiting for a first sign-in',
    deactivated: 'No deactivated ambassadors'
  };
  const asDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
"""
assert "  } = props;\n" in s
s = s.replace("  } = props;\n", state, 1)

block = """              <div className="flex flex-wrap items-center gap-2 mb-4" role="tablist" aria-label="Ambassador groups">
                {ambTabs.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={ambTab === key}
                    onClick={() => setAmbTab(key)}
                    className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold ${ambTab === key ? 'bg-brand-600 text-white' : 'bg-paper text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                  >{label} ({ambLists[key].length})</button>
                ))}
                <input
                  type="search"
                  value={ambSearch}
                  onChange={(e) => setAmbSearch(e.target.value)}
                  placeholder="Search name, email or code"
                  aria-label="Search ambassadors"
                  className="sm:ml-auto w-full sm:w-64 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm"
                />
              </div>

              {ambTab !== 'pending' ? (
                ambLists[ambTab].length === 0 ? (
                  <div className="bg-paper rounded-xl shadow-lg p-10 text-center">
                    <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">{ambEmpty[ambTab]}</p>
                  </div>
                ) : (
                  <div className="bg-paper rounded-xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Referral code</th>
                          {ambTab === 'active' && <><th className="px-4 py-3">Country</th><th className="px-4 py-3">Signed in on</th><th className="px-4 py-3 text-right">Members</th></>}
                          {ambTab === 'invited' && <><th className="px-4 py-3">Invited on</th><th className="px-4 py-3">Status</th></>}
                          {ambTab === 'deactivated' && <th className="px-4 py-3">Country</th>}
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ambLists[ambTab].map(a => (
                          <React.Fragment key={a.id}>
                            <tr>
                              <td className="px-4 py-3 font-medium text-gray-800">{a.fullName || '-'}</td>
                              <td className="px-4 py-3 text-gray-700 break-all">{a.email}</td>
                              <td className="px-4 py-3 font-mono font-bold text-brand-600 whitespace-nowrap">{a.referralCode || '-'}</td>
                              {ambTab === 'active' && <>
                                <td className="px-4 py-3 whitespace-nowrap">{a.countryName || a.countryCode || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{asDate(a.lastLoginAt)?.toLocaleDateString() || '-'}</td>
                                <td className="px-4 py-3 text-right">{a.memberCount ?? 0}</td>
                              </>}
                              {ambTab === 'invited' && <>
                                <td className="px-4 py-3 whitespace-nowrap">{(asDate(a.invitedAt) || asDate(a.createdAt))?.toLocaleDateString() || '-'}</td>
                                <td className="px-4 py-3"><span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full whitespace-nowrap">Invited – not signed in</span></td>
                              </>}
                              {ambTab === 'deactivated' && <td className="px-4 py-3 whitespace-nowrap">{a.countryName || a.countryCode || '-'}</td>}
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {ambTab === 'invited' && (
                                    <button onClick={() => setResendFor(resendFor === a.id ? null : a.id)} className="px-3 py-2 min-h-[44px] rounded-lg text-sm bg-brand-100 text-brand-800 hover:bg-brand-200 whitespace-nowrap">Resend invite</button>
                                  )}
                                  <button
                                    onClick={() => handleToggleActive(a)}
                                    className={`px-3 py-2 min-h-[44px] rounded-lg text-sm whitespace-nowrap ${a.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                  >{a.isActive ? 'Deactivate' : 'Reactivate'}</button>
                                  {ambTab === 'active' && (
                                    <button onClick={() => handleEditBankDetails(a)} className="px-3 py-2 min-h-[44px] rounded-lg text-sm bg-ocean-600 text-white hover:bg-ocean-700 whitespace-nowrap">Edit Bank</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {resendFor === a.id && (
                              <tr><td colSpan={8} className="px-4 py-3 bg-gray-50"><InviteMessageBox message={buildInviteMessage(a.email)} onClose={() => setResendFor(null)} /></td></tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : ambLists.pending.length === 0 ? ("""
assert "              {ambassadors.length === 0 ? (" in s
s = s.replace("              {ambassadors.length === 0 ? (", block, 1)
assert "                  {ambassadors.map(ambassador => (" in s
s = s.replace("                  {ambassadors.map(ambassador => (", "                  {ambLists.pending.map(ambassador => (", 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
