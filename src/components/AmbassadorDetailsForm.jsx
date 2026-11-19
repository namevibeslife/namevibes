import React, { useEffect, useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COUNTRIES } from '../data/countries';

const input = 'w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none';

// Exactly the fields the old registration form collected. [name, label, type, required, extras]
const SECTIONS = [
  ['Personal Details', [
    ['firstName', 'First Name', 'text', true], ['middleName', 'Middle Name', 'text', false], ['lastName', 'Last Name', 'text', true],
    ['motherName', "Mother's Name", 'text', true], ['dob', 'Date of Birth', 'date', true],
    ['gender', 'Gender', 'select', true, { options: ['Male', 'Female', 'Other'], placeholder: 'Select Gender' }],
    ['profession', 'Current Profession', 'text', true]
  ]],
  ['Contact Details', [
    ['mobileNumber', 'Mobile Number', 'tel', true], ['alternateMobile', 'Alternate Mobile', 'tel', false],
    ['email', 'Email ID', 'email', true, { readOnly: true }]
  ]],
  ['Address Details', [
    ['countryCode', 'Country', 'country', true], ['stateCode', 'State', 'state', true],
    ['city', 'City', 'text', true], ['zipCode', 'ZIP / Postal Code', 'text', true], ['addressLine1', 'Address Line 1', 'text', true]
  ]],
  ['Social Media Handles', [
    ['instagram', 'Instagram', 'text', false, { placeholder: '@username' }], ['facebook', 'Facebook', 'text', false, { placeholder: 'Profile URL' }],
    ['youtube', 'YouTube', 'text', false, { placeholder: 'Channel URL' }], ['twitter', 'Twitter / X', 'text', false, { placeholder: '@username' }]
  ]],
  ['Bank & Compliance Details', [
    ['bankAccountName', 'Account Holder Name', 'text', true], ['bankName', 'Bank Name', 'text', true],
    ['accountNumber', 'Account Number', 'text', true],
    ['accountType', 'Account Type', 'select', true, { options: [['savings', 'Savings'], ['current', 'Current']] }],
    ['ifscCode', 'IFSC / SWIFT Code', 'text', true], ['branchName', 'Branch Name', 'text', false],
    ['upiId', 'UPI ID', 'text', false, { placeholder: 'username@paytm' }], ['panNumber', 'PAN Number', 'text', false],
    ['idType', 'ID Type', 'select', true, { options: ['Aadhaar', 'Passport', 'Driving License', 'Voter ID'] }],
    ['idNumber', 'ID Number', 'text', true]
  ]],
  ['Nominee Details (Optional)', [
    ['nomineeName', 'Nominee Name', 'text', false], ['nomineeRelation', 'Relation', 'text', false], ['nomineeContact', 'Contact', 'tel', false]
  ]]
];

const EMPTY = Object.fromEntries(SECTIONS.flatMap(([, fields]) => fields.map(([name]) => [name, ''])));

function fromAmbassador(a, user) {
  const [first = '', ...rest] = String(a.fullName || user?.displayName || '').trim().split(/\s+/);
  const dob = a.dob?.toDate ? a.dob.toDate().toISOString().slice(0, 10) : '';
  return {
    ...EMPTY,
    firstName: a.firstName ?? first,
    lastName: a.lastName ?? rest.join(' '),
    middleName: a.middleName || '',
    motherName: a.motherName || '', dob, gender: a.gender || '', profession: a.profession || '',
    mobileNumber: a.mobileNumber || '', alternateMobile: a.alternateMobile || '',
    email: a.email || user?.email?.toLowerCase() || '',
    countryCode: a.countryCode || '', stateCode: a.stateCode || '', city: a.city || '', zipCode: a.zipCode || '', addressLine1: a.addressLine1 || '',
    instagram: a.socialMedia?.instagram || '', facebook: a.socialMedia?.facebook || '', youtube: a.socialMedia?.youtube || '', twitter: a.socialMedia?.twitter || '',
    bankAccountName: a.bankAccountName || '', bankName: a.bankName || '', accountNumber: a.accountNumber || '',
    accountType: a.accountType || 'savings', ifscCode: a.ifscCode || '', branchName: a.branchName || '', upiId: a.upiId || '', panNumber: a.panNumber || '',
    idType: a.idType || 'Aadhaar', idNumber: a.idNumber || '',
    nomineeName: a.nomineeDetails?.name || '', nomineeRelation: a.nomineeDetails?.relation || '', nomineeContact: a.nomineeDetails?.contact || ''
  };
}

