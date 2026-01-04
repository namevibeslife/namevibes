import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserCheck, ArrowLeft } from 'lucide-react';

export default function AmbassadorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

 const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login for:', email);
      
      // Check ambassadors collection
      const ambassadorsRef = collection(db, 'ambassadors');
      const q = query(ambassadorsRef, where('email', '==', email));
      
      const snapshot = await getDocs(q);
      
      console.log('Query results:', snapshot.size);

      if (snapshot.empty) {
        setError('Ambassador account not found. Please contact admin.');
        setLoading(false);
        return;
      }

      const ambassadorDoc = snapshot.docs[0];
      const ambassador = ambassadorDoc.data();
      
      console.log('Ambassador found:', ambassador.fullName);
      console.log('Is approved:', ambassador.isApproved);
      console.log('Is active:', ambassador.isActive);

      if (!ambassador.isApproved) {
        setError('Your account is pending approval.');
        setLoading(false);
        return;
      }

      if (!ambassador.isActive) {
        setError('Your account has been deactivated. Please contact admin.');
        setLoading(false);
        return;
      }

      // Check password
      if (!ambassador.password) {
        setError('Password not set. Please contact admin.');
        setLoading(false);
        return;
      }

      if (ambassador.password !== password) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Store ambassador session
      sessionStorage.setItem('ambassadorId', ambassadorDoc.id);
      sessionStorage.setItem('ambassadorEmail', ambassador.email);
      sessionStorage.setItem('ambassadorName', ambassador.fullName);
      
      console.log('Login successful, redirecting...');
      navigate('/ambassador/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed: ' + error.message);
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="ambassador@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Want to become an ambassador?{' '}
            <button
              onClick={() => navigate('/ambassador/register')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Apply here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}