p='src/pages/PaymentPage.jsx'
s=open(p,encoding='utf-8',newline=None).read()
def need(old,new):
    global s
    assert old in s, old[:70]
    s=s.replace(old,new,1)

# server call helper
need("export default function PaymentPage() {","""// The server decides the price and checks every payment with the gateway before activating a plan.
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

export default function PaymentPage() {""")

# PayPal buttons
need("""      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: toGatewayAmount(amount, currency || 'USD'),
              currency_code: currency || 'USD'
            },
            description: 'NAMASUTRA Annual Plan'
          }]
        });
      },
      onApprove: async (data, actions) => {
        return actions.order.capture().then(async (details) => {
          await savePaymentSuccess('paypal', details.id);
        });
      },""","""      // Order is created on the server with the server-computed amount; the server captures and verifies it
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
      },""")

# Razorpay
a=s.index("  const handleRazorpayPayment = async () => {")
b=s.index("  // Test mode: the server activates")
s=s[:a]+"""  const handleRazorpayPayment = async () => {
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

"""+s[b:]

# client-side saving is mock-only now
need("  const savePaymentSuccess = async (gateway, transactionId) => {","  // Simulated payment, dev:mock only. Real payments are recorded by the server (functions/api/pay/verify.js).\n  const saveMockPayment = async (gateway, transactionId) => {")
s=s.replace("savePaymentSuccess('mock',","saveMockPayment('mock',")
open(p,'w',encoding='utf-8',newline='\n').write(s)
