import { Timestamp } from 'firebase/firestore';
import i18n from 'i18next';
import { COUNTRIES } from '../data/countries';
import { countryLabel } from '../i18n/format.js';

// Profile / payout details an ambassador fills in on the Register tab.
// Each field: [name, label, type, required, extras]
export const FORM_SECTIONS = [
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

// Read-only profile layout: Personal, Contact, Address, Bank/Payout, ID/Nominee
export const VIEW_SECTIONS = [
  ['Personal', ['firstName', 'middleName', 'lastName', 'motherName', 'dob', 'gender', 'profession']],
  ['Contact', ['mobileNumber', 'alternateMobile', 'instagram', 'facebook', 'youtube', 'twitter']],
  ['Address', ['countryCode', 'stateCode', 'city', 'zipCode', 'addressLine1']],
  ['Bank / Payout', ['bankAccountName', 'bankName', 'accountNumber', 'accountType', 'ifscCode', 'branchName', 'upiId', 'panNumber']],
  ['ID / Nominee', ['idType', 'idNumber', 'nomineeName', 'nomineeRelation', 'nomineeContact']]
];

export const FIELD_LABELS = Object.fromEntries(FORM_SECTIONS.flatMap(([, fields]) => fields.map(f => [f[0], f[1]])));
const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
// Labels live in the language files (ambassador.field.*, .section.*, .option.*); English is the fallback
export const fieldLabel = (name) => i18n.t(`ambassador.field.${name}`, { defaultValue: FIELD_LABELS[name] || name });
export const sectionLabel = (title) => i18n.t(`ambassador.section.${slug(title)}`, { defaultValue: title });
export const optionLabel = (option) => i18n.t(`ambassador.option.${slug(option)}`, { defaultValue: option });
export const hintLabel = (text) => (text ? i18n.t(`ambassador.hint.${slug(text)}`, { defaultValue: text }) : text);
export const FIELD_NAMES = Object.keys(FIELD_LABELS).filter(n => n !== 'email');
const EMPTY = Object.fromEntries(Object.keys(FIELD_LABELS).map(n => [n, '']));

// Shown only as the last 4 characters, everywhere outside the edit form (pop-up, history, profile)
export const SENSITIVE_FIELDS = ['accountNumber', 'panNumber', 'idNumber'];
// Changes to these count as "bank / payout" changes (flag on payout details)
export const BANK_FIELDS = ['bankAccountName', 'bankName', 'accountNumber', 'accountType', 'ifscCode', 'branchName', 'upiId', 'panNumber'];

export function maskValue(field, value) {
  const v = String(value ?? '').trim();
  if (!v) return '—';
  if (!SENSITIVE_FIELDS.includes(field)) return v;
  return v.length <= 4 ? '••••' : `••••${v.slice(-4)}`;
}

// Human-readable (and masked where sensitive) value for a form field
export function displayValue(field, value, data = {}) {
  if (field === 'countryCode') return value ? countryLabel(value, COUNTRIES[value]?.name || value) : '—';
  if (field === 'stateCode') {
    const state = COUNTRIES[data.countryCode]?.states?.find(s => s.code === value);
    return value ? (state?.name || value) : '—';
  }
  if (field === 'accountType') return value === 'current' ? optionLabel('Current') : value === 'savings' ? optionLabel('Savings') : maskValue(field, value);
  return maskValue(field, value);
}

// Ambassador document -> flat form values
export function fromAmbassador(a, user) {
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

// Form values -> fields to write on the ambassador document (only keys firestore.rules lets an
// ambassador change). The detailsCompleted markers are set on the first save only.
export function buildUpdate(data, { first = false } = {}) {
  const country = COUNTRIES[data.countryCode];
  const state = country?.states?.find(s => s.code === data.stateCode);
  return {
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
    ...(first ? { detailsCompleted: true, detailsCompletedAt: Timestamp.now() } : {})
  };
}

// Only the fields that changed: [{ field, label, old, new }] with sensitive values already masked,
// ready to show in the confirmation pop-up and to store in the history (raw values never leave the form).
export function diffProfile(before, after) {
  const trimmed = (v) => String(v ?? '').trim();
  return FIELD_NAMES
    .filter(field => trimmed(before[field]) !== trimmed(after[field]))
    .map(field => ({
      field,
      label: FIELD_LABELS[field],
      old: displayValue(field, trimmed(before[field]), before),
      new: displayValue(field, trimmed(after[field]), after)
    }));
}
