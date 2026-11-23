import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { callMerch } from '../merch/client';
import { loadCart, saveCart, newLineId } from '../merch/cart';
import { buildDesign, applyTemplate, BLOOD_GROUPS, bloodGroupLabel } from '../merch/designs';
import { FRAME_IDS, DEFAULT_FRAME, FRAME_MAX_MEMBERS } from '../merch/frames';
import ProductPreview from '../merch/ProductPreview';
import { ALL_COUNTRIES } from '../data/countries';
import { effectiveSpec, defaultLayoutFor, normaliseLayout, placementBox, designAspect, designDpi, resolutionStatus, maxScaleForDpi } from '../merch/layout';
import { formatMoney } from '../i18n/format';

const COLLECTIONS = ['name_elements', 'blood_group'];

// Merchandise store + designer. Availability and prices come from the server for the chosen SHIPPING country.
export default function MerchStore() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = location.state?.merch; // { names: [{ name, elements }] } from a results screen
  const [country, setCountry] = useState(String(profile?.countryCode || 'IN').toUpperCase());
  const [catalogue, setCatalogue] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [collection, setCollection] = useState('name_elements');
  const [productId, setProductId] = useState(incoming?.productId || ''); // "Frame My Elements" opens the framed poster directly
  const [name, setName] = useState(incoming?.names?.[0]?.name || profile?.fullName || '');
  const [frame, setFrame] = useState(DEFAULT_FRAME);
  // family design: members come from the family result (name + relation the buyer entered), editable, up to FRAME_MAX_MEMBERS
  const [members, setMembers] = useState(() => (incoming?.names?.length ? incoming.names.slice(0, FRAME_MAX_MEMBERS) : [{ name: profile?.fullName || '', relation: '' }]).map((n) => ({ name: n.name || '', relation: n.relation || '' })));
  const [familyName, setFamilyName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [layout, setLayout] = useState(null); // null = automatic (centred, sharp-safe size) until the customer moves something
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (user) loadCart(user.uid).then(setCart); }, [user]);
  useEffect(() => {
    let live = true;
    setCatalogue(null); setLoadError(false);
    callMerch('catalogue', { country }).then((r) => { if (!live) return; if (r.status === 200) setCatalogue(r.body); else setLoadError(true); }).catch(() => live && setLoadError(true));
    return () => { live = false; };
  }, [country]);

  const products = useMemo(() => (catalogue?.products || []).filter((p) => p.collections.includes(collection)), [catalogue, collection]);
  useEffect(() => {
    const first = products[0];
    if (!products.find((p) => p.id === productId)) setProductId(first?.id || '');
  }, [products, productId]);
  const product = products.find((p) => p.id === productId);
  useEffect(() => { if (product) { setColor(product.colors[0]?.id || ''); setSize(product.sizes[0] || ''); setLayout(null); } }, [productId, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPoster = product?.kind === 'wall-art';
  const frames = isPoster ? FRAME_IDS.filter((f) => product.frames?.[f]) : [];
  const activeFrame = frames.includes(frame) ? frame : frames[0];
  useEffect(() => { if (isPoster && activeFrame && activeFrame !== frame) setFrame(activeFrame); }, [isPoster, activeFrame, frame]);
  const frameInput = activeFrame === 'family-dark' ? { frame: activeFrame, people: members.filter((m) => m.name.trim()).map((m) => ({ name: m.name, relation: m.relation })), familyName } : { frame: activeFrame, name };
  const baseBuilt = collection === 'name_elements'
    ? buildDesign('name_elements', isPoster && activeFrame ? frameInput : { name })
    : buildDesign('blood_group', { bloodGroup, confirmed: true }); // preview only; the confirmation is required to add
  // the server builds the same design again from the names; the preview and the print file use exactly this definition
  const built = baseBuilt.design ? { ...baseBuilt, design: applyTemplate(baseBuilt.design, product) } : baseBuilt;
  const colorHex = product?.colors.find((c) => c.id === color)?.hex || '#FFFFFF';
  const isFrameDesign = built.design?.template === 'frame';
  const symbols = built.design?.elements?.map((e) => e.symbol).join(' · ');
  // print area, position bounds and resolution (the server re-checks all of it)
  const spec0 = product?.printSpec ? effectiveSpec(product.printSpec, null, size) : undefined; // print area for the chosen size
  const spec = spec0 && Number(spec0.maxWidthInches) > 0 && Number(spec0.maxHeightInches) > 0 ? spec0 : undefined; // none until the size is chosen
  const lay = normaliseLayout(layout || defaultLayoutFor(built.design, spec));
  const area = spec ? { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) } : null;
  const box = area && built.design ? placementBox(area, lay, designAspect(built.design)) : null;
  const halfW = box ? box.width / 2 / area.width : 0;
  const halfH = box ? box.height / 2 / area.height : 0;
  const res = area && built.design ? designDpi({ design: built.design, spec, layout: lay }) : null;
  const resStatus = res ? resolutionStatus(res.dpi, { minDpi: Number(spec.minDpi) }) : 'ok';
  const blocked = resStatus === 'blocked' && !product?.dpiOverride;
  const maxScale = res && built.design ? maxScaleForDpi({ design: built.design, spec, minDpi: Number(spec.minDpi) }) : 1;
  const errorText = (code) => t(`merch.err.${code}`, { defaultValue: t('merch.err.generic') });

  async function add() {
    setMsg('');
    if (!product) return;
    if (collection === 'blood_group' && !confirmed) { setMsg(errorText('blood-group-not-confirmed')); return; }
    if (built.error) { setMsg(errorText(built.error)); return; }
    const design = collection === 'blood_group' ? { bloodGroup, confirmed: true }
      : isFrameDesign ? (activeFrame === 'family-dark' ? { frame: activeFrame, familyName: built.design.familyName, people: built.design.people.map((p) => ({ name: p.name, relation: p.relation, elements: p.elements.map((e) => e.symbol) })) } : { frame: activeFrame, name: built.design.name, elements: built.design.elements.map((e) => e.symbol) })
      : { name: built.design.name, elements: built.design.elements.map((e) => e.symbol) };
    const unitPrice = product.prices?.[size] ?? product.price;
    if (!(unitPrice > 0)) { setMsg(errorText('merch-product-off')); return; }
    if (blocked) { setMsg(t('merch.err.resolution-too-low', { dpi: res?.dpi, minDpi: spec?.minDpi })); return; }
    const next = [...cart, { id: newLineId(), collection, productId, color, size, qty: Number(qty), design, layout: lay }];
    try { await saveCart(user.uid, next); setCart(next); setMsg(t('merch.added')); } catch { setMsg(t('merch.err.generic')); }
  }

  const off = catalogue && (!catalogue.globalEnabled ? 'off' : !catalogue.countryEnabled ? 'countryOff' : catalogue.products.length === 0 ? 'none' : null);

  return (
    <main className="min-h-screen site-background p-4">
      <div className="max-w-5xl mx-auto bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-3xl font-bold text-gray-800">{t('merch.title')}</h1>
          <Link to="/merch/cart" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white" data-testid="cart-link"><ShoppingCart size={18} aria-hidden="true" />{t('merch.cart.title')} ({cart.reduce((n, l) => n + l.qty, 0)})</Link>
        </div>
        <p className="text-gray-600 mb-4">{t('merch.intro')}</p>
        <label className="block mb-4 text-sm font-medium text-gray-700">{t('merch.shipTo')}
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 block w-full max-w-xs border rounded-lg px-3 py-2" data-testid="ship-country">
            {Object.values(ALL_COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        {loadError && <p role="alert" className="text-red-700">{t('merch.loadError')}</p>}
        {!catalogue && !loadError && <p>{t('merch.loading')}</p>}
        {off && <p role="status" className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900" data-testid="merch-off">{off === 'off' ? (catalogue.message || t('merch.off')) : off === 'none' ? t('merch.noProducts') : t('merch.countryOff')}</p>}

        {catalogue && !off && (
          <div className="grid md:grid-cols-2 gap-6">
            <section aria-label={t('merch.designer')}>
              <div role="tablist" className="flex gap-2 mb-4">
                {COLLECTIONS.filter((c) => catalogue.collections[c]).map((c) => (
                  <button key={c} role="tab" aria-selected={collection === c} onClick={() => setCollection(c)} data-testid={`tab-${c}`}
                    className={`px-4 py-2 rounded-lg border ${collection === c ? 'bg-brand-600 text-white' : 'bg-white'}`}>{t(`merch.collection.${c}`)}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {products.map((p) => (
                  <button key={p.id} onClick={() => setProductId(p.id)} aria-pressed={productId === p.id} data-testid={`product-${p.id}`}
                    className={`px-3 py-2 rounded-lg border ${productId === p.id ? 'border-brand-600 ring-2 ring-brand-600' : ''} bg-white`}>
                    {t(`merch.product.${p.id}`, { defaultValue: p.id })}<span className="block text-xs text-gray-500">{formatMoney(Math.min(...Object.values(p.prices || {}).concat(p.price > 0 ? [p.price] : [Infinity])), catalogue.currency)}</span>
                  </button>
                ))}
              </div>

              {collection === 'name_elements' ? (
                <div className="mb-4">
                  {frames.length > 1 && (
                    <fieldset className="mb-3" data-testid="frame-designs">
                      <legend className="block text-sm font-medium text-gray-700">{t('merch.frameTitle')}</legend>
                      <div className="flex flex-wrap gap-2 mt-1">{frames.map((f) => <label key={f} className={`px-3 py-1 rounded-lg border cursor-pointer ${activeFrame === f ? 'bg-brand-600 text-white' : 'bg-white'}`}><input type="radio" name="frame" value={f} checked={activeFrame === f} onChange={() => setFrame(f)} className="sr-only" data-testid={`frame-${f}`} />{t(`merch.frame.${f}`)}</label>)}</div>
                    </fieldset>
                  )}
                  {activeFrame === 'family-dark' && (
                    <div className="mb-3 space-y-2" data-testid="family-inputs">
                      <label className="block text-sm font-medium text-gray-700">{t('merch.familyName')}<input value={familyName} maxLength={30} onChange={(e) => setFamilyName(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2" data-testid="family-name" /></label>
                      {members.map((m, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 items-end">
                          <label className="col-span-3 text-sm text-gray-700">{t('merch.memberName', { n: i + 1 })}<input value={m.name} maxLength={40} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="mt-1 block w-full border rounded-lg px-2 py-2" data-testid={`member-name-${i}`} /></label>
                          <label className="col-span-2 text-sm text-gray-700">{t('merch.memberRelation')}<input value={m.relation} maxLength={20} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))} className="mt-1 block w-full border rounded-lg px-2 py-2" /></label>
                        </div>
                      ))}
                      {members.length < FRAME_MAX_MEMBERS && <button type="button" className="text-sm underline" onClick={() => setMembers([...members, { name: '', relation: '' }])}>{t('merch.addMember')}</button>}
                    </div>
                  )}
                  <label className={`block text-sm font-medium text-gray-700 ${activeFrame === 'family-dark' ? 'hidden' : ''}`} htmlFor="merch-name">{t('merch.nameLabel')}</label>
                  {incoming?.names?.length > 1 && (
                    <select aria-label={t('merch.pickName')} className="mt-1 mb-2 block w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)}>
                      {incoming.names.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
                    </select>
                  )}
                  <input id="merch-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={`mt-1 block w-full border rounded-lg px-3 py-2 ${activeFrame === 'family-dark' ? 'hidden' : ''}`} data-testid="merch-name" />
                  {built.error ? <p role="alert" className="text-sm text-red-700 mt-1">{errorText(built.error)}</p>
                    : <p className="text-sm text-gray-600 mt-1" data-testid="merch-symbols"><span className="font-medium">{t('merch.yourElements')}:</span> {symbols}</p>}
                  {built.design?.unmatched?.length > 0 && <p className="text-xs text-gray-500">{t('merch.unmatched', { letters: built.design.unmatched.join(' ') })}</p>}
                </div>
              ) : (
                <fieldset className="mb-4">
                  <legend className="block text-sm font-medium text-gray-700">{t('merch.bloodLabel')}</legend>
                  <div className="grid grid-cols-4 gap-2 mt-2" data-testid="blood-groups">
                    {BLOOD_GROUPS.map((g) => (
                      <label key={g} className={`text-center py-2 rounded-lg border cursor-pointer ${bloodGroup === g ? 'bg-red-700 text-white' : 'bg-white'}`}>
                        <input type="radio" name="blood" value={g} checked={bloodGroup === g} onChange={() => { setBloodGroup(g); setConfirmed(false); }} className="sr-only" />{bloodGroupLabel(g)}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{t('merch.bloodNote')}</p>
                  {bloodGroup && <label className="flex items-start gap-2 mt-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="blood-confirm" />{t('merch.bloodConfirm', { group: bloodGroupLabel(bloodGroup) })}</label>}
                </fieldset>
              )}

              {product && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <label className="text-sm font-medium text-gray-700">{t('merch.colour')}
                    <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full border rounded-lg px-2 py-2">{product.colors.map((c) => <option key={c.id} value={c.id}>{t(`merch.color.${c.id}`, { defaultValue: c.id })}</option>)}</select></label>
                  <label className="text-sm font-medium text-gray-700">{t('merch.size')}
                    <select value={size} onChange={(e) => setSize(e.target.value)} className="mt-1 block w-full border rounded-lg px-2 py-2">{product.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                  <label className="text-sm font-medium text-gray-700">{t('merch.qty')}
                    <input type="number" min="1" max="10" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="mt-1 block w-full border rounded-lg px-2 py-2" /></label>
                </div>
              )}
              {product && <p className="mb-3 text-lg font-semibold" data-testid="unit-price">{formatMoney(product.prices?.[size] ?? product.price, catalogue.currency)}</p>}
              {product && built.design && spec && !isFrameDesign && (
                <fieldset className="mb-4" data-testid="layout-controls">
                  <legend className="block text-sm font-medium text-gray-700">{t('merch.layoutTitle')}</legend>
                  <label className="block text-sm mt-1">{t('merch.layoutScale')}<input type="range" min="0.2" max="1" step="0.01" value={lay.scale} onChange={(e) => setLayout({ ...lay, scale: Number(e.target.value) })} className="block w-full" data-testid="layout-scale" /></label>
                  <label className="block text-sm mt-1">{t('merch.layoutX')}<input type="range" min={halfW} max={1 - halfW} step="0.01" value={Math.min(1 - halfW, Math.max(halfW, lay.x))} onChange={(e) => setLayout({ ...lay, x: Number(e.target.value) })} disabled={halfW >= 0.5} className="block w-full" data-testid="layout-x" /></label>
                  <label className="block text-sm mt-1">{t('merch.layoutY')}<input type="range" min={halfH} max={1 - halfH} step="0.01" value={Math.min(1 - halfH, Math.max(halfH, lay.y))} onChange={(e) => setLayout({ ...lay, y: Number(e.target.value) })} disabled={halfH >= 0.5} className="block w-full" data-testid="layout-y" /></label>
                  <button type="button" className="mt-1 text-sm underline" onClick={() => setLayout({ ...lay, x: 0.5, y: 0.5 })} data-testid="layout-centre">{t('merch.layoutCentre')}</button>
                  <p className="text-xs text-gray-600 mt-1">{t('merch.printArea', { w: spec.maxWidthInches, h: spec.maxHeightInches })}</p>
                  {resStatus === 'low' && <p role="status" className="text-xs text-amber-800" data-testid="dpi-warning">{t('merch.dpiLow', { dpi: res.dpi })}</p>}
                  {resStatus === 'blocked' && <p role="alert" className="text-xs text-red-700" data-testid="dpi-blocked">{t('merch.err.resolution-too-low', { dpi: res.dpi, minDpi: spec.minDpi })} {t('merch.dpiMaxSize', { percent: Math.floor(maxScale * 100) })} <button type="button" className="underline" onClick={() => setLayout({ ...lay, scale: Math.max(0.2, Math.floor(maxScale * 100) / 100) })}>{t('merch.dpiFix')}</button></p>}
                </fieldset>
              )}
              <button onClick={add} disabled={blocked || !product || (collection === 'name_elements' ? !!built.error : !bloodGroup)} className="px-5 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50" data-testid="add-to-cart">{t('merch.addToCart')}</button>
              {msg && <p role="status" className="mt-2 text-sm text-gray-700" data-testid="merch-msg">{msg} {msg === t('merch.added') && <button className="underline" onClick={() => navigate('/merch/cart')}>{t('merch.viewCart')}</button>}</p>}
            </section>
            <section aria-label={t('merch.preview')} className="bg-white/60 rounded-xl p-4">
              <ProductPreview product={product} colorHex={colorHex} design={built.design} label={t('merch.preview')} layout={lay} spec={spec} />
              {isPoster && isFrameDesign && <p className="text-xs text-gray-600 mt-2">{t('merch.frameNote', { w: spec?.maxWidthInches, h: spec?.maxHeightInches })}</p>}
              {isPoster && (
                <div className="mt-4" data-testid="samples">
                  <h3 className="text-sm font-semibold text-gray-700">{t('merch.samplesTitle')}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-2">{FRAME_IDS.map((f) => <figure key={f} className="text-center"><div className="relative"><img src={`/merch/samples/frame-${f}.jpg`} alt={t(`merch.frame.${f}`)} loading="lazy" className="w-full rounded border" /><span className="absolute top-1 left-1 text-[10px] px-1 rounded bg-black/70 text-white">{t('merch.sampleLabel')}</span></div><figcaption className="text-xs mt-1">{t(`merch.frame.${f}`)}</figcaption></figure>)}</div>
                </div>
              )}
            </section>
          </div>
        )}
        <p className="mt-6"><Link to="/merch/orders" className="underline text-brand-700">{t('merch.orders.title')}</Link></p>
      </div>
    </main>
  );
}
