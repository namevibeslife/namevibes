import React from 'react';
import { VIEW_SECTIONS, FIELD_LABELS, fromAmbassador, displayValue } from '../utils/ambassadorProfile';

// Saved details, read-only, in clear sections. Bank account number, PAN and ID number show only
// their last 4 characters. The Ambassador Code and email are shown but can't be edited.
export default function AmbassadorProfileView({ ambassador, compact = false }) {
  const data = fromAmbassador(ambassador);
  return (
    <div className="space-y-4">
      <section className="bg-paper rounded-xl shadow p-4 grid sm:grid-cols-2 gap-3" aria-label="Account">
        <div className="min-w-0"><p className="text-xs uppercase text-gray-500">Ambassador Code</p><p className="font-mono font-bold text-brand-700 break-all">{ambassador.referralCode || '—'}</p></div>
        <div className="min-w-0"><p className="text-xs uppercase text-gray-500">Email</p><p className="text-gray-800 break-all">{ambassador.email}</p></div>
      </section>
      <div className={compact ? 'grid md:grid-cols-2 gap-4' : 'space-y-4'}>
        {VIEW_SECTIONS.map(([title, fields]) => (
          <section key={title} className="bg-paper rounded-xl shadow p-4" aria-label={title}>
            <h4 className="font-serif text-lg font-bold text-gray-900 mb-3">{title}</h4>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {fields.map(field => (
                <div key={field} className="min-w-0">
                  <dt className="text-xs uppercase text-gray-500">{FIELD_LABELS[field]}</dt>
                  <dd className="text-gray-800 break-words">{displayValue(field, data[field], data)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
