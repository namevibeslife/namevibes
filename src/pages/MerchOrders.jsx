import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { loadCart, saveCart, newLineId } from '../merch/cart';
import { bloodGroupLabel } from '../merch/designs';
import { sizeLabel } from '../merch/labels';
import { formatMoney, formatDate } from '../i18n/format';

const when = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
// Customers see a simple status; "exception" is an internal holding state.
const shown = (s) => (s === 'exception' || s === 'held_provider_funds' ? 'in_review' : s);

function Timeline({ order, t }) {
  return (
    <ol className="space-y-1 border-l-2 border-brand-600 pl-4" data-testid="timeline">
      {(order.timeline || []).filter((e) => e.state !== 'partial_refund').map((e, i) => (
        <li key={i}>{t(`merch.status.${shown(e.state)}`, { defaultValue: e.state })}<span className="text-xs text-gray-500"> · {when(e.at) ? formatDate(when(e.at)) : ''}</span></li>
      ))}
      {(order.items || []).some((i) => i.artwork?.fileDeletedAt) && <li className="text-xs text-gray-600" data-testid="file-removed">{t('merch.orders.fileRemoved')}</li>}
    </ol>
  );
}

export function MerchOrderList() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'merch_orders'), where('uid', '==', user.uid))).then((s) => setOrders(s.docs.map((d) => d.data()).sort((a, b) => when(b.createdAt) - when(a.createdAt)))).catch(() => setOrders([]));
  }, [user]);
  return (
    <main className="min-h-screen site-background p-4"><div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('merch.orders.title')}</h1>
      {orders === null ? <p>{t('merch.loading')}</p> : orders.length === 0 ? <p data-testid="orders-empty">{t('merch.orders.empty')} <Link to="/merch" className="underline text-brand-700">{t('merch.cart.browse')}</Link></p> : (
        <ul className="space-y-2" data-testid="orders-list">
          {orders.filter((o) => o.status !== 'payment_pending').map((o) => (
            <li key={o.id}><Link to={`/merch/orders/${o.id}`} className="flex justify-between gap-3 bg-white/70 rounded-lg p-3">
              <span>{t('merch.orders.order', { id: o.id.slice(0, 8) })}<span className="block text-xs text-gray-500">{when(o.createdAt) ? formatDate(when(o.createdAt)) : ''}</span></span>
              <span className="text-right">{formatMoney(o.amount, o.currency)}<span className="block text-xs">{t(`merch.status.${shown(o.status)}`)}</span></span></Link></li>
          ))}
        </ul>
      )}
    </div></main>
  );
}

export function MerchOrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState(undefined);
  useEffect(() => { getDoc(doc(db, 'merch_orders', id)).then((s) => setOrder(s.exists() ? s.data() : null)).catch(() => setOrder(null)); }, [id]);

  async function reorder() {
    const cart = await loadCart(user.uid);
    const lines = order.items.map((i) => ({ id: newLineId(), collection: i.collection, productId: i.productId, color: i.color, size: i.size, qty: i.qty, layout: i.layout, addStand: i.addStand === true,
      design: i.collection === 'blood_group' ? { bloodGroup: i.design.bloodGroup, confirmed: true }
        : i.design.template === 'frame' ? (i.design.frame === 'family-dark' ? { frame: i.design.frame, familyName: i.design.familyName, people: i.design.people.map((p) => ({ name: p.name, relation: p.relation, elements: p.elements.map((e) => e.symbol) })) } : { frame: i.design.frame, name: i.design.name, elements: i.design.elements.map((e) => e.symbol) })
          : { name: i.design.name, elements: i.design.elements.map((e) => e.symbol) } }));
    await saveCart(user.uid, [...cart, ...lines]);
    navigate('/merch/cart');
  }

  if (order === undefined) return <main className="min-h-screen site-background p-4"><p>{t('merch.loading')}</p></main>;
  if (!order || order.uid !== user?.uid) return <main className="min-h-screen site-background p-4"><p>{t('merch.orders.notFound')}</p></main>;
  return (
    <main className="min-h-screen site-background p-4"><div className="max-w-3xl mx-auto">
      <p><Link to="/merch/orders" className="underline text-brand-700">{t('merch.orders.title')}</Link></p>
      <h1 className="text-2xl font-bold text-gray-800 my-3" data-testid="order-status">{t('merch.orders.order', { id: order.id.slice(0, 8) })} · {t(`merch.status.${shown(order.status)}`)}</h1>
      <ul className="mb-4 space-y-1">{order.items.map((i) => (
        <li key={i.index}>{t(`merch.product.${i.productId}`, { defaultValue: i.productId })} · {sizeLabel(i.size) || i.size} × {i.qty}{i.addStand ? ` + ${t('merch.stand')}` : ''} · {i.collection === 'blood_group' ? bloodGroupLabel(i.design.bloodGroup) : i.design.people && i.design.frame === 'family-dark' ? i.design.people.map((p) => p.name).join(', ') : `${i.design.name} (${i.design.elements.map((e) => e.symbol).join(' ')})`}</li>))}</ul>
      <p className="mb-4">{t('merch.cart.total')}: <strong>{formatMoney(order.amount, order.currency)}</strong>{order.refundedAmount > 0 && <span> · {t('merch.orders.refunded', { amount: formatMoney(order.refundedAmount, order.currency) })}</span>}</p>
      {order.tracking && <p className="mb-4" data-testid="tracking">{t('merch.orders.tracking')}: {order.tracking.carrier} {order.tracking.number} {order.tracking.url && <a className="underline" href={order.tracking.url} target="_blank" rel="noopener noreferrer">{t('merch.orders.trackLink')}</a>}</p>}
      <h2 className="text-lg font-semibold mb-2">{t('merch.orders.timeline')}</h2>
      <Timeline order={order} t={t} />
      <p className="text-xs text-gray-600 mt-4">{t('merch.orders.deliveryNote')} <Link to="/merch/returns-policy" className="underline">{t('merch.policyLink')}</Link></p>
      <button onClick={reorder} className="mt-4 px-5 py-2 rounded-lg bg-brand-600 text-white" data-testid="reorder">{t('merch.orders.reorder')}</button>
    </div></main>
  );
}
