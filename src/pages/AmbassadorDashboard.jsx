import React, { useState } from 'react';
import { TrendingUp, Users, DollarSign, Copy, Share2 } from 'lucide-react';

export default function AmbassadorDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // Mock login - in production, this would call Firebase Auth
    if (email && password) {
      setIsLoggedIn(true);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText('NV2024XYZ');
    alert('Referral code copied!');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Ambassador Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Login
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-600">
            Ambassadors receive login credentials after approval
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">Ambassador Panel</h1>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="text-gray-600 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            👋 Welcome, Ambassador!
          </h2>
          
          {/* Referral Code */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Referral Code</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-white rounded-lg p-4 font-mono text-3xl font-bold text-purple-600">
                NV2024XYZ
              </div>
              <button
                onClick={copyReferralCode}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Copy size={20} />
                Copy
              </button>
              <button className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2">
                <Share2 size={20} />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-600">Total Referrals</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">47</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-600">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">₹4,285</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-600">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">₹1,250</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-600">Paid Out</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">₹3,035</p>
          </div>
        </div>

        {/* Payout Settings */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Payout Settings</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Frequency
              </label>
              <select className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Payout Date
              </label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700">
                January 10, 2025
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            📊 Live Activity Feed
          </h3>
          
          <div className="space-y-4">
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">🟢 Raj Kumar</h4>
                  <p className="text-sm text-gray-600">Individual Plan</p>
                </div>
                <span className="text-xs text-gray-500">2 minutes ago</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm text-gray-600">Payment Received</p>
                  <p className="text-xl font-bold text-gray-800">₹89.10</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your Commission</p>
                  <p className="text-xl font-bold text-green-600">₹8.91</p>
                </div>
              </div>
            </div>

            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">🟢 Priya Sharma</h4>
                  <p className="text-sm text-gray-600">Family Package</p>
                </div>
                <span className="text-xs text-gray-500">15 minutes ago</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm text-gray-600">Payment Received</p>
                  <p className="text-xl font-bold text-gray-800">₹239.20</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your Commission</p>
                  <p className="text-xl font-bold text-green-600">₹47.84</p>
                </div>
              </div>
            </div>

            <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">🔴 Amit Patel</h4>
                  <p className="text-sm text-gray-600">Payment Pending</p>
                </div>
                <span className="text-xs text-gray-500">1 hour ago</span>
              </div>
              <p className="text-sm text-gray-600">Order created, awaiting payment confirmation...</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Note:</strong> All commissions are calculated on payment received after tax deductions 
            as per your country/state laws. Detailed breakdown available in Earnings Report section.
          </p>
        </div>
      </div>
    </div>
  );
}