import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { COUNTRIES, getPricing, getDiscountedPrice } from '../data/countries';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';

export default function Pricing() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planType) => {
    if (!userProfile) return;

    const pricing = getPricing(userProfile.countryCode, planType);
    const hasReferral = userProfile.referralCodeUsed || userProfile.referralCode;
    const finalPrice = hasReferral 
      ? Math.round(getDiscountedPrice(pricing.price, planType))
      : pricing.price;

    navigate('/payment', {
      state: {
        planType,
        amount: finalPrice,
        currency: pricing.currency,
        symbol: pricing.symbol,
        referralCode: userProfile.referralCodeUsed || userProfile.referralCode || null
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const countryInfo = COUNTRIES[userProfile?.countryCode] || COUNTRIES.US;
  const individualPricing = getPricing(userProfile?.countryCode, 'individual');
  const familyPricing = getPricing(userProfile?.countryCode, 'family');
  
  const hasReferral = userProfile?.referralCodeUsed || userProfile?.referralCode;
  
  const individualPrice = individualPricing.price;
  const familyPrice = familyPricing.price;
  
  const individualDiscountedPrice = hasReferral ? Math.round(getDiscountedPrice(individualPrice, 'individual')) : null;
  const familyDiscountedPrice = hasReferral ? Math.round(getDiscountedPrice(familyPrice, 'family')) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-8 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Unlock the chemistry in names
          </p>
          {hasReferral && (
            <div className="mt-4 inline-block bg-green-100 border-2 border-green-500 rounded-lg px-6 py-3">
              <p className="text-green-800 font-semibold">
                🎉 Referral Code Applied: {userProfile.referralCodeUsed || userProfile.referralCode}
              </p>
              <p className="text-green-700 text-sm">
                10% off Individual • 20% off Family
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          
          {/* Individual Plan */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200 hover:border-purple-500 transition">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Individual</h3>
              <div className="mb-4">
                {hasReferral ? (
                  <>
                    <p className="text-gray-500 line-through text-lg">
                      {individualPricing.symbol}{individualPrice}
                    </p>
                    <p className="text-5xl font-bold text-purple-600">
                      {individualPricing.symbol}{individualDiscountedPrice}
                    </p>
                    <p className="text-green-600 font-semibold mt-1">
                      Save {individualPricing.symbol}{individualPrice - individualDiscountedPrice}!
                    </p>
                  </>
                ) : (
                  <p className="text-5xl font-bold text-purple-600">
                    {individualPricing.symbol}{individualPrice}
                  </p>
                )}
                <p className="text-gray-600 mt-2">per year</p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">8 name analyses per month</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Periodic table element breakdown</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Chaldean numerology insights</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Hindu astrology compatibility</span>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <span className="text-gray-400">❌ No family package</span>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <span className="text-gray-400">❌ No PDF downloads</span>
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('individual')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition transform hover:scale-105 shadow-lg"
            >
              Select Individual
            </button>
          </div>

          {/* Family Plan */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 border-4 border-purple-700 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                <Sparkles size={16} />
                MOST POPULAR
              </span>
            </div>

            <div className="text-center mb-6 mt-4">
              <h3 className="text-2xl font-bold text-white mb-2">Family</h3>
              <div className="mb-4">
                {hasReferral ? (
                  <>
                    <p className="text-purple-200 line-through text-lg">
                      {familyPricing.symbol}{familyPrice}
                    </p>
                    <p className="text-5xl font-bold text-white">
                      {familyPricing.symbol}{familyDiscountedPrice}
                    </p>
                    <p className="text-yellow-300 font-semibold mt-1">
                      Save {familyPricing.symbol}{familyPrice - familyDiscountedPrice}!
                    </p>
                  </>
                ) : (
                  <p className="text-5xl font-bold text-white">
                    {familyPricing.symbol}{familyPrice}
                  </p>
                )}
                <p className="text-purple-100 mt-2">per year</p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white">Everything in Individual, plus:</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white font-semibold">Analyze up to 50 family names</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white font-semibold">Download beautiful PDF reports</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white font-semibold">Family harmony analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white">Perfect for gifts!</span>
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('family')}
              className="w-full bg-white text-purple-600 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition transform hover:scale-105 shadow-lg"
            >
              Select Family
            </button>
          </div>
        </div>

        <div className="text-center text-gray-600 max-w-2xl mx-auto">
          <p className="mb-4">
            🔒 Secure payment powered by {countryInfo.gateway === 'razorpay' ? 'Razorpay' : 'PayPal'}
          </p>
          <p className="text-sm">
            All plans are billed yearly. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}