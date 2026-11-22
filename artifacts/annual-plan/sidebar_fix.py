p = 'src/pages/AdminDashboard.jsx'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    assert old in s, old[:70]
    s = s.replace(old, new, 1)
rep("const open = ambOpen || activeTab === 'ambassadors';", "const open = ambOpen;")
rep("onClick={() => (open && activeTab !== 'ambassadors' ? goAmbassadors('active') : activeTab === 'ambassadors' ? setAmbOpen(!ambOpen) : goAmbassadors('active'))}",
    "onClick={() => { if (activeTab !== 'ambassadors') goAmbassadors('active'); else setAmbOpen(!ambOpen); }}")
rep("""                    {stats.pendingAmbassadors > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">{stats.pendingAmbassadors}</span>
                    )}
                    {stats.pendingAmbassadors > 0 ? null : <span className="ml-auto" />}
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}""",
    """                    <span className="ml-auto flex items-center gap-2">
                      {stats.pendingAmbassadors > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{stats.pendingAmbassadors}</span>
                      )}
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>""")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
