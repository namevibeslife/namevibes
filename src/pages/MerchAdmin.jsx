import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { callMerch, mockControls, IS_MOCK } from '../merch/client';
import { DEFAULT_PRODUCTS, mergeProducts } from '../merch/catalog';
import { COLLECTION_IDS, STATES } from '../merch/constants';
import { specProblems } from '../merch/layout';
import { ALL_COUNTRIES, getCountry } from '../data/countries';

// Staff screen (English only, like the other admin screens). Every write goes through the server
// (POST /api/merch/admin), which re-checks that the caller is an admin and writes an audit entry.
const read = async (name) => (await getDocs(collection(db, name))).docs.map((d) => d.data());
const when = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
const TABS = ['Overview', 'Global & countries', 'Providers', 'Products', 'Orders', 'Commission', 'Audit'];

const Toggle = ({ label, checked, onChange, testid }) => (
  <label className="inline-flex items-center gap-2 mr-4"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} data-testid={testid} />{label}</label>
);
const Btn = ({ children, ...p }) => <button type="button" {...p} className={`px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50 ${p.className || ''}`}>{children}</button>;

export default function MerchAdmin() {
  const { user, loading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user?.email) { setIsAdmin(false); return; }
    getDoc(doc(db, 'admins', user.email.toLowerCase())).then((s) => setIsAdmin(s.exists())).catch(() => setIsAdmin(false));
  }, [user]);

  const reload = useCallback(async () => {
    const [settings, countries, providers, products, orders, commissions, audit, policy] = await Promise.all([
      getDoc(doc(db, 'merch_settings', 'global')), read('merch_countries'), read('merch_providers'), read('merch_products'), read('merch_orders'),
      read('merch_commissions'), read('merch_audit_logs'), getDoc(doc(db, 'merch_settings', 'commission'))
    ]);
    setData({ settings: settings.exists() ? settings.data() : { enabled: false, message: '' }, countries, providers, products: mergeProducts(products), orders, commissions, audit, policy: policy.exists() ? policy.data() : {} });
  }, []);
  useEffect(() => { if (isAdmin) reload().catch(() => setNote('Could not load merchandise data')); }, [isAdmin, reload]);

  async function act(action, payload, okText = 'Saved') {
    setNote('');
    const r = await callMerch('admin', { action, data: payload });
    setNote(r.status === 200 ? okText : `Rejected: ${r.body?.error || r.status}`);
    await reload();
    return r;
  }

  if (loading || isAdmin === null) return <main className="p-6">Loading…</main>;
  if (!isAdmin) return <main className="p-6" data-testid="not-admin">You do not have access to merchandise administration. <Link to="/" className="underline">Home</Link></main>;
  if (!data) return <main className="p-6">Loading…</main>;

  return (
    <main className="min-h-screen site-background p-4"><div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-3">Merchandise administration</h1>
      <div role="tablist" className="flex flex-wrap gap-2 mb-4">{TABS.map((x) => <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`px-3 py-1.5 rounded-lg border ${tab === x ? 'bg-brand-600 text-white' : 'bg-white'}`}>{x}</button>)}</div>
      {note && <p role="status" className="mb-3 text-sm" data-testid="admin-note">{note}</p>}
      {tab === 'Overview' && <Overview data={data} />}
      {tab === 'Global & countries' && <Switches data={data} act={act} />}
      {tab === 'Providers' && <Providers data={data} act={act} />}
      {tab === 'Products' && <Products data={data} act={act} />}
      {tab === 'Orders' && <Orders data={data} act={act} reload={reload} setNote={setNote} />}
      {tab === 'Commission' && <Commission data={data} act={act} reload={reload} />}
      {tab === 'Audit' && <Audit data={data} />}
    </div></main>
  );
}

