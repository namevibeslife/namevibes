import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  LogOut,
  UserCheck,
  Globe,
  MapPin
} from 'lucide-react';

export default function AmbassadorDashboard() {
  const navigate = useNavigate();
  const [ambassador, setAmbassador] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalReferrals: 0,
    totalRevenue: 0,
    byCountry: {},
    byState: {},
    byMonth: {},
    byGender: { Male: 0, Female: 0, Other: 0 },
    byPackage: { individual: 0, family: 0 },
    renewalAlerts: []
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    year: new Date().getFullYear(),
    month: 'all'
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadAmbassadorData();
  }, []);

  useEffect(() => {
    if (ambassador) {
      loadAnalytics();
    }
  }, [ambassador, filter]);

  const loadAmbassadorData = async () => {
    try {
      // Check session storage instead of Firebase Auth
      const ambassadorId = sessionStorage.getItem('ambassadorId');
      const ambassadorEmail = sessionStorage.getItem('ambassadorEmail');

      if (!ambassadorId || !ambassadorEmail) {
        navigate('/ambassador');
        return;
      }

      // Get ambassador from Firestore
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', ambassadorId));
      
      if (!ambassadorDoc.exists()) {
        alert('Ambassador account not found');
        sessionStorage.clear();
        navigate('/ambassador');
        return;
      }

      const ambassadorData = { id: ambassadorDoc.id, ...ambassadorDoc.data() };

      if (!ambassadorData.isApproved || !ambassadorData.isActive) {
        alert('Your ambassador account is not active yet. Please wait for admin approval.');
        sessionStorage.clear();
        navigate('/ambassador');
        return;
      }

      setAmbassador(ambassadorData);
    } catch (error) {
      console.error('Error loading ambassador:', error);
      alert('Error loading ambassador data');
    }
  };

  const loadAnalytics = async () => {
    if (!ambassador?.referralCode) return;

    setLoading(true);
    try {
      // Get all users who used this referral code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralUsed', '==', ambassador.referralCode));
      const usersSnapshot = await getDocs(q);

      const stats = {
        totalReferrals: 0,
        totalRevenue: 0,
        byCountry: {},
        byState: {},
        byMonth: {},
        byGender: { Male: 0, Female: 0, Other: 0 },
        byPackage: { individual: 0, family: 0 },
        renewalAlerts: []
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      usersSnapshot.docs.forEach(doc => {
        const user = doc.data();

        // Apply filters
        const userDate = user.paidAt?.toDate();
        if (filter.year !== 'all' && userDate?.getFullYear() !== parseInt(filter.year)) {
          return;
        }
        if (filter.month !== 'all' && userDate?.getMonth() !== parseInt(filter.month)) {
          return;
        }

        stats.totalReferrals++;
        stats.totalRevenue += user.paidAmount || 0;

        // By country
        const country = user.countryName || 'Unknown';
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;

        // By state
        const state = user.stateName || 'Unknown';
        stats.byState[state] = (stats.byState[state] || 0) + 1;

        // By month
        if (userDate) {
          const monthYear = `${months[userDate.getMonth()]} ${userDate.getFullYear()}`;
          stats.byMonth[monthYear] = (stats.byMonth[monthYear] || 0) + 1;
        }

        // By gender
        const gender = user.gender || 'Other';
        stats.byGender[gender] = (stats.byGender[gender] || 0) + 1;

        // By package
        if (user.planType) {
          stats.byPackage[user.planType] = (stats.byPackage[user.planType] || 0) + 1;
        }

        // Renewal alerts (30 days before expiry)
        if (user.planExpiry) {
          const expiryDate = user.planExpiry.toDate();
          if (expiryDate > now && expiryDate < thirtyDaysFromNow) {
            stats.renewalAlerts.push({
              name: user.firstName || 'User',
              expiry: expiryDate,
              daysLeft: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
            });
          }
        }
      });

      setAnalytics(stats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      navigate('/ambassador');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const calculateCommission = () => {
    if (!ambassador) return 0;
    return (
      (analytics.byPackage.individual || 0) * (ambassador.commissionRateIndividual || 0) +
      (analytics.byPackage.family || 0) * (ambassador.commissionRateFamily || 0)
    );
  };

  if (loading && !ambassador) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Ambassador Dashboard</h1>
              <p className="text-xs text-gray-500">{ambassador?.fullName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Referral Code Card */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Your Referral Code</h2>
          <div className="text-5xl font-bold tracking-wider mb-4">
            {ambassador?.referralCode || 'N/A'}
          </div>
          <p className="text-purple-100">Share this code with your network to earn commissions!</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Filters</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={filter.year}
                onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Years</option>
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Months</option>
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Referrals</p>
                <p className="text-3xl font-bold text-gray-800">{analytics.totalReferrals}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-800">₹{analytics.totalRevenue}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your Commission</p>
                <p className="text-3xl font-bold text-gray-800">₹{calculateCommission()}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Renewals Due</p>
                <p className="text-3xl font-bold text-gray-800">{analytics.renewalAlerts.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* By Country */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-800">By Country</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.byCountry).length > 0 ? (
                Object.entries(analytics.byCountry).map(([country, count]) => (
                  <div key={country} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">{country}</span>
                    <span className="font-bold text-purple-600">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No data available</p>
              )}
            </div>
          </div>

          {/* By State */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-800">By State</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.byState).length > 0 ? (
                Object.entries(analytics.byState).map(([state, count]) => (
                  <div key={state} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">{state}</span>
                    <span className="font-bold text-purple-600">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No data available</p>
              )}
            </div>
          </div>

          {/* By Gender */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">By Gender</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Male</span>
                <span className="font-bold text-blue-600">{analytics.byGender.Male}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Female</span>
                <span className="font-bold text-pink-600">{analytics.byGender.Female}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Other</span>
                <span className="font-bold text-purple-600">{analytics.byGender.Other}</span>
              </div>
            </div>
          </div>

          {/* By Package */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">By Package</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Individual</span>
                <span className="font-bold text-green-600">{analytics.byPackage.individual}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">Family</span>
                <span className="font-bold text-orange-600">{analytics.byPackage.family}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Renewal Alerts */}
        {analytics.renewalAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Upcoming Renewals (Next 30 Days)</h3>
            <div className="space-y-2">
              {analytics.renewalAlerts.map((alert, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="font-medium text-gray-800">{alert.name}</span>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      Expires: {alert.expiry.toLocaleDateString()}
                    </span>
                    <span className="ml-4 text-sm font-bold text-orange-600">
                      {alert.daysLeft} days left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month-wise Breakdown */}
        {Object.keys(analytics.byMonth).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Month-wise Sign-ups</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(analytics.byMonth).map(([month, count]) => (
                <div key={month} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">{month}</p>
                  <p className="text-2xl font-bold text-purple-600">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}