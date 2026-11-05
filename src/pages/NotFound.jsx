import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen site-background flex items-center justify-center px-4">
      <div className="bg-paper rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl font-bold text-brand-600 mb-2">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">This element isn't on our periodic table.</p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-3 rounded-lg font-semibold hover:from-brand-700 hover:to-ocean-700 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
