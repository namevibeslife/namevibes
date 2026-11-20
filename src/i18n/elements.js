import i18n from 'i18next';

// Element symbols, names, numbers and colours are data and stay as they are. Only the life
// meaning is translated, from the per-language content file (src/locales/content/<lang>.json).
export function elementMeaning(el) {
  if (!el) return '';
  return i18n.t(`elements.${el.symbol}`, { ns: 'content', defaultValue: el.meaning });
}