// ---- overview ---------------------------------------------------------------------------------------
function Overview({ data }) {
  const paid = data.orders.filter((o) => o.transactionId && o.status !== 'refunded');
  const sum = (f) => paid.reduce((s, o) => s + f(o), 0);
  const byStatus = STATES.map((s) => [s, data.orders.filter((o) => o.status === s).length]).filter(([, n]) => n);
  const exceptions = data.orders.filter((o) => o.status === 'exception');
  const stuck = data.orders.filter((o) => ['paid', 'fulfillment_pending'].includes(o.status));
  const byCountry = {};
  paid.forEach((o) => { byCountry[o.countryCode] = byCountry[o.countryCode] || { n: 0, rev: 0, cur: o.currency }; byCountry[o.countryCode].n++; byCountry[o.countryCode].rev += o.amount - (o.refundedAmount || 0); });
  return (
    <section className="space-y-4" data-testid="overview">
      <p>Merchandise is <strong data-testid="global-state">{data.settings.enabled ? 'ON' : 'OFF'}</strong> · {data.orders.length} orders · {paid.length} paid · revenue (all currencies summed by country below) · estimated margin shown per order.</p>
      <table className="w-full text-sm bg-white/70"><thead><tr><th className="text-left p-2">Country</th><th>Paid orders</th><th>Revenue</th></tr></thead>
        <tbody>{Object.entries(byCountry).map(([c, v]) => <tr key={c}><td className="p-2">{c}</td><td className="text-center">{v.n}</td><td className="text-center">{v.rev.toFixed(2)} {v.cur}</td></tr>)}</tbody></table>
      <p>Estimated margin on paid orders: {sum((o) => o.totals?.estimatedMargin || 0).toFixed(2)} (mixed currencies; see Orders for each)</p>
      <p>Status: {byStatus.map(([s, n]) => `${s} ${n}`).join(' · ') || 'no orders'}</p>
      <div className={exceptions.length || stuck.length ? 'p-3 rounded-lg bg-red-50 border border-red-300' : ''} data-testid="alerts">
        {exceptions.length > 0 && <p>⚠ {exceptions.length} paid order(s) need attention (exception queue): {exceptions.map((o) => `${o.id.slice(0, 8)} (${o.exceptionReason})`).join(', ')}</p>}
        {stuck.length > 0 && <p>⚠ {stuck.length} paid order(s) not yet with a provider.</p>}
        {!exceptions.length && !stuck.length && <p>No paid-but-unsubmitted orders.</p>}
      </div>
    </section>
  );
}

