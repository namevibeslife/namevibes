import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import Logo from './Logo';
import LanguagePicker from './LanguagePicker';
import { isPlanActive } from '../utils/plan';
import { useTranslation } from 'react-i18next';

const explore = [
  ['nav.home', '/'], ['nav.knowMore', '/learn-more'], ['nav.dashboard', '/dashboard'],
  ['nav.analyze', '/analyze'], ['nav.family', '/family'],
  ['nav.insights', '/element-insights'],
  ['nav.numerology', '/numerology-calculator'],
  ['nav.zodiac', '/zodiac-syllables'], ['nav.hora', '/hora-muhurat'],
  ['nav.merch', '/merch'], ['nav.bloodGroup', '/merch/blood-group'],
  ['nav.pricing', '/pricing'],
];

// One shared navigation bar on every route, including public and error pages.
export default function UserNav() {
  const { t } = useTranslation();
  const { user, profile, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [isAmbassador, setIsAmbassador] = useState(false);
  const container = useRef(null);
  const toggle = useRef(null);
  useEffect(() => { setOpen(false); setError(''); }, [location.pathname]);
  // Only a signed-in approved, active ambassador gets the "Ambassador area" label.
  useEffect(() => {
    let cancelled = false;
    setIsAmbassador(false);
    if (!user?.email) return undefined;
    getDocs(query(collection(db, 'ambassadors'), where('email', '==', user.email.toLowerCase())))
      .then(snap => { if (!cancelled) setIsAmbassador(snap.docs.some(d => d.data().isApproved && d.data().isActive)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.email]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  // An approved ambassador with no paid plan only sees links that open for them; the paid tools
  // (and the dashboard that leads to them) stay hidden rather than bouncing to the payment card.
  const planless = user && isAmbassador && !isPlanActive(profile);
  const exploreLinks = planless ? explore.filter(([, to]) => ['/', '/learn-more'].includes(to) || (to === '/pricing' && profile?.profileComplete)) : explore;
  const account = user ? [['nav.settings', '/settings'], ['nav.profile', '/profile']] : [['nav.signIn', '/login']];
  // Ambassadors are invite-only, so the only public entry is a login link (no sign-up anywhere).
  // One link to the ambassador sign-in page; it reads "Ambassador area" for a signed-in ambassador.
  const partners = [[isAmbassador ? 'nav.ambassadorArea' : 'nav.ambassadorLogin', '/ambassador']];
  if (['/admin', '/accounts', '/admin/merch'].includes(location.pathname)) partners.push(['nav.admin', '/admin'], ['nav.accounts', '/accounts'], ['nav.adminMerch', '/admin/merch']);
  async function signOut() {
    try { await logout(); setOpen(false); navigate('/'); }
    catch { setError(t('errors.signOut')); }
  }
  return <header className="site-navigation" ref={container}>
    <div className="site-navigation-bar">
      <Link to="/" aria-label={t('nav.homeAria')} className="site-navigation-logo"><Logo /></Link>
      <nav aria-label={t('nav.primary')} className="site-navigation-actions">
        <LanguagePicker className="language-picker-compact" />
        <NavLink to="/" end className="site-home-link" aria-label={t('nav.home')}><Home size={18} aria-hidden="true" /><span className="site-home-text">{t('nav.home')}</span></NavLink>
        <button ref={toggle} type="button" aria-expanded={open} aria-label={t('nav.menu')} aria-controls="site-navigation-menu" onClick={() => setOpen(value => !value)} className="site-menu-toggle">
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />} <span className="site-menu-text">{t('nav.menu')}</span>
        </button>
      </nav>
      {open && <nav id="site-navigation-menu" aria-label={t('nav.allPages')} className="site-navigation-dropdown" onBlur={event => { if (event.relatedTarget && !container.current?.contains(event.relatedTarget)) setOpen(false); }}>
        {[['nav.explore', exploreLinks], ['nav.account', account], ['nav.ambassadors', partners]].map(([title, links]) => <section key={title}>
          <h2>{t(title)}</h2>
          <div className="site-navigation-links">{links.map(([label, to]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}>{t(label)}</NavLink>)}</div>
        </section>)}
        <div className="site-navigation-language"><LanguagePicker /></div>
        {user && <button type="button" onClick={signOut} className="site-signout">{t('nav.signOut')}</button>}
        {error && <p role="alert">{error}</p>}
      </nav>}
    </div>
  </header>;
}
