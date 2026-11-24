import { useEffect } from 'react';
import { LANGUAGE_PICKER_ENABLED } from '../config/site';
import { useAuthStore } from '../store/authStore';
import { isSupported, savedLanguage, setLanguage } from '../i18n';
import { saveLanguageToProfile } from '../i18n/profileLanguage';

// Keeps the profile and this device in step: a device with no saved choice takes the signed-in
// user's profile language; a saved local choice is written back to the profile.
export default function LanguageSync() {
  const profile = useAuthStore(s => s.profile);
  const uid = useAuthStore(s => s.user?.uid);
  useEffect(() => {
    if (!LANGUAGE_PICKER_ENABLED || !uid || !profile) return; // picker off: the site stays English, the profile is left alone
    const local = savedLanguage();
    if (!local && isSupported(profile.language)) setLanguage(profile.language);
    else if (local && profile.language !== local) saveLanguageToProfile(local);
  }, [uid, profile?.language, Boolean(profile)]);
  return null;
}
