import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AmbassadorDetailsForm from './AmbassadorDetailsForm';
import AmbassadorProfileView from './AmbassadorProfileView';
import AmbassadorChangeLog, { addChangeLogEntry } from './AmbassadorChangeLog';
import { buildUpdate, diffProfile, fromAmbassador, fieldLabel } from '../utils/ambassadorProfile';
import { useTranslation } from 'react-i18next';

// Register tab. First time: the full form, then straight to Home. After that: the saved details,
// read-only, with an Edit button; saving an edit opens a pop-up listing only what changed.
export default function AmbassadorRegister({ ambassador, user, onSaved, notify, goHome }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { data, changes }
  const [logKey, setLogKey] = useState(0);
  const confirmRef = useRef(null);
  const completed = !!ambassador.detailsCompleted;
  const by = user?.email?.toLowerCase() || ambassador.email;

  useEffect(() => {
    if (!pending) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setPending(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending]);

  async function saveFirst(data) {
    setBusy(true);
    setError('');
    try {
      const update = buildUpdate(data, { first: true });
      await updateDoc(doc(db, 'ambassadors', ambassador.id), update);
      try { await addChangeLogEntry(ambassador.id, { by, type: 'submitted', summary: 'Details submitted', changes: [] }); }
      catch (e) { console.warn('History entry not written:', e.message); }
      onSaved({ ...ambassador, ...update });
      notify(t('ambassador.detailsSaved'));
      goHome();
    } catch (e) {
      console.error('Saving ambassador details failed:', e);
      setError(t('ambassador.saveFailed', { message: e.message }));
    } finally {
      setBusy(false);
    }
  }

  function reviewEdit(data) {
    setError('');
    const changes = diffProfile(fromAmbassador(ambassador, user), data);
    if (changes.length === 0) {
      notify(t('ambassador.noChanges'));
      setEditing(false);
      return;
    }
    setPending({ data, changes });
  }

  async function confirmEdit() {
    const { data, changes } = pending;
    setBusy(true);
    setError('');
    try {
      const update = buildUpdate(data);
      await updateDoc(doc(db, 'ambassadors', ambassador.id), update);
      try {
        await addChangeLogEntry(ambassador.id, { by, type: 'edit', summary: `Changed ${changes.map(c => c.label).join(', ')}`, changes });
      } catch (e) { console.warn('History entry not written:', e.message); }
      onSaved({ ...ambassador, ...update });
      setPending(null);
      setEditing(false);
      setLogKey(k => k + 1);
      notify(t('ambassador.changesSaved'));
    } catch (e) {
      console.error('Saving ambassador changes failed:', e);
      setPending(null);
      setError(t('ambassador.saveChangesFailed', { message: e.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-4xl mx-auto" aria-labelledby="register-heading">
      <h2 id="register-heading" className="font-serif text-3xl font-bold text-gray-900 text-center mb-2">{t('ambassador.myDetails')}</h2>
      <p className="text-center text-gray-600 mb-8">{t('ambassador.myDetailsHint')}</p>

      {error && <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {!completed ? (
        <AmbassadorDetailsForm initial={fromAmbassador(ambassador, user)} busy={busy} onSubmit={saveFirst} />
      ) : editing ? (
        <AmbassadorDetailsForm initial={fromAmbassador(ambassador, user)} submitLabel={t('ambassador.saveChanges')} busy={busy} onSubmit={reviewEdit} onCancel={() => setEditing(false)} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button type="button" onClick={() => setEditing(true)} className="px-5 py-2 min-h-[44px] rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">{t('common.edit')}</button>
          </div>
          <AmbassadorProfileView ambassador={ambassador} />
        </div>
      )}

      {completed && <div className="mt-8"><AmbassadorChangeLog ambassadorId={ambassador.id} refreshKey={logKey} /></div>}

      {pending && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPending(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-paper rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-title" className="font-serif text-xl font-bold text-gray-900 mb-3">{t('ambassador.confirmChanges')}</h3>
            <ul className="space-y-2 mb-5 text-sm">
              {pending.changes.map(c => (
                <li key={c.field} className="break-words"><span className="font-semibold">{fieldLabel(c.field)}:</span> {c.old} → {c.new}</li>
              ))}
            </ul>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button type="button" onClick={() => setPending(null)} disabled={busy} className="px-5 py-2 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">{t('common.cancel')}</button>
              <button type="button" ref={confirmRef} onClick={confirmEdit} disabled={busy} className="px-5 py-2 min-h-[44px] rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50">{busy ? t('profileComplete.saving') : t('ambassador.confirmButton')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
