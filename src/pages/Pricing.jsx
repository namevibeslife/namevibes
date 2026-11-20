import { formatMoney } from '../i18n/format';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { COUNTRIES, getCountry } from '../data/countries';
import { loadCountryPricing, discountedPrice, loadGatewayChoice } from '../utils/pricing';
import { FAMILY_MAX_NAMES } from '../utils/plan';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  // null = neither gateway can take this country's currency (checkout is blocked)
  const [gateway, setGateway] = useState('pending');
  const [testMode, setTestMode] = useState(false);
  const checkoutBlocked = gateway === null && !testMode;

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
        const loaded = await loadCountryPricing(userDoc.data().countryCode);
        setPricing(loaded);
        setGateway((await loadGatewayChoice(userDoc.data().countryCode, loaded)).gateway);
        if (import.meta.env.MODE !== 'mock') {
          try { setTestMode((await (await fetch('/api/payment-mode')).json()).testMode === true); } catch { /* normal checkout */ }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // One plan only. Internally it is stored as planType 'family' so every existing feature gate
  // keeps working; the UI just calls it the NAMASUTRA Annual Plan.
  const handleSelectPlan = () => {
    if (!userProfile || !pricing) return;

    const plan = pricing.plan;
    const hasReferral = userProfile.referralCodeUsed || userProfile.referralCode;
    const finalPrice = hasReferral ? discountedPrice(plan) : plan.price;

    navigate('/payment', {
      state: {
        planType: 'family',
        amount: finalPrice,
        listPrice: plan.price,
        discountPercent: plan.discountPercent,
        currency: pricing.currency,
        symbol: pricing.symbol,
        referralCode: userProfile.referralCodeUsed || userProfile.referralCode || null
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen site-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const countryInfo = getCountry(userProfile?.countryCode) || COUNTRIES.US;
  const symbol = pricing?.symbol || countryInfo.symbol;
  const hasReferral = userProfile?.referralCodeUsed || userProfile?.referralCode;
  const price = pricing?.plan.price;
  // A discount only shows when there's a referral code and the discount actually lowers the price
  const discounted = hasReferral && pricing && discountedPrice(pricing.plan) < price ? discountedPrice(pricing.plan) : null;

  return (
    <div className="min-h-screen site-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-8 font-medium"
        >
          <ArrowLeft size={20} />
          {t('nav.backToDashboard')}
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('pricing.subtitle')}
          </p>
          {location.state?.reason && (
            <div className="mt-4 inline-block bg-brand-50 border-2 border-brand-300 rounded-lg px-6 py-3 text-brand-800 font-medium">
              {location.state.reason === 'family-required'
                ? t('pricing.reasonFamily')
                : t('pricing.reasonPlan')}
            </div>
          )}
          {hasReferral && (
            <div className="mt-4 inline-block bg-green-100 border-2 border-green-500 rounded-lg px-6 py-3">
              <p className="text-green-800 font-semibold">
                {t('pricing.referralApplied', { code: userProfile.referralCodeUsed || userProfile.referralCode })}
              </p>
              <p className="text-green-700 text-sm">
                {t('pricing.percentOff', { percent: pricing?.plan.discountPercent })}
              </p>
            </div>
          )}
        </div>

        <div className="max-w-md mx-auto mb-12">
          <div className="bg-gradient-to-br from-brand-600 to-ocean-600 rounded-2xl shadow-2xl p-8 border-4 border-brand-700 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 whitespace-nowrap">
                <Sparkles size={16} />
                {t('pricing.badge')}
              </span>
            </div>

            <div className="text-center mb-6 mt-4">
              <h3 className="text-2xl font-bold text-white mb-2">{t('pricing.title')}</h3>
              <div className="mb-4">
                {discounted !== null ? (
                  <>
                    <p className="text-brand-200 line-through text-lg">{formatMoney(price, pricing.currency)}</p>
                    <p className="text-5xl font-bold text-white">{formatMoney(discounted, pricing.currency)} <span className="text-2xl font-semibold text-brand-100">{t('pricing.perYear')}</span></p>
                    <p className="text-yellow-300 font-semibold mt-1">{t('pricing.referralDiscount', { percent: pricing.plan.discountPercent })}</p>
                  </>
                ) : (
                  <p className="text-5xl font-bold text-white">{formatMoney(price, pricing?.currency)} <span className="text-2xl font-semibold text-brand-100">{t('pricing.perYear')}</span></p>
                )}
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                t('pricing.feature1'),
                t('pricing.featureFamily', { max: FAMILY_MAX_NAMES }),
                t('pricing.feature2'),
                t('pricing.feature3'),
                t('pricing.feature4'),
                t('pricing.feature5'),
                t('pricing.feature6'),
                t('pricing.feature7')
              ].map(text => (
                <li key={text} className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white">{text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSelectPlan}
              disabled={checkoutBlocked}
              className="w-full bg-paper text-brand-600 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition transform hover:scale-105 shadow-lg disabled:opacity-60 disabled:transform-none disabled:cursor-not-allowed"
            >
              {t('pricing.cta')}
            </button>
          </div>
        </div>

        <div className="text-center text-gray-600 max-w-2xl mx-auto">
          {checkoutBlocked ? (
            <p role="alert" className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 font-medium">
              {t('payment.unavailable')}
            </p>
          ) : (
            <p className="mb-4">
              {t('payment.securePowered', { gateway: gateway === 'razorpay' ? 'Razorpay' : 'PayPal' })}
            </p>
          )}
          <p className="text-sm">
            {t('pricing.billing')}
          </p>
        </div>
      </div>
    </div>
  );
}