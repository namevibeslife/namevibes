from importlib.machinery import SourceFileLoader
import re, json
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:70])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

def hook(p, names):
    s = X.hook(open(p, encoding='utf-8').read(), names)
    open(p, 'w', encoding='utf-8').write(s)

# country label helper
s = open('src/i18n/format.js', encoding='utf-8').read()
if 'countryLabel' not in s:
    s += """
// Country names are shown in the selected language (Intl); stored values stay as they are
export function countryLabel(code, fallback = '', lang = i18n.language) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(String(code).toUpperCase()) || fallback; } catch { return fallback; }
}
"""
    open('src/i18n/format.js', 'w', encoding='utf-8').write(s)

# profile helpers
p = 'src/utils/ambassadorProfile.js'
s = open(p, encoding='utf-8').read()
s = s.replace("import { COUNTRIES } from '../data/countries';", "import i18n from 'i18next';\nimport { COUNTRIES } from '../data/countries';\nimport { countryLabel } from '../i18n/format.js';")
s = s.replace("export const FIELD_NAMES", """const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
// Labels live in the language files (ambassador.field.*, .section.*, .option.*); English is the fallback
export const fieldLabel = (name) => i18n.t(`ambassador.field.${name}`, { defaultValue: FIELD_LABELS[name] || name });
export const sectionLabel = (title) => i18n.t(`ambassador.section.${slug(title)}`, { defaultValue: title });
export const optionLabel = (option) => i18n.t(`ambassador.option.${slug(option)}`, { defaultValue: option });
export const hintLabel = (text) => (text ? i18n.t(`ambassador.hint.${slug(text)}`, { defaultValue: text }) : text);
export const FIELD_NAMES""", 1)
s = s.replace("return value ? (COUNTRIES[value]?.name || value) : '—';", "return value ? countryLabel(value, COUNTRIES[value]?.name || value) : '—';")
s = s.replace("if (field === 'accountType') return value === 'current' ? 'Current' : value === 'savings' ? 'Savings' : maskValue(field, value);", "if (field === 'accountType') return value === 'current' ? optionLabel('Current') : value === 'savings' ? optionLabel('Savings') : maskValue(field, value);")
open(p, 'w', encoding='utf-8').write(s)

sections = {'Personal Details': 'personalDetails', 'Contact Details': 'contactDetails', 'Address Details': 'addressDetails', 'Social Media Handles': 'socialMediaHandles', 'Bank & Compliance Details': 'bankComplianceDetails', 'Nominee Details (Optional)': 'nomineeDetailsOptional', 'Personal': 'personal', 'Contact': 'contact', 'Address': 'address', 'Bank / Payout': 'bankPayout', 'ID / Nominee': 'idNominee'}
add = []
src = open(p, encoding='utf-8').read()
fields = re.findall(r"\['(\w+)', ((?:\"[^\"]*\")|(?:'[^']*')), '(?:text|date|select|tel|email|country|state)'", src)
for n, l in fields:
    add.append((f'ambassador.field.{n}', l.strip("'\"")))
for t, k in sections.items():
    add.append((f'ambassador.section.{k}', t))
opts = {'Male': 'male', 'Female': 'female', 'Other': 'other', 'Aadhaar': 'aadhaar', 'Passport': 'passport', 'Driving License': 'drivingLicense', 'Voter ID': 'voterId', 'Savings': 'savings', 'Current': 'current'}
for t, k in opts.items():
    add.append((f'ambassador.option.{k}', t))
add += [('ambassador.hint.profileUrl', 'Profile URL'), ('ambassador.hint.channelUrl', 'Channel URL'), ('ambassador.hint.selectGender', 'Select Gender')]
X.add(add)
print(len(add), 'keys')

