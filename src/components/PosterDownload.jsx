import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { planFeatures } from '../utils/plan';
import ChemistryPoster from './ChemistryPoster';

export default function PosterDownload({ person, people, family = false }) {
  const profile = useAuthStore(state => state.profile);
  const features = planFeatures(profile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [prepared, setPrepared] = useState(null);
  const [theme, setTheme] = useState('gold');
  const version = useRef(0);
  const readyPanel = useRef(null);
  const list = people || [person];
  const identity = JSON.stringify(list);
  useEffect(() => {
    version.current += 1; setPrepared(null); setMessage(''); setBusy(false);
    return () => { version.current += 1; };
  }, [identity, theme]);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);
  useEffect(() => { if (prepared) readyPanel.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [prepared]);
  if (!features) return null;
  async function download() {
    setBusy(true); setMessage('');
    try {
      const { buildPosterPDF, loadPosterLogo } = await import('../utils/posterReport');
      const logo = await loadPosterLogo(theme).catch(() => null);
      buildPosterPDF(list, { theme, logo }).save(family ? 'NameVibes_Family_Posters.pdf' : 'NameVibes_Elemental_Profile.pdf');
    } catch { setMessage('The PDF could not be downloaded. Please try again.'); }
    finally { setBusy(false); }
  }
  async function prepare() {
    if (prepared) { readyPanel.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); return; }
    const request = version.current;
    setBusy(true); setMessage('');
    try {
      const file = family
        ? await (await import('../utils/familyPosterImage')).buildFamilyPosterImage(list, theme)
        : await (await import('../utils/posterImage')).buildPosterImage(list[0], false, theme);
      if (request !== version.current) return;
      setPrepared({ file, url: URL.createObjectURL(file) });
    } catch { if (request === version.current) setMessage('The poster could not be prepared. Please try again.'); }
    finally { if (request === version.current) setBusy(false); }
  }
  async function share() {
    setBusy(true); setMessage('');
    try {
      // The ready-file button preserves the user gesture required by mobile sharing.
      await navigator.share({ files: [prepared.file], title: family ? 'Our Family NameVibes' : 'My NameVibes' });
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Sharing is unavailable. Use Save Image, then attach the poster in WhatsApp, Instagram or Facebook.');
    } finally { setBusy(false); }
  }
  let canShare = false;
  try { canShare = Boolean(prepared && navigator.share && navigator.canShare?.({ files: [prepared.file] })); } catch { /* Save Image remains available. */ }
  const buttonClass = 'inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50';
  return <section className="text-center mb-6 space-y-3" aria-label="Download and share your poster">
    <h3 className="text-2xl text-brand-800">{family ? 'Save & share your family poster' : 'Save & share your poster'}</h3>
    <fieldset className="flex flex-wrap justify-center items-center gap-3">
      <legend className="text-sm text-gray-700 mb-2">Choose your poster style</legend>
      {['gold', 'dark'].map(value => <label key={value} className="inline-flex items-center gap-2 px-5 py-2 border border-brand-300 rounded-full cursor-pointer">
        <input type="radio" name={`poster-theme-${family ? 'family' : 'individual'}`} value={value} checked={theme === value} disabled={busy} onChange={() => setTheme(value)} />
        {value === 'gold' ? 'Golden' : 'Dark'}
      </label>)}
    </fieldset>
    <div className="max-w-4xl mx-auto" aria-live="polite">
      <ChemistryPoster people={list} family={family} theme={theme} minimal />
    </div>
    <div className="flex flex-wrap justify-center gap-3">
      <button onClick={prepare} disabled={busy} className={buttonClass}><Share2 size={18} />{busy ? 'Preparing...' : 'Save & Share Poster'}</button>
      {features.pdfDownload && <button onClick={download} disabled={busy} className={buttonClass}><Download size={18} />Download Poster PDF</button>}
    </div>
    <p className="text-sm text-gray-600">{family ? 'One image with the whole family, shared elements and their meanings.' : 'Your name and element tiles, ready to save or share as an image.'}</p>
    {prepared && <div className="space-y-3" ref={readyPanel}>
      <p role="status" className="font-semibold text-brand-800">Your poster is ready. Save it or choose an app to share it.</p>
      <img src={prepared.url} alt={family ? 'Full family poster with shared elements and meanings' : `Share poster for ${list[0].fullName}`} className="max-h-96 max-w-full mx-auto rounded-lg" />
      <div className="flex flex-wrap justify-center gap-3">
        <a href={prepared.url} download={prepared.file.name} className={buttonClass}><Download size={18} />Save Image</a>
        {canShare && <button onClick={share} disabled={busy} className={buttonClass}><Share2 size={18} />Share to Apps</button>}
      </div>
      <p className="text-sm text-gray-600">{canShare ? 'Choose WhatsApp, Instagram or Facebook if available in your device share menu. You can also save the image for later.' : 'Save the image, then attach it to a WhatsApp message or an Instagram or Facebook post.'}</p>
    </div>}
    {message && <p role="status" className="text-brand-800">{message}</p>}
  </section>;
}
