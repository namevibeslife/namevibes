import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { callMerch, mockControls, IS_MOCK } from '../merch/client';
import { DEFAULT_PRODUCTS, mergeProducts } from '../merch/catalog';
import { COLLECTION_IDS, STATES } from '../merch/constants';
import { specProblems, readiness, readySizes } from '../merch/layout';
import { baseCost, starterSku, variantId, shippingCostFor } from '../merch/catalog';
import { verificationLevels } from '../merch/layout';
import { BLOOD_GROUPS, bloodGroupSlug } from '../merch/designs';
import { FRAME_IDS, DEFAULT_FRAME_DESIGNS } from '../merch/frames';
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

// Who can see merchandise at all. Nobody (default) = same 404 as if it did not exist; Admins only = owner testing; Everyone = launched.
function VisibilityControl({ settings, act }) {
  const [info, setInfo] = useState(null);
  useEffect(() => { callMerch('visibility', {}).then((r) => setInfo(r.body)).catch(() => {}); }, [settings.visibleTo]);
  const mode = settings.visibleTo || 'nobody';
  return (
    <div className="p-3 bg-white/70 rounded-lg" data-testid="visibility-control">
      <h2 className="font-semibold mb-1">Merchandise visible to</h2>
      <select aria-label="Merchandise visible to" value={mode} onChange={(e) => act('setVisibility', { visibleTo: e.target.value })} className="border rounded px-2 py-1" data-testid="visible-to">
        <option value="nobody">Nobody (default)</option><option value="admins">Admins only (owner testing)</option><option value="everyone">Everyone</option>
      </select>
      <p className="text-xs mt-1">Nobody: the menu link, pages and every merchandise address behave as if the feature does not exist (normal 404). Takes effect at once; no deploy needed.</p>
      {info?.sandbox && <p className="mt-2 p-2 rounded bg-amber-100 border border-amber-400 text-amber-900 text-sm font-semibold" data-testid="sandbox-banner-admin">SANDBOX: no real order will be printed or shipped. {info.paymentsSimulated ? 'Payments are simulated (nobody is charged).' : 'Checkout is blocked until test payments are switched on (TEST_PAYMENTS).'}</p>}
    </div>
  );
}

const admin = (action, data) => callMerch('admin', { action, data });
const BACKEND_LABEL = { r2: 'Cloudflare R2', supabase: 'Supabase Storage' };
const STATUS_LABEL = { ok: 'OK', failing: 'FAILING', 'not-configured': 'not configured' };

