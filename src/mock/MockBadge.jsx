import React, { useState } from 'react';
import { resetMockDatabase } from './firestore';
import { useAuthStore } from '../store/authStore';

// Floating badge shown only in mock mode: who is signed in, plus a data reset
export default function MockBadge() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    if (!confirm('Reset all mock data back to the seeded test data?')) return;
    resetMockDatabase();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="fixed bottom-3 left-3 z-[9999] text-xs">
      {open && (
        <div className="mb-2 bg-white border-2 border-amber-400 rounded-lg shadow-lg p-3 w-60">
          <div className="font-bold text-amber-700 mb-1">Mock mode</div>
          <div className="text-gray-700 mb-2">
            No real Firebase, Google sign-in or payments. Data is stored in this browser only.
          </div>
          <div className="text-gray-700 mb-3">
            Signed in as: <strong>{user?.email || 'nobody'}</strong>
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 rounded"
          >
            Reset mock data
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-3 py-1.5 rounded-full shadow"
      >
        MOCK
      </button>
    </div>
  );
}
