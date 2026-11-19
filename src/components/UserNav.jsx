import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Logo from './Logo';

const explore = [
  ['Home', '/'], ['Know More', '/learn-more'], ['Dashboard', '/dashboard'],
  ['Analyze Name', '/analyze'], ['Family Analysis', '/family'],
  ['Element & Nakshatra Insights', '/element-insights'],
  ['Numerology Calculator', '/numerology-calculator'],
  ['Zodiac Name Guide', '/zodiac-syllables'], ['Hora & Muhurat', '/hora-muhurat'],
  ['Plans & Pricing', '/pricing'],
];

// One shared navigation bar on every route, including public and error pages.
export default function UserNav() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const container = useRef(null);
  const toggle = useRef(null);
  useEffect(() => { setOpen(false); setError(''); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const account = user ? [['Settings', '/settings'], ['My Profile', '/profile-complete']] : [['Sign In', '/login']];
  const partners = [['Ambassador Program', '/ambassador'], ['Become an Ambassador', '/ambassador/register']];
  if (location.pathname.startsWith('/ambassador')) partners.push(['Ambassador Dashboard', '/ambassador/dashboard']);
  if (['/admin', '/accounts'].includes(location.pathname)) partners.push(['Admin', '/admin'], ['Accounts', '/accounts']);
  async function signOut() {
    try { await logout(); setOpen(false); navigate('/'); }
    catch { setError('Could not sign out. Please try again.'); }
  }
  return <header className="site-navigation" ref={container}>
    <div className="site-navigation-bar">
      <Link to="/" aria-label="Namasutra home" className="site-navigation-logo"><Logo /></Link>
      <nav aria-label="Primary navigation" className="site-navigation-actions">
        <NavLink to="/" end className="site-home-link"><Home size={18} aria-hidden="true" />Home</NavLink>
        <button ref={toggle} type="button" aria-expanded={open} aria-controls="site-navigation-menu" onClick={() => setOpen(value => !value)} className="site-menu-toggle">
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />} Menu
        </button>
      </nav>
      {open && <nav id="site-navigation-menu" aria-label="All pages" className="site-navigation-dropdown" onBlur={event => { if (event.relatedTarget && !container.current?.contains(event.relatedTarget)) setOpen(false); }}>
        {[['Explore Namasutra', explore], ['Your account', account], ['Partners', partners]].map(([title, links]) => <section key={title}>
          <h2>{title}</h2>
          <div className="site-navigation-links">{links.map(([label, to]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)}>{label}</NavLink>)}</div>
        </section>)}
        {user && <button type="button" onClick={signOut} className="site-signout">Sign Out</button>}
        {error && <p role="alert">{error}</p>}
      </nav>}
    </div>
  </header>;
}
