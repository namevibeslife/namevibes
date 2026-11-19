import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReferralShareCard from './ReferralShareCard';
import AmbassadorRegister from './AmbassadorRegister';
import AmbassadorProfileView from './AmbassadorProfileView';
import AmbassadorFollowers from './AmbassadorFollowers';

const TABS = [['home', 'Home'], ['register', 'Register'], ['followers', 'My Followers']];

// Home text lives in Firestore (ambassadorContent/home), readable only by admins and approved
// ambassadors, so none of it ships in a public bundle. Sections are plain structured data:
// { heading, paragraphs[], bullets[{label?, text}], callout?, after[] }.
function HomeContent({ content }) {
  const para = (list) => (list || []).map((p, i) => <p key={i}>{p}</p>);
  return (
    <>
      <header className="text-center mb-10">
        {content.brand && <p className="font-serif text-sm tracking-[0.3em] text-brand-700 mb-3">{content.brand}</p>}
        {content.title && <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{content.title}</h1>}
      </header>
      <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">{para(content.intro)}</div>
      {(content.sections || []).map((section, i) => (
        <section key={i} className="mt-10">
          {section.heading && <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>}
          <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">
            {para(section.paragraphs)}
            {section.bullets?.length > 0 && (
              <ul className="list-disc pl-6 space-y-2">
                {section.bullets.map((b, j) => <li key={j}>{b.label ? <><strong>{b.label}:</strong> </> : null}{b.text}</li>)}
              </ul>
            )}
            {section.callout && <p className="font-serif text-xl font-bold text-gray-900">{section.callout}</p>}
            {para(section.after)}
          </div>
        </section>
      ))}
      {content.tagline && <p className="mt-10 text-center font-serif italic text-lg text-brand-800">{content.tagline}</p>}
    </>
  );
}

// Everything an approved ambassador sees. Loaded as its own chunk only after the account has been
// confirmed as an approved, active ambassador.
export default function AmbassadorArea({ ambassador, user, onAmbassadorChange, onSignOut }) {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'home';
  const goto = (key) => setParams(key === 'home' ? {} : { tab: key });
  const [content, setContent] = useState(null);
  const [contentError, setContentError] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const notify = (text) => { setToast(text); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 3500); };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'ambassadorContent', 'home'))
      .then(snap => { if (!cancelled) setContent(snap.exists() ? snap.data() : {}); })
      .catch(() => { if (!cancelled) { setContent({}); setContentError(true); } });
    return () => { cancelled = true; };
  }, [ambassador.id]);

  return (
    <div className="max-w-5xl mx-auto">
      <nav aria-label="Ambassador sections" className="flex justify-center gap-1 sm:gap-2 mb-8 border-b border-brand-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => goto(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={`px-3 sm:px-5 py-3 min-h-[44px] text-sm sm:text-base font-semibold border-b-2 -mb-px ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >{label}</button>
        ))}
      </nav>

      {tab === 'home' && (
        <article className="max-w-3xl mx-auto">
          <div className="mb-8 space-y-4">
            {!ambassador.detailsCompleted && (
              <div role="status" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-amber-900 font-medium">Complete your details to receive payouts.</p>
                <button type="button" onClick={() => goto('register')} className="px-4 py-2 min-h-[44px] rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700">Complete details</button>
              </div>
            )}
            <ReferralShareCard code={ambassador.referralCode} />
            {ambassador.detailsCompleted && (
              <section aria-labelledby="saved-details-heading">
                <h2 id="saved-details-heading" className="font-serif text-2xl font-bold text-gray-900 mb-3">Your saved details</h2>
                <AmbassadorProfileView ambassador={ambassador} />
                <p className="mt-2 text-sm text-gray-600">Need to change something? Open the Register tab and choose Edit.</p>
              </section>
            )}
          </div>
          {content === null ? <p className="text-center text-gray-600">Loading...</p> : <HomeContent content={content} />}
          {contentError && <p role="status" className="mt-4 text-center text-sm text-gray-500">The welcome text could not be loaded right now.</p>}
        </article>
      )}

      {tab === 'register' && (
        <AmbassadorRegister ambassador={ambassador} user={user} onSaved={onAmbassadorChange} notify={notify} goHome={() => goto('home')} />
      )}

      {tab === 'followers' && (
        <section aria-labelledby="followers-heading">
          <h2 id="followers-heading" className="font-serif text-3xl font-bold text-gray-900 text-center mb-6">My Followers</h2>
          <AmbassadorFollowers ambassador={ambassador} />
        </section>
      )}

      {toast && <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] rounded-lg bg-gray-900 text-white px-4 py-3 text-sm shadow-lg">{toast}</div>}

      <div className="mt-10 text-center">
        <p className="text-xs text-gray-500 mb-2">Signed in as {ambassador.email}</p>
        <button type="button" onClick={onSignOut} className="px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">Sign out</button>
      </div>
    </div>
  );
}
