import React, { Suspense, lazy, useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { GoogleButton } from '../components/AuthButtons';
import Logo from '../components/Logo';
import { ShieldCheck } from 'lucide-react';
import './AmbassadorHome.css';
import { normalizeEmail } from '../utils/ambassadorInvite';
import { useTranslation } from 'react-i18next';

// Everything an approved ambassador sees is a separate chunk, fetched only after the account is
// confirmed. Nothing about commissions or the program ships in this public page.
const AmbassadorArea = lazy(() => import('../components/AmbassadorArea'));

// /ambassador: a sign-in page and nothing else for signed-out visitors. Invite-only: a verified
// Google email must match an approved, active ambassadors document; nothing is ever created for
// anyone else, and the page never says whether an email is or isn't an ambassador before sign-in.
export default function AmbassadorHome() {
  const { t } = useTranslation();
  const [user, setUser] = useState(undefined);
  // 'checking' | 'ok' | 'denied'
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
        const found = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(a => a.isApproved && a.isActive);
        if (cancelled) return;
        if (!found) { setAccess('denied'); return; }
        setAmbassador(found);
        setAccess('ok');
        if (!found.lastLoginAt) {
          // First login flips the admin list from Invited to Logged in. Best effort only.
          updateDoc(doc(db, 'ambassadors', found.id), { lastLoginAt: serverTimestamp() })
            .then(() => setAmbassador(a => (a ? { ...a, lastLoginAt: new Date() } : a)))
            .catch(() => {});
        }
      } catch (e) {
        console.error('Ambassador access check failed:', e);
        if (!cancelled) setAccess('denied');
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
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setError(t('ambassador.signInFailed', { message: e.message }));
    } finally {
      setSigningIn(false);
    }
  }

  const doSignOut = async () => { try { await signOut(auth); } catch { setError(t('errors.signOut')); } };

  let body;
  if (user === undefined || (user && access === 'checking')) {
    body = <p className="text-center text-gray-600 py-16">{t('common.loading')}</p>;
  } else if (!user) {
    body = (
      <div className="amb-signin-shell">
        <div className="amb-signin-intro">
          <p className="amb-kicker">{t('ambassador.kicker')}</p>
          <Logo className="amb-signin-logo" />
          <h1>{t('ambassador.welcomeLine1')}<br /><em>{t('ambassador.welcomeLine2')}</em></h1>
          <p className="amb-signin-tagline">{t('ambassador.tagline1')}<br />{t('ambassador.tagline2')}</p>
          <div className="amb-gold-rule" aria-hidden="true" />
        </div>
        <section className="amb-auth-card" aria-labelledby="amb-signin-heading">
          <span className="amb-icon-medallion"><ShieldCheck size={28} aria-hidden="true" /></span>
          <p className="amb-kicker">{t('ambassador.invitationOnly')}</p>
          <h2 id="amb-signin-heading">{t('ambassador.signInTitle')}</h2>
          <p>{t('ambassador.signInText')}</p>
          <GoogleButton onClick={signIn} disabled={signingIn}>{signingIn ? t('ambassador.signingIn') : t('ambassador.signInGoogle')}</GoogleButton>
          <p className="amb-auth-note">{t('ambassador.helpNote')}</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </section>
      </div>
    );
  } else if (access !== 'ok') {
    body = (
      <div role="alert" className="amb-auth-card amb-access-message">
        <h1 className="text-2xl font-serif">{t('ambassador.checkInvitation')}</h1>
        <p className="text-gray-800">{t('ambassador.notInvited')}</p>
        <button type="button" onClick={doSignOut} className="px-5 py-2 min-h-[44px] rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">{t('ambassador.signOut')}</button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  } else {
    body = (
      <Suspense fallback={<p className="text-center text-gray-600 py-16">{t('common.loading')}</p>}>
        <AmbassadorArea ambassador={ambassador} user={user} onAmbassadorChange={setAmbassador} onSignOut={doSignOut} />
      </Suspense>
    );
  }

  return <main className="amb-page site-background">{body}</main>;
}
