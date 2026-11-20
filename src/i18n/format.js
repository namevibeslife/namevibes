import i18n from 'i18next';

// Presentation only: never changes the amount charged. Latin digits are kept for money so a price
// reads the same in every language; dates follow the selected language.
export function formatMoney(amount, currency, lang = i18n.language) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat(lang, {
      style: 'currency', currency: currency || 'USD', currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2,
    }).format(n);
  } catch { return String(n); }
}
export function formatNumber(n, lang = i18n.language, options) {
  try { return new Intl.NumberFormat(lang, options).format(Number(n)); } catch { return String(n); }
}
export function formatDate(value, lang = i18n.language, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const iso = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = value?.toDate ? value.toDate() : value instanceof Date ? value : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try { return new Intl.DateTimeFormat(lang, options).format(d); } catch { return d.toDateString(); }
}
export function formatTime(value, lang = i18n.language) {
  return formatDate(value, lang, { hour: 'numeric', minute: '2-digit' });
}

// Country names are shown in the selected language (Intl); stored values stay as they are
export function countryLabel(code, fallback = '', lang = i18n.language) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(String(code).toUpperCase()) || fallback; } catch { return fallback; }
}

// Clock time in a named time zone (the place the timings are calculated for), in the selected language
export function formatClock(ms, timeZone, lang = i18n.language) {
  try {
    const out = new Intl.DateTimeFormat(lang, { timeZone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ms));
    return lang === 'en' ? out.toUpperCase() : out;
  } catch { return ''; }
}
