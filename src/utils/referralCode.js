// Ambassador referral codes: generation, formatting and link/message building.
// Pure - no Firebase imports here, so this is safe to unit-test directly in Node.
//
// Format: NV-XXXXXX - 6 characters from an alphabet with the look-alike characters
// removed (no 0/O, 1/I/L), so a code is easy to read aloud or copy by hand.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const CODE_PREFIX = 'NV-';

const CODE_PATTERN = new RegExp(`^NV-[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

// crypto.getRandomValues, never Math.random. CODE_ALPHABET.length is 31 (26 letters minus
// O/I/L, plus 10 digits minus 0/1) - not a power of two, so a plain `byte % 31` would be
// slightly biased (256 isn't evenly divisible by 31). Rejection sampling removes that bias:
// any byte >= the largest multiple of 31 under 256 is discarded and redrawn.
const REJECTION_CEILING = 256 - (256 % CODE_ALPHABET.length);

export function generateCandidateCode() {
  let body = '';
  const buf = new Uint8Array(1);
  while (body.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    if (buf[0] >= REJECTION_CEILING) continue; // biased range - redraw
    body += CODE_ALPHABET[buf[0] % CODE_ALPHABET.length];
  }
  return `${CODE_PREFIX}${body}`;
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

// Short, friendly and editable in one place.
export function buildShareMessage(code) {
  const link = buildShareLink(code);
  return `I've been exploring my name's hidden meaning on NameVibes: numerology, astrology and Nakshatra insights. Try it with my code ${normalizeReferralCode(code)}: ${link}`;
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
