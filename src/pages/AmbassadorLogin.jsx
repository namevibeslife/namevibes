import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { UserCheck, ArrowLeft } from 'lucide-react';

export default function AmbassadorLogin() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log('Google login successful for:', user.email);

      // Check if this email exists in ambassadors collection
      const ambassadorsRef = collection(db, 'ambassadors');
      const q = query(ambassadorsRef, where('email', '==', user.email));
      const snapshot = await getDocs(q);

      console.log('Ambassador query results:', snapshot.size);

      if (snapshot.empty) {
        setError('This email is not registered as an ambassador. Please apply first.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const ambassadorDoc = snapshot.docs[0];
      const ambassador = ambassadorDoc.data();

      console.log('Ambassador found:', ambassador.fullName);
      console.log('Is approved:', ambassador.isApproved);
      console.log('Is active:', ambassador.isActive);

      if (!ambassador.isApproved) {
        setError('Your application is pending admin approval. Please wait.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      if (!ambassador.isActive) {
        setError('Your account has been deactivated. Please contact admin.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Store ambassador session
      sessionStorage.setItem('ambassadorId', ambassadorDoc.id);
      sessionStorage.setItem('ambassadorEmail', ambassador.email);
      sessionStorage.setItem('ambassadorName', ambassador.fullName);
      
      console.log('Login successful, redirecting to dashboard...');
      navigate('/ambassador/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError('Login failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Ambassador Login</h1>
          <p className="text-gray-600 mt-2">Access your ambassador dashboard</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 font-semibold">
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Want to become an ambassador?{' '}
            <button
              onClick={() => navigate('/ambassador/register')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Apply here
            </button>
          </p>
          <p className="text-xs text-gray-500 mt-4">
            Use the same email you registered with to sign in
          </p>
        </div>
      </div>
    </div>
  );
}