def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:70])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

edit('src/pages/AdminPanel.jsx', [
 ("import { ALL_COUNTRIES, getCountry, suggestedCurrency, currencySymbol, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';", "import { ALL_COUNTRIES, getCountry, currencySymbol, DEFAULT_REFERRAL_DISCOUNT } from '../data/countries';"),
 ("currencySymbol: CURRENCY_SYMBOLS[currency] || currency + ' ',", "currencySymbol: currencySymbol(currency),"),
])

old_start = """                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={countryFormData.countryCode}
                  onChange={(e) => setCountryFormData({...countryFormData, countryCode: e.target.value})}
                  disabled={editingCountry !== null}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select Country</option>
                  {Object.values(COUNTRIES).map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
"""
new_start = """                <label htmlFor="country-combobox" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <CountryCombobox
                  id="country-combobox"
                  countries={Object.values(COUNTRIES).sort((a, b) => a.name.localeCompare(b.name))}
                  value={countryFormData.countryCode}
                  disabled={editingCountry !== null}
                  onChange={(code) => setCountryFormData(f => ({ ...f, countryCode: code, currency: suggestedCurrency(code) }))}
                />
                <p className="text-xs text-gray-500 mt-1">Type a few letters of the name or the two-letter code. Any country in the world can be added.</p>
              </div>
"""
edit('src/pages/AdminDashboard.jsx', [
 (old_start, new_start),
 ("""                  {['INR', 'USD', 'EUR', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
""", """                  {countryFormData.currency === '' && <option value="">Select currency</option>}
                  {[...new Set([countryFormData.currency, ...allCurrencies()].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Filled in from the country (euro countries get EUR). You can change it. Symbol: {countryFormData.currency ? currencySymbol(countryFormData.currency).trim() : '-'}
                </p>
                {gatewayWarnings(countryFormData.countryCode, countryFormData.currency, countryFormData.price).map((w, i) => (
                  <div key={i} role="alert" className={`mt-2 rounded-lg border px-3 py-2 text-sm ${w.level === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                    {w.level === 'warn' ? '⚠ ' : 'ℹ '}{w.text}
                  </div>
                ))}
              </div>
"""),
 ("""                    value={countryFormData.price}
                    onChange={(e) => setCountryFormData({...countryFormData, price: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
""", """                    value={countryFormData.price}
                    onChange={(e) => setCountryFormData({...countryFormData, price: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="Enter the price"
"""),
 ("import { CURRENCY_SYMBOLS } from '../data/countries';", "import { CURRENCY_SYMBOLS, allCurrencies, currencySymbol, suggestedCurrency } from '../data/countries';\nimport { gatewayWarnings } from '../data/gatewayCurrencies';\nimport CountryCombobox from '../components/CountryCombobox';"),
 ("disabled={loading || !countryFormData.countryCode}", "disabled={loading || !countryFormData.countryCode || !countryFormData.currency}"),
])
print('ok')
