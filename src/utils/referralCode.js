import i18n from 'i18next';
import { SITE_URL } from '../config/site.js';
// Ambassador referral codes: generation, formatting and link/message building.
// Pure - no Firebase imports here, so this is safe to unit-test directly in Node.
//
// Format: <CC><6 digits>, e.g. IN482913, US073519 - the ambassador's 2-letter country code
// followed by 6 random digits (leading zeros allowed). No letters after the country code.
export const DIGIT_COUNT = 6;

const CODE_PATTERN = /^[A-Z]{2}\d{6}$/;

// crypto.getRandomValues, never Math.random. 10 isn't a power of two, so a plain `byte % 10`
// would be slightly biased (256 isn't evenly divisible by 10). Rejection sampling removes
// that bias: any byte >= the largest multiple of 10 under 256 (250) is discarded and redrawn.
const REJECTION_CEILING = 250;

// countryCode must be the ambassador's real 2-letter country code - this never guesses or
// falls back silently. Callers (approval, migration) must fail clearly if it's missing.
export function generateCandidateCode(countryCode) {
  const cc = normalizeReferralCode(countryCode);
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error(`Cannot generate a referral code: "${countryCode || ''}" is not a valid 2-letter country code.`);
  }
  let digits = '';
  const buf = new Uint8Array(1);
  while (digits.length < DIGIT_COUNT) {
    crypto.getRandomValues(buf);
    if (buf[0] >= REJECTION_CEILING) continue; // biased range - redraw
    digits += String(buf[0] % 10);
  }
  return `${cc}${digits}`;
}

// Codes are case-insensitive: callers normalize on both input and lookup.
export function normalizeReferralCode(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isWellFormedCode(code) {
  return CODE_PATTERN.test(normalizeReferralCode(code));
}

export function buildShareLink(code) {
  return `${SITE_URL}/?ref=${normalizeReferralCode(code)}`;
}

// Exact text, kept in one place so it's easy to edit. Emojis and line breaks are intentional.
// The link line is index 3 - buildTelegramMessage below omits it so Telegram's separate `url`
// param isn't duplicated in the message text.
function shareMessageLines(code) {
  const c = normalizeReferralCode(code);
  const link = buildShareLink(code);
  return [
    i18n.t('share.line1'),
    i18n.t('share.line2'),
    i18n.t('share.line3'),
    i18n.t('share.line4', { link }),
    i18n.t('share.line5', { code: c })
  ];
}

export function buildShareMessage(code) {
  return shareMessageLines(code).join('\n');
}

// Telegram's share URL carries the link separately via `url` (shown as a link preview), so
// the text omits the "Explore your Namasutra" link line - otherwise the link would appear twice.
export function buildTelegramMessage(code) {
  return shareMessageLines(code).filter((_, i) => i !== 3).join('\n');
}

// ---------- capturing ?ref= on landing ----------

const REF_STORAGE_KEY = 'nv_referral_ref';
const REF_TTL_DAYS = 30;

// Reads ?ref= from a location.search string and persists it (30 days) if it looks like a
// real code. Call this once, on landing. Safe to call even when there's no ?ref= param.
export function captureReferralFromUrl(search) {
  try {
    const params = new URLSearchParams(search || '');
    const raw = params.get('ref');
    if (!raw) return;
    const code = normalizeReferralCode(raw);
    if (!isWellFormedCode(code)) return;
    const expiresAt = Date.now() + REF_TTL_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ code, expiresAt }));
  } catch {
    // localStorage unavailable (private mode, blocked storage) - referral just won't persist
  }
}

// Returns the stored referral code if present and not expired, else null.
// Expired entries are cleaned up.
export function getStoredReferralCode() {
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const { code, expiresAt } = JSON.parse(raw);
    if (!code || !expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(REF_STORAGE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ }
}
