import React, { useState } from 'react';
import { ALL_COUNTRIES, getCountry } from '../data/countries';
import { FORM_SECTIONS, fieldLabel, sectionLabel, optionLabel, hintLabel } from '../utils/ambassadorProfile';
import { countryLabel } from '../i18n/format';
import { useTranslation } from 'react-i18next';

const input = 'w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none';

// The details form (first submission and later edits). It only collects values: the parent decides
// what to do with them (save, or compare and confirm).
export default function AmbassadorDetailsForm({ initial, submitLabel, busy = false, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [data, setData] = useState(initial);

  const change = (e) => setData(d => ({ ...d, [e.target.name]: e.target.value, ...(e.target.name === 'countryCode' ? { stateCode: '' } : {}) }));
  const submit = (e) => { e.preventDefault(); onSubmit(data); };

  const field = ([name, , type, required, extra = {}]) => {
    const common = { id: `amb-${name}`, name, required, value: data[name], onChange: change, className: input };
    let control;
    if (type === 'select') {
      control = <select {...common}>
        <option value="">{hintLabel(extra.placeholder) || t('common.select')}</option>
        {extra.options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{optionLabel(o[1])}</option> : <option key={o} value={o}>{optionLabel(o)}</option>)}
      </select>;
    } else if (type === 'country') {
      control = <select {...common}><option value="">{t('ambassador.selectCountry')}</option>
        {Object.values(ALL_COUNTRIES).sort((x, y) => x.name.localeCompare(y.name)).map(c => <option key={c.code} value={c.code}>{countryLabel(c.code, c.name)}</option>)}</select>;
    } else if (type === 'state') {
      const states = getCountry(data.countryCode)?.states || [];
      control = states.length || !data.countryCode
        ? <select {...common} disabled={!data.countryCode}><option value="">{t('ambassador.selectState')}</option>
          {states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        : <input {...common} required={false} type="text" placeholder={t('ambassador.stateOptional')} />;
    } else {
      control = <input {...common} type={type} placeholder={extra.placeholder} readOnly={extra.readOnly}
        title={extra.readOnly ? t('ambassador.emailLocked') : undefined}
        className={extra.readOnly ? 'w-full px-4 py-2 border-2 border-gray-200 bg-gray-100 rounded-lg text-gray-600' : input} />;
    }
    return <div key={name} className="min-w-0">
      <label htmlFor={`amb-${name}`} className="block text-sm font-medium text-gray-700 mb-2">{fieldLabel(name)}{required ? ' *' : ''}</label>
      {control}
    </div>;
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      {FORM_SECTIONS.map(([title, fields]) => (
        <section key={title}>
          <h3 className="text-xl font-bold text-gray-800 mb-4">{sectionLabel(title)}</h3>
          <div className="grid sm:grid-cols-2 gap-4">{fields.map(field)}</div>
        </section>
      ))}
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={busy} className="flex-1 bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 min-h-[44px] rounded-lg font-semibold text-lg disabled:opacity-50">
          {busy ? t('profileComplete.saving') : (submitLabel || t('ambassador.saveMyDetails'))}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-6 py-4 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">{t('common.cancel')}</button>}
      </div>
    </form>
  );
}
