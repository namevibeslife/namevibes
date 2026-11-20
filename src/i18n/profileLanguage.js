import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';

// Best effort: only for a signed-in user who already has a profile document (no new documents,
// no rule changes - users/{uid} owners may already update non-plan fields).
export async function saveLanguageToProfile(code) {
  const { user, profile } = useAuthStore.getState();
  if (!user || !profile || profile.language === code) return;
  try { await updateDoc(doc(db, 'users', user.uid), { language: code }); } catch { /* local choice still applies */ }
}