// ---- global + countries -----------------------------------------------------------------------------
function Switches({ data, act }) {
  const [message, setMessage] = useState(data.settings.message || '');
  const [cc, setCc] = useState(data.countries[0]?.countryCode || 'IN');
  const existing = data.countries.find((c) => c.countryCode === cc);
  const blank = { countryCode: cc, enabled: false, currency: getCountry(cc)?.currency || 'USD', taxPercent: 0, taxIncluded: true, collections: { name_elements: false, blood_group: false }, prices: {}, costs: {}, disabledProducts: {}, shipping: { flat: 0, freeAbove: 0 }, paymentFeePercent: 0, providerPrimary: '', providerBackup: '', gatewayOverride: 'auto' };
  const [form, setForm] = useState({ ...blank, ...existing });
  useEffect(() => { setForm({ ...blank, ...(data.countries.find((c) => c.countryCode === cc) || {}) }); }, [cc, data.countries]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, sub) => (e) => (sub ? set(k, { ...form[k], [sub]: e.target.value }) : set(k, e.target.value));
  const products = Object.values(data.products);
  return (
    <section className="space-y-6">
      <div className="p-3 bg-white/70 rounded-lg">
        <h2 className="font-semibold mb-2">Global master switch</h2>
        <Toggle label="Merchandise enabled (all countries)" checked={data.settings.enabled} onChange={(v) => act('setGlobal', { enabled: v, message })} testid="global-toggle" />
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message shown to customers when off" className="border rounded px-2 py-1 w-full max-w-md mt-2" />
        <Btn className="ml-2" onClick={() => act('setGlobal', { enabled: data.settings.enabled, message })}>Save message</Btn>
      </div>
      <div className="p-3 bg-white/70 rounded-lg">
        <h2 className="font-semibold mb-2">Countries (shipping destination)</h2>
        <p className="text-xs mb-2">All countries start disabled. A country needs a currency, prices, a provider and collections before it can sell.</p>
        <select value={cc} onChange={(e) => setCc(e.target.value)} className="border rounded px-2 py-1 mb-3" data-testid="country-select" aria-label="Country">
          {Object.values(ALL_COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code}){data.countries.find((x) => x.countryCode === c.code)?.enabled ? ' - ON' : ''}</option>)}
        </select>
        <div className="space-y-2">
          <Toggle label="Country enabled" checked={form.enabled} onChange={(v) => set('enabled', v)} testid="country-toggle" />
          {COLLECTION_IDS.map((c) => <Toggle key={c} label={c === 'name_elements' ? 'Name Elements' : 'Blood Group'} checked={form.collections?.[c]} onChange={(v) => set('collections', { ...form.collections, [c]: v })} testid={`col-${c}`} />)}
          <div className="grid sm:grid-cols-4 gap-2">
            <label className="text-sm">Currency<input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className="block border rounded px-2 py-1 w-full" /></label>
            <label className="text-sm">Tax %<input value={form.taxPercent} onChange={num('taxPercent')} className="block border rounded px-2 py-1 w-full" /></label>
            <label className="text-sm">Margin floor % (block sales below)<input value={form.marginFloorPercent ?? 0} onChange={num('marginFloorPercent')} className="block border rounded px-2 py-1 w-full" /></label>
            <label className="text-sm">Payment fee % (estimate)<input value={form.paymentFeePercent} onChange={num('paymentFeePercent')} className="block border rounded px-2 py-1 w-full" /></label>
            <Toggle label="Prices include tax" checked={form.taxIncluded} onChange={(v) => set('taxIncluded', v)} />
            <label className="text-sm">Shipping flat<input value={form.shipping?.flat} onChange={num('shipping', 'flat')} className="block border rounded px-2 py-1 w-full" /></label>
            <label className="text-sm">Free shipping above<input value={form.shipping?.freeAbove} onChange={num('shipping', 'freeAbove')} className="block border rounded px-2 py-1 w-full" /></label>
            <label className="text-sm">Primary provider<select value={form.providerPrimary || ''} onChange={(e) => set('providerPrimary', e.target.value)} className="block border rounded px-2 py-1 w-full"><option value="">-</option>{data.providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}</select></label>
            <label className="text-sm">Backup provider<select value={form.providerBackup || ''} onChange={(e) => set('providerBackup', e.target.value)} className="block border rounded px-2 py-1 w-full"><option value="">-</option>{data.providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}</select></label>
            <label className="text-sm">Payment gateway<select value={form.gatewayOverride || 'auto'} onChange={(e) => set('gatewayOverride', e.target.value)} className="block border rounded px-2 py-1 w-full"><option value="auto">Auto</option><option value="razorpay">Razorpay</option><option value="paypal">PayPal</option></select></label>
          </div>
          <table className="w-full text-sm"><thead><tr><th className="text-left">Product</th><th>Sell price</th><th>Provider cost (est.)</th><th>Off here</th></tr></thead><tbody>
            {products.map((p) => <tr key={p.id}><td>{p.id}</td>
              <td><input aria-label={`${p.id} price`} value={form.prices?.[p.id] ?? ''} onChange={(e) => set('prices', { ...form.prices, [p.id]: e.target.value })} className="border rounded px-2 py-1 w-24" data-testid={`price-${p.id}`} /></td>
              <td><input aria-label={`${p.id} cost`} value={form.costs?.[p.id] ?? ''} onChange={(e) => set('costs', { ...form.costs, [p.id]: e.target.value })} className="border rounded px-2 py-1 w-24" /></td>
              <td className="text-center"><input type="checkbox" aria-label={`${p.id} off in this country`} checked={!!form.disabledProducts?.[p.id]} onChange={(e) => set('disabledProducts', { ...form.disabledProducts, [p.id]: e.target.checked })} /></td></tr>)}
          </tbody></table>
          <Btn onClick={() => act('setCountry', { ...form, countryCode: cc })} data-testid="save-country">Save country</Btn>
        </div>
      </div>
    </section>
  );
}

