import React, { useEffect, useState } from 'react';
import { Download, Share2, Image } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { planFeatures } from '../utils/plan';
import ChemistryPoster from './ChemistryPoster';

export default function PosterDownload({ person, people, family = false }) {
  const profile = useAuthStore(state => state.profile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(0);
  const [prepared, setPrepared] = useState(null);
  const [theme, setTheme] = useState('gold');
  const list = people || [person];
  const selectedPerson = list[selected] || list[0];
  const identity = JSON.stringify(selectedPerson);
  useEffect(() => { setPrepared(null); setMessage(''); }, [identity, theme]);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);
  if (!planFeatures(profile)?.pdfDownload) return null;
  async function download() {
    setBusy(true); setMessage('');
    try {
      const { buildPosterPDF } = await import('../utils/posterReport');
      buildPosterPDF(list, { theme }).save(family ? 'NameVibes_Family_Posters.pdf' : 'NameVibes_Elemental_Profile.pdf');
    } catch { setMessage('The PDF could not be downloaded. Please try again.'); }
    finally { setBusy(false); }
  }
  async function prepare() {
    setBusy(true); setMessage('');
    try {
      const { buildPosterImage } = await import('../utils/posterImage');
      const file = await buildPosterImage(selectedPerson, family, theme);
      setPrepared({ file, url: URL.createObjectURL(file) });
    } catch { setMessage('The image could not be prepared. Please try again.'); }
    finally { setBusy(false); }
  }
  async function share() {
    try {
      // Preparation is separate to preserve the gesture needed by native sharing.
      await navigator.share({ files: [prepared.file], title: 'My NameVibes', text: 'Discover the elements. Explore the connections. Feel your NameVibes.' });
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Sharing is unavailable. Save the PNG and upload it to Instagram or Facebook.');
    }
  }
  const canShare = prepared && navigator.share && navigator.canShare?.({ files: [prepared.file] });
  const buttonClass = 'inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50';
  return <section className="text-center mb-6 space-y-3" aria-label="Download and share your poster">
    <h3 className="text-2xl text-brand-800">Make it yours</h3>
    <fieldset className="flex flex-wrap justify-center items-center gap-3">
      <legend className="text-sm text-gray-700 mb-2">Preview your download style</legend>
      {['gold', 'dark'].map(value => <label key={value} className="inline-flex items-center gap-2 px-5 py-2 border border-brand-300 rounded-full cursor-pointer">
        <input type="radio" name={`poster-theme-${family ? 'family' : 'individual'}`} value={value} checked={theme === value} disabled={busy} onChange={() => setTheme(value)} />
        {value === 'gold' ? 'Golden' : 'Dark'}
      </label>)}
    </fieldset>
    <div className="max-w-2xl mx-auto" aria-live="polite">
      <ChemistryPoster people={[selectedPerson]} theme={theme} minimal />
    </div>
    <div className="flex flex-wrap justify-center gap-3">
      <button onClick={download} disabled={busy} className={buttonClass}><Download size={18} />Download Poster PDF</button>
      <button onClick={prepare} disabled={busy} className={buttonClass}><Image size={18} />{busy ? 'Preparing...' : 'Create Share Image'}</button>
    </div>
    {list.length > 1 && <label className="block text-sm text-gray-700">Name for share image
      <select disabled={busy} className="ml-2 max-w-full p-2 border border-brand-200 rounded-lg" value={selected} onChange={event => setSelected(Number(event.target.value))}>
        {list.map((item, i) => <option key={i} value={i}>{item.fullName}</option>)}
      </select>
    </label>}
    <p className="text-sm text-gray-600">Frame-ready PDFs with just your name and elements. Save a PNG for Instagram or Facebook.</p>
    {prepared && <div className="space-y-3">
      <img src={prepared.url} alt={`Share poster for ${selectedPerson.fullName}`} className="max-h-80 max-w-full mx-auto rounded-lg" />
      <div className="flex flex-wrap justify-center gap-3">
        <a href={prepared.url} download={prepared.file.name} className={buttonClass}><Download size={18} />Save PNG</a>
        {canShare && <button onClick={share} className={buttonClass}><Share2 size={18} />Share Image</button>}
      </div>
      <p className="text-sm text-gray-600">{canShare ? 'Choose Instagram or Facebook if available in your device share menu, or save the PNG and upload it.' : 'Save the PNG, then attach it to a new Instagram or Facebook post.'}</p>
    </div>}
    {message && <p role="status" className="text-brand-800">{message}</p>}
  </section>;
}
