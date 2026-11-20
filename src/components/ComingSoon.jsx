import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Shown instead of a pay button when this country's payments are not open yet (its currency only
// Razorpay can take and International Payments is off, or neither gateway supports it). The visitor
// leaves an email; it is saved to the Firestore `waitlist` collection as { email, countryCode, createdAt }.
// The entry id is COUNTRY_email, so asking twice is refused by the rules and reported as "already on the list".
export default function ComingSoon({ countryCode, defaultEmail = '', className = '' }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState('idle'); // idle | sending | done | already | error

  async function submit(event) {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    const code = String(countryCode || '').toUpperCase();
    if (!clean || code.length !== 2) return;
    setState('sending');
    try {
      await setDoc(doc(db, 'waitlist', `${code}_${clean}`), { email: clean, countryCode: code, createdAt: serverTimestamp() });
      setState('done');
    } catch (error) {
      // a second request for the same country + email is an update, which the rules refuse
      setState(error?.code === 'permission-denied' ? 'already' : 'error');
    }
  }

  return (
    <div className={`rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 ${className}`} role="status">
      <p className="font-semibold">{t('payment.comingSoon')}</p>
      {state === 'done' || state === 'already' ? (
        <p className="mt-2 text-sm">{state === 'done' ? t('payment.notifyDone') : t('payment.notifyAlready')}</p>
      ) : (
        <form onSubmit={submit} className="mt-2">
          <p className="text-sm mb-3">{t('payment.comingSoonBody')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1">
              <span className="sr-only">{t('payment.notifyEmail')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('payment.notifyEmail')}
                autoComplete="email"
                className="w-full min-h-[44px] px-3 border-2 border-amber-300 rounded-lg bg-white text-gray-800"
              />
            </label>
            <button type="submit" disabled={state === 'sending'} className="min-h-[44px] px-5 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:opacity-60">
              {t('payment.notifyMe')}
            </button>
          </div>
          {state === 'error' && <p role="alert" className="mt-2 text-sm text-red-700">{t('payment.notifyError')}</p>}
        </form>
      )}
    </div>
  );
}
