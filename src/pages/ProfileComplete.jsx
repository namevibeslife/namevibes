import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { COUNTRIES } from '../data/countries';

export default function ProfileComplete() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    countryCode: '',
    countryName: '',
    stateCode: '',
    stateName: '',
    referralCode: ''
  });

  // Search states
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/signin');
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

  const formatReferralCode = (value) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}`;
  };

  const handleReferralCodeChange = (e) => {
    const formatted = formatReferralCode(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 9) {
      setFormData({ ...formData, referralCode: formatted });
    }
  };

  // Filter countries based on search
  const getFilteredCountries = () => {
    if (!countrySearch) return Object.values(COUNTRIES);
    return Object.values(COUNTRIES).filter(country =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase())
    );
  };

  // Filter states based on search
  const getFilteredStates = () => {
    if (!formData.countryCode) return [];
    const country = COUNTRIES[formData.countryCode];
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
        alert('Please sign in first');
        navigate('/signin');
        return;
      }

      // Validate referral code format if provided
      if (formData.referralCode) {
        const cleaned = formData.referralCode.replace(/\s/g, '');
        if (cleaned.length !== 9) {
          alert('Referral code must be exactly 9 characters (CC SS NNNNN format)');
          setLoading(false);
          return;
        }
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...formData,
        email: user.email,
        profileComplete: true,
        createdAt: new Date()
      }, { merge: true });

      navigate('/pricing');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Complete Your Profile
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Tell us a bit about yourself
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Enter your full name"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Country - Searchable */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Type to search country..."
                autoComplete="off"
              />
              
              {showCountryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getFilteredCountries().length > 0 ? (
                    getFilteredCountries().map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-800">{country.name}</div>
                        <div className="text-xs text-gray-500">{country.code}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      No countries found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* State - Searchable */}
            {formData.countryCode && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Type to search state..."
                  autoComplete="off"
                />
                
                {showStateDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredStates().length > 0 ? (
                      getFilteredStates().map(state => (
                        <button
                          key={state.code}
                          type="button"
                          onClick={() => handleStateSelect(state)}
                          className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{state.name}</div>
                          <div className="text-xs text-gray-500">{state.code}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No states found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Referral Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referral Code (Optional)
              </label>
              <input
                type="text"
                value={formData.referralCode}
                onChange={handleReferralCodeChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                placeholder="IN TN 00001"
                maxLength={11}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: CC SS NNNNN (e.g., IN TN 00001)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue to Pricing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}