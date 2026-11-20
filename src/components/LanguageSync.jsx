import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { isSupported, savedLanguage, setLanguage } from '../i18n';
import { saveLanguageToProfile } from '../i18n/profileLanguage';

// Keeps the profile and this device in step: a device with no saved choice takes the signed-in
// user's profile language; a saved local choice is written back to the profile.
export default function LanguageSync() {
  const profile = useAuthStore(s => s.profile);
  const uid = useAuthStore(s => s.user?.uid);
  useEffect(() => {
    if (!uid || !profile) return;
    const local = savedLanguage();
    if (!local && isSupported(profile.language)) setLanguage(profile.language);
    else if (local && profile.language !== local) saveLanguageToProfile(local);
  }, [uid, profile?.language, Boolean(profile)]);
  return null;
}
