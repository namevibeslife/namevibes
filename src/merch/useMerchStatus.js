// Whether this visitor may see merchandise at all (server setting "Merchandise visible to": Nobody / Admins only / Everyone).
// The answer comes from the server (action "visibility"); a 404 means "does not exist for you", so nothing in the UI hints at it.
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { callMerch } from './client';

const cache = new Map(); // uid -> promise of status, so the menu and the page gate share one request
export const HIDDEN = { loading: false, visible: false, admin: false, sandbox: false, paymentsSimulated: false };

export function resetMerchStatus() { cache.clear(); }

export function useMerchStatus() {
  const { user, loading: authLoading } = useAuthStore();
  const [status, setStatus] = useState({ ...HIDDEN, loading: true });
  const key = user?.uid || 'anon';
  useEffect(() => {
    if (authLoading) { setStatus({ ...HIDDEN, loading: true }); return undefined; }
    let live = true;
    if (!cache.has(key)) {
      cache.set(key, callMerch('visibility', {}).then((r) => (r.status === 200 && r.body?.visible
        ? { loading: false, visible: true, admin: r.body.admin === true, sandbox: r.body.sandbox === true, paymentsSimulated: r.body.paymentsSimulated === true }
        : HIDDEN)).catch(() => { cache.delete(key); return HIDDEN; }));
    }
    cache.get(key).then((s) => { if (live) setStatus(s); });
    return () => { live = false; };
  }, [key, authLoading]);
  return status;
}
