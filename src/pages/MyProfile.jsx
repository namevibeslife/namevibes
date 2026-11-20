import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isPlanActive } from '../utils/plan';

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const fmt = (d) => (d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

// Open to every signed-in user (plan member, ambassador or admin). Read-only and never asks for
// payment: the plan line is information plus a plain link.
export default function MyProfile() {
  const { user, profile } = useAuthStore();
  const complete = Boolean(profile?.profileComplete);
  const active = isPlanActive(profile);
  const expiry = fmt(toDate(profile?.planExpiry));
  const place = [profile?.stateName, profile?.countryName].filter(Boolean).join(', ');
  const rows = [
    ['Name', profile?.fullName || user?.displayName],
    ['Email', user?.email],
    ...(complete ? [
      ['Date of birth', profile?.dob],
      ['Gender', profile?.gender],
      ['Location', place],
      ['Referral code used', profile?.referralCode],
    ] : []),
    ['Plan', active ? `NAMASUTRA Annual Plan${expiry ? ` - active until ${expiry}` : ' - active'}` : 'No active plan'],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen site-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-paper rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
          <dl className="divide-y divide-gray-200">
            {rows.map(([label, value]) => (
              <div key={label} className="py-3 sm:flex sm:gap-6">
                <dt className="text-sm text-gray-500 sm:w-40 shrink-0">{label}</dt>
                <dd className="text-gray-900 break-words min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {!complete && <Link to="/profile-complete" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg bg-brand-600 text-white font-semibold">Complete your profile</Link>}
            <Link to="/settings" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg border border-gray-300 text-gray-700">Account settings</Link>
            {!active && complete && <Link to="/pricing" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg border border-gray-300 text-gray-700">Plans &amp; pricing</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
