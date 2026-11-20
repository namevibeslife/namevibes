import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CountryCombobox from './CountryCombobox';
import { countryLabel } from '../i18n/format';

// Type-ahead picker limited to the countries that have an Active price in Country Pricing.
// Names are shown in the interface language. `countries` is [{ code, name }].
export default function CountryPricePicker({ countries, value, onChange }) {
  const { t, i18n } = useTranslation();
  const options = useMemo(
    () => countries.map(c => ({ code: c.code, name: countryLabel(c.code, c.name) })).sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
    [countries, i18n.language]
  );
  return (
    <CountryCombobox
      countries={options}
      value={value}
      onChange={onChange}
      label={t('pricing.changeCountry')}
      placeholder={t('pricing.searchCountry')}
      noMatch={t('pricing.noCountryMatch')}
    />
  );
}
