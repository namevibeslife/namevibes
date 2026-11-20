import React, { useState } from 'react';
import { Copy, Check, Mail, Link as LinkIcon } from 'lucide-react';
import { WhatsAppIcon, isMobileDevice, copyToClipboard } from './ReferralShareCard';
import { inviteEmailSubject, AMBASSADOR_LOGIN_URL } from '../utils/ambassadorInvite';

// Shows the invite message for an ambassador with Copy / WhatsApp / Email / Copy-link buttons.
export default function InviteMessageBox({ message, onClose }) {
  const [note, setNote] = useState('');
  const flash = (text) => { setNote(text); window.setTimeout(() => setNote(''), 2400); };
  const [text, setText] = useState(message);

  const copy = async (value, label) => { await copyToClipboard(value).catch(() => {}); flash(label); };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  const email = () => {
    const subject = encodeURIComponent(inviteEmailSubject());
    const body = encodeURIComponent(text);
    copyToClipboard(text).catch(() => {});
    if (isMobileDevice()) window.location.href = `mailto:?subject=${subject}&body=${body}`;
    else window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    flash('Message copied');
  };

  const btn = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-brand-200 bg-paper text-sm font-semibold text-gray-800 hover:bg-brand-50';
  return (
    <div className="rounded-xl border-2 border-brand-200 p-4 space-y-3" role="region" aria-label="Invite message">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-bold text-gray-800">Invite message</h4>
        {onClose && <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 min-h-[44px] px-2">Close</button>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full rounded-lg border-2 border-gray-300 p-3 text-sm whitespace-pre-wrap focus:ring-2 focus:ring-brand-500 focus:outline-none"
        aria-label="Invite message text"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button type="button" className={btn} onClick={() => copy(text, 'Message copied')}><Copy size={16} />Copy</button>
        <button type="button" className={btn} onClick={whatsapp}><WhatsAppIcon className="w-4 h-4" />WhatsApp</button>
        <button type="button" className={btn} onClick={email}><Mail size={16} />Email</button>
        <button type="button" className={btn} onClick={() => copy(AMBASSADOR_LOGIN_URL, 'Link copied')}><LinkIcon size={16} />Copy link</button>
      </div>
      <p className="text-sm text-green-700 min-h-[1.25rem]" role="status">{note && <><Check size={14} className="inline mr-1" />{note}</>}</p>
    </div>
  );
}
