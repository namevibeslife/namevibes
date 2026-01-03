import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Sparkles, Users, Calendar, LogOut, Settings } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  };

  const renewalDate = userProfile?.renewalDate?.toDate();
  const formattedRenewalDate = renewalDate ? renewalDate.toLocaleDateString() : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              NameVibes
            </h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            👋 Welcome, {userProfile?.fullName}!
          </h2>
          {userProfile?.planType && (
            <div className="space-y-2">
              <p className="text-gray-600">
                <strong>Plan:</strong> {userProfile.planType.charAt(0).toUpperCase() + userProfile.planType.slice(1)} Yearly
                {userProfile.planActive && <span className="ml-2 text-green-600">(Renews: {formattedRenewalDate})</span>}
              </p>
              <p className="text-gray-600">
                <strong>Analyses Used:</strong> 0/8 this month
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/analyze')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            <Sparkles className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Analyze New Name</h3>
            <p className="text-purple-100 text-sm">Discover the chemistry in any name</p>
          </button>

          {userProfile?.planType === 'family' && (
            <button
              onClick={() => navigate('/family')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Users className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">Family Package</h3>
              <p className="text-blue-100 text-sm">Analyze up to 50 names together</p>
            </button>
          )}

          {!userProfile?.planType && (
            <button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Calendar className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">Upgrade Plan</h3>
              <p className="text-green-100 text-sm">Get unlimited access</p>
            </button>
          )}

          {/* Settings Button - Always visible */}
          <button
            onClick={() => navigate('/settings')}
            className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            <Settings className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Settings</h3>
            <p className="text-gray-100 text-sm">Account & app settings</p>
          </button>
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Recent Analyses</h3>
          <div className="text-center py-12 text-gray-500">
            <p>No analyses yet. Start by analyzing a name!</p>
          </div>
        </div>
      </div>
    </div>
  );
}