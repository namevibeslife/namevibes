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
  return `https://namevibes.life/?ref=${normalizeReferralCode(code)}`;
}

// Exact text, kept in one place so it's easy to edit. Emojis and line breaks are intentional.
export function buildShareMessage(code) {
  const c = normalizeReferralCode(code);
  const link = buildShareLink(code);
  return [
    'Your name is more than just an identity. What if it has a connection to the very elements of our universe? 🌌',
    "I discovered something fascinating on NameVibes — a unique platform that connects the letters of our names to chemical elements, while exploring numerology, astrology and Nakshatra insights.",
    'Every name has a story. Discover what yours reveals! ✨',
    `🔗 Explore your NameVibes: ${link}`,
    `🎁 Try it with my referral code: ${c} this can give you a DISCOUNT`
  ].join('\n');
}

// X/Twitter has a character limit the full message usually exceeds - fall back to just the
// link and code line.
const X_CHAR_LIMIT = 280;

export function buildShortShareMessage(code) {
  const c = normalizeReferralCode(code);
  const link = buildShareLink(code);
  return [
    `🔗 Explore your NameVibes: ${link}`,
    `🎁 Try it with my referral code: ${c} this can give you a DISCOUNT`
  ].join('\n');
}

export function buildXShareMessage(code) {
  const full = buildShareMessage(code);
  return full.length > X_CHAR_LIMIT ? buildShortShareMessage(code) : full;
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
