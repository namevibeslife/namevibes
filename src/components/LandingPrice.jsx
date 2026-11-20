import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CountryPricePicker from './CountryPricePicker';
import { formatMoney, countryLabel } from '../i18n/format';
import { loadCountryPricing, loadPricedCountries, viewerCountry, rememberPriceCountry } from '../utils/pricing';
import { useAuthStore } from '../store/authStore';

// The Annual Plan price for THIS visitor's country only, from its Country Pricing record.
// Country: signed-in profile -> a country chosen here -> Cloudflare country (/api/geo) -> browser locale.
// A country with no Active price never shows another country's price: the visitor picks from the
// Active countries instead. Nothing is rendered if no country has a price at all.
export default function LandingPrice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const profileCountry = user ? profile?.countryCode : null;
  const [countries, setCountries] = useState(null);
  const [code, setCode] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [picking, setPicking] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadPricedCountries();
      const { code: country } = await viewerCountry(profileCountry);
      const found = country && list.some(c => c.code === country) ? await loadCountryPricing(country) : null;
      if (cancelled) return;
      setCountries(list); setCode(country); setPricing(found); setReady(true);
    })();
    return () => { cancelled = true; };
  }, [profileCountry]);

  async function pick(next) {
    rememberPriceCountry(next);
    setCode(next);
    setPricing(await loadCountryPricing(next));
    setPicking(false);
  }

  if (!ready || !countries || countries.length === 0) return null;
  const name = code ? countryLabel(code, code) : '';
  const canChange = !profileCountry;
  const showPicker = canChange && (picking || !pricing);
  const discount = pricing?.plan.discountPercent;

  return (
    <section className="max-w-xl mx-auto px-6 pb-10 text-center" aria-label={t('pricing.title')} data-testid="landing-price">
      <div className="rounded-2xl border-2 border-brand-300 bg-paper p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800">{t('pricing.title')}</h2>
        {pricing ? (
          <>
            <p className="text-sm text-gray-600 mt-1">{t('pricing.priceFor', { country: name })}</p>
            <p className="text-4xl font-bold text-brand-600 mt-2" data-testid="landing-price-amount">
              {formatMoney(pricing.plan.price, pricing.currency)} <span className="text-lg font-semibold text-gray-600">{t('pricing.perYear')}</span>
            </p>
            {pricing.taxPercent > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {pricing.countryCode === 'IN' ? t('payment.includesGst', { percent: pricing.taxPercent }) : t('payment.includesTax', { percent: pricing.taxPercent })}
              </p>
            )}
            {discount > 0 && <p className="text-sm font-semibold text-green-700 mt-1">{t('pricing.landingReferral', { percent: discount })}</p>}
          </>
        ) : (
          <p className="mt-2 text-gray-700" role="status">
            {code ? t('pricing.countryUnavailable', { country: name }) : t('pricing.chooseCountry')}
          </p>
        )}

        {showPicker && (
          <div className="mt-4 text-left">
            <CountryPricePicker countries={countries} value={pricing ? code : ''} onChange={pick} />
          </div>
        )}
        {pricing && canChange && !picking && (
          <button type="button" onClick={() => setPicking(true)} className="mt-3 text-sm text-brand-700 underline min-h-[44px]">
            {t('pricing.changeCountry')}
          </button>
        )}
        {!canChange && !pricing && (
          <button type="button" onClick={() => navigate('/pricing')} className="mt-3 text-sm text-brand-700 underline min-h-[44px]">
            {t('pricing.changeCountry')}
          </button>
        )}
      </div>
    </section>
  );
}
