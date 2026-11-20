import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { LANGUAGES, setLanguage } from '../i18n';
import { saveLanguageToProfile } from '../i18n/profileLanguage';

// Globe button for the sticky top bar. Opens a small list of languages, each in its own script.
// Choosing one switches immediately, is remembered on this device and saved to the signed-in
// user's profile (same behaviour as LanguagePicker). Escape and an outside click close it and
// focus returns to the button. `onOpen` lets the bar close its Menu so only one panel is open.
export default function LanguageButton({ onOpen }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const button = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!wrap.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    // keyboard users land on the current language
    list.current?.querySelector('[aria-current="true"]')?.focus({ preventScroll: true });
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  async function choose(code) {
    const applied = await setLanguage(code);
    saveLanguageToProfile(applied);
    setOpen(false);
    button.current?.focus();
  }
  function onListKey(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...list.current.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return (
    <div className="site-language" ref={wrap}>
      <button
        ref={button}
        type="button"
        aria-label={t('nav.language')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="site-language-menu"
        onClick={() => { if (!open) onOpen?.(); setOpen(value => !value); }}
        className="site-language-toggle"
      >
        <Globe size={22} aria-hidden="true" />
      </button>
      {open && (
        <div id="site-language-menu" role="group" aria-label={t('nav.language')} className="site-language-menu" ref={list} onKeyDown={onListKey}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              aria-current={l.code === i18n.language ? 'true' : undefined}
              onClick={() => choose(l.code)}
            >
              <span>{l.name}</span>
              {l.code === i18n.language && <Check size={18} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
