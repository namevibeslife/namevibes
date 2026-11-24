import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { callMerch } from '../merch/client';
import { BLOOD_ASSETS } from '../merch/bloodAssets';
import { bloodGroupLabel } from '../merch/designs';
import { effectiveSpec, defaultLayoutFor } from '../merch/layout';
import { sizeLabel } from '../merch/labels';
import ProductPreview from '../merch/ProductPreview';
import { formatMoney } from '../i18n/format';

// Blood Group shop: ALL the bloodline designs, browsable. A design is listed only if admin has not hidden it and at least one
// enabled product (mug, bottles, posters when enabled) carries it. The server decides this (catalogue.bloodDesigns).
function useCatalogue() {
  const { profile } = useAuthStore();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const country = String(profile?.countryCode || 'IN').toUpperCase();
  useEffect(() => {
    let live = true;
    callMerch('catalogue', { country }).then((r) => { if (!live) return; if (r.status === 200) setData(r.body); else setFailed(true); }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [country]);
  return { data, failed };
}

export function BloodGroupGrid() {
  const { t } = useTranslation();
  const { data, failed } = useCatalogue();
  return (
    <main className="min-h-screen site-background p-4"><div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('merch.blood.title')}</h1>
      <p className="text-gray-600 mb-4">{t('merch.blood.intro')}</p>
      <p className="text-xs text-gray-600 mb-4">{t('merch.bloodNote')}</p>
      {failed && <p role="alert" className="text-red-700">{t('merch.loadError')}</p>}
      {!data && !failed && <p>{t('merch.loading')}</p>}
      {data && (!data.globalEnabled || !data.countryEnabled) && <p role="status" className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900" data-testid="blood-off">{data.message || t('merch.off')}</p>}
      {data && data.globalEnabled && data.countryEnabled && data.bloodDesigns.length === 0 && <p role="status" data-testid="blood-none">{t('merch.blood.none')}</p>}
      {data && data.bloodDesigns?.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="blood-grid">
          {data.bloodDesigns.map((d) => (
            <li key={d.code}>
              <Link to={`/merch/blood-group/${d.slug}`} className="block bg-white/70 rounded-xl p-3 text-center" data-testid={`blood-card-${d.slug}`}>
                <img src={BLOOD_ASSETS[d.slug]?.path} alt={t('merch.blood.designLabel', { group: bloodGroupLabel(d.code) })} loading="lazy" className="w-full h-auto" />
                <span className="block mt-2 font-semibold">{bloodGroupLabel(d.code)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6"><Link to="/merch" className="underline text-brand-700">{t('merch.title')}</Link></p>
    </div></main>
  );
}

export function BloodGroupDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, failed } = useCatalogue();
  const design = data?.bloodDesigns?.find((d) => d.slug === slug);
  const products = (data?.products || []).filter((p) => design && p.collections.includes('blood_group'));
  return (
    <main className="min-h-screen site-background p-4"><div className="max-w-4xl mx-auto">
      <p><Link to="/merch/blood-group" className="underline text-brand-700">{t('merch.blood.title')}</Link></p>
      {failed && <p role="alert" className="text-red-700">{t('merch.loadError')}</p>}
      {!data && !failed && <p>{t('merch.loading')}</p>}
      {data && !design && <p role="status" data-testid="blood-missing">{t('merch.blood.notAvailable')}</p>}
      {design && (
        <>
          <h1 className="text-3xl font-bold text-gray-800 my-3" data-testid="blood-title">{t('merch.blood.designLabel', { group: bloodGroupLabel(design.code) })}</h1>
          <img src={BLOOD_ASSETS[slug]?.path} alt={t('merch.blood.designLabel', { group: bloodGroupLabel(design.code) })} className="mx-auto w-full max-w-xs mb-3" />
          <p className="text-xs text-gray-600 mb-4">{t('merch.bloodNote')}</p>
          <h2 className="text-xl font-semibold mb-2">{t('merch.blood.choose')}</h2>
          <ul className="grid sm:grid-cols-2 gap-3" data-testid="blood-products">
            {products.map((p) => {
              const size = p.sizes[0]; const color = (p.colorsBySize?.[size] || p.colors)[0];
              const spec = p.printSpec ? effectiveSpec(p.printSpec, null, size) : undefined;
              const d = { collection: 'blood_group', bloodGroup: design.code };
              const from = Math.min(...Object.values(p.variantPrices || p.prices || {}));
              return (
                <li key={p.id} className="bg-white/70 rounded-xl p-3" data-testid={`blood-product-${p.id}`}>
                  <ProductPreview product={p} colorHex={color?.hex || '#FFFFFF'} design={d} label={t(`merch.product.${p.id}`, { defaultValue: p.id })} layout={defaultLayoutFor(d, spec)} spec={spec} size={size} />
                  <p className="font-semibold mt-2">{t(`merch.product.${p.id}`, { defaultValue: p.id })}</p>
                  <p className="text-sm text-gray-600">{p.sizes.map(sizeLabel).filter(Boolean).join(' · ')}</p>
                  <p className="text-sm">{t('merch.blood.from', { price: formatMoney(from, data.currency) })}</p>
                  <button type="button" className="mt-2 px-4 py-2 rounded-lg bg-brand-600 text-white" data-testid={`blood-choose-${p.id}`}
                    onClick={() => navigate('/merch', { state: { merch: { productId: p.id, collection: 'blood_group', bloodGroup: design.code } } })}>{t('merch.blood.pick')}</button>
                </li>
              );
            })}
            {products.length === 0 && <li>{t('merch.blood.none')}</li>}
          </ul>
        </>
      )}
    </div></main>
  );
}
