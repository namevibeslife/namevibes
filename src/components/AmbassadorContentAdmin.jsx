import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { setAmbassadorAccess } from '../utils/referralCodeAdmin';

// Admin -> Ambassadors -> "Ambassador Home content". Loaded lazily by AdminDashboard, so the
// default copy (imported dynamically below) only ever ships in an admin chunk.
//
// The document ambassadorContent/home holds structured fields:
//   { brand, title, intro: [para], sections: [{ heading, paragraphs[], bullets[{label?, text}], callout?, after[] }], tagline }
const area = 'w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none';

// Editor text <-> structured fields. Paragraphs are separated by a blank line; bullets are one per
// line, written "Label | text" (label optional).
const toParas = (text) => String(text || '').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);
const fromParas = (list) => (list || []).join('\n\n');
const toBullets = (text) => String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const i = l.indexOf(' | ');
  return i > 0 ? { label: l.slice(0, i).trim(), text: l.slice(i + 3).trim() } : { text: l };
});
const fromBullets = (list) => (list || []).map(b => (b.label ? `${b.label} | ${b.text}` : b.text)).join('\n');

function toEditable(content) {
  return {
    brand: content.brand || '',
    title: content.title || '',
    intro: fromParas(content.intro),
    tagline: content.tagline || '',
    sections: (content.sections || []).map(s => ({
      heading: s.heading || '', paragraphs: fromParas(s.paragraphs), bullets: fromBullets(s.bullets),
      callout: s.callout || '', after: fromParas(s.after)
    }))
  };
}

function toDocument(form) {
  const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => !(Array.isArray(v) ? v.length === 0 : v === '')));
  return {
    brand: form.brand.trim(), title: form.title.trim(), intro: toParas(form.intro), tagline: form.tagline.trim(),
    sections: form.sections.map(s => clean({
      heading: s.heading.trim(), paragraphs: toParas(s.paragraphs), bullets: toBullets(s.bullets),
      callout: s.callout.trim(), after: toParas(s.after)
    }))
  };
}

// The packaged default text, converted to the Firestore shape.
async function loadDefaultDocument() {
  const { AMBASSADOR_COPY: c } = await import('../data/ambassadorCopy');
  const bullet = (b) => (Array.isArray(b) ? { label: b[0], text: b[1] } : { text: b });
  return {
    brand: c.brand, title: c.title, intro: c.intro, tagline: c.tagline,
    sections: c.sections.map(s => ({
      heading: s.heading,
      ...(s.paragraphs ? { paragraphs: s.paragraphs } : {}),
      ...(s.bullets ? { bullets: s.bullets.map(bullet) } : {}),
      ...(s.callout ? { callout: s.callout } : {}),
      ...(s.after ? { after: s.after } : {})
    }))
  };
}

export default function AmbassadorContentAdmin({ currentAdmin }) {
  const [form, setForm] = useState(null);
  const [exists, setExists] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const snap = await getDoc(doc(db, 'ambassadorContent', 'home'));
      setExists(snap.exists());
      setForm(snap.exists() ? toEditable(snap.data()) : null);
    } catch (e) {
      setMessage('Could not load the content: ' + e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (document, label) => {
    setBusy(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'ambassadorContent', 'home'), { ...document, updatedAt: Timestamp.now(), updatedBy: currentAdmin?.email || '' });
      setMessage(label);
      await load();
    } catch (e) {
      setMessage('Could not save: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const publishDefault = async () => {
    if (exists && !window.confirm('This replaces the current Ambassador Home content with the default text. Continue?')) return;
    await save(await loadDefaultDocument(), 'Default content published.');
  };

  // Rules cannot look an ambassador up by email, so each approved ambassador has a mirror document
  // ambassadorAccess/{email}. New invites/approvals/deactivations keep it current; this backfills
  // ambassadors that existed before it.
  const syncAccess = async () => {
    setBusy(true);
    setMessage('');
    try {
      const snap = await getDocs(collection(db, 'ambassadors'));
      let n = 0;
      for (const d of snap.docs) {
        const a = d.data();
        if (a.isApproved && a.email) { await setAmbassadorAccess(a.email, d.id, !!a.isActive); n += 1; }
      }
      setMessage(`Access list synced for ${n} ambassador${n === 1 ? '' : 's'}.`);
    } catch (e) {
      setMessage('Could not sync: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setSection = (i, key, value) => setForm(f => ({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }));
  const btn = 'px-4 py-2 min-h-[44px] rounded-lg font-semibold text-sm disabled:opacity-50';

  return (
    <div className="bg-paper rounded-xl shadow-lg p-6 mb-6 border-2 border-brand-200">
      <h3 className="text-lg font-bold text-gray-800 mb-1">Ambassador Home content</h3>
      <p className="text-sm text-gray-600 mb-4">
        The text on the ambassadors' Home tab. It is stored in the database and shown only to signed-in, approved ambassadors.
        {exists === false && ' Nothing is published yet, so ambassadors currently see an empty Home tab.'}
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <button type="button" disabled={busy} onClick={publishDefault} className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>Publish default content</button>
        <button type="button" disabled={busy} onClick={syncAccess} className={`${btn} bg-ocean-100 text-ocean-800 hover:bg-ocean-200`}>Sync ambassador access list</button>
      </div>
      {message && <p role="status" className="text-sm text-gray-800 mb-4">{message}</p>}

      {form && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">Brand
              <input className={area} value={form.brand} onChange={e => setField('brand', e.target.value)} /></label>
            <label className="text-sm font-medium text-gray-700">Title
              <input className={area} value={form.title} onChange={e => setField('title', e.target.value)} /></label>
          </div>
          <label className="block text-sm font-medium text-gray-700">Opening paragraphs (blank line between paragraphs)
            <textarea className={area} rows={6} value={form.intro} onChange={e => setField('intro', e.target.value)} /></label>

          {form.sections.map((s, i) => (
            <fieldset key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
              <legend className="px-1 text-sm font-bold text-gray-700">Section {i + 1}</legend>
              <label className="block text-sm font-medium text-gray-700">Heading
                <input className={area} value={s.heading} onChange={e => setSection(i, 'heading', e.target.value)} /></label>
              <label className="block text-sm font-medium text-gray-700">Paragraphs
                <textarea className={area} rows={3} value={s.paragraphs} onChange={e => setSection(i, 'paragraphs', e.target.value)} /></label>
              <label className="block text-sm font-medium text-gray-700">Bullets (one per line; "Label | text" for a bold label)
                <textarea className={area} rows={4} value={s.bullets} onChange={e => setSection(i, 'bullets', e.target.value)} /></label>
              <label className="block text-sm font-medium text-gray-700">Highlighted line (optional)
                <input className={area} value={s.callout} onChange={e => setSection(i, 'callout', e.target.value)} /></label>
              <label className="block text-sm font-medium text-gray-700">Paragraphs after the bullets
                <textarea className={area} rows={3} value={s.after} onChange={e => setSection(i, 'after', e.target.value)} /></label>
              <button type="button" className="text-sm text-red-700 hover:underline min-h-[44px]"
                onClick={() => setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))}>Remove section</button>
            </fieldset>
          ))}
          <button type="button" className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`}
            onClick={() => setForm(f => ({ ...f, sections: [...f.sections, { heading: '', paragraphs: '', bullets: '', callout: '', after: '' }] }))}>Add section</button>

          <label className="block text-sm font-medium text-gray-700">Closing line
            <input className={area} value={form.tagline} onChange={e => setField('tagline', e.target.value)} /></label>

          <button type="button" disabled={busy} onClick={() => save(toDocument(form), 'Content saved.')} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Save changes</button>
        </div>
      )}
    </div>
  );
}
