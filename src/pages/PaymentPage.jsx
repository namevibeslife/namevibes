import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowLeft, CreditCard } from 'lucide-react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  const { planType, amount, currency, symbol, referralCode } = location.state || {};

  useEffect(() => {
    if (!planType || !amount) {
      navigate('/pricing');
      return;
    }
    loadUserProfile();
  }, []);

  useEffect(() => {
    // Load PayPal SDK if needed
    if (paymentMethod === 'paypal' && !paypalLoaded) {
      loadPayPalScript();
    }
  }, [paymentMethod]);

  const loadPayPalScript = () => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=AcF_1jxK7heQF3978kTbdmXDsjMtMEvtYgdjW63843OyvH2ni78u-ZiMeYXO64wvgsTmFh8ECcqpzR3U&currency=USD`;
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
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: amount.toString(),
              currency_code: 'USD'
            },
            description: `NameVibes ${planType} Plan - Yearly`
          }]
        });
      },
      onApprove: async (data, actions) => {
        return actions.order.capture().then(async (details) => {
          await savePaymentSuccess('paypal', details.id);
        });
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        alert('Payment failed. Please try again.');
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
        setPaymentMethod(data.countryCode === 'IN' ? 'razorpay' : 'paypal');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'NameVibes',
        description: `${planType} Plan - Yearly`,
        handler: async function (response) {
          await savePaymentSuccess('razorpay', response.razorpay_payment_id);
        },
        prefill: {
          email: auth.currentUser.email,
          name: userProfile?.fullName
        },
        theme: {
          color: '#9333ea'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSuccess = async (gateway, transactionId) => {
    try {
      const user = auth.currentUser;
      const userRef = doc(db, 'users', user.uid);

      const renewalDate = new Date();
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      await updateDoc(userRef, {
        planType,
        planActive: true,
        renewalDate: renewalDate,
        referralCodeUsed: referralCode || null
      });

      await setDoc(doc(db, 'payments', `${user.uid}_${Date.now()}`), {
        userId: user.uid,
        userEmail: user.email,
        planType,
        amount,
        currency: gateway === 'razorpay' ? 'INR' : 'USD',
        gateway,
        transactionId,
        referralCode: referralCode || null,
        status: 'success',
        createdAt: new Date()
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Payment recorded but profile update failed. Please contact support.');
    }
  };

  if (!planType || !amount) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          
          {/* Back Button */}
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Pricing
          </button>

          <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Complete Payment
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Secure payment for your {planType} plan
          </p>

          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-gray-700 capitalize">{planType} Plan - Yearly</span>
              <span className="text-3xl font-bold text-purple-600">
                {symbol}{amount}
              </span>
            </div>
            {referralCode && (
              <div className="bg-white rounded-lg p-3 text-sm">
                <span className="text-gray-600">Referral Code Applied: </span>
                <span className="font-mono font-bold text-purple-600">{referralCode}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Payment Method</h3>

            {paymentMethod === 'razorpay' ? (
              <button
                onClick={handleRazorpayPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard size={24} />
                {loading ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            ) : (
              <div>
                <div id="paypal-button-container" className="mb-4"></div>
                {!paypalLoaded && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading PayPal...</p>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancel Payment
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center text-sm text-gray-500">
            🔒 Secure payment powered by {paymentMethod === 'razorpay' ? 'Razorpay' : 'PayPal'}
          </div>
        </div>
      </div>
    </div>
  );
}