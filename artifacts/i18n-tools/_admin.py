def rw(p, f):
    s = open(p, encoding='utf-8', newline=None).read()
    s2 = f(s)
    open(p, 'w', encoding='utf-8', newline='\n').write(s2)

def need(s, old, new):
    if old not in s:
        print('NOT FOUND:', old[:70].replace('\n', '|'))
        return s
    return s.replace(old, new, 1)

def ap(s):
    s = need(s, "    taxPercent: '',\n    isActive: true\n  });", "    taxPercent: '',\n    gatewayOverride: 'auto',\n    isActive: true\n  });")
    s = need(s, "      taxPercent: '',\n      isActive: true\n    });\n    setShowCountryModal(true);", "      taxPercent: '',\n      gatewayOverride: 'auto',\n      isActive: true\n    });\n    setShowCountryModal(true);")
    s = need(s, "      taxPercent: country.taxPercent ?? '',\n      isActive: country.isActive", "      taxPercent: country.taxPercent ?? '',\n      gatewayOverride: country.gatewayOverride || 'auto',\n      isActive: country.isActive")
    s = need(s, "        isActive: countryFormData.isActive,\n        updatedAt", "        gatewayOverride: ['razorpay', 'paypal'].includes(countryFormData.gatewayOverride) ? countryFormData.gatewayOverride : 'auto',\n        isActive: countryFormData.isActive,\n        updatedAt")
    if 'const loadInternationalFlag' not in s:
        s = need(s, "  const loadCountrySettings = async () => {\n    try {", """  const loadInternationalFlag = async () => {
    try {
      const snap = await getDoc(doc(db, 'paymentSettings', 'razorpay'));
      setInternationalEnabled(snap.exists() && snap.data().internationalEnabled === true);
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  const handleToggleInternational = async (value) => {
    const previous = internationalEnabled;
    setInternationalEnabled(value);
    try {
      await setDoc(doc(db, 'paymentSettings', 'razorpay'), { internationalEnabled: value, updatedAt: Timestamp.now(), updatedBy: currentAdmin.email }, { merge: true });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      setInternationalEnabled(previous);
      alert('Could not save the setting: ' + error.message);
    }
  };

  const loadCountrySettings = async () => {
    loadInternationalFlag();
    try {""")
    return s

rw('src/pages/AdminPanel.jsx', ap)

def ad(s):
    s = need(s, "gatewayWarnings(countryFormData.countryCode, countryFormData.currency, countryFormData.price)", "gatewayWarnings(countryFormData.countryCode, countryFormData.currency, countryFormData.price, { override: countryFormData.gatewayOverride, internationalEnabled })")
    s = need(s, """              {countrySettings.length === 0 ? (
                <div className="bg-paper rounded-xl shadow-lg p-12 text-center">""", """              <label className="flex items-start gap-3 bg-paper rounded-xl shadow p-4 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={internationalEnabled}
                  onChange={(e) => handleToggleInternational(e.target.checked)}
                  className="mt-1 w-5 h-5"
                />
                <span>
                  <span className="block font-semibold text-gray-800">Razorpay: International payments enabled</span>
                  <span className="block text-sm text-gray-600">
                    Off (default): countries outside India are charged through PayPal where PayPal supports their currency.
                    On: every country whose currency Razorpay supports uses Razorpay, and PayPal is only the fallback.
                    Switch it on only after Razorpay has approved International Payments on your account. INR (India) always uses Razorpay.
                  </span>
                </span>
              </label>

              {countrySettings.length === 0 ? (
                <div className="bg-paper rounded-xl shadow-lg p-12 text-center">""")
    s = need(s, """                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Referral Discount</span>""", """                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Payment gateway</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {(() => {
                              const r = resolveGateway({ currency: readPlanSettings(country).currency, override: country.gatewayOverride, internationalEnabled });
                              const label = r.gateway ? GATEWAY_NAMES[r.gateway] : 'None (checkout blocked)';
                              return r.via === 'forced' ? `${label} (forced)` : `${label} (auto)`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Referral Discount</span>""")
    s = need(s, "import { gatewayWarnings } from '../data/gatewayCurrencies';", "import { gatewayWarnings, resolveGateway, GATEWAY_NAMES } from '../data/gatewayCurrencies';")
    s = need(s, """              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax included in price (%)""", """              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment gateway</label>
                <select
                  value={countryFormData.gatewayOverride || 'auto'}
                  onChange={(e) => setCountryFormData({...countryFormData, gatewayOverride: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                >
                  <option value="auto">Auto (Razorpay where it supports the currency, otherwise PayPal)</option>
                  <option value="razorpay">Razorpay (force)</option>
                  <option value="paypal">PayPal (force)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Leave on Auto. Force a gateway only if the automatic one is failing for this country.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax included in price (%)""")
    return s

rw('src/pages/AdminDashboard.jsx', ad)
