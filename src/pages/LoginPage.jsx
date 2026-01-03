import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // User has paid? Go to dashboard
        if (userData.planType) {
          navigate('/dashboard');
        } 
        // User completed profile but no plan? Go to pricing
        else if (userData.profileComplete) {
          navigate('/pricing');
        } 
        // User didn't complete profile? Go to profile
        else {
          navigate('/profile-complete');
        }
      } else {
        // Brand new user
        navigate('/profile-complete');
      }
    } catch (error) {
      alert('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            NameVibes
          </h1>
          <p className="text-gray-600">Discover the chemistry in your name</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/')} className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}