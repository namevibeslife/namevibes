import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReferralShareCard from './ReferralShareCard';
import AmbassadorRegister from './AmbassadorRegister';
import { ArrowUpRight, CheckCircle, UserCircle, Home, Users } from 'lucide-react';
import AmbassadorFollowers from './AmbassadorFollowers';

const TABS = [['home', 'ambassador.tabHome'], ['register', 'ambassador.tabRegister'], ['followers', 'ambassador.tabFollowers']];

// Home text lives in Firestore (ambassadorContent/home), readable only by admins and approved
// ambassadors, so none of it ships in a public bundle. Sections are plain structured data:
// { heading, paragraphs[], bullets[{label?, text}], callout?, after[] }.
function HomeContent({ content }) {
  const para = (list) => (list || []).map((p, i) => <p key={i}>{p}</p>);
  return (
    <>
      <header className="amb-editorial-heading">
        {content.brand && <p className="font-serif text-sm tracking-[0.3em] text-brand-700 mb-3">{content.brand}</p>}
        {content.title && <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">{content.title}</h2>}
      </header>
      <div className="amb-prose">{para(content.intro)}</div>
      {(content.sections || []).map((section, i) => (
        <section key={i} className="amb-content-section">
          {section.heading && <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">{section.heading}</h3>}
          <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">
            {para(section.paragraphs)}
            {section.bullets?.length > 0 && (
              <ul className="amb-content-list">
                {section.bullets.map((b, j) => <li key={j}>{b.label ? <><strong>{b.label}:</strong> </> : null}{b.text}</li>)}
              </ul>
            )}
            {section.callout && <p className="amb-callout">{section.callout}</p>}
            {para(section.after)}
          </div>
        </section>
      ))}
      {content.tagline && <p className="mt-10 text-center font-serif italic text-lg text-brand-800">{content.tagline}</p>}
    </>
  );
}

// Everything an approved ambassador sees. Loaded as its own chunk only after the account has been
// confirmed as an approved, active ambassador.
export default function AmbassadorArea({ ambassador, user, onAmbassadorChange, onSignOut }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'home';
  const goto = (key) => setParams(key === 'home' ? {} : { tab: key });
  const [content, setContent] = useState(null);
  const [contentError, setContentError] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const notify = (text) => { setToast(text); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 3500); };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'ambassadorContent', 'home'))
      .then(snap => { if (!cancelled) setContent(snap.exists() ? snap.data() : {}); })
      .catch(() => { if (!cancelled) { setContent({}); setContentError(true); } });
    return () => { cancelled = true; };
  }, [ambassador.id]);

  return (
    <div className="amb-workspace">
      <header className="amb-workspace-header">
        <div><p className="amb-kicker">{t('ambassador.yourSpace')}</p><h1>{t('ambassador.welcome', { name: ambassador.firstName || ambassador.fullName || user.displayName || t('ambassador.fallbackName') })}</h1><p>{t('ambassador.everything')}</p></div>
        <span className="amb-status"><CheckCircle size={16} aria-hidden="true" /> {t('ambassador.active')}</span>
      </header>
      <nav aria-label={t('ambassador.sectionsAria')} className="amb-tabs">
        {TABS.map(([key, label], index) => {
          const Icon = [Home, UserCircle, Users][index];
          return <button key={key} type="button" onClick={() => goto(key)} aria-current={tab === key ? 'page' : undefined}>
            <Icon size={18} aria-hidden="true" /><span>{t(label)}</span>
          </button>;
        })}
      </nav>
      {tab === 'home' && (
        <div className="amb-home-grid">
          <article className="amb-welcome-card">
            {content === null ? <p role="status" className="amb-prose">{t('ambassador.loadingWelcome')}</p> : <HomeContent content={content} />}
            {content !== null && !content.title && !content.intro?.length && !content.sections?.length && <div className="amb-empty-welcome"><p className="amb-kicker">{t('ambassador.emptyKicker')}</p><h2>{t('ambassador.emptyTitle')}</h2><p>{t('ambassador.emptyText')}</p></div>}
            {contentError && <p role="status" className="mt-4 text-sm text-gray-600">{t('ambassador.welcomeFailed')}</p>}
          </article>
          <aside className="amb-tools" aria-label={t('ambassador.toolsAria')}>
            <section className="amb-profile-summary">
              <span className="amb-icon-medallion"><UserCircle size={25} aria-hidden="true" /></span>
              <div><p className="amb-kicker">{t('ambassador.yourProfile')}</p><h2>{ambassador.detailsCompleted ? t('ambassador.detailsSavedTitle') : t('ambassador.makeHome')}</h2></div>
              <p>{ambassador.detailsCompleted ? t('ambassador.profileSavedText') : t('ambassador.profileCompleteText')}</p>
              <button type="button" className="amb-primary-action" onClick={() => goto('register')}>
                {ambassador.detailsCompleted ? t('ambassador.viewProfile') : t('ambassador.completeDetails')} <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </section>
            <div className="amb-share-panel"><ReferralShareCard code={ambassador.referralCode} /></div>
          </aside>
        </div>
      )}

      {tab === 'register' && (
        <AmbassadorRegister ambassador={ambassador} user={user} onSaved={onAmbassadorChange} notify={notify} goHome={() => goto('home')} />
      )}

      {tab === 'followers' && (
        <section aria-labelledby="followers-heading">
          <h2 id="followers-heading" className="font-serif text-3xl font-bold text-gray-900 text-center mb-6">{t('ambassador.tabFollowers')}</h2>
          <AmbassadorFollowers ambassador={ambassador} />
        </section>
      )}

      {toast && <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] rounded-lg bg-gray-900 text-white px-4 py-3 text-sm shadow-lg">{toast}</div>}

      <div className="amb-account-footer">
        <p className="text-xs text-gray-500 mb-2">{t('ambassador.signedInAs', { email: ambassador.email })}</p>
        <button type="button" onClick={onSignOut} className="px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">{t('ambassador.signOut')}</button>
      </div>
    </div>
  );
}
