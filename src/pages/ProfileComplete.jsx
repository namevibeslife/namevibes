import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { COUNTRIES, getCountry, getActiveCountries } from '../data/countries';
import { detectBrowserCountry } from '../utils/countryDetect';
import { normalizeReferralCode, isWellFormedCode, getStoredReferralCode, clearStoredReferralCode } from '../utils/referralCode';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

export default function ProfileComplete() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const [loading, setLoading] = useState(false);
  // A referral code captured from a ?ref= share link (see LandingPage) prefills this field,
  // but the person can still change or clear it.
  const [referralFromLink] = useState(() => Boolean(getStoredReferralCode()));
  const [formData, setFormData] = useState(() => ({
    fullName: '',
    dob: '',
    gender: '',
    countryCode: '',
    countryName: '',
    stateCode: '',
    stateName: '',
    referralCode: getStoredReferralCode() || ''
  }));

  // Search states
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  // Countries admin has activated, and whether the current selection came from auto-detection
  const [activeCountries, setActiveCountries] = useState([]);
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    checkExistingProfile();
    loadActiveCountriesAndDetect();
  }, []);

  const loadActiveCountriesAndDetect = async () => {
    try {
      const [settingsSnapshot, detectedCode] = await Promise.all([
        getDocs(collection(db, 'countrySettings')),
        detectBrowserCountry()
      ]);

      const active = getActiveCountries(settingsSnapshot.docs.map(d => d.data()));
      setActiveCountries(active);

      const match = detectedCode && active.find(c => c.code === detectedCode);
      if (match) {
        setFormData(prev => ({ ...prev, countryCode: match.code, countryName: match.name }));
        setCountrySearch(match.name);
        setAutoDetected(true);
      }
    } catch (error) {
      console.error('Error loading country list:', error);
    }
  };

  const checkExistingProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().profileComplete) {
        navigate('/pricing');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handleReferralCodeChange = (e) => {
    // Codes are case-insensitive and whitespace-free (CCNNNNNN, e.g. IN482913); uppercase as typed.
    // A generous length cap just guards against pasting something huge, not against format.
    const value = e.target.value.toUpperCase().slice(0, 20);
    setFormData({ ...formData, referralCode: value });
  };

  // Filter countries based on search. Only countries an admin has activated are offered;
  // if none are activated yet, fall back to the full list so sign-up never blocks on that.
  const getFilteredCountries = () => {
    const options = activeCountries.length > 0 ? activeCountries : Object.values(COUNTRIES);
    if (!countrySearch) return options;
    return options.filter(country =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase())
    );
  };

  // Filter states based on search
  const getFilteredStates = () => {
    if (!formData.countryCode) return [];
    const country = getCountry(formData.countryCode);
    if (!country) return [];
    
    if (!stateSearch) return country.states;
    return country.states.filter(state =>
      state.name.toLowerCase().includes(stateSearch.toLowerCase())
    );
  };

  const handleCountrySelect = (country) => {
    setFormData({
      ...formData,
      countryCode: country.code,
      countryName: country.name,
      stateCode: '',
      stateName: ''
    });
    setCountrySearch(country.name);
    setStateSearch('');
    setShowCountryDropdown(false);
    setAutoDetected(false);
  };

  const handleStateSelect = (state) => {
    setFormData({
      ...formData,
      stateCode: state.code,
      stateName: state.name
    });
    setStateSearch(state.name);
    setShowStateDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        alert(t('errors.signInFirst'));
        navigate('/login');
        return;
      }

      // Validate the referral code: format first (CCNNNNNN, e.g. IN482913), then against
      // active ambassador codes.
      let ambassadorEmail = null;
      let cleaned = '';
      if (formData.referralCode) {
        cleaned = normalizeReferralCode(formData.referralCode);
        if (!isWellFormedCode(cleaned)) {
          alert(t('errors.referralFormat'));
          setLoading(false);
          return;
        }
        const codeDoc = await getDoc(doc(db, 'referralCodes', cleaned));
        if (!codeDoc.exists() || !codeDoc.data().active) {
          alert(t('errors.referralInvalid'));
          setLoading(false);
          return;
        }
        ambassadorEmail = codeDoc.data().ambassadorEmail;
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...formData,
        referralCode: cleaned,
        ambassadorEmail,
        email: user.email,
        profileComplete: true,
        createdAt: new Date()
      }, { merge: true });

      clearStoredReferralCode();
      await refreshProfile();
      navigate('/pricing');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(t('errors.profileSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen site-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-paper rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
            {t('profileComplete.title')}
          </h2>
          <p className="text-center text-gray-600 mb-8">
            {t('profileComplete.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileComplete.fullName')}
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder={t('profileComplete.fullNamePlaceholder')}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileComplete.dob')}
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileComplete.gender')}
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">{t('profileComplete.selectGender')}</option>
                <option value="male">{t('profileComplete.male')}</option>
                <option value="female">{t('profileComplete.female')}</option>
                <option value="other">{t('profileComplete.other')}</option>
              </select>
            </div>

            {/* Country - Searchable */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileComplete.country')}
              </label>
              <input
                type="text"
                required
                value={countrySearch}
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setShowCountryDropdown(true);
                }}
                onFocus={() => setShowCountryDropdown(true)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder={t('profileComplete.countryPlaceholder')}
                autoComplete="off"
              />
              
              {showCountryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-paper border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getFilteredCountries().length > 0 ? (
                    getFilteredCountries().map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full px-4 py-3 text-left hover:bg-brand-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-800">{country.name}</div>
                        <div className="text-xs text-gray-500">{country.code}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      {t('profileComplete.noCountries')}
                    </div>
                  )}
                </div>
              )}
              {autoDetected && (
                <p className="text-xs text-brand-600 mt-1">
                  {t('profileComplete.detected')}
                </p>
              )}
            </div>

            {/* State - Searchable */}
            {formData.countryCode && !(getCountry(formData.countryCode)?.states || []).length && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profileComplete.stateOptional')}</label>
                <input
                  type="text"
                  value={formData.stateName}
                  onChange={(e) => setFormData({ ...formData, stateCode: '', stateName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            )}

            {formData.countryCode && (getCountry(formData.countryCode)?.states || []).length > 0 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profileComplete.state')}
                </label>
                <input
                  type="text"
                  required
                  value={stateSearch}
                  onChange={(e) => {
                    setStateSearch(e.target.value);
                    setShowStateDropdown(true);
                  }}
                  onFocus={() => setShowStateDropdown(true)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder={t('profileComplete.statePlaceholder')}
                  autoComplete="off"
                />
                
                {showStateDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-paper border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredStates().length > 0 ? (
                      getFilteredStates().map(state => (
                        <button
                          key={state.code}
                          type="button"
                          onClick={() => handleStateSelect(state)}
                          className="w-full px-4 py-3 text-left hover:bg-brand-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{state.name}</div>
                          <div className="text-xs text-gray-500">{state.code}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        {t('profileComplete.noStates')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Referral Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileComplete.referral')}
              </label>
              <input
                type="text"
                value={formData.referralCode}
                onChange={handleReferralCodeChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                placeholder="IN482913"
                maxLength={20}
              />
              {referralFromLink && formData.referralCode ? (
                <p className="text-xs text-brand-600 mt-1">
                  {t('profileComplete.referralFromLink')}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  {t('profileComplete.referralFormat')}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-brand-700 hover:to-ocean-700 transition disabled:opacity-50"
            >
              {loading ? t('profileComplete.saving') : t('profileComplete.continue')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}