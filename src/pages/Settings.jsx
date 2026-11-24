import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import LanguagePicker from '../components/LanguagePicker';
import { LANGUAGE_PICKER_ENABLED } from '../config/site';
import { Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleSignOutAllDevices = async () => {
    if (!confirm(t('settings.confirmSignOutAll'))) {
      return;
    }

    setClearing(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
      
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      
      await signOut(auth);
      
      alert(t('settings.signedOutAll'));
      
      window.location.href = '/';
      
    } catch (error) {
      console.error('Clear error:', error);
      alert(t('errors.clearCache'));
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen site-background">

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="bg-paper rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('settings.title')}</h2>
          
          <div className="space-y-4">
            {LANGUAGE_PICKER_ENABLED && <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('nav.language')}</h3>
              <LanguagePicker />
            </div>}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">{t('settings.email')}</p>
              <p className="text-lg font-semibold text-gray-800">{auth.currentUser?.email}</p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('settings.signOut')}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {t('settings.signOutDeviceHint')}
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                <LogOut size={18} />
                {t('settings.signOutDevice')}
              </button>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('settings.clearTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {t('settings.clearHint')}
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      {t('settings.warning')}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {t('settings.warningText')}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOutAllDevices}
                disabled={clearing}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                {clearing ? t('settings.clearing') : t('settings.clearTitle')}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('settings.about')}</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>{t('settings.app')}</strong> Namasutra</p>
            <p><strong>{t('settings.version')}</strong> 1.0.0</p>
            <p><strong>{t('settings.support')}</strong> support@namevibes.life</p>
          </div>
        </div>
      </div>
    </div>
  );
}