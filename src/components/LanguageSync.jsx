import { useEffect } from 'react';
import { LANGUAGE_PICKER_ENABLED } from '../config/site';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';
import i18n, { isSupported, savedLanguage, setLanguage } from '../i18n';
import { isStaffRoute } from '../config/staffRoutes';
import { saveLanguageToProfile } from '../i18n/profileLanguage';

// Keeps the profile and this device in step: a device with no saved choice takes the signed-in
// user's profile language; a saved local choice is written back to the profile.
export default function LanguageSync() {
  const profile = useAuthStore(s => s.profile);
  const uid = useAuthStore(s => s.user?.uid);
  const staff = isStaffRoute(useLocation().pathname);
  // Staff screens: English for this visit only (not saved anywhere); the user's own language returns when they leave.
  useEffect(() => {
    if (!LANGUAGE_PICKER_ENABLED) return undefined;
    if (staff) {
      const before = i18n.language;
      if (before !== 'en') setLanguage('en', { persist: false });
      return () => { if (before && before !== 'en') setLanguage(before, { persist: false }); };
    }
    return undefined;
  }, [staff]);
  useEffect(() => {
    if (!LANGUAGE_PICKER_ENABLED || staff || !uid || !profile) return; // picker off: the site stays English, the profile is left alone
    const local = savedLanguage();
    if (!local && isSupported(profile.language)) setLanguage(profile.language);
    else if (local && profile.language !== local) saveLanguageToProfile(local);
  }, [uid, profile?.language, Boolean(profile), staff]);
  return null;
}