// ---- providers --------------------------------------------------------------------------------------
function Providers({ data, act }) {
  const [draft, setDraft] = useState({ id: '', name: '', adapter: 'mock', countries: '' });
  return (
    <section className="space-y-4">
      <p className="text-xs">API keys are never stored here; they are server secrets (QIKINK_CLIENT_ID, QIKINK_CLIENT_SECRET, QIKINK_ENV). Live submission needs QIKINK_ENV=live AND the Live switch below; both are off by default.</p>
      {data.providers.map((p) => (
        <div key={p.id} className="p-3 bg-white/70 rounded-lg" data-testid={`provider-${p.id}`}>
          <strong>{p.name || p.id}</strong> ({p.adapter}) · serves {(p.countries || []).join(', ') || 'no countries'}
          <div className="mt-1">
            <Toggle label="Active (receives new orders)" checked={p.active} onChange={(v) => act('setProvider', { ...p, active: v })} testid={`prov-active-${p.id}`} />
            <Toggle label="Live submission" checked={p.liveEnabled} onChange={(v) => act('setProvider', { ...p, liveEnabled: v })} />
          </div>
        </div>
      ))}
      <div className="p-3 bg-white/70 rounded-lg">
        <h2 className="font-semibold mb-2">Add / update provider</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input placeholder="id (e.g. qikink)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} className="border rounded px-2 py-1" />
          <input placeholder="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="border rounded px-2 py-1" />
          <select value={draft.adapter} onChange={(e) => setDraft({ ...draft, adapter: e.target.value })} className="border rounded px-2 py-1"><option value="mock">mock (test)</option><option value="qikink">qikink</option></select>
          <input placeholder="countries e.g. IN,US" value={draft.countries} onChange={(e) => setDraft({ ...draft, countries: e.target.value })} className="border rounded px-2 py-1" />
        </div>
        <Btn className="mt-2" onClick={() => act('setProvider', { ...draft, active: false, countries: draft.countries.split(',').map((s) => s.trim()).filter(Boolean) })}>Save (starts inactive)</Btn>
      </div>
    </section>
  );
}

