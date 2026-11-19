import { SITE_URL } from '../config/site.js';
// Invite-only ambassadors: the admin invites a Google email, which becomes the authorisation.
export const AMBASSADOR_LOGIN_URL = `${SITE_URL}/ambassador`;
export const INVITE_EMAIL_SUBJECT = 'You are invited to become a NAMASUTRA Ambassador';

// Editable default invite text.
export function buildInviteMessage(email) {
  return [
    "You're invited to become a NAMASUTRA Ambassador 🌟",
    `Sign in with your Google account (${email}) here: ${AMBASSADOR_LOGIN_URL}`,
    'Your unique Ambassador Code is already waiting for you in your dashboard.'
  ].join('\n');
}

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// "ra***@gmail.com"
export function maskEmail(email) {
  const [name = '', domain = ''] = String(email || '').split('@');
  return `${name.slice(0, 2)}***${domain ? '@' + domain : ''}`;
}

// "Asha K."
export function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Member';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
