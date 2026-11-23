// Cart convenience: items live in merch_carts/{uid} so they follow the customer across devices.
// It is NOT trusted: the server re-validates every line and recomputes every price at quote time.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function loadCart(uid) {
  try {
    const snap = await getDoc(doc(db, 'merch_carts', uid));
    return snap.exists() ? snap.data().items || [] : [];
  } catch { return []; }
}

export async function saveCart(uid, items) {
  await setDoc(doc(db, 'merch_carts', uid), { uid, items, updatedAt: new Date() });
}

export const newLineId = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