# details form
p = 'src/components/AmbassadorDetailsForm.jsx'
sub(p, [
("import { FORM_SECTIONS } from '../utils/ambassadorProfile';", "import { FORM_SECTIONS, fieldLabel, sectionLabel, optionLabel, hintLabel } from '../utils/ambassadorProfile';\nimport { countryLabel } from '../i18n/format';"),
("submitLabel = 'Save my details'", "submitLabel"),
("<option value=\"\">{extra.placeholder || 'Select'}</option>", "<option value=\"\">{hintLabel(extra.placeholder) || t('common.select')}</option>"),
("<option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>", "<option key={o[0]} value={o[0]}>{optionLabel(o[1])}</option> : <option key={o} value={o}>{optionLabel(o)}</option>"),
("<option value=\"\">Select Country</option>", "<option value=\"\">{t('ambassador.selectCountry')}</option>"),
("{c.name}</option>)}</select>;\n    } else if (type === 'state')", "{countryLabel(c.code, c.name)}</option>)}</select>;\n    } else if (type === 'state')"),
("<option value=\"\">Select State</option>", "<option value=\"\">{t('ambassador.selectState')}</option>"),
("title={extra.readOnly ? 'Your Google sign-in email. It cannot be changed.' : undefined}", "title={extra.readOnly ? t('ambassador.emailLocked') : undefined}"),
(">{label}{required ? ' *' : ''}</label>", ">{fieldLabel(name)}{required ? ' *' : ''}</label>"),
("<h3 className=\"text-xl font-bold text-gray-800 mb-4\">{title}</h3>", "<h3 className=\"text-xl font-bold text-gray-800 mb-4\">{sectionLabel(title)}</h3>"),
("{busy ? 'Saving...' : submitLabel}", "{busy ? t('profileComplete.saving') : (submitLabel || t('ambassador.saveMyDetails'))}"),
(">Cancel</button>}", ">{t('common.cancel')}</button>}"),
("const field = ([name, label, type, required, extra = {}]) => {", "const field = ([name, , type, required, extra = {}]) => {"),
])
hook(p, ['AmbassadorDetailsForm'])
X.add([('common.select', 'Select'), ('ambassador.selectCountry', 'Select Country'), ('ambassador.selectState', 'Select State'),
('ambassador.emailLocked', 'Your Google sign-in email. It cannot be changed.'), ('ambassador.saveMyDetails', 'Save my details'), ('common.cancel', 'Cancel')])

# profile view
p = 'src/components/AmbassadorProfileView.jsx'
sub(p, [
("import { VIEW_SECTIONS, FIELD_LABELS, fromAmbassador, displayValue }", "import { VIEW_SECTIONS, fieldLabel, sectionLabel, fromAmbassador, displayValue }"),
("aria-label=\"Account\"", "aria-label={t('ambassador.account')}"),
(">Ambassador Code</p>", ">{t('ambassador.code')}</p>"), (">Email</p>", ">{t('settings.email')}</p>"),
("aria-label={title}>", "aria-label={sectionLabel(title)}>"), ("mb-3\">{title}</h4>", "mb-3\">{sectionLabel(title)}</h4>"),
("{FIELD_LABELS[field]}", "{fieldLabel(field)}"),
])
hook(p, ['AmbassadorProfileView'])
X.add([('ambassador.account', 'Account'), ('ambassador.code', 'Ambassador Code')])

# change log
p = 'src/components/AmbassadorChangeLog.jsx'
sub(p, [
("const when = (v) => { const d = toDate(v); return d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''; };", "const when = (v) => { const d = toDate(v); return d ? formatDate(d, undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };"),
("import { BANK_FIELDS } from '../utils/ambassadorProfile';", "import { BANK_FIELDS, fieldLabel } from '../utils/ambassadorProfile';\nimport { formatDate } from '../i18n/format';\nimport { useTranslation } from 'react-i18next';"),
("export default function AmbassadorChangeLog({ ambassadorId, refreshKey = 0 }) {", "export default function AmbassadorChangeLog({ ambassadorId, refreshKey = 0 }) {\n  const { t } = useTranslation();"),
("export function BankChangeFlag({ ambassadorEmail }) {", "export function BankChangeFlag({ ambassadorEmail }) {\n  const { t } = useTranslation();"),
(">Change history</h3>", ">{t('ambassador.history')}</h3>"),
("<p className=\"text-sm text-gray-500\">Loading...</p>", "<p className=\"text-sm text-gray-500\">{t('common.loading')}</p>"),
("{failed ? 'The history could not be loaded.' : 'No changes recorded yet.'}", "{failed ? t('ambassador.historyFailed') : t('ambassador.historyEmpty')}"),
("{entry.type === 'submitted' ? 'Details submitted' : entry.summary || 'Details changed'}", "{entry.type === 'submitted' ? t('ambassador.detailsSubmitted') : (entry.changes || []).length ? t('ambassador.changedList', { fields: entry.changes.map(c => fieldLabel(c.field)).join(', ') }) : entry.summary || t('ambassador.detailsChanged')}"),
("<li key={i} className=\"break-words\">Changed {c.label}: {c.old} → {c.new}</li>", "<li key={i} className=\"break-words\">{t('ambassador.changedLine', { label: fieldLabel(c.field), old: c.old, new: c.new })}</li>"),
("⚠ Bank details changed on {changedAt.toLocaleDateString()}", "{t('ambassador.bankChanged', { date: formatDate(changedAt) })}"),
])
X.add([('ambassador.history', 'Change history'), ('ambassador.historyFailed', 'The history could not be loaded.'), ('ambassador.historyEmpty', 'No changes recorded yet.'),
('ambassador.detailsSubmitted', 'Details submitted'), ('ambassador.changedList', 'Changed {{fields}}'), ('ambassador.detailsChanged', 'Details changed'),
('ambassador.changedLine', 'Changed {{label}}: {{old}} → {{new}}'), ('ambassador.bankChanged', '⚠ Bank details changed on {{date}}')])
print('done')
