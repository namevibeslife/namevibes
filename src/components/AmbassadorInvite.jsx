import React, { useState } from 'react';
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { COUNTRIES, getActiveCountries } from '../data/countries';
import { reserveReferralCode, setAmbassadorAccess, CURRENT_CODE_VERSION } from '../utils/referralCodeAdmin';
import { buildInviteMessage, normalizeEmail, isEmailLike } from '../utils/ambassadorInvite';
import InviteMessageBox from './InviteMessageBox';

const input = 'w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none';

// Admin -> Ambassadors -> "Invite ambassador". Ambassadors are invite-only: creating the record
// here (already approved and active, with their referral code reserved in the same step) is the
// authorisation. There is no public sign-up and no separate approval step.
export default function AmbassadorInvite({ currentAdmin, ambassadors = [], countrySettings = [], onInvited }) {
  const active = getActiveCountries(countrySettings);
  const countries = active.length ? active : Object.values(COUNTRIES);
  const [form, setForm] = useState({ fullName: '', email: '', countryCode: '', mobileNumber: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invited, setInvited] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    const email = normalizeEmail(form.email);
    const fullName = form.fullName.trim();
    if (!fullName) return setError('Please enter the full name.');
    if (!isEmailLike(email)) return setError('Please enter a valid Google email address.');
    if (!COUNTRIES[form.countryCode]) return setError('Please choose a country.');
    if (ambassadors.some(a => normalizeEmail(a.email) === email)) {
      return setError(`${email} is already an ambassador (or has a pending application).`);
    }

    setBusy(true);
    try {
      const existing = await getDocs(query(collection(db, 'ambassadors'), where('email', '==', email)));
      if (!existing.empty) throw Object.assign(new Error('exists'), { friendly: `${email} is already an ambassador (or has a pending application).` });

      const ref = doc(collection(db, 'ambassadors'));
      const country = COUNTRIES[form.countryCode];
      // Reserve the code first (atomic) so the ambassador doc is written once, complete, with the
      // code locked at the current version.
      const referralCode = await reserveReferralCode(ref.id, email, form.countryCode);
      await setDoc(ref, {
        fullName,
        email,
        mobileNumber: form.mobileNumber.trim(),
        countryCode: form.countryCode,
        countryName: country.name,
        isApproved: true,
        isActive: true,
        approvedAt: Timestamp.now(),
        approvedBy: currentAdmin.email,
        referralCode,
        codeVersion: CURRENT_CODE_VERSION,
        payoutFrequency: 'monthly',
        invitedBy: currentAdmin.email,
        invitedAt: Timestamp.now(),
        detailsCompleted: false,
        createdAt: Timestamp.now()
      });
      await setAmbassadorAccess(email, ref.id, true);
      setInvited({ email, fullName, referralCode });
      setForm({ fullName: '', email: '', countryCode: '', mobileNumber: '' });
      onInvited?.();
    } catch (err) {
      console.error('Invite failed:', err);
      setError(err.friendly || `Could not create the invite: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-paper rounded-xl shadow-lg p-6 mb-6 border-2 border-brand-200">
      <h3 className="text-lg font-bold text-gray-800 mb-1">Invite ambassador</h3>
      <p className="text-sm text-gray-600 mb-4">
        Ambassadors are invite-only. The Google email you enter is the only account that can open the ambassador area.
      </p>
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium text-gray-700">Full name *
          <input className={input} value={form.fullName} onChange={set('fullName')} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">Google email *
          <input type="email" className={input} value={form.email} onChange={set('email')} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">Country *
          <select className={input} value={form.countryCode} onChange={set('countryCode')} required>
            <option value="">Select country</option>
            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">Phone (optional)
          <input type="tel" className={input} value={form.mobileNumber} onChange={set('mobileNumber')} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={busy} className="px-5 py-2 min-h-[44px] bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Creating invite...' : 'Create invite'}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {invited && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
            {invited.fullName} is invited. Their code <span className="font-mono font-bold">{invited.referralCode}</span> is ready.
          </p>
          <InviteMessageBox message={buildInviteMessage(invited.email)} onClose={() => setInvited(null)} />
        </div>
      )}
    </div>
  );
}