// ---- products ---------------------------------------------------------------------------------------
function ProductCard({ x, act }) {
  const sp = x.printSpec || {};
  const [f, setF] = useState({ printTypeId: sp.printTypeId ?? '', allowedPlacements: (sp.allowedPlacements || []).join(','), maxWidthInches: sp.maxWidthInches ?? '', maxHeightInches: sp.maxHeightInches ?? '', minDpi: sp.minDpi ?? 150, dpiOverride: x.dpiOverride === true });
  const problems = specProblems(x.printSpec);
  const spec = () => ({ printTypeId: Number(f.printTypeId), allowedPlacements: f.allowedPlacements.split(',').map((p) => p.trim()).filter(Boolean), maxWidthInches: Number(f.maxWidthInches), maxHeightInches: Number(f.maxHeightInches), minDpi: Number(f.minDpi), verified: false });
  return (
    <div className="p-3 bg-white/70 rounded-lg" data-testid={`product-card-${x.id}`}>
      <strong>{x.id}</strong> · {x.kind} · sizes {x.sizes.join(', ')} · colours {x.colors.map((c) => c.id).join(', ')}
      {problems.length > 0 && <p className="text-sm text-red-700" data-testid={`blocked-${x.id}`}>BLOCKED: print area / print type / placement not set ({problems.join(', ')}). It cannot be sold until you fill these in from Qikink's guide.</p>}
      {x.printSpec && x.printSpec.verified !== true && problems.length === 0 && <p className="text-xs text-amber-800">Print spec is UNVERIFIED: confirm with a physical sample.</p>}
      <div><Toggle label="Product enabled" checked={x.enabled !== false} onChange={(v) => act('setProduct', { ...x, enabled: v })} testid={`prod-${x.id}`} /></div>
      <div className="grid sm:grid-cols-6 gap-2 mt-2 text-sm">
        <input aria-label={`${x.id} print_type_id`} placeholder="print_type_id" value={f.printTypeId} onChange={(e) => setF({ ...f, printTypeId: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} placements`} placeholder="placements e.g. fr" value={f.allowedPlacements} onChange={(e) => setF({ ...f, allowedPlacements: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} max width in`} placeholder="max width in" value={f.maxWidthInches} onChange={(e) => setF({ ...f, maxWidthInches: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} max height in`} placeholder="max height in" value={f.maxHeightInches} onChange={(e) => setF({ ...f, maxHeightInches: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} min dpi`} placeholder="min DPI" value={f.minDpi} onChange={(e) => setF({ ...f, minDpi: e.target.value })} className="border rounded px-2 py-1" />
        <Toggle label="Allow below min DPI" checked={f.dpiOverride} onChange={(v) => setF({ ...f, dpiOverride: v })} />
      </div>
      <Btn className="mt-2" data-testid={`save-spec-${x.id}`} onClick={() => act('setProduct', { ...x, printSpec: spec(), dpiOverride: f.dpiOverride })}>Save print spec</Btn>
    </div>
  );
}

function Products({ data, act }) {
  const [sku, setSku] = useState({ productId: 'tshirt', color: 'white', size: 'M', provider: 'qikink', sku: '', printTypeId: '1', placementSku: 'fr', widthInches: '', heightInches: '', plain: false });
  const p = data.products[sku.productId] || DEFAULT_PRODUCTS.tshirt;
  return (
    <section className="space-y-4">
      {Object.values(data.products).map((x) => <ProductCard key={x.id} x={x} act={act} />)}
      <div className="p-3 bg-white/70 rounded-lg">
        <h2 className="font-semibold mb-2">Provider SKU mapping (per exact variant)</h2>
        <div className="grid sm:grid-cols-5 gap-2">
          <select value={sku.productId} onChange={(e) => setSku({ ...sku, productId: e.target.value })} className="border rounded px-2 py-1">{Object.keys(data.products).map((k) => <option key={k}>{k}</option>)}</select>
          <select value={sku.color} onChange={(e) => setSku({ ...sku, color: e.target.value })} className="border rounded px-2 py-1">{p.colors.map((c) => <option key={c.id}>{c.id}</option>)}</select>
          <select value={sku.size} onChange={(e) => setSku({ ...sku, size: e.target.value })} className="border rounded px-2 py-1">{p.sizes.map((s) => <option key={s}>{s}</option>)}</select>
          <input placeholder="provider id" value={sku.provider} onChange={(e) => setSku({ ...sku, provider: e.target.value })} className="border rounded px-2 py-1" />
          <input placeholder="provider SKU" value={sku.sku} onChange={(e) => setSku({ ...sku, sku: e.target.value })} className="border rounded px-2 py-1" />
        </div>
        <div className="grid sm:grid-cols-5 gap-2 mt-2">
          <input aria-label="print type id" placeholder="print_type_id (1 DTG, 17 DTF...)" value={sku.printTypeId} onChange={(e) => setSku({ ...sku, printTypeId: e.target.value })} className="border rounded px-2 py-1" />
          <select aria-label="placement" value={sku.placementSku} onChange={(e) => setSku({ ...sku, placementSku: e.target.value })} className="border rounded px-2 py-1">{['fr', 'bk', 'lp', 'rp', 'rs', 'ls'].map((x) => <option key={x}>{x}</option>)}</select>
          <input aria-label="design width inches" placeholder="width in (max DTG 16, DTF 18)" value={sku.widthInches} onChange={(e) => setSku({ ...sku, widthInches: e.target.value })} className="border rounded px-2 py-1" />
          <input aria-label="design height inches" placeholder="height in (max 20)" value={sku.heightInches} onChange={(e) => setSku({ ...sku, heightInches: e.target.value })} className="border rounded px-2 py-1" />
          <Toggle label="Plain product (no print)" checked={sku.plain} onChange={(v) => setSku({ ...sku, plain: v })} />
        </div>
        <p className="text-xs mt-1">Copy SKUs and print types from the "SKU Descriptions" page of your Qikink dashboard; the API has no SKU catalogue.</p>
        <Btn className="mt-2" onClick={() => act('setVariant', { productId: sku.productId, color: sku.color, size: sku.size, providerSkus: { [sku.provider]: sku.provider === 'qikink' ? { sku: sku.sku, printTypeId: Number(sku.printTypeId), placementSku: sku.placementSku, widthInches: Number(sku.widthInches) || undefined, heightInches: Number(sku.heightInches) || undefined, plain: sku.plain } : sku.sku } })}>Save mapping</Btn>
      </div>
    </section>
  );
}

// ---- orders -----------------------------------------------------------------------------------------
function Orders({ data, act, reload, setNote }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => data.orders.filter((o) => o.status !== 'payment_pending' || q).filter((o) => !q || JSON.stringify([o.id, o.status, o.countryCode, o.email]).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (when(b.createdAt) || 0) - (when(a.createdAt) || 0)), [data.orders, q]);
  const [open, setOpen] = useState(null);
  const mock = async (fn, label) => { const r = await fn(); setNote(`${label}: ${JSON.stringify(r).slice(0, 160)}`); await reload(); };
  return (
    <section className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, status, country, email" className="border rounded px-2 py-1 w-full max-w-sm" />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => act('retryDue', {}, 'Retried due jobs')}>Retry due fulfilment jobs</Btn>
        <Btn onClick={() => act('syncTracking', {}, 'Tracking synced')}>Sync tracking</Btn>
        {IS_MOCK && <>
          <Btn onClick={() => mockControls.failNext('timeout')} data-testid="fail-timeout">Mock: next submission times out</Btn>
          <Btn onClick={() => mockControls.failNext('reject')} data-testid="fail-reject">Mock: next submission rejected</Btn>
        </>}
      </div>
      <table className="w-full text-sm bg-white/70" data-testid="orders-table"><thead><tr><th className="text-left p-2">Order</th><th>Status</th><th>Country</th><th>Total</th><th>Est. margin</th><th /></tr></thead>
        <tbody>{rows.map((o) => (
          <React.Fragment key={o.id}>
            <tr className="border-t"><td className="p-2">{o.id.slice(0, 10)}</td><td data-testid={`status-${o.id}`}>{o.status}{o.exceptionReason ? ` (${o.exceptionReason})` : ''}</td><td className="text-center">{o.countryCode}</td>
              <td className="text-center">{o.amount} {o.currency}{o.refundedAmount ? ` (−${o.refundedAmount})` : ''}</td><td className="text-center">{o.totals?.estimatedMargin}</td>
              <td><Btn onClick={() => setOpen(open === o.id ? null : o.id)}>Manage</Btn></td></tr>
            {open === o.id && <tr><td colSpan={6} className="p-3 bg-white">
              <p className="text-xs mb-2">Provider {o.providerId} · gateway {o.gateway} · {o.items.map((i) => `${i.productId} ${i.size} x${i.qty}`).join(', ')} · ship to {o.address?.name}, {o.address?.city}, {o.address?.country}</p>
              <div className="flex flex-wrap gap-2">
                {['exception', 'paid', 'fulfillment_pending'].includes(o.status) && <Btn onClick={() => act('retry', { orderId: o.id }, 'Retried')}>Retry submission</Btn>}
                {['exception', 'paid', 'fulfillment_pending'].includes(o.status) && data.providers.filter((p) => p.active && p.id !== o.providerId && (p.countries || []).includes(o.countryCode)).map((p) => <Btn key={p.id} onClick={() => act('reroute', { orderId: o.id, providerId: p.id }, 'Rerouted')}>Reroute to {p.name || p.id}</Btn>)}
                {o.transactionId && o.status !== 'refunded' && <Btn data-testid={`refund-${o.id}`} onClick={() => { if (window.confirm('Refund this order in full?')) act('refund', { orderId: o.id, reason: 'admin refund' }, 'Refunded'); }}>Refund in full</Btn>}
                {IS_MOCK && ['submitted', 'in_production', 'shipped'].includes(o.status) && <>
                  <Btn onClick={() => mock(() => mockControls.advance(o.id, 'processing'), 'In production')}>Mock: in production</Btn>
                  <Btn onClick={() => mock(() => mockControls.advance(o.id, 'shipped', { carrier: 'MockExpress', number: `MX${o.id.slice(0, 6)}`, url: null }), 'Shipped')}>Mock: shipped</Btn>
                  <Btn onClick={() => mock(() => mockControls.advance(o.id, 'delivered'), 'Delivered')}>Mock: delivered</Btn>
                </>}
              </div></td></tr>}
          </React.Fragment>))}</tbody></table>
    </section>
  );
}

// ---- commission -------------------------------------------------------------------------------------
function Commission({ data, act, reload }) {
  const p = data.policy || {};
  const [f, setF] = useState({ enabled: !!p.enabled, type: p.type || 'percent_margin', value: p.value ?? 0, cap: p.cap ?? 0, holdDays: p.holdDays ?? 14, overrides: JSON.stringify(p.overrides || {}) });
  let overridesOk = true; let overrides = {};
  try { overrides = JSON.parse(f.overrides || '{}'); } catch { overridesOk = false; }
  return (
    <section className="space-y-4">
      <div className="p-3 bg-white/70 rounded-lg">
        <h2 className="font-semibold mb-1">Merchandise commission policy (separate from the 30% / 50% subscription commission)</h2>
        <Toggle label="Enabled" checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} />
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="border rounded px-2 py-1 mr-2"><option value="percent_margin">% of eligible margin</option><option value="fixed">Fixed per unit</option></select>
        <input aria-label="value" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="border rounded px-2 py-1 w-24 mr-2" />
        <label className="text-sm mr-2">Cap <input value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })} className="border rounded px-2 py-1 w-24" /></label>
        <label className="text-sm">Hold days after delivery <input value={f.holdDays} onChange={(e) => setF({ ...f, holdDays: e.target.value })} className="border rounded px-2 py-1 w-20" /></label>
        <label className="block text-xs mt-2">Overrides (JSON, keys country:IN, collection:blood_group, product:mug)<textarea value={f.overrides} onChange={(e) => setF({ ...f, overrides: e.target.value })} className="block border rounded px-2 py-1 w-full font-mono text-xs" rows={2} /></label>
        <Btn className="mt-2" disabled={!overridesOk} onClick={() => act('setCommissionPolicy', { ...f, overrides })}>Save policy</Btn>
      </div>
      <Btn onClick={async () => { await act('sweepCommissions', {}, 'Eligibility updated'); }}>Mark delivered orders eligible (after hold)</Btn>
      <table className="w-full text-sm bg-white/70"><thead><tr><th className="text-left p-2">Order</th><th>Ambassador</th><th>Amount</th><th>Reversed</th><th>Status</th><th /></tr></thead>
        <tbody>{data.commissions.map((c) => (
          <tr key={c.id} className="border-t"><td className="p-2">{c.orderId.slice(0, 8)}</td><td>{c.referralCode}</td><td className="text-center">{c.amount} {c.currency}</td><td className="text-center">{c.reversedAmount}</td><td className="text-center">{c.status}</td>
            <td>{c.status === 'eligible' && <Btn onClick={() => act('commissionStatus', { id: c.id, status: 'payable' })}>Mark payable</Btn>}{c.status === 'payable' && <Btn onClick={() => act('commissionStatus', { id: c.id, status: 'paid' })}>Mark paid</Btn>}</td></tr>))}</tbody></table>
      <p className="text-xs">Commission rows hold no address or blood-group data; ambassadors can read only their own rows.</p>
    </section>
  );
}

function Audit({ data }) {
  const rows = [...data.audit].sort((a, b) => (when(b.at) || 0) - (when(a.at) || 0)).slice(0, 100);
  return (
    <table className="w-full text-sm bg-white/70" data-testid="audit"><thead><tr><th className="text-left p-2">When</th><th>Who</th><th>Action</th><th>Target</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="p-2">{when(r.at)?.toLocaleString()}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.target}</td></tr>)}</tbody></table>
  );
}
