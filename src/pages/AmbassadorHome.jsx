import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, getDocs, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { GoogleButton } from '../components/AuthButtons';
import ReferralShareCard from '../components/ReferralShareCard';
import AmbassadorDetailsForm from '../components/AmbassadorDetailsForm';
import AmbassadorFollowers from '../components/AmbassadorFollowers';
import { AMBASSADOR_COPY as COPY } from '../data/ambassadorCopy';
import { normalizeEmail } from '../utils/ambassadorInvite';

const TABS = [['home', 'Home'], ['register', 'Register'], ['followers', 'My Followers']];

// /ambassador: public story + Google sign-in for invited ambassadors, plus their Register
// (payout details) and My Followers tabs. Invite-only: access needs a verified Google email that
// matches an approved ambassadors document; nothing is ever created for anyone else.
export default function AmbassadorHome() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'home';
  const [user, setUser] = useState(undefined);
  // 'checking' | 'ok' | 'not-invited' | 'inactive'
  const [access, setAccess] = useState('checking');
  const [ambassador, setAmbassador] = useState(null);
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) { setAmbassador(null); setAccess('checking'); } }), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setAccess('checking');
      try {
        const email = normalizeEmail(user.email);
        const snap = user.emailVerified && email
          ? await getDocs(query(collection(db, 'ambassadors'), where('email', '==', email)))
          : { docs: [] };
        const found = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(a => a.isApproved);
        if (cancelled) return;
        if (!found) { setAccess('not-invited'); return; }
        if (!found.isActive) { setAccess('inactive'); return; }
        setAmbassador(found);
        setAccess('ok');
        if (!found.lastLoginAt) {
          // First login flips the admin list from Invited to Active. Best effort only.
          updateDoc(doc(db, 'ambassadors', found.id), { lastLoginAt: serverTimestamp() })
            .then(() => setAmbassador(a => (a ? { ...a, lastLoginAt: new Date() } : a)))
            .catch(() => {});
        }
      } catch (e) {
        console.error('Ambassador access check failed:', e);
        if (!cancelled) setAccess('not-invited');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function signIn() {
    setSigningIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setError('Sign-in failed: ' + e.message);
    } finally {
      setSigningIn(false);
    }
  }

  const doSignOut = async () => { try { await signOut(auth); } catch (e) { setError('Could not sign out. Please try again.'); } };
  const goto = (key) => setParams(key === 'home' ? {} : { tab: key });

  const signInBox = (
    <div className="text-center space-y-3">
      <div className="max-w-sm mx-auto">
        <GoogleButton onClick={signIn} disabled={signingIn}>{signingIn ? 'Signing in...' : 'Sign in with Google'}</GoogleButton>
      </div>
      <p className="text-sm text-gray-600">For invited NAMASUTRA Ambassadors only.</p>
    </div>
  );

  const notInvited = (
    <div role="alert" className="text-center space-y-4 max-w-md mx-auto">
      <p className="text-gray-800">
        {access === 'inactive'
          ? 'Your ambassador account is not active. Please contact us.'
          : "This Google account isn't an invited NAMASUTRA Ambassador. Please contact us for an invitation."}
      </p>
      <button type="button" onClick={doSignOut} className="px-5 py-2 min-h-[44px] rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">Sign out</button>
    </div>
  );

  // What a tab shows when you are not (yet) a signed-in ambassador
  const gate = () => {
    if (user === undefined || (user && access === 'checking')) return <p className="text-center text-gray-600 py-8">Loading...</p>;
    if (!user) return <div className="py-6">{signInBox}</div>;
    return <div className="py-6">{notInvited}</div>;
  };
  const isAmbassador = user && access === 'ok' && ambassador;

  const home = (
    <article className="max-w-3xl mx-auto">
      {isAmbassador && (
        <div className="mb-8 space-y-4">
          {!ambassador.detailsCompleted && (
            <div role="status" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-amber-900 font-medium">Complete your details to receive payouts.</p>
              <button type="button" onClick={() => goto('register')} className="px-4 py-2 min-h-[44px] rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700">Complete details</button>
            </div>
          )}
          <ReferralShareCard code={ambassador.referralCode} />
        </div>
      )}

      <header className="text-center mb-10">
        <p className="font-serif text-sm tracking-[0.3em] text-brand-700 mb-3">{COPY.brand}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{COPY.title}</h1>
      </header>

      <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">
        {COPY.intro.map(p => <p key={p.slice(0, 24)}>{p}</p>)}
      </div>

      {COPY.sections.map(section => (
        <section key={section.heading} className="mt-10">
          <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
          <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">
            {(section.paragraphs || []).map(p => <p key={p.slice(0, 24)}>{p}</p>)}
            {section.bullets && (
              <ul className="list-disc pl-6 space-y-2">
                {section.bullets.map(b => Array.isArray(b)
                  ? <li key={b[0]}><strong>{b[0]}:</strong> {b[1]}</li>
                  : <li key={b.slice(0, 24)}>{b}</li>)}
              </ul>
            )}
            {section.callout && <p className="font-serif text-xl font-bold text-gray-900">{section.callout}</p>}
            {(section.after || []).map(p => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
        </section>
      ))}

      <p className="mt-10 text-center font-serif italic text-lg text-brand-800">{COPY.tagline}</p>

      {!isAmbassador && <div className="mt-12">{gate()}</div>}
      {error && <p role="alert" className="mt-4 text-center text-sm text-red-700">{error}</p>}
    </article>
  );

  return (
    <main className="min-h-screen site-background px-4 py-8">
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

        {tab === 'home' && home}

        {tab === 'register' && (
          <section className="max-w-4xl mx-auto" aria-labelledby="register-heading">
            <h2 id="register-heading" className="font-serif text-3xl font-bold text-gray-900 text-center mb-2">My Details</h2>
            <p className="text-center text-gray-600 mb-8">Your profile and payout details.</p>
            {isAmbassador
              ? <AmbassadorDetailsForm ambassador={ambassador} user={user} onSaved={setAmbassador} />
              : gate()}
          </section>
        )}

        {tab === 'followers' && (
          <section aria-labelledby="followers-heading">
            <h2 id="followers-heading" className="font-serif text-3xl font-bold text-gray-900 text-center mb-6">My Followers</h2>
            {isAmbassador ? <AmbassadorFollowers ambassador={ambassador} /> : gate()}
          </section>
        )}

        {isAmbassador && (
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500 mb-2">Signed in as {ambassador.email}</p>
            <button type="button" onClick={doSignOut} className="px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">Sign out</button>
          </div>
        )}
      </div>
    </main>
  );
}