// Where customers' print files are kept (R2 / Supabase with automatic failover) and when they are deleted.
function StoragePanel({ act }) {
  const [info, setInfo] = useState(null);
  const [report, setReport] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [days, setDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await admin('storageHealth', {});
    if (r.status === 200) { setInfo(r.body); setDays(String(r.body.retentionDays)); }
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  if (!info) return <div className="p-3 bg-white/70 rounded-lg" data-testid="storage-panel">Print-file storage: loading...</div>;
  const names = Object.keys(info.backends);
  return (
    <div className="p-3 bg-white/70 rounded-lg space-y-2" data-testid="storage-panel">
      <h2 className="font-semibold">Print-file storage</h2>
      <ul className="text-sm">
        {names.map((n) => <li key={n} data-testid={`storage-${n}`}>{BACKEND_LABEL[n] || n}: <strong>{info.backends[n].status === 'not-configured' && names.some((o) => o !== n && info.backends[o].status !== 'not-configured') ? 'backup storage not configured' : (STATUS_LABEL[info.backends[n].status] || info.backends[n].status)}</strong>{info.backends[n].detail ? ` (${info.backends[n].detail})` : ''}{info.primary === n ? ' - first choice' : ''}</li>)}
      </ul>
      <p className="text-xs" data-testid="last-failover">{info.lastFailover ? `Last failover: ${info.lastFailover.from} -> ${info.lastFailover.to || 'none'} (${info.lastFailover.error})` : 'No failover has happened.'}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label>First choice <select aria-label="First choice" value={info.primary || ''} onChange={(e) => run(async () => { await act('setStorage', { primary: e.target.value }); await load(); })} className="border rounded px-2 py-1" data-testid="storage-primary">
          <option value="">Automatic (R2 if set up)</option><option value="r2">Cloudflare R2</option><option value="supabase">Supabase Storage</option></select></label>
        <label><input type="checkbox" checked={info.mirror} onChange={(e) => run(async () => { await act('setStorage', { mirror: e.target.checked }); await load(); })} data-testid="storage-mirror" /> Mirror to both</label>
        <label>Keep delivered orders' files for <input type="number" min="0" max="365" value={days} onChange={(e) => setDays(e.target.value)} className="border rounded px-2 py-1 w-20" data-testid="retention-days" /> days</label>
        <Btn onClick={() => run(async () => { await act('setStorage', { retentionDays: Number(days) }); await load(); })}>Save</Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => run(async () => { const r = await admin('storageTest', {}); setTestResult(r.status === 200 ? r.body.results : { error: r.body?.error }); })} data-testid="storage-test">Test upload</Btn>
        <Btn onClick={() => run(async () => { const r = await admin('fileReport', {}); if (r.status === 200) setReport(r.body); })} data-testid="file-report">Deletion report</Btn>
        <Btn onClick={() => run(async () => { const r = await admin('sweepFiles', { dryRun: true }); if (r.status === 200) setReport({ dry: r.body }); })} data-testid="file-dry-run">Dry run (delete nothing)</Btn>
        <Btn onClick={() => { if (window.confirm('Delete every print file that is due now? This cannot be undone.')) run(async () => { const r = await admin('sweepFiles', { dryRun: false }); if (r.status === 200) setReport({ ran: r.body }); }); }} data-testid="file-sweep" disabled={busy}>Delete due files now</Btn>
      </div>
      {testResult && <p className="text-sm" data-testid="storage-test-result">{testResult.error ? `Test failed: ${testResult.error}` : Object.entries(testResult).map(([n, r]) => `${BACKEND_LABEL[n] || n}: ${r.ok ? 'write, read, signed download, private bucket and delete all passed' : `FAILED - ${['write', 'read', 'signedDownload', 'privateBucket', 'deleted', 'gone'].filter((s) => r[s] !== true).join(', ')}${r.error ? ` (${r.error})` : ''}`}`).join(' | ')}</p>}
      {report && <p className="text-sm" data-testid="file-report-result">
        {report.dry ? `Dry run: ${report.dry.due} file(s) are due for deletion; nothing was deleted.` : report.ran ? `Deleted ${report.ran.deleted}, failed ${report.ran.failed}, were due ${report.ran.due}.` : `Files due now: ${report.due}. Deleted so far: ${report.deleted}. Failed: ${report.failed}.`}
      </p>}
      <p className="text-xs">Unpaid uploads are deleted after 48 hours, cancelled or refunded orders after 7 days, delivered orders after the number of days above (orders with an open return or exception are never deleted). Deletion runs from the cron job; the order record stays.</p>
    </div>
  );
}

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
    const [settings, countries, providers, products, orders, commissions, audit, policy, variants, blood] = await Promise.all([
      getDoc(doc(db, 'merch_settings', 'global')), read('merch_countries'), read('merch_providers'), read('merch_products'), read('merch_orders'),
      read('merch_commissions'), read('merch_audit_logs'), getDoc(doc(db, 'merch_settings', 'commission')), read('merch_variants'), getDoc(doc(db, 'merch_settings', 'bloodDesigns'))
    ]);
    setData({ settings: settings.exists() ? settings.data() : { enabled: false, message: '' }, countries, providers, products: mergeProducts(products), orders, commissions, audit, policy: policy.exists() ? policy.data() : {}, variants: Object.fromEntries(variants.map((v) => [v.id, v])), bloodDesigns: blood.exists() ? blood.data() : {} });
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
      {tab === 'Overview' && <Overview data={data} act={act} />}
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
function Overview({ data, act }) {
  const paid = data.orders.filter((o) => o.transactionId && o.status !== 'refunded');
  const sum = (f) => paid.reduce((s, o) => s + f(o), 0);
  const byStatus = STATES.map((s) => [s, data.orders.filter((o) => o.status === s).length]).filter(([, n]) => n);
  const exceptions = data.orders.filter((o) => o.status === 'exception');
  const held = data.orders.filter((o) => o.status === 'held_provider_funds');
  const stuck = data.orders.filter((o) => ['paid', 'fulfillment_pending'].includes(o.status));
  const byCountry = {};
  paid.forEach((o) => { byCountry[o.countryCode] = byCountry[o.countryCode] || { n: 0, rev: 0, cur: o.currency }; byCountry[o.countryCode].n++; byCountry[o.countryCode].rev += o.amount - (o.refundedAmount || 0); });
  return (
    <section className="space-y-4" data-testid="overview">
      <VisibilityControl settings={data.settings} act={act} />
      <StoragePanel act={act} />
      <p>Merchandise is <strong data-testid="global-state">{data.settings.enabled ? 'ON' : 'OFF'}</strong> · {data.orders.length} orders · {paid.length} paid · revenue (all currencies summed by country below) · estimated margin shown per order.</p>
      <table className="w-full text-sm bg-white/70"><thead><tr><th className="text-left p-2">Country</th><th>Paid orders</th><th>Revenue</th></tr></thead>
        <tbody>{Object.entries(byCountry).map(([c, v]) => <tr key={c}><td className="p-2">{c}</td><td className="text-center">{v.n}</td><td className="text-center">{v.rev.toFixed(2)} {v.cur}</td></tr>)}</tbody></table>
      <p>Estimated margin on paid orders: {sum((o) => o.totals?.estimatedMargin || 0).toFixed(2)} (mixed currencies; see Orders for each)</p>
      <p>Status: {byStatus.map(([s, n]) => `${s} ${n}`).join(' · ') || 'no orders'}</p>
      <div className="p-3 rounded-lg bg-white/70"><Btn data-testid="apply-preset" onClick={() => { if (window.confirm('Write the launch configuration (India, Qikink, poster + mug enabled, everything else off, global and India switches OFF, no prices)? Existing settings are not overwritten.')) act('applyLaunchPreset', {}, 'Launch configuration written'); }}>Apply launch configuration</Btn> <span className="text-xs">India, Qikink, framed posters and blood-group mugs; creates only what is missing.</span></div>
      <p data-testid="held-count">Orders held for provider funds (Qikink wallet): <strong>{held.length}</strong></p>
      <div className={exceptions.length || stuck.length || held.length ? 'p-3 rounded-lg bg-red-50 border border-red-300' : ''} data-testid="alerts">
        {held.length > 0 && <p>⚠ {held.length} PAID order(s) are held because the Qikink wallet has too little credit. Top up the wallet, then press "Retry after wallet top-up" on each order (Orders tab).</p>}
        {exceptions.length > 0 && <p>⚠ {exceptions.length} paid order(s) need attention (exception queue): {exceptions.map((o) => `${o.id.slice(0, 8)} (${o.exceptionReason})`).join(', ')}</p>}
        {stuck.length > 0 && <p>⚠ {stuck.length} paid order(s) not yet with a provider.</p>}
        {!exceptions.length && !stuck.length && !held.length && <p>No paid-but-unsubmitted orders.</p>}
      </div>
    </section>
  );
}

