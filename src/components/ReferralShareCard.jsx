import React, { useRef, useState } from 'react';
import { Copy, Check, Share2, Mail } from 'lucide-react';
import { buildShareLink, buildShareMessage, buildTelegramMessage } from '../utils/referralCode';

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
const LinkedInIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const MessengerIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" {...props}>
    <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.39 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z"/>
  </svg>
);

const TAP = 'min-w-[44px] min-h-[44px] w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-brand-200/70 bg-paper hover:bg-brand-50 transition px-2 py-3 text-center leading-tight';

const EMAIL_SUBJECT = 'Discover the hidden elements in your name';

// Native share sheets only list a useful set of apps on phones and tablets; on desktop the OS
// list is tiny (Windows especially), so desktop relies on the explicit buttons instead. Mobile =
// touch + a mobile UA (iPadOS reports a Mac UA but still has multi-touch).
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const hasTouch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent || '');
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return hasTouch && (mobileUA || iPadOS);
}

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
  const [messageCopied, setMessageCopied] = useState(false);

  // The timer lives in a ref: showToast is recreated every render, so a property on it would never
  // cancel the previous toast's timer and an older timer would wipe out a newer toast early.
  const toastTimer = useRef(null);
  const showToast = (text) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
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

  const handleCopyMessage = async () => {
    await copyToClipboard(message).catch(() => {});
    setMessageCopied(true);
    showToast('Message copied!');
    window.setTimeout(() => setMessageCopied(false), 1800);
  };

  const isMobile = isMobileDevice();
  // Only on phones/tablets - see isMobileDevice. Desktop uses the explicit buttons below.
  const canNativeShare = isMobile && typeof navigator !== 'undefined' && !!navigator.share;

  // Starts the clipboard copy and opens the destination in the same click, so both stay inside
  // the user gesture (opening a new tab first would steal focus and make the copy fail). The
  // copy is the fallback if the tab is blocked or the site ignores prefilled text.
  const copyAndOpen = (url, toastText) => {
    const copying = copyToClipboard(message).catch(() => {});
    window.open(url, '_blank', 'noopener,noreferrer');
    copying.then(() => showToast(toastText));
  };

  const handleNativeShare = async () => {
    try {
      // No separate url - the message already contains the ?ref= link, so a separate url
      // field would show it twice in the share sheet.
      await navigator.share({ title: 'Namasutra', text: message });
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Sharing was cancelled.');
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // mailto: does nothing on desktop browsers with no default mail app, so desktop opens Gmail's
  // web compose in a new tab by default; phones keep mailto: (opens the phone's mail app).
  // Outlook and the default mail app are offered as alternatives under the buttons.
  const openEmail = (provider = isMobile ? 'mailto' : 'gmail') => {
    const subject = encodeURIComponent(EMAIL_SUBJECT);
    const body = encodeURIComponent(message);
    if (provider === 'mailto') {
      const copying = copyToClipboard(message).catch(() => {});
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      copying.then(() => showToast('Message copied'));
      return;
    }
    const url = provider === 'outlook'
      ? `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`
      : `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    copyAndOpen(url, 'Message copied');
  };

  const openMessenger = () => {
    // No reliable Messenger share URL - copy the message and open Messenger to paste it.
    copyAndOpen('https://www.messenger.com/', 'Message copied. Paste it in Messenger.');
  };

  const openLinkedIn = () => {
    // LinkedIn's share dialog only takes the link, so the message is copied to paste into the post.
    copyAndOpen(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
      'Message copied. Paste it into your LinkedIn post.'
    );
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
    // Telegram renders `url` as the shared link/preview; the text omits the link line
    // (buildTelegramMessage) so it isn't shown twice.
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(buildTelegramMessage(code))}`, '_blank', 'noopener,noreferrer');
  };

  const openX = () => {
    // Full message, every time - long text needs X Premium to post, which is fine.
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
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

        <div className="grid grid-cols-3 gap-3 max-w-xl">
          {canNativeShare && (
            <button type="button" onClick={handleNativeShare} className={`${TAP} bg-white text-brand-700 border-transparent hover:bg-brand-50 col-span-3`} aria-label="Share">
              <Share2 size={20} />
              <span className="text-xs font-semibold">Share</span>
            </button>
          )}
          <button type="button" onClick={openWhatsApp} className={`${TAP} bg-white/95 text-[#25D366]`} aria-label="Share on WhatsApp">
            <WhatsAppIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
          </button>
          <button type="button" onClick={() => openEmail()} className={`${TAP} bg-white/95 text-brand-600`} aria-label="Share by email">
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
          <button type="button" onClick={openLinkedIn} className={`${TAP} bg-white/95 text-[#0A66C2]`} aria-label="Share on LinkedIn">
            <LinkedInIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">LinkedIn</span>
          </button>
          <button type="button" onClick={openMessenger} className={`${TAP} bg-white/95 text-[#0084FF]`} aria-label="Share on Messenger">
            <MessengerIcon className="w-6 h-6" />
            <span className="text-xs font-semibold text-gray-700">Messenger</span>
          </button>
          <button type="button" onClick={handleCopyMessage} className={`${TAP} bg-white/95 text-brand-600`} aria-label="Copy message to clipboard">
            {messageCopied ? <Check size={22} /> : <Copy size={22} />}
            <span className="text-xs font-semibold text-gray-700">{messageCopied ? 'Copied' : 'Copy message'}</span>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center text-xs text-brand-100">
          <span>Email with:</span>
          <button
            type="button"
            onClick={() => openEmail('outlook')}
            className="min-h-[44px] px-2 underline underline-offset-2 hover:text-white"
          >
            Outlook
          </button>
          <span aria-hidden="true">&middot;</span>
          <button
            type="button"
            onClick={() => openEmail('mailto')}
            className="min-h-[44px] px-2 underline underline-offset-2 hover:text-white"
          >
            Default mail app
          </button>
        </div>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-semibold text-brand-100">Message that will be sent</span>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="min-w-[44px] min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition font-semibold text-sm"
              aria-label="Copy message"
            >
              {messageCopied ? <Check size={16} /> : <Copy size={16} />}
              {messageCopied ? 'Copied' : 'Copy message'}
            </button>
          </div>
          <div
            className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm text-white"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {message}
          </div>
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
