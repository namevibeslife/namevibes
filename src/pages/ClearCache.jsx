import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function ClearCache() {
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleClearAll = async () => {
    setClearing(true);
    
    try {
      // 1. Sign out from Firebase
      await signOut(auth);
      
      // 2. Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Clear IndexedDB (Firebase cache)
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      }
      
      // 4. Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      alert('✅ All cache cleared! The page will reload.');
      
      // 5. Hard reload
      window.location.href = '/';
      
    } catch (error) {
      console.error('Clear error:', error);
      alert('Error: ' + error.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-orange-600 to-red-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔥</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Clear All Cache
          </h1>
          <p className="text-gray-600">Reset Firebase auth and browser storage</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>⚠️ Warning:</strong> This will:
          </p>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>Sign you out completely</li>
            <li>Clear all local storage</li>
            <li>Clear all session data</li>
            <li>Clear Firebase IndexedDB</li>
            <li>Clear all cookies</li>
            <li>Reload the page</li>
          </ul>
        </div>

        {auth.currentUser && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Currently signed in:</strong><br />
              {auth.currentUser.email}
            </p>
          </div>
        )}

        <button
          onClick={handleClearAll}
          disabled={clearing}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 mb-4"
        >
          {clearing ? '🔄 Clearing...' : '🔥 Clear All & Reset'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Cancel
        </button>
      </div>
    </div>
  );
}