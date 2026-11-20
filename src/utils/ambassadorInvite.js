import i18n from 'i18next';
import { SITE_URL } from '../config/site.js';
// Invite-only ambassadors: the admin invites a Google email, which becomes the authorisation.
export const AMBASSADOR_LOGIN_URL = `${SITE_URL}/ambassador`;
export const inviteEmailSubject = () => i18n.t('invite.subject');

// Editable default invite text.
export function buildInviteMessage(email) {
  return [
    i18n.t('invite.line1'),
    i18n.t('invite.line2', { email, url: AMBASSADOR_LOGIN_URL }),
    i18n.t('invite.line3')
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
  if (!parts.length) return i18n.t('invite.member');
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
