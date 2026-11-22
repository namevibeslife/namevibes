import re

def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:70])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

edit('src/utils/pricing.js', [
 ("import { COUNTRIES, getPricing, defaultPriceFor, CURRENCY_SYMBOLS, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';", "import { COUNTRIES, getCountry, getPricing, defaultPriceFor, CURRENCY_SYMBOLS, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';"),
 ("const country = COUNTRIES[countryCode] || COUNTRIES.US;\n  const base", "const country = getCountry(countryCode) || COUNTRIES.US;\n  const base"),
])
edit('src/pages/Pricing.jsx', [
 ("import { COUNTRIES } from '../data/countries';", "import { COUNTRIES, getCountry } from '../data/countries';"),
 ("COUNTRIES[userProfile?.countryCode] || COUNTRIES.US", "getCountry(userProfile?.countryCode) || COUNTRIES.US"),
])
edit('src/components/AmbassadorFollowers.jsx', [
 ("import { CURRENCY_SYMBOLS, COUNTRIES } from '../data/countries';", "import { CURRENCY_SYMBOLS, getCountry } from '../data/countries';"),
 ("const country = COUNTRIES[ambassador.countryCode];", "const country = getCountry(ambassador.countryCode);"),
])
edit('src/components/AmbassadorInvite.jsx', [
 ("import { COUNTRIES, getActiveCountries } from '../data/countries';", "import { COUNTRIES, getCountry, getActiveCountries } from '../data/countries';"),
 ("if (!COUNTRIES[form.countryCode])", "if (!getCountry(form.countryCode))"),
 ("const country = COUNTRIES[form.countryCode];", "const country = getCountry(form.countryCode);"),
])
edit('src/utils/ambassadorProfile.js', [
 ("import { COUNTRIES } from '../data/countries';", "import { getCountry } from '../data/countries';"),
 ("COUNTRIES[value]?.name || value", "getCountry(value)?.name || value"),
 ("const state = COUNTRIES[data.countryCode]?.states?.find(s => s.code === value);", "const state = getCountry(data.countryCode)?.states?.find(s => s.code === value);"),
 ("return value ? (state?.name || value) : '—';", "return value ? (state?.name || value) : '—';"),
 ("const country = COUNTRIES[data.countryCode];", "const country = getCountry(data.countryCode);"),
 ("stateCode: data.stateCode, stateName: state?.name || '',", "stateCode: data.stateCode, stateName: state?.name || (country && !country.states?.length ? data.stateCode : ''),"),
])
edit('src/components/AmbassadorDetailsForm.jsx', [
 ("import { COUNTRIES } from '../data/countries';", "import { ALL_COUNTRIES, getCountry } from '../data/countries';"),
 ("{Object.values(COUNTRIES).map(c =>", "{Object.values(ALL_COUNTRIES).sort((a, b) => a.name.localeCompare(b.name)).map(c =>"),
 ("control = <select {...common} disabled={!data.countryCode}><option value=\"\">Select State</option>\n        {(COUNTRIES[data.countryCode]?.states || []).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>;",
  "const states = getCountry(data.countryCode)?.states || [];\n      control = states.length || !data.countryCode\n        ? <select {...common} disabled={!data.countryCode}><option value=\"\">Select State</option>\n          {states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>\n        : <input {...common} required={false} type=\"text\" placeholder=\"State / region (optional)\" />;"),
])
edit('src/pages/ProfileComplete.jsx', [
 ("import { COUNTRIES, getActiveCountries } from '../data/countries';", "import { COUNTRIES, getCountry, getActiveCountries } from '../data/countries';"),
 ("const country = COUNTRIES[formData.countryCode];\n    if (!country) return [];", "const country = getCountry(formData.countryCode);\n    if (!country) return [];"),
 ("            {formData.countryCode && (\n              <div className=\"relative\">\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                  State/Province *",
  "            {formData.countryCode && !(getCountry(formData.countryCode)?.states || []).length && (\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">State/Province (optional)</label>\n                <input\n                  type=\"text\"\n                  value={formData.stateName}\n                  onChange={(e) => setFormData({ ...formData, stateCode: '', stateName: e.target.value })}\n                  className=\"w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none\"\n                />\n              </div>\n            )}\n\n            {formData.countryCode && (getCountry(formData.countryCode)?.states || []).length > 0 && (\n              <div className=\"relative\">\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                  State/Province *"),
])
# admin: use the full list everywhere
edit('src/pages/AdminPanel.jsx', [
 ("import { COUNTRIES, CURRENCY_SYMBOLS, DEFAULT_REFERRAL_DISCOUNT, defaultPriceFor } from '../data/countries';", "import { ALL_COUNTRIES, getCountry, suggestedCurrency, currencySymbol, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';"),
 ("const country = COUNTRIES[countryCode];\n    return country ? country.states : [];", "const country = getCountry(countryCode);\n    return country ? country.states : [];"),
 ("    countryCode: '',\n    currency: 'USD',\n    price: 12,\n", "    countryCode: '',\n    currency: '',\n    price: '',\n"),
 ("      countryCode: '',\n      currency: 'USD',\n      price: defaultPriceFor('USD'),\n", "      countryCode: '',\n      currency: '',\n      price: '',\n"),
 ("readPlanSettings(country, COUNTRIES[country.countryCode]?.currency)", "readPlanSettings(country, getCountry(country.countryCode)?.currency)"),
 ("const countryInfo = COUNTRIES[countryFormData.countryCode];", "const countryInfo = getCountry(countryFormData.countryCode);"),
 ("symbol: CURRENCY_SYMBOLS[currency] || countryInfo.symbol || '$',", "symbol: currencySymbol(currency),"),
 ("      // One Annual Plan price and one referral discount per country.", "      if (!(Number(countryFormData.price) > 0)) {\n        alert('Enter the annual plan price for this country (a number above 0). Prices are never filled in automatically.');\n        setLoading(false);\n        return;\n      }\n\n      // One Annual Plan price and one referral discount per country."),
 ("COUNTRIES={COUNTRIES}", "COUNTRIES={ALL_COUNTRIES}"),
])
print('wired')
