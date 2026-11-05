import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { planFeatures } from '../utils/plan';

export default function PosterDownload({ person }) {
  const profile = useAuthStore(state => state.profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!planFeatures(profile)?.pdfDownload) return null;
  async function download() {
    setBusy(true); setError('');
    try {
      const { buildPosterPDF } = await import('../utils/posterReport');
      buildPosterPDF([person]).save('NameVibes_Elemental_Profile.pdf');
    } catch { setError('The poster could not be downloaded. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="text-center mb-6">
    <button onClick={download} disabled={busy} className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"><Download size={18} />{busy ? 'Preparing poster…' : 'Download Poster PDF'}</button>
    {error && <p role="alert" className="text-red-700 mt-2">{error}</p>}
  </div>;
}
