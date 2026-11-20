import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import { ensureScriptFont, scriptFontFamily } from './fonts';

// Adding a language = adding src/locales/<code>.json (+ src/locales/content/<code>.json).
// Each file carries its own "meta": { "code", "name" (in its own script), "script" }. English is
// bundled (source of truth and fallback); every other language loads on demand.
const metaFiles = import.meta.glob('../locales/*.json', { import: 'meta', eager: true });
const uiLoaders = import.meta.glob('../locales/*.json');
const contentLoaders = import.meta.glob('../locales/content/*.json');

export const LANGUAGES = Object.values(metaFiles)
  .map(m => ({ code: m.code, name: m.name, script: m.script || 'latin' }))
  .sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.code.localeCompare(b.code)));
export const DEFAULT_LANGUAGE = 'en';
export const STORAGE_KEY = 'nv_lang';
export const isSupported = (code) => LANGUAGES.some(l => l.code === code);

const loaded = new Set(['en']);
async function loadLanguage(code) {
  if (!isSupported(code)) code = DEFAULT_LANGUAGE;
  if (!loaded.has(code)) {
    const [ui, content] = await Promise.all([
      uiLoaders[`../locales/${code}.json`](),
      contentLoaders[`../locales/content/${code}.json`]?.() ?? Promise.resolve({ default: {} }),
    ]);
    i18n.addResourceBundle(code, 'translation', ui.default, true, true);
    i18n.addResourceBundle(code, 'content', content.default, true, true);
    loaded.add(code);
  }
  return code;
}

export function savedLanguage() {
  try { const v = localStorage.getItem(STORAGE_KEY); return isSupported(v) ? v : null; } catch { return null; }
}
function browserLanguage() {
  try {
    for (const tag of navigator.languages || [navigator.language]) {
      const base = String(tag || '').toLowerCase().split('-')[0];
      if (isSupported(base)) return base;
    }
  } catch { /* ignore */ }
  return null;
}

// saved choice -> (profile language, applied after sign-in) -> detected country (India shows
// English, with the picker prominent) -> browser language -> English
async function pickInitialLanguage() {
  const saved = savedLanguage();
  if (saved) return { code: saved, chosen: true };
  let country = null;
  try {
    const { detectBrowserCountry } = await import('../utils/countryDetect');
    country = await Promise.race([detectBrowserCountry(), new Promise(r => setTimeout(() => r(null), 700))]);
  } catch { /* ignore */ }
  if (country === 'IN') return { code: 'en', chosen: false };
  return { code: browserLanguage() || DEFAULT_LANGUAGE, chosen: false };
}

function applyDocument(code) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  const title = i18n.t('page.title');
  if (title && title !== 'page.title') document.title = title;
  const description = i18n.t('page.description');
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    const tag = document.querySelector(selector);
    if (tag && description && description !== 'page.description') tag.setAttribute('content', description);
  }
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    const tag = document.querySelector(selector);
    if (tag && title && title !== 'page.title') tag.setAttribute('content', title);
  }
}

export const languageInfo = (code = i18n.language) => LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

export async function setLanguage(code, { persist = true } = {}) {
  const lang = await loadLanguage(code);
  const script = languageInfo(lang).script;
  await ensureScriptFont(script, languageInfo(lang).name);
  const family = scriptFontFamily(script);
  if (typeof document !== 'undefined') document.documentElement.style.setProperty('--script-font', family ? `"${family}"` : 'system-ui');
  await i18n.changeLanguage(lang);
  applyDocument(lang);
  if (persist) { try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ } }
  return lang;
}

export async function initI18n() {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation', 'content'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
  const { code, chosen } = await pickInitialLanguage();
  // English content is a lazy file too, so load it for the fallback chain before first paint
  const contentEn = await contentLoaders['../locales/content/en.json']?.();
  if (contentEn) i18n.addResourceBundle('en', 'content', contentEn.default, true, true);
  await setLanguage(code, { persist: chosen });
  window.__nvLanguageChosen = chosen;
}

// "IN" visitors without a saved choice get a prominent picker
export const hasChosenLanguage = () => Boolean(savedLanguage());

export default i18n;
