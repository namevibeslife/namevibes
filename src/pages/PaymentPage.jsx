import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trans } from 'react-i18next';
import { formatMoney } from '../i18n/format';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { loadTaxRates, loadGatewayChoice } from '../utils/pricing';
import { GST_RATE_BY_COUNTRY } from '../utils/commission';
import { useTranslation } from 'react-i18next';

// In mock mode (npm run dev:mock) no gateway scripts load; payments are simulated
const IS_MOCK = import.meta.env.MODE === 'mock';

const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.body.appendChild(script);
});

// The server decides the price and checks every payment with the gateway before activating a plan.
// The browser only asks it to start an order and to verify the result.
async function callPayApi(path, payload) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/pay/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Payment request failed'), { code: data.code });
  return data;
}

export default function PaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paid, setPaid] = useState(false);
  const [chosenGateway, setChosenGateway] = useState(null);

  const { planType, amount, currency, symbol, referralCode, listPrice, discountPercent } = location.state || {};
  const [taxRate, setTaxRate] = useState(null);
  // The discount is always list price minus the amount actually charged, so the lines add up.
  const discountAmount = referralCode && Number(listPrice) > Number(amount) ? Number(listPrice) - Number(amount) : 0;

  useEffect(() => {
    if (!planType || !amount) {
      navigate('/pricing');
      return;
    }
    loadUserProfile();
  }, []);

  // Tax text comes from the country's own setting (Country Pricing), with the same fallback as commission
  useEffect(() => {
    if (!userProfile?.countryCode) return;
    loadTaxRates().then(rates => {
      const set = rates[userProfile.countryCode];
      setTaxRate(Number.isFinite(Number(set)) && set !== undefined && set !== null ? Number(set) : (GST_RATE_BY_COUNTRY[userProfile.countryCode] || 0));
    }).catch(() => setTaxRate(GST_RATE_BY_COUNTRY[userProfile.countryCode] || 0));
  }, [userProfile?.countryCode]);

  useEffect(() => {
    // Load PayPal SDK if needed
    if (paymentMethod === 'paypal' && !paypalLoaded) {
      loadPayPalScript();
    }
  }, [paymentMethod]);

  const loadPayPalScript = () => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=AcF_1jxK7heQF3978kTbdmXDsjMtMEvtYgdjW63843OyvH2ni78u-ZiMeYXO64wvgsTmFh8ECcqpzR3U&currency=${encodeURIComponent(currency || 'USD')}`;
    script.addEventListener('load', () => {
      setPaypalLoaded(true);
      renderPayPalButton();
    });
    document.body.appendChild(script);
  };

  const renderPayPalButton = () => {
    if (!window.paypal) return;

    // Clear existing buttons
    const container = document.getElementById('paypal-button-container');
    if (container) {
      container.innerHTML = '';
    }

    window.paypal.Buttons({
      // Order is created on the server with the server-computed amount; the server captures and verifies it
      createOrder: async () => {
        const order = await callPayApi('create-order', { gateway: 'paypal' });
        return order.orderId;
      },
      onApprove: async (data) => {
        try {
          await callPayApi('verify', { gateway: 'paypal', orderId: data.orderID });
          await finishPayment();
        } catch (error) {
          console.error('PayPal verification error:', error);
          alert(t('errors.paymentRecorded'));
        }
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        alert(t('errors.paymentFailed'));
      }
    }).render('#paypal-button-container');
  };

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile(data);
        // While testers are checking the flow, the server can switch on a no-card test payment
        let testMode = false;
        if (!IS_MOCK) {
          try {
            testMode = (await (await fetch('/api/payment-mode')).json()).testMode === true;
          } catch {
            // no test mode: normal checkout
          }
        }
        // Razorpay wherever it supports the currency, PayPal as fallback, otherwise no checkout
        const choice = await loadGatewayChoice(data.countryCode);
        setPaymentMethod(testMode ? 'test' : choice.gateway === null ? 'unavailable' : IS_MOCK ? 'mock' : choice.gateway);
        setChosenGateway(choice.gateway);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      // amount, currency and order are created server-side; the key id comes from the server too
      const order = await callPayApi('create-order', { gateway: 'razorpay' });
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Namasutra',
        description: 'NAMASUTRA Annual Plan',
        handler: async function (response) {
          try {
            await callPayApi('verify', {
              gateway: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            await finishPayment();
          } catch (error) {
            console.error('Razorpay verification error:', error);
            alert(t('errors.paymentRecorded'));
          }
        },
        prefill: {
          email: auth.currentUser.email,
          name: userProfile?.fullName
        },
        theme: {
          color: '#9333ea'
        }
      });
      rzp.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      alert(t('errors.paymentFailed'));
    } finally {
      setLoading(false);
    }
  };

  // After the server has verified the payment and activated the plan
  const finishPayment = async () => {
    await refreshProfile();
    navigate('/dashboard');
  };

  // Test mode: the server activates the plan without a card, then we show the success screen
  const handleTestPayment = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/test-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planType, amount, currency, referralCode: referralCode || null, countryCode: userProfile?.countryCode || null })
      });
      if (!res.ok) throw new Error('Test payment was not accepted');
      setPaid(true);
      await refreshProfile();
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (error) {
      console.error('Test payment error:', error);
      alert(t('errors.testPaymentFailed'));
      setLoading(false);
    }
  };

  // Simulated payment, dev:mock only. Real payments are recorded by the server (functions/api/pay/verify.js).
  const saveMockPayment = async (gateway, transactionId) => {
    if (!IS_MOCK) return;
    try {
      const user = auth.currentUser;
      const userRef = doc(db, 'users', user.uid);

      const renewalDate = new Date();
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      await updateDoc(userRef, {
        planType,
        planActive: true,
        paidAmount: amount,
        paidAt: new Date(),
        planExpiry: renewalDate,
        renewalDate: renewalDate,
        referralCode: referralCode || null
      });

      await setDoc(doc(db, 'payments', `${user.uid}_${Date.now()}`), {
        userId: user.uid,
        userEmail: user.email,
        planType,
        amount,
        currency: currency || (gateway === 'razorpay' ? 'INR' : 'USD'),
        gateway,
        transactionId,
        referralCode: referralCode || null,
        countryCode: userProfile?.countryCode || null,
        status: 'success',
        createdAt: new Date()
      });

      await refreshProfile();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(t('errors.paymentRecorded'));
    }
  };

  if (!planType || !amount) {
    return null;
  }

  if (paid) {
    return (
      <div className="min-h-screen site-background flex items-center justify-center px-4">
        <div className="bg-paper rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle size={72} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('payment.success')}</h2>
          <p className="text-gray-600 mb-1">{t('payment.active')}</p>
          <p className="text-gray-500 text-sm">{t('payment.taking')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-paper rounded-2xl shadow-xl p-8">
          
          {/* Back Button */}
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-6 font-medium"
          >
            <ArrowLeft size={20} />
            {t('payment.backToPricing')}
          </button>

          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-brand-600 to-ocean-600 bg-clip-text text-transparent">
            {t('payment.title')}
          </h2>
          <p className="text-center text-gray-600 mb-8">
            {t('payment.subtitle')}
          </p>

          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-brand-100 to-ocean-100 rounded-xl p-6 mb-8">
            {discountAmount > 0 ? (
              <>
                <div className="flex justify-between items-center mb-2 text-gray-700">
                  <span>{t('payment.planLine')}</span>
                  <span>{formatMoney(listPrice, currency)}</span>
                </div>
                <div className="flex justify-between items-center mb-3 text-green-700">
                  <span><Trans i18nKey="payment.referralLine" values={{ code: referralCode, percent: discountPercent }} components={{ code: <span className="font-mono font-semibold" /> }} /></span>
                  <span>&minus;{formatMoney(discountAmount, currency)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center mb-3 text-gray-700">
                <span>{t('payment.planLine')}</span>
                <span>{formatMoney(amount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-brand-300 pt-3">
              <span className="text-lg font-semibold text-gray-800">{t('payment.total')}</span>
              <span className="text-3xl font-bold text-brand-600">{formatMoney(amount, currency)}</span>
            </div>
            {taxRate > 0 && <p className="text-sm text-gray-600 mt-1 text-right">{userProfile?.countryCode === 'IN' ? t('payment.includesGst', { percent: taxRate }) : t('payment.includesTax', { percent: taxRate })}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('payment.selectMethod')}</h3>

            {paymentMethod === 'unavailable' ? (
              <div role="alert" className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4 text-amber-900 font-medium">
                {t('payment.unavailable')}
              </div>
            ) : paymentMethod === 'mock' ? (
              <div className="border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-amber-800 font-semibold">{t('payment.mockNote')}</p>
                <p className="text-xs text-amber-800" data-testid="mock-gateway">{t('payment.mockGateway', { gateway: chosenGateway === 'razorpay' ? 'Razorpay' : 'PayPal' })}</p>
                <button
                  onClick={() => saveMockPayment('mock', `mock_${Date.now()}`)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  {t('payment.simulateOk')}
                </button>
                <button
                  onClick={() => alert(t('errors.paymentFailed'))}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-lg font-semibold transition"
                >
                  {t('payment.simulateFail')}
                </button>
              </div>
            ) : paymentMethod === 'test' ? (
              <div className="border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-amber-800 font-semibold">{t('payment.testNote')}</p>
                <button
                  onClick={handleTestPayment}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-semibold text-lg transition disabled:opacity-50"
                >
                  {loading ? t('payment.processing') : t('payment.payTest', { amount: formatMoney(amount, currency) })}
                </button>
              </div>
            ) : paymentMethod === 'razorpay' ? (
              <button
                onClick={handleRazorpayPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-ocean-600 to-ocean-700 text-white py-4 rounded-lg font-semibold text-lg hover:from-ocean-700 hover:to-ocean-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard size={24} />
                {loading ? t('payment.processing') : t('payment.payRazorpay')}
              </button>
            ) : (
              <div>
                <div id="paypal-button-container" className="mb-4"></div>
                {!paypalLoaded && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">{t('payment.loadingPaypal')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              {t('payment.cancel')}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center text-sm text-gray-500">
            {paymentMethod === 'unavailable' ? '' : paymentMethod === 'mock' ? t('payment.poweredMock') : paymentMethod === 'test' ? t('payment.poweredTest') : t('payment.securePowered', { gateway: paymentMethod === 'razorpay' ? 'Razorpay' : 'PayPal' })}
          </div>
        </div>
      </div>
    </div>
  );
}
