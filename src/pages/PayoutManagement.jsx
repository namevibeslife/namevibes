import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, CheckCircle, Eye } from 'lucide-react';
import { COUNTRIES } from '../data/countries';

export default function PayoutManagement({ currentAdmin, ambassadors, canViewFeature }) {
  const [loading, setLoading] = useState(false);
  const [payoutsData, setPayoutsData] = useState([]);
  const [filter, setFilter] = useState({
    ambassadorId: 'all',
    country: 'all',
    month: 'all',
    year: 'all',
    status: 'all'
  });
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    paid: 0,
    total: 0
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026, 2027];

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const payoutsRef = collection(db, 'payouts');
      const snapshot = await getDocs(payoutsRef);
      
      const payoutsData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const payout = docSnap.data();
          
          // Get ambassador details
          const ambassadorDoc = await getDoc(doc(db, 'ambassadors', payout.ambassadorId));
          const ambassador = ambassadorDoc.data();
          
          return {
            id: docSnap.id,
            ...payout,
            ambassadorName: ambassador?.fullName || 'Unknown',
            ambassadorEmail: ambassador?.email || ''
          };
        })
      );
      
      setPayoutsData(payoutsData);
      
      // Calculate summary
      const summaryCalc = payoutsData.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + p.amount;
        acc.total += p.amount;
        return acc;
      }, { pending: 0, approved: 0, paid: 0, total: 0 });
      
      setSummary(summaryCalc);
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPayouts = () => {
    return payoutsData.filter(payout => {
      if (filter.ambassadorId !== 'all' && payout.ambassadorId !== filter.ambassadorId) return false;
      if (filter.country !== 'all' && payout.countryCode !== filter.country) return false;
      if (filter.month !== 'all' && payout.month !== parseInt(filter.month)) return false;
      if (filter.year !== 'all' && payout.year !== parseInt(filter.year)) return false;
      if (filter.status !== 'all' && payout.status !== filter.status) return false;
      return true;
    });
  };

  const handleApprovePayout = async (payout) => {
    if (!confirm(`Approve payout of ₹${payout.amount} for ${payout.ambassadorName}?`)) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'payouts', payout.id), {
        status: 'approved',
        approvedAt: Timestamp.now(),
        approvedBy: currentAdmin.email
      });
      
      // Add audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminEmail: currentAdmin.email,
        action: 'payout_approved',
        targetType: 'payout',
        targetId: payout.id,
        timestamp: Timestamp.now(),
        details: `Approved payout of ₹${payout.amount} for ${payout.ambassadorName}`
      });
      
      alert('Payout approved successfully!');
      loadPayouts();
    } catch (error) {
      console.error('Error approving payout:', error);
      alert('Error approving payout');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (payout) => {
    if (!confirm(`Mark payout of ₹${payout.amount} as PAID for ${payout.ambassadorName}?`)) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'payouts', payout.id), {
        status: 'paid',
        paidAt: Timestamp.now(),
        paidBy: currentAdmin.email
      });
      
      // Add audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminEmail: currentAdmin.email,
        action: 'payout_paid',
        targetType: 'payout',
        targetId: payout.id,
        timestamp: Timestamp.now(),
        details: `Marked payout of ₹${payout.amount} as paid for ${payout.ambassadorName}`
      });
      
      alert('Payout marked as paid!');
      loadPayouts();
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      alert('Error marking payout as paid');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payout) => {
    alert(`Payout Details:
Ambassador: ${payout.ambassadorName}
Email: ${payout.ambassadorEmail}
Period: ${months[payout.month - 1]} ${payout.year}
Referrals: ${payout.referralCount}
Total Sales: ₹${payout.totalSales}
Commission: ₹${payout.amount}
Status: ${payout.status}
${payout.approvedAt ? `Approved: ${payout.approvedAt.toDate().toLocaleDateString()}` : ''}
${payout.paidAt ? `Paid: ${payout.paidAt.toDate().toLocaleDateString()}` : ''}`);
  };

  if (!canViewFeature('payments')) {
    return (
      <div className="p-12 text-center text-gray-500">
        You don't have permission to view payouts
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payout Management</h2>
        <button
          onClick={loadPayouts}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ambassador</label>
            <select
              value={filter.ambassadorId}
              onChange={(e) => setFilter({...filter, ambassadorId: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="all">All Ambassadors</option>
              {ambassadors.filter(a => a.isApproved).map(amb => (
                <option key={amb.id} value={amb.id}>{amb.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              value={filter.country}
              onChange={(e) => setFilter({...filter, country: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="all">All Countries</option>
              {Object.values(COUNTRIES).map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={filter.month}
              onChange={(e) => setFilter({...filter, month: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="all">All Months</option>
              {months.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={filter.year}
              onChange={(e) => setFilter({...filter, year: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-gray-800">₹{summary.pending.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-3xl font-bold text-gray-800">₹{summary.approved.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Paid</p>
          <p className="text-3xl font-bold text-gray-800">₹{summary.paid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-800">₹{summary.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ambassador</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getFilteredPayouts().map(payout => (
              <tr key={payout.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payout.ambassadorName}</p>
                    <p className="text-xs text-gray-500">{payout.ambassadorEmail}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {months[payout.month - 1]} {payout.year}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{payout.referralCount}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{payout.totalSales}</td>
                <td className="px-6 py-4 text-sm font-bold text-green-600">₹{payout.amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    payout.status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : payout.status === 'approved'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payout.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {payout.status === 'pending' && (
                      <button
                        onClick={() => handleApprovePayout(payout)}
                        disabled={loading}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {payout.status === 'approved' && (
                      <button
                        onClick={() => handleMarkPaid(payout)}
                        disabled={loading}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        title="Mark Paid"
                      >
                        <DollarSign size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleViewDetails(payout)}
                      className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {getFilteredPayouts().length === 0 && (
          <div className="p-12 text-center text-gray-500">
            {loading ? 'Loading...' : 'No payouts found'}
          </div>
        )}
      </div>
    </div>
  );
}