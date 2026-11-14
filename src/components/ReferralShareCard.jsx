import React, { useState } from 'react';
import { Copy, Check, Share2, Mail } from 'lucide-react';
import { buildShareLink, buildShareMessage, buildXShareMessage } from '../utils/referralCode';

// Small brand glyphs the icon library doesn't have. Single-color, inherits currentColor.
const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38A9.96 9.96 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.13a8.1 8.1 0 0 1-4.14-1.14l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 1 1 20.14 12a8.1 8.1 0 0 1-8.1 8.13Zm4.45-6.06c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/>
  </svg>
);
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/>
  </svg>
);
const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const TelegramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M21.9 4.3 18.6 20.2c-.25 1.1-.9 1.37-1.82.86l-5.03-3.7-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.1L17.95 7c.4-.36-.09-.56-.62-.2L6.6 13.6l-4.95-1.55c-1.08-.34-1.1-1.08.22-1.6L20.5 3.15c.9-.34 1.68.2 1.4 1.15Z"/>
  </svg>
);
const XIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.24 3H21l-6.3 7.2L22 21h-6.2l-4.85-6.35L5.35 21H2.58l6.75-7.7L2 3h6.35l4.38 5.8L18.24 3Zm-1.08 16.17h1.52L7.9 4.73H6.27l10.89 14.44Z"/>
  </svg>
);

const TAP = 'min-w-[44px] min-h-[44px] w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-brand-200/70 bg-paper hover:bg-brand-50 transition px-2 py-3';

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Fallback for older/locked-down browsers
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(el); }
  return Promise.resolve();
}

export default function ReferralShareCard({ code }) {
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  const showToast = (text) => {
    setToast(text);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 2600);
  };

  if (!code) return null;

  const link = buildShareLink(code);
  const message = buildShareMessage(code);

  const handleCopyCode = async () => {
    await copyToClipboard(code).catch(() => {});
    setCopied(true);
    showToast('Copied!');
    window.setTimeout(() => setCopied(false), 1800);
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'NameVibes', text: message, url: link });
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Sharing was cancelled.');
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const openEmail = () => {
    const subject = encodeURIComponent('Discover the hidden elements in your name');
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(message)}`;
  };

  const openFacebook = async () => {
    // Facebook's share dialog ignores pre-filled text, so copy the message first.
    await copyToClipboard(message).catch(() => {});
    showToast('Message copied. Paste it after sharing on Facebook.');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank', 'noopener,noreferrer');
  };

  const openInstagram = async () => {
    // No Instagram web share intent - copy the message and send them to paste it themselves.
    await copyToClipboard(message).catch(() => {});
    showToast('Message copied. Paste it in Instagram.');
    window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
  };

  const openTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const openX = () => {
    // X has a character limit the full message usually exceeds - buildXShareMessage falls
    // back to just the link and code line in that case.
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildXShareMessage(code))}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-brand-600 to-ocean-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Your Referral Code</h2>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="text-4xl sm:text-5xl font-bold tracking-wider font-mono">{code}</div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="min-w-[44px] min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition font-semibold"
            aria-label="Copy referral code"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-brand-100 text-sm mb-6">Share this code with your network to earn commissions!</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-xl">
          {canNativeShare && (
            <button type="button" onClick={handleNativeShare} className={`${TAP} bg-white text-brand-700 border-transparent hover:bg-brand-50 col-span-3 sm:col-span-4`} aria-label="Share">
              <Share2 size={20} />
              <span className="text-xs font-semibold">Share</span>
            </button>
          )}
          <button type="button" onClick={openWhatsApp} className={`${TAP} bg-white/95 text-[#25D366]`} aria-label="Share on WhatsApp">
            <WhatsAppIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
          </button>
          <button type="button" onClick={openEmail} className={`${TAP} bg-white/95 text-brand-600`} aria-label="Share by email">
            <Mail size={22} />
            <span className="text-xs font-semibold text-gray-700">Email</span>
          </button>
          <button type="button" onClick={openFacebook} className={`${TAP} bg-white/95 text-[#1877F2]`} aria-label="Share on Facebook">
            <FacebookIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">Facebook</span>
          </button>
          <button type="button" onClick={openInstagram} className={`${TAP} bg-white/95 text-[#C13584]`} aria-label="Share on Instagram">
            <InstagramIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">Instagram</span>
          </button>
          <button type="button" onClick={openTelegram} className={`${TAP} bg-white/95 text-[#26A5E4]`} aria-label="Share on Telegram">
            <TelegramIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">Telegram</span>
          </button>
          <button type="button" onClick={openX} className={`${TAP} bg-white/95 text-gray-900`} aria-label="Share on X">
            <XIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">X</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed sm:absolute left-1/2 -translate-x-1/2 bottom-6 sm:bottom-auto sm:-top-3 z-20 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