// ---- global + countries -----------------------------------------------------------------------------
function Switches({ data, act }) {
  const [message, setMessage] = useState(data.settings.message || '');
  const [cc, setCc] = useState(data.countries[0]?.countryCode || 'IN');
  const existing = data.countries.find((c) => c.countryCode === cc);
  const blank = { countryCode: cc, enabled: false, currency: getCountry(cc)?.currency || 'USD', taxPercent: 0, taxByProduct: {}, taxIncluded: true, collections: { name_elements: false, blood_group: false }, prices: {}, costs: {}, disabledProducts: {}, shipping: { flat: 0, freeAbove: 0 }, paymentFeePercent: 0, providerPrimary: '', providerBackup: '', gatewayOverride: 'auto' };
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
          <table className="w-full text-sm"><thead><tr><th className="text-left">Product / size</th><th>Sell price (tax {form.taxIncluded ? 'incl.' : 'excl.'})</th><th>Provider cost (est.)</th><th>Tax % (blank = country rate)</th><th>Off here</th></tr></thead><tbody>
            {products.flatMap((p) => ((p.printSpec?.perSize || p.kind === 'wall-art') && p.sizes.length > 1 ? p.sizes.map((sz) => ({ p, key: `${p.id}:${sz}`, label: `${p.id} ${sz}`, first: sz === p.sizes[0] })) : [{ p, key: p.id, label: p.id, first: true }])).map(({ p, key, label, first }) => <tr key={key}><td>{label}</td>
              <td><input aria-label={`${label} price`} value={form.prices?.[key] ?? ''} onChange={(e) => set('prices', { ...form.prices, [key]: e.target.value })} className="border rounded px-2 py-1 w-24" data-testid={`price-${key}`} /></td>
              <td><input aria-label={`${label} cost`} value={form.costs?.[key] ?? ''} onChange={(e) => set('costs', { ...form.costs, [key]: e.target.value })} className="border rounded px-2 py-1 w-24" /></td>
              <td>{first && <input aria-label={`${p.id} tax percent`} value={form.taxByProduct?.[p.id] ?? ''} onChange={(e) => set('taxByProduct', { ...form.taxByProduct, [p.id]: e.target.value })} className="border rounded px-2 py-1 w-20" data-testid={`tax-${p.id}`} />}</td>
              <td className="text-center">{first && <input type="checkbox" aria-label={`${p.id} off in this country`} checked={!!form.disabledProducts?.[p.id]} onChange={(e) => set('disabledProducts', { ...form.disabledProducts, [p.id]: e.target.checked })} />}</td></tr>)}
          </tbody></table>
          <p className="text-xs">Suggested GST (Qikink's table): posters and framed posters 18%, mugs 5%. Confirm your GST treatment with your accountant before launch.</p>
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
// ---- Product Management: switches per product, per country, per collection, and for the whole module -------------
// Every change (single or bulk) is previewed by the server (dryRun), confirmed here, applied by the server, and audited with before/after.
function ProductManagement({ data, act }) {
  const products = Object.values(data.products);
  const countries = data.countries;
  const [sel, setSel] = useState({});
  const [scope, setScope] = useState('');
  const [collection, setCollection] = useState('name_elements');
  const [countryCode, setCountryCode] = useState('all');
  const ids = products.filter((p) => sel[p.id]).map((p) => p.id);
  const on = (p, cc) => p.enabled !== false && (!cc || countries.find((c) => c.countryCode === cc)?.disabledProducts?.[p.id] !== true);

  async function change(payload, okText) {
    const dry = await callMerch('admin', { action: 'bulkSwitch', data: { ...payload, dryRun: true } });
    if (dry.status !== 200) { window.alert(`Cannot apply: ${dry.body?.error || dry.status}`); return; }
    const lines = dry.body.changes.map((c) => `${c.label}: ${c.before ? 'ON' : 'OFF'} -> ${c.after ? 'ON' : 'OFF'}${c.noop ? ' (no change)' : ''}`);
    if (!window.confirm(`Confirm this change?\n\n${lines.join('\n')}\n\nDisabling only stops NEW quotes and checkouts; paid orders, tracking and refunds are not touched.`)) return;
    await act('bulkSwitch', payload, okText || 'Saved');
  }
  const Pill = ({ ok, children }) => <span className={`px-2 py-0.5 rounded text-xs ${ok ? 'bg-green-100 text-green-900' : 'bg-gray-200 text-gray-700'}`}>{children}</span>;

  return (
    <div className="p-3 bg-white/70 rounded-lg space-y-3" data-testid="product-management">
      <h2 className="font-semibold">Product Management</h2>
      <p className="text-xs">A product is purchasable only when its own switch, its country switch, the collection switch and the global switch are ON <strong>and</strong> its print spec is complete. "Enabled but blocked" means the switch is on but the print spec is still missing.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm"><input type="checkbox" data-testid="select-all" checked={products.length > 0 && ids.length === products.length} onChange={(e) => setSel(Object.fromEntries(products.map((p) => [p.id, e.target.checked])))} /> Select All</label>
        <select aria-label="Apply to" value={scope} onChange={(e) => setScope(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">Everywhere (product switch)</option>{countries.map((c) => <option key={c.countryCode} value={c.countryCode}>Only in {c.countryCode}</option>)}
        </select>
        <Btn disabled={!ids.length} data-testid="activate-selected" onClick={() => change({ scope: 'products', productIds: ids, countryCode: scope || undefined, enabled: true })}>Activate Selected</Btn>
        <Btn disabled={!ids.length} data-testid="deactivate-selected" onClick={() => change({ scope: 'products', productIds: ids, countryCode: scope || undefined, enabled: false })}>Deactivate Selected</Btn>
      </div>
      <table className="w-full text-sm" data-testid="pm-table"><thead><tr><th /><th className="text-left">Product</th><th>Status</th><th>Everywhere</th>{countries.map((c) => <th key={c.countryCode}>{c.countryCode}</th>)}</tr></thead>
        <tbody>{products.map((p) => {
          const ready = readiness(p); const problems = ready.ok ? [] : [ready.reason];
          return (
            <tr key={p.id} className="border-t" data-testid={`pm-row-${p.id}`}>
              <td><input type="checkbox" aria-label={`Select ${p.id}`} checked={!!sel[p.id]} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} /></td>
              <td>{p.id}<span className="block text-xs text-gray-500">{p.collections.join(', ')}</span></td>
              <td className="text-center">{p.enabled === false ? <Pill ok={false}>OFF</Pill> : problems.length ? <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-900" data-testid={`blocked-${p.id}`}>ENABLED BUT BLOCKED: print area missing or not verified</span> : <Pill ok>ON</Pill>}</td>
              <td className="text-center"><button type="button" className="underline" data-testid={`switch-${p.id}`} onClick={() => change({ scope: 'products', productIds: [p.id], enabled: p.enabled === false })}>{p.enabled === false ? 'Turn on' : 'Turn off'}</button></td>
              {countries.map((c) => <td key={c.countryCode} className="text-center"><button type="button" className="underline" data-testid={`switch-${p.id}-${c.countryCode}`} onClick={() => change({ scope: 'products', productIds: [p.id], countryCode: c.countryCode, enabled: !on(p, c.countryCode) })}>{on(p, c.countryCode) ? 'ON' : 'OFF'}</button></td>)}
            </tr>
          );
        })}</tbody></table>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <select aria-label="Country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="all">All countries</option>{countries.map((c) => <option key={c.countryCode} value={c.countryCode}>{c.countryCode}</option>)}</select>
        <select aria-label="Collection" value={collection} onChange={(e) => setCollection(e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="name_elements">Name Elements</option><option value="blood_group">Blood Group</option></select>
        <Btn onClick={() => change({ scope: 'collection', collection, countryCodes: countryCode === 'all' ? 'all' : [countryCode], enabled: true })}>Activate collection</Btn>
        <Btn onClick={() => change({ scope: 'collection', collection, countryCodes: countryCode === 'all' ? 'all' : [countryCode], enabled: false })}>Deactivate collection</Btn>
        <Btn onClick={() => change({ scope: 'country', countryCodes: countryCode === 'all' ? 'all' : [countryCode], enabled: true })}>Activate country</Btn>
        <Btn onClick={() => change({ scope: 'country', countryCodes: countryCode === 'all' ? 'all' : [countryCode], enabled: false })}>Deactivate country</Btn>
        <Btn data-testid="module-on" onClick={() => change({ scope: 'global', enabled: true })}>Activate whole module</Btn>
        <Btn data-testid="module-off" onClick={() => change({ scope: 'global', enabled: false })}>Deactivate whole module</Btn>
      </div>
    </div>
  );
}

const sizeText = (s) => (s === 'NA' ? 'one size' : s);
const SOURCE_LABEL = { name_elements: 'Elements designs (the buyer\'s own name)', blood_group: 'Bloodline designs (the 8 approved logos)' };

function ProductCard({ x, act, data }) {
  const sp = x.printSpec || {};
  const manySizes = (x.sizes || []).length > 1;
  const [perSize, setPerSize] = useState(sp.perSize === true || (!x.printSpec && manySizes && (x.kind === 'wall-art' || x.kind === 'acrylic')));
  const [f, setF] = useState({ printTypeId: sp.printTypeId ?? '', allowedPlacements: (sp.allowedPlacements || []).join(','), maxWidthInches: sp.maxWidthInches ?? '', maxHeightInches: sp.maxHeightInches ?? '', minDpi: sp.minDpi ?? 150, dpiOverride: x.dpiOverride === true, verified: sp.verified === true });
  const [sizes, setSizes] = useState(() => Object.fromEntries((x.sizes || []).map((s) => [s, { w: sp.bySize?.[s]?.maxWidthInches ?? '', h: sp.bySize?.[s]?.maxHeightInches ?? '', v: sp.bySize?.[s]?.verified === true }])));
  const ready = readiness(x);
  const [inset, setInset] = useState(String(x.designInsetMm ?? x.defaultInsetMm ?? 10));
  const spec = () => {
    const base = { printTypeId: Number(f.printTypeId), allowedPlacements: f.allowedPlacements.split(',').map((p) => p.trim()).filter(Boolean), minDpi: Number(f.minDpi) };
    return perSize
      ? { ...base, perSize: true, bySize: Object.fromEntries(Object.entries(sizes).filter(([, v]) => v.w !== '' && v.h !== '').map(([s, v]) => [s, { maxWidthInches: Number(v.w), maxHeightInches: Number(v.h), verified: v.v === true }])) }
      : { ...base, maxWidthInches: Number(f.maxWidthInches), maxHeightInches: Number(f.maxHeightInches), verified: f.verified };
  };
  const frameKind = x.kind === 'wall-art' || x.kind === 'acrylic';
  return (
    <div className="p-3 bg-white/70 rounded-lg" data-testid={`product-card-${x.id}`}>
      <strong>{x.id}</strong> · {x.kind} · sizes {(x.sizes || []).map(sizeText).join(', ')} · colours {(x.colors || []).filter((c) => c.on !== false).map((c) => c.id).join(', ')}{x.taxUnverified ? ' · GST % NOT KNOWN: set it before selling' : ''}
      {!ready.ok && <p className="text-sm text-red-700" data-testid={`blocked-${x.id}`}>BLOCKED: {ready.reason === 'print-area-unverified' ? 'the print area is filled in but not marked "verified with Qikink"' : 'print type / placement / print area not filled in'}. It cannot be switched on until a size has a complete AND verified print spec.</p>}
      {ready.ok && <p className="text-xs text-green-800">Ready: {readySizes(x).map(sizeText).join(', ')} {readySizes(x).length < (x.sizes || []).length ? '(the other sizes are still blocked)' : ''}</p>}
      <div className="mt-2 text-sm">{(x.collections || []).map((c) => <Toggle key={c} label={SOURCE_LABEL[c]} checked={x.designSources?.[c] === true} onChange={(v) => act('setDesignSource', { productId: x.id, source: c, enabled: v }, 'Saved')} testid={`source-${x.id}-${c}`} />)}</div>
      <div className="grid sm:grid-cols-5 gap-2 mt-2 text-sm">
        <input aria-label={`${x.id} print_type_id`} placeholder="print_type_id" value={f.printTypeId} onChange={(e) => setF({ ...f, printTypeId: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} placements`} placeholder="placements e.g. fr" value={f.allowedPlacements} onChange={(e) => setF({ ...f, allowedPlacements: e.target.value })} className="border rounded px-2 py-1" />
        <input aria-label={`${x.id} min dpi`} placeholder="min DPI" value={f.minDpi} onChange={(e) => setF({ ...f, minDpi: e.target.value })} className="border rounded px-2 py-1" />
        <Toggle label="Allow below min DPI" checked={f.dpiOverride} onChange={(v) => setF({ ...f, dpiOverride: v })} />
        {manySizes && <Toggle label="Different print area per size" checked={perSize} onChange={setPerSize} testid={`persize-${x.id}`} />}
      </div>
      {perSize ? (
        <table className="w-full text-sm mt-2" data-testid={`spec-table-${x.id}`}><thead><tr><th className="text-left">Size</th><th>Print width in</th><th>Print height in</th><th>Verified with Qikink</th></tr></thead><tbody>
          {(x.sizes || []).map((s) => <tr key={s}><td>{sizeText(s)}</td>
            <td><input aria-label={`${x.id} ${s} width`} value={sizes[s].w} onChange={(e) => setSizes({ ...sizes, [s]: { ...sizes[s], w: e.target.value } })} className="border rounded px-2 py-1 w-24" /></td>
            <td><input aria-label={`${x.id} ${s} height`} value={sizes[s].h} onChange={(e) => setSizes({ ...sizes, [s]: { ...sizes[s], h: e.target.value } })} className="border rounded px-2 py-1 w-24" /></td>
            <td className="text-center"><input type="checkbox" aria-label={`${x.id} ${s} verified`} checked={sizes[s].v} onChange={(e) => setSizes({ ...sizes, [s]: { ...sizes[s], v: e.target.checked } })} /></td></tr>)}
        </tbody></table>
      ) : (
        <div className="grid sm:grid-cols-3 gap-2 mt-2 text-sm">
          <input aria-label={`${x.id} max width in`} placeholder="print width in" value={f.maxWidthInches} onChange={(e) => setF({ ...f, maxWidthInches: e.target.value })} className="border rounded px-2 py-1" />
          <input aria-label={`${x.id} max height in`} placeholder="print height in" value={f.maxHeightInches} onChange={(e) => setF({ ...f, maxHeightInches: e.target.value })} className="border rounded px-2 py-1" />
          <Toggle label="Verified with Qikink" checked={f.verified} onChange={(v) => setF({ ...f, verified: v })} testid={`verified-${x.id}`} />
        </div>
      )}
      {frameKind && (
        <div className="mt-2 p-2 rounded bg-white/70" data-testid={`inset-${x.id}`}>
          <label className="text-sm">Artwork inset from the edge, mm (all four sides, 0 to 30; framed default 10, acrylic default 0)
            <input aria-label={`${x.id} design inset mm`} value={inset} onChange={(e) => setInset(e.target.value)} className="ml-2 border rounded px-2 py-1 w-20" data-testid={`inset-input-${x.id}`} /></label>
          <Btn className="ml-2" data-testid={`save-inset-${x.id}`} onClick={() => act('setProduct', { ...x, designInsetMm: inset === '' ? 10 : Number(inset) }, 'Saved')}>Save inset</Btn>
        </div>
      )}
      {frameKind && (
        <div className="mt-2 p-2 rounded bg-white/70" data-testid={`frames-${x.id}`}>
          <strong className="text-sm">Frame designs customers can choose</strong> <span className="text-xs">(launch: Elements Gold only; the two dark designs stay off until you activate them)</span>
          <div>{FRAME_IDS.map((fid) => <Toggle key={fid} label={fid === 'elements-gold' ? 'Elements Gold' : fid === 'individual-dark' ? 'Individual Dark' : 'Family Dark'} checked={{ ...DEFAULT_FRAME_DESIGNS, ...(x.frameDesigns || {}) }[fid]} onChange={(v) => act('setFrameDesign', { productId: x.id, frame: fid, enabled: v }, 'Saved')} testid={`frame-toggle-${fid}`} />)}</div>
        </div>
      )}
      <Btn className="mt-2" data-testid={`save-spec-${x.id}`} onClick={() => act('setProduct', { ...x, printSpec: spec(), dpiOverride: f.dpiOverride })}>Save print spec</Btn>
      <CatalogueRows x={x} act={act} data={data} />
    </div>
  );
}

// One row per size / colour variant: Qikink SKU, base cost, our selling price, GST %, switch. A product can be switched on only after its print area is verified (above).
function CatalogueRows({ x, act, data }) {
  const country = data.countries[0];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  if (!country) return <p className="text-xs mt-2">Create a country (Global & countries tab) to price this product.</p>;
  const perColour = x.kind === 'drinkware' || x.kind === 'bottle';
  const keyOf = (size, color) => (perColour ? `${x.id}:${size}:${color}` : `${x.id}:${size}`);
  const rows = [];
  for (const size of x.sizes || []) for (const c of (x.colorsBySize?.[size] ? x.colors.filter((k) => x.colorsBySize[size].includes(k.id)) : x.colors || [])) rows.push({ size, c });
  const val = (table, key, fallback) => draft[table]?.[key] ?? country[table]?.[key] ?? fallback ?? '';
  const set = (table, key, v) => setDraft({ ...draft, [table]: { ...(draft[table] || {}), [key]: v } });
  const ship = Number(country.shipping?.flat) || 0;
  return (
    <div className="mt-2" data-testid={`catalogue-${x.id}`}>
      <button type="button" className="underline text-sm" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'} variants, SKUs, costs, prices and GST ({rows.length} rows)</button>
      {open && (
        <>
          <table className="w-full text-xs mt-1"><thead><tr><th className="text-left">Size</th><th className="text-left">Colour</th><th className="text-left">Qikink SKU</th><th>Base cost</th><th>Our price</th><th>GST %</th><th title="a spec confirmed, b sandbox accepted, c sample approved">Levels a/b/c</th><th>Qikink shipping cost</th><th>On</th><th /></tr></thead><tbody>
            {rows.map(({ size, c }) => {
              const key = keyOf(size, c.id); const vid = variantId(x.id, c.id, size); const v = data.variants?.[vid];
              const first = perColour || c === (x.colors.find((k) => !x.colorsBySize?.[size] || x.colorsBySize[size].includes(k.id)));
              const cost = Number(val('costs', key, baseCost(x.id, c.id, size))); const price = Number(val('prices', key));
              const rate = Number(val('taxByProduct', key, country.taxByProduct?.[x.id] ?? country.taxPercent));
              const tax = price - price / (1 + rate / 100);
              const sc = shippingCostFor(country, x.id, size); // what Qikink charges us for this product's weight
              const low = price > 0 && price - tax <= cost + Math.max(ship, sc.amount);
              const lv = verificationLevels(x, size);
              return (
                <tr key={vid} className="border-t" data-testid={`variant-row-${vid}`}>
                  <td>{sizeText(size)}</td><td>{c.id}</td>
                  <td>{v?.providerSkus?.qikink?.sku || starterSku(x.id, c.id, size) || '-'}{v?.providerSkus?.qikink?.unverified !== false ? ' (unverified)' : ''}</td>
                  <td>{first ? <input aria-label={`${vid} cost`} value={val('costs', key, baseCost(x.id, c.id, size))} onChange={(e) => set('costs', key, e.target.value)} className="border rounded px-1 py-0.5 w-16" /> : <span className="text-gray-500">same</span>}</td>
                  <td>{first ? <input aria-label={`${vid} price`} value={val('prices', key)} onChange={(e) => set('prices', key, e.target.value)} className="border rounded px-1 py-0.5 w-16" data-testid={`price-input-${vid}`} /> : <span className="text-gray-500">same</span>}{first && !price && <span className="text-red-700 ml-1">no price</span>}{first && low && <span className="text-red-700 ml-1" data-testid={`low-${vid}`}>below cost + shipping + tax</span>}</td>
                  <td>{first ? <input aria-label={`${vid} gst`} value={val('taxByProduct', key, '')} placeholder={String(country.taxByProduct?.[x.id] ?? country.taxPercent ?? '')} onChange={(e) => set('taxByProduct', key, e.target.value)} className="border rounded px-1 py-0.5 w-12" /> : <span className="text-gray-500">same</span>}</td>
                  <td data-testid={`levels-${vid}`} className="text-xs whitespace-nowrap" title="a = spec confirmed by Qikink in writing, b = sandbox order accepted, c = physical sample approved by the owner (needed to sell to Everyone)">{lv.specConfirmed ? 'a' : '-'}{lv.sandboxAccepted ? 'b' : '-'}{lv.sampleApproved ? 'c' : '-'}</td>
                  <td data-testid={`ship-${vid}`} className={sc.unconfirmed ? 'text-amber-800 text-xs' : 'text-xs'}>{sc.amount}{sc.unconfirmed ? ' (unconfirmed for this weight)' : ''}</td>
                  <td><input type="checkbox" aria-label={`${vid} on`} checked={(v?.enabled ?? c.on) !== false} onChange={(e) => act('setVariant', { productId: x.id, color: c.id, size, enabled: e.target.checked, providerSkus: v?.providerSkus || { qikink: { sku: starterSku(x.id, c.id, size), unverified: true } } }, 'Saved')} /></td>
                </tr>
              );
            })}
          </tbody></table>
          {x.standSku && <p className="text-xs mt-1">Add-stand price (separate Qikink line, SKU {x.standSku}, base ₹120): <input aria-label={`${x.id} stand price`} value={val('prices', `${x.id}-stand`)} onChange={(e) => set('prices', `${x.id}-stand`, e.target.value)} className="border rounded px-1 py-0.5 w-16" data-testid={`stand-price-${x.id}`} /></p>}
          <Btn className="mt-1" data-testid={`save-prices-${x.id}`} onClick={async () => { await act('setCountry', { ...country, prices: { ...country.prices, ...(draft.prices || {}) }, costs: { ...country.costs, ...(draft.costs || {}) }, taxByProduct: { ...country.taxByProduct, ...(draft.taxByProduct || {}) } }, 'Saved'); setDraft({}); }}>Save prices, costs and GST ({country.countryCode})</Btn>
          <span className="text-xs ml-2">Shipping charged: {ship}. Confirm GST with your accountant. Base costs are Qikink's list prices.</span>
        </>
      )}
    </div>
  );
}

function BloodDesigns({ data, act }) {
  const hidden = data.bloodDesigns?.hidden || {};
  return (
    <div className="p-3 bg-white/70 rounded-lg" data-testid="blood-designs-admin">
      <h2 className="font-semibold mb-1">Bloodline designs shown on the site</h2>
      <p className="text-xs mb-1">A design appears in the customer's Blood Group section only if it is shown here AND at least one enabled product carries it.</p>
      {BLOOD_GROUPS.map((g) => <Toggle key={g} label={g} checked={hidden[g] !== true} onChange={(v) => act('setBloodDesign', { code: g, visible: v }, 'Saved')} testid={`blood-design-${bloodGroupSlug(g)}`} />)}
    </div>
  );
}

function Products({ data, act }) {
  const [sku, setSku] = useState({ productId: 'tshirt', color: 'white', size: 'M', provider: 'qikink', sku: '', printTypeId: '1', placementSku: 'fr', widthInches: '', heightInches: '', plain: false });
  const p = data.products[sku.productId] || DEFAULT_PRODUCTS.tshirt;
  return (
    <section className="space-y-4">
      <ProductManagement data={data} act={act} />
      <BloodDesigns data={data} act={act} />
      {Object.values(data.products).map((x) => <ProductCard key={x.id} x={x} act={act} data={data} />)}
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
                {['exception', 'paid', 'fulfillment_pending', 'held_provider_funds'].includes(o.status) && <Btn data-testid={`retry-${o.id}`} onClick={() => act('retry', { orderId: o.id }, 'Retried')}>{o.status === 'held_provider_funds' ? 'Retry after wallet top-up' : 'Retry submission'}</Btn>}
                {['exception', 'paid', 'fulfillment_pending', 'held_provider_funds'].includes(o.status) && data.providers.filter((p) => p.active && p.id !== o.providerId && (p.countries || []).includes(o.countryCode)).map((p) => <Btn key={p.id} onClick={() => act('reroute', { orderId: o.id, providerId: p.id }, 'Rerouted')}>Reroute to {p.name || p.id}</Btn>)}
                <OrderNote orderId={o.id} act={act} />
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

function OrderNote({ orderId, act }) {
  const [type, setType] = useState('complaint');
  const [text, setText] = useState('');
  return (
    <span className="inline-flex items-center gap-1">
      <select aria-label="Note type" value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-1 py-1 text-sm"><option value="complaint">Complaint</option><option value="replacement">Replacement</option><option value="note">Note</option></select>
      <input aria-label="Note text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Complaint / replacement / note (staff only)" className="border rounded px-2 py-1 text-sm w-56" />
      <Btn disabled={!text.trim()} onClick={async () => { await act('addOrderNote', { orderId, type, text }, 'Note saved'); setText(''); }}>Save note</Btn>
    </span>
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