// The Register / "My Details" tab: payout and profile details, saved to the ambassador's own doc.
export default function AmbassadorDetailsForm({ ambassador, user, onSaved }) {
  const [data, setData] = useState(() => fromAmbassador(ambassador, user));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setData(fromAmbassador(ambassador, user)); }, [ambassador.id]);

  const change = (e) => setData(d => ({ ...d, [e.target.name]: e.target.value, ...(e.target.name === 'countryCode' ? { stateCode: '' } : {}) }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const country = COUNTRIES[data.countryCode];
      const state = country?.states?.find(s => s.code === data.stateCode);
      const update = {
        fullName: `${data.firstName} ${data.middleName} ${data.lastName}`.replace(/\s+/g, ' ').trim(),
        firstName: data.firstName, middleName: data.middleName, lastName: data.lastName,
        motherName: data.motherName,
        dob: data.dob ? Timestamp.fromDate(new Date(data.dob)) : null,
        gender: data.gender, profession: data.profession,
        mobileNumber: data.mobileNumber, alternateMobile: data.alternateMobile,
        countryCode: data.countryCode, countryName: country?.name || '',
        stateCode: data.stateCode, stateName: state?.name || '',
        city: data.city, zipCode: data.zipCode, addressLine1: data.addressLine1,
        socialMedia: { instagram: data.instagram, facebook: data.facebook, youtube: data.youtube, twitter: data.twitter },
        bankAccountName: data.bankAccountName, bankName: data.bankName, accountNumber: data.accountNumber,
        accountType: data.accountType, ifscCode: data.ifscCode, swiftCode: '', branchName: data.branchName,
        upiId: data.upiId, panNumber: data.panNumber,
        idType: data.idType, idNumber: data.idNumber,
        nomineeDetails: { name: data.nomineeName, relation: data.nomineeRelation, contact: data.nomineeContact },
        detailsCompleted: true,
        detailsCompletedAt: Timestamp.now()
      };
      await updateDoc(doc(db, 'ambassadors', ambassador.id), update);
      setMessage('Your details are saved.');
      onSaved?.({ ...ambassador, ...update });
    } catch (error) {
      console.error('Saving ambassador details failed:', error);
      setMessage('Could not save your details: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  const field = ([name, label, type, required, extra = {}]) => {
    const common = { id: `amb-${name}`, name, required, value: data[name], onChange: change, className: input };
    let control;
    if (type === 'select') {
      control = <select {...common}>
        <option value="">{extra.placeholder || 'Select'}</option>
        {extra.options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
      </select>;
    } else if (type === 'country') {
      control = <select {...common}><option value="">Select Country</option>
        {Object.values(COUNTRIES).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select>;
    } else if (type === 'state') {
      control = <select {...common} disabled={!data.countryCode}><option value="">Select State</option>
        {(COUNTRIES[data.countryCode]?.states || []).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>;
    } else {
      control = <input {...common} type={type} placeholder={extra.placeholder} readOnly={extra.readOnly}
        title={extra.readOnly ? 'Your Google sign-in email' : undefined}
        className={extra.readOnly ? 'w-full px-4 py-2 border-2 border-gray-200 bg-gray-100 rounded-lg text-gray-600' : input} />;
    }
    return <div key={name} className="min-w-0">
      <label htmlFor={`amb-${name}`} className="block text-sm font-medium text-gray-700 mb-2">{label}{required ? ' *' : ''}</label>
      {control}
    </div>;
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      {SECTIONS.map(([title, fields]) => (
        <section key={title}>
          <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
          <div className="grid sm:grid-cols-2 gap-4">{fields.map(field)}</div>
        </section>
      ))}
      <div>
        <button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 min-h-[44px] rounded-lg font-semibold text-lg disabled:opacity-50">
          {busy ? 'Saving...' : 'Save my details'}
        </button>
        {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
      </div>
    </form>
  );
}
