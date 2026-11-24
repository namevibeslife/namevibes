import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { LANGUAGES, setLanguage } from '../i18n';
import { LANGUAGE_PICKER_ENABLED } from '../config/site';
import { saveLanguageToProfile } from '../i18n/profileLanguage';

// Each language is shown in its own script. Switching is immediate once the (small) language file
// is loaded, remembered on this device and saved to the signed-in user's profile.
export default function LanguagePicker({ className = '', prominent = false }) {
  const { t, i18n } = useTranslation();
  if (!LANGUAGE_PICKER_ENABLED) return null;
  async function change(event) {
    const code = await setLanguage(event.target.value);
    saveLanguageToProfile(code);
  }
  return (
    <label className={`language-picker ${prominent ? 'language-picker-prominent' : ''} ${className}`}>
      <Globe size={16} aria-hidden="true" />
      <span className="sr-only">{t('nav.language')}</span>
      <select value={i18n.language} onChange={change} aria-label={t('nav.language')}>
        {LANGUAGES.map(l => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}
