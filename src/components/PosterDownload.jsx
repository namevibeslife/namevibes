import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { planFeatures } from '../utils/plan';
import ChemistryPoster from './ChemistryPoster';
import { isComplexLanguage } from '../i18n/posterFont';
import { useTranslation } from 'react-i18next';

export default function PosterDownload({ person, people, family: requestedFamily = false, showPreparedPreview = false }) {
  const { t } = useTranslation();
  const profile = useAuthStore(state => state.profile);
  const features = planFeatures(profile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [prepared, setPrepared] = useState(null);
  const [theme, setTheme] = useState('gold');
  const version = useRef(0);
  const readyPanel = useRef(null);
  const list = people || [person];
  const family = requestedFamily && list.length > 1;
  const identity = JSON.stringify(list);
  useEffect(() => {
    version.current += 1; setPrepared(null); setMessage(''); setBusy(false);
    return () => { version.current += 1; };
  }, [identity, theme]);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);
  useEffect(() => { if (prepared) readyPanel.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [prepared]);
  async function download() {
    setBusy(true); setMessage('');
    try {
      const { buildPosterPDF, loadPosterLogo, loadPosterArtwork } = await import('../utils/posterReport');
      const [logo, artwork] = await Promise.all([loadPosterLogo(theme).catch(() => null), loadPosterArtwork(theme).catch(() => null)]);
      const name = family ? 'Namasutra_Family_Posters.pdf' : 'Namasutra_Elemental_Profile.pdf';
      if (isComplexLanguage()) (await (await import('../utils/posterPdfImage')).buildPosterImagePDF(list, { theme, family })).save(name);
      else buildPosterPDF(list, { theme, logo, artwork, family }).save(name);
    } catch { setMessage(t('download.pdfFailed')); }
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
    } catch { if (request === version.current) setMessage(t('download.prepareFailed')); }
    finally { if (request === version.current) setBusy(false); }
  }
  async function share() {
    setBusy(true); setMessage('');
    try {
      // The ready-file button preserves the user gesture required by mobile sharing.
      await navigator.share({ files: [prepared.file], title: family ? t('download.shareTitleFamily') : t('download.shareTitleSingle') });
    } catch (error) {
      if (error.name !== 'AbortError') setMessage(t('download.shareUnavailable'));
    } finally { setBusy(false); }
  }
  let canShare = false;
  try { canShare = Boolean(prepared && navigator.share && navigator.canShare?.({ files: [prepared.file] })); } catch { /* Save Image remains available. */ }
  const buttonClass = 'inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50';
  return <section className="text-center mb-6 space-y-3" aria-label={t('download.aria')}>
    <h3 className="text-2xl text-brand-800">{family ? t('download.titleFamily') : t('download.titleSingle')}</h3>
    <fieldset className="flex flex-wrap justify-center items-center gap-3">
      <legend className="text-sm text-gray-700 mb-2">{t('download.styleLegend')}</legend>
      {['gold', 'dark'].map(value => <label key={value} className="inline-flex items-center gap-2 px-5 py-2 border border-brand-300 rounded-full cursor-pointer">
        <input type="radio" name={`poster-theme-${family ? 'family' : 'individual'}`} value={value} checked={theme === value} disabled={busy} onChange={() => setTheme(value)} />
        {value === 'gold' ? t('download.golden') : t('download.dark')}
      </label>)}
    </fieldset>
    <div className="max-w-4xl mx-auto" aria-live="polite">
      <ChemistryPoster people={list} family={family} theme={theme} minimal />
    </div>
    {features && <div className="flex flex-wrap justify-center gap-3">
      <button onClick={prepare} disabled={busy} className={buttonClass}><Share2 size={18} />{busy ? t('download.preparing') : t('download.saveShare')}</button>
      {features.pdfDownload && <button onClick={download} disabled={busy} className={buttonClass}><Download size={18} />{t('download.pdf')}</button>}
    </div>}
    <p className="text-sm text-gray-600">{family ? t('download.hintFamily') : t('download.hintSingle')}</p>
    {prepared && features && <div className="space-y-3" ref={readyPanel}>
      <p role="status" className="font-semibold text-brand-800">{t('download.ready')}</p>
      {showPreparedPreview && <img src={prepared.url} alt={family ? t('download.altFamily') : t('download.altSingle', { name: list[0].fullName })} className="max-h-96 max-w-full mx-auto rounded-lg" />}
      <div className="flex flex-wrap justify-center gap-3">
        <a href={prepared.url} download={prepared.file.name} className={buttonClass}><Download size={18} />{t('download.saveImage')}</a>
        {canShare && <button onClick={share} disabled={busy} className={buttonClass}><Share2 size={18} />{t('download.shareApps')}</button>}
      </div>
      <p className="text-sm text-gray-600">{canShare ? t('download.shareHint') : t('download.saveHint')}</p>
    </div>}
    {message && <p role="status" className="text-brand-800">{message}</p>}
  </section>;
}
