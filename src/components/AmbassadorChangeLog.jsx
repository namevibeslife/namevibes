import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BANK_FIELDS } from '../utils/ambassadorProfile';

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const when = (v) => { const d = toDate(v); return d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''; };

// Append-only history: ambassadors/{id}/changeLog. Values in `changes` are already masked.
export async function addChangeLogEntry(ambassadorId, { by, type, summary, changes }) {
  await addDoc(collection(db, 'ambassadors', ambassadorId, 'changeLog'), {
    at: Timestamp.now(), by, type, summary, changes
  });
}

export async function loadChangeLog(ambassadorId) {
  const snap = await getDocs(query(collection(db, 'ambassadors', ambassadorId, 'changeLog'), orderBy('at', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Newest first: date, time, who, then "Changed X: old → new" for each field.
export default function AmbassadorChangeLog({ ambassadorId, refreshKey = 0 }) {
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChangeLog(ambassadorId)
      .then(list => { if (!cancelled) { setEntries(list); setFailed(false); } })
      .catch(() => { if (!cancelled) { setEntries([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, [ambassadorId, refreshKey]);

  return (
    <section aria-labelledby={`history-${ambassadorId}`} className="bg-paper rounded-xl shadow p-4">
      <h3 id={`history-${ambassadorId}`} className="font-serif text-xl font-bold text-gray-900 mb-3">Change history</h3>
      {entries === null ? <p className="text-sm text-gray-500">Loading...</p>
        : entries.length === 0 ? <p className="text-sm text-gray-500">{failed ? 'The history could not be loaded.' : 'No changes recorded yet.'}</p>
        : (
          <ol className="space-y-4 border-l-2 border-brand-200 pl-4">
            {entries.map(entry => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.45rem] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-500" aria-hidden="true" />
                <p className="text-xs text-gray-500">{when(entry.at)}{entry.by ? ` · ${entry.by}` : ''}</p>
                <p className="font-semibold text-gray-800">{entry.type === 'submitted' ? 'Details submitted' : entry.summary || 'Details changed'}</p>
                {(entry.changes || []).length > 0 && (
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {entry.changes.map((c, i) => <li key={i} className="break-words">Changed {c.label}: {c.old} → {c.new}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}

// Payout detail flag: shown when bank or payout fields were edited in the last 30 days.
export function BankChangeFlag({ ambassadorEmail }) {
  const [changedAt, setChangedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setChangedAt(null);
    if (!ambassadorEmail) return undefined;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'ambassadors'), where('email', '==', String(ambassadorEmail).toLowerCase())));
        if (snap.empty) return;
        const entries = await loadChangeLog(snap.docs[0].id);
        const since = Date.now() - 30 * 86400000;
        const hit = entries.find(e => e.type !== 'submitted' && toDate(e.at)?.getTime() >= since
          && (e.changes || []).some(c => BANK_FIELDS.includes(c.field)));
        if (hit && !cancelled) setChangedAt(toDate(hit.at));
      } catch { /* the flag is advisory; ignore if the history can't be read */ }
    })();
    return () => { cancelled = true; };
  }, [ambassadorEmail]);

  if (!changedAt) return null;
  return (
    <p role="status" className="my-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
      ⚠ Bank details changed on {changedAt.toLocaleDateString()}
    </p>
  );
}
