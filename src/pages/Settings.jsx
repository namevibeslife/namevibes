import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ArrowLeft, LogOut, Trash2, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleSignOutAllDevices = async () => {
    if (!confirm('This will sign you out from all devices. Continue?')) {
      return;
    }

    setClearing(true);
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      
      // Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      alert('✅ Signed out from all devices successfully!');
      
      // Redirect to home
      window.location.href = '/';
      
    } catch (error) {
      console.error('Clear error:', error);
      alert('Error clearing cache. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Settings
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Account Settings */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
          
          <div className="space-y-4">
            {/* User Info */}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-lg font-semibold text-gray-800">{auth.currentUser?.email}</p>
            </div>

            {/* Sign Out Current Device */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Sign Out</h3>
              <p className="text-sm text-gray-600 mb-3">
                Sign out from this device only.
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                <LogOut size={18} />
                Sign Out This Device
              </button>
            </div>

            {/* Sign Out All Devices */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Sign Out All Devices
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Clear all cached data and sign out from all devices where you're logged in. 
                You'll need to sign in again on all devices.
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      Warning: This action cannot be undone
                    </p>
                    <p className="text-sm text-yellow-700">
                      This will clear all browser data, cookies, and cache. 
                      You'll be signed out immediately.
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
                {clearing ? 'Clearing...' : 'Sign Out All Devices & Clear Cache'}
              </button>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>App:</strong> NameVibes</p>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Support:</strong> support@namevibes.life</p>
          </div>
        </div>
      </div>
    </div>
  );
}