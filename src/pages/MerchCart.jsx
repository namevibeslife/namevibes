import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { callMerch, IS_MOCK } from '../merch/client';
import { loadCart, saveCart } from '../merch/cart';
import { attachArtwork } from '../merch/artworkUpload';
import { mergeProducts } from '../merch/catalog';
import { bloodGroupLabel } from '../merch/designs';
import { ALL_COUNTRIES } from '../data/countries';
import { formatMoney } from '../i18n/format';

const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('script'));
  document.body.appendChild(s);
});
const PAYPAL_CLIENT_ID = 'AcF_1jxK7heQF3978kTbdmXDsjMtMEvtYgdjW63843OyvH2ni78u-ZiMeYXO64wvgsTmFh8ECcqpzR3U'; // same public id as PaymentPage

const FIELDS = ['name', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode'];

export default function MerchCart() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [address, setAddress] = useState({ name: profile?.fullName || '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: String(profile?.countryCode || 'IN').toUpperCase() });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const products = mergeProducts();

  useEffect(() => { if (user) loadCart(user.uid).then(setCart); }, [user]);
  const errorText = (body) => (body?.error === 'merch-off' && body.message ? body.message : t(`merch.err.${body?.error}`, { ...body, defaultValue: t('merch.err.generic') }));
  const items = (cart || []).map((l) => ({ productId: l.productId, collection: l.collection, color: l.color, size: l.size, qty: l.qty, design: l.design, layout: l.layout }));

  async function persist(next) { setCart(next); setQuote(null); await saveCart(user.uid, next); }
  const setField = (k, v) => { setAddress((a) => ({ ...a, [k]: v })); setQuote(null); }; // an address change invalidates the quote

  async function getQuote() {
    setError(''); setBusy(true);
    try {
      const r = await callMerch('quote', { items, address });
      if (r.status === 200) setQuote(r.body); else setError(r.body?.error === 'address-incomplete' ? t('merch.err.address-incomplete') : errorText(r.body));
    } catch { setError(t('merch.err.generic')); } finally { setBusy(false); }
  }

  async function pay() {
    setError(''); setBusy(true);
    try {
      const c = await callMerch('checkout', { quoteId: quote.quoteId });
      if (c.status !== 200) { setError(c.body?.error === 'quote-expired' || c.body?.error === 'quote-changed' ? t('merch.err.quote-expired') : errorText(c.body)); setQuote(null); return; }
      const { orderId, gatewayOrder } = c.body;
      const order = (await getDoc(doc(db, 'merch_orders', orderId))).data();
      const colorHexOf = (it) => products[it.productId]?.colors.find((x) => x.id === it.color)?.hex || '#FFFFFF';
      await attachArtwork({ orderId, uid: user.uid, items: order.items, products, colorHexOf });
      const done = async (proof) => {
        const v = await callMerch('verify', { orderId, proof });
        if (v.status !== 200) { setError(errorText(v.body)); return; }
        await saveCart(user.uid, []);
        navigate(`/merch/orders/${orderId}`);
      };
      if (IS_MOCK || gatewayOrder.gateway === 'mock') { await done({}); return; }
      if (gatewayOrder.gateway === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        new window.Razorpay({
          key: gatewayOrder.keyId, order_id: gatewayOrder.orderId, amount: gatewayOrder.amount, currency: gatewayOrder.currency, name: 'Namasutra',
          description: t('merch.title'),
          handler: (r) => done({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }).catch(() => setError(t('merch.err.paymentRecorded'))),
          prefill: { email: user.email, name: address.name }
        }).open();
        return;
      }
      await loadScript(`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=${encodeURIComponent(gatewayOrder.currency)}`);
      const box = document.getElementById('merch-paypal');
      box.innerHTML = '';
      window.paypal.Buttons({ createOrder: () => gatewayOrder.orderId, onApprove: () => done({}), onError: () => setError(t('merch.err.paymentFailed')) }).render('#merch-paypal');
    } catch { setError(t('merch.err.paymentFailed')); } finally { setBusy(false); }
  }

  if (cart === null) return <main className="min-h-screen site-background p-4"><p>{t('merch.loading')}</p></main>;
  return (
    <main className="min-h-screen site-background p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('merch.cart.title')}</h1>
        {cart.length === 0 ? (
          <p data-testid="cart-empty">{t('merch.cart.empty')} <Link to="/merch" className="underline text-brand-700">{t('merch.cart.browse')}</Link></p>
        ) : (
          <>
            <ul className="space-y-2 mb-6" data-testid="cart-lines">
              {cart.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 bg-white/70 rounded-lg p-3">
                  <span>{t(`merch.product.${l.productId}`, { defaultValue: l.productId })} · {t(`merch.color.${l.color}`, { defaultValue: l.color })} · {l.size} × {l.qty}
                    <span className="block text-sm text-gray-600">{l.collection === 'blood_group' ? bloodGroupLabel(l.design.bloodGroup) : `${l.design.name} (${(l.design.elements || []).join(' ')})`}</span></span>
                  <button className="text-sm underline" onClick={() => persist(cart.filter((x) => x.id !== l.id))}>{t('merch.cart.remove')}</button>
                </li>
              ))}
            </ul>
            <h2 className="text-xl font-semibold mb-2">{t('merch.addr.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {FIELDS.map((f) => (
                <label key={f} className="text-sm font-medium text-gray-700">{t(`merch.addr.${f}`)}
                  <input value={address[f]} onChange={(e) => setField(f, e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2" data-testid={`addr-${f}`} /></label>
              ))}
              <label className="text-sm font-medium text-gray-700">{t('merch.addr.country')}
                <select value={address.country} onChange={(e) => setField('country', e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2" data-testid="addr-country">
                  {Object.values(ALL_COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select></label>
            </div>
            <p className="text-xs text-gray-600 mb-3">{t('merch.addr.privacy')} <Link to="/merch/returns-policy" className="underline">{t('merch.policyLink')}</Link></p>
            {error && <p role="alert" className="mb-3 text-red-700" data-testid="cart-error">{error}</p>}
            {!quote ? (
              <button onClick={getQuote} disabled={busy} className="px-5 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50" data-testid="get-quote">{t('merch.cart.getQuote')}</button>
            ) : (
              <div className="bg-white/80 rounded-xl p-4" data-testid="quote-box">
                <dl className="space-y-1">
                  <div className="flex justify-between"><dt>{t('merch.cart.items')}</dt><dd>{formatMoney(quote.quote.items, quote.quote.currency)}</dd></div>
                  <div className="flex justify-between"><dt>{t('merch.cart.shipping')}</dt><dd>{formatMoney(quote.quote.shipping, quote.quote.currency)}</dd></div>
                  <div className="flex justify-between"><dt>{quote.quote.taxIncluded ? t('merch.cart.taxIncluded') : t('merch.cart.tax')}</dt><dd>{formatMoney(quote.quote.tax, quote.quote.currency)}</dd></div>
                  <div className="flex justify-between font-bold text-lg"><dt>{t('merch.cart.total')}</dt><dd data-testid="quote-total">{formatMoney(quote.quote.total, quote.quote.currency)}</dd></div>
                </dl>
                <p className="text-xs text-gray-600 mt-2">{t('merch.cart.quoteHeld')}</p>
                {IS_MOCK && <p className="text-xs text-amber-800 mt-1">{t('merch.cart.mockPay')}</p>}
                <button onClick={pay} disabled={busy} className="mt-3 px-5 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50" data-testid="pay">{t('merch.cart.pay', { amount: formatMoney(quote.quote.total, quote.quote.currency) })}</button>
                <div id="merch-paypal" className="mt-3" />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
