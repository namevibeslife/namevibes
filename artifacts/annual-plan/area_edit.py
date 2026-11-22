p='src/components/AmbassadorArea.jsx'
s=open(p,encoding='utf-8').read()
s=s.replace("import AmbassadorDetailsForm from './AmbassadorDetailsForm';","import AmbassadorRegister from './AmbassadorRegister';\nimport AmbassadorProfileView from './AmbassadorProfileView';")
s=s.replace("  const [contentError, setContentError] = useState(false);","  const [contentError, setContentError] = useState(false);\n  const [toast, setToast] = useState('');\n  const toastTimer = useRef(null);\n  const notify = (text) => { setToast(text); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 3500); };\n  useEffect(() => () => window.clearTimeout(toastTimer.current), []);")
s=s.replace("import React, { useEffect, useState } from 'react';","import React, { useEffect, useRef, useState } from 'react';")
# register tab
a=s.index("      {tab === 'register' && (")
b=s.index("      {tab === 'followers' && (")
s=s[:a]+"""      {tab === 'register' && (
        <AmbassadorRegister ambassador={ambassador} user={user} onSaved={onAmbassadorChange} notify={notify} goHome={() => goto('home')} />
      )}

"""+s[b:]
# home: saved details after the code card, before home text
s=s.replace("""            <ReferralShareCard code={ambassador.referralCode} />
          </div>""","""            <ReferralShareCard code={ambassador.referralCode} />
            {ambassador.detailsCompleted && (
              <section aria-labelledby="saved-details-heading">
                <h2 id="saved-details-heading" className="font-serif text-2xl font-bold text-gray-900 mb-3">Your saved details</h2>
                <AmbassadorProfileView ambassador={ambassador} />
                <p className="mt-2 text-sm text-gray-600">Need to change something? Open the Register tab and choose Edit.</p>
              </section>
            )}
          </div>""")
s=s.replace("""      <div className="mt-10 text-center">
        <p className="text-xs text-gray-500 mb-2">Signed in as""","""      {toast && <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] rounded-lg bg-gray-900 text-white px-4 py-3 text-sm shadow-lg">{toast}</div>}

      <div className="mt-10 text-center">
        <p className="text-xs text-gray-500 mb-2">Signed in as""")
open(p,'w',encoding='utf-8').write(s)
