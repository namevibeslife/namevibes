import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isPlanActive } from '../utils/plan';
import { formatDate } from '../i18n/format';
import { useTranslation } from 'react-i18next';

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

// Open to every signed-in user (plan member, ambassador or admin). Read-only and never asks for
// payment: the plan line is information plus a plain link.
export default function MyProfile() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const complete = Boolean(profile?.profileComplete);
  const active = isPlanActive(profile);
  const expiry = toDate(profile?.planExpiry) ? formatDate(profile.planExpiry) : null;
  const place = [profile?.stateName, profile?.countryName].filter(Boolean).join(', ');
  const rows = [
    [t('profile.name'), profile?.fullName || user?.displayName],
    [t('settings.email'), user?.email],
    ...(complete ? [
      [t('profile.dob'), profile?.dob ? formatDate(profile.dob) : null],
      [t('profile.gender'), profile?.gender ? t(`profileComplete.${profile.gender}`, { defaultValue: profile.gender }) : null],
      [t('profile.location'), place],
      [t('profile.referralUsed'), profile?.referralCode],
    ] : []),
    [t('profile.plan'), active ? (expiry ? t('profile.planActiveUntil', { date: expiry }) : t('profile.planActive')) : t('profile.noPlan')],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen site-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-paper rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title')}</h1>
          <dl className="divide-y divide-gray-200">
            {rows.map(([label, value]) => (
              <div key={label} className="py-3 sm:flex sm:gap-6">
                <dt className="text-sm text-gray-500 sm:w-40 shrink-0">{label}</dt>
                <dd className="text-gray-900 break-words min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
          {active && <p className="mt-4 text-sm text-gray-600">{t('payment.noRenewal')}</p>}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {!complete && <Link to="/profile-complete" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg bg-brand-600 text-white font-semibold">{t('profile.complete')}</Link>}
            <Link to="/settings" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg border border-gray-300 text-gray-700">{t('profile.settings')}</Link>
            {!active && complete && <Link to="/pricing" className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg border border-gray-300 text-gray-700">{t('profile.pricing')}</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
