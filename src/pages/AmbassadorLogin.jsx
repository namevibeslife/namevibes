import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { UserCheck, ArrowLeft } from 'lucide-react';
import { GoogleButton } from '../components/AuthButtons';

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
      const q = query(ambassadorsRef, where('email', '==', user.email.toLowerCase()));
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
      sessionStorage.setItem('ambassadorEmail', ambassador.email.toLowerCase());
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
    <div className="min-h-screen site-midnight flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Ambassador Login</h1>
          <p className="text-gray-600 mt-2">Access your ambassador dashboard</p>
        </div>

        <div className="space-y-4">
          <GoogleButton onClick={handleGoogleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </GoogleButton>

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
              className="text-brand-600 hover:text-brand-700 font-medium"
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
