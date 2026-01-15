import React from 'react';
import PayoutManagement from '../components/PayoutManagement';
import FilterPanel from '../components/FilterPanel';
import {
  Users,
  CreditCard,
  UserCheck,
  Globe,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building,
  DollarSign,
  Plus,
  Search,
  Shield,
  Trash2,
  FileText,
  Share2
} from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminDashboard(props) {
  const {
    currentAdmin,
    stats,
    activeTab,
    setActiveTab,
    handleLogout,
    canViewFeature,
    admins,
    handleAddAdmin,
    handleEditAdmin,
    handleDeleteAdmin,
    showAdminModal,
    setShowAdminModal,
    editingAdmin,
    adminFormData,
    setAdminFormData,
    handleSaveAdmin,
    loading,
    COUNTRIES,
    users,
    getFilteredUsers,
    userSearchTerm,
    setUserSearchTerm,
    userFilter,
    setUserFilter,
    loadUsers,
    ambassadors,
    loadAmbassadors,
    handleApproveClick,
    handleReject,
    handleToggleActive,
    handleEditBankDetails,
    payments,
    getFilteredPayments,
    paymentFilter,
    setPaymentFilter,
    getAvailableStates,
    months,
    years,
    loadPayments,
    ambassadorPayouts,
    payoutFilter,
    setPayoutFilter,
    loadAmbassadorPayouts,
    countrySettings,
    handleAddCountry,
    handleEditCountry,
    showApprovalModal,
    setShowApprovalModal,
    selectedAmbassador,
    approvalData,
    setApprovalData,
    handleApprove,
    showBankModal,
    setShowBankModal,
    bankData,
    setBankData,
    handleSaveBankDetails,
    showCountryModal,
    setShowCountryModal,
    editingCountry,
    countryFormData,
    setCountryFormData,
    handleSaveCountry,
    userFilters,
    setUserFilters,
    ambassadorFilters,
    setAmbassadorFilters
  } = props;

  // New state for Share with Accounts modals
  const [showSharePayoutModal, setShowSharePayoutModal] = React.useState(false);
  const [showShareRevenueModal, setShowShareRevenueModal] = React.useState(false);
  const [selectedPayoutData, setSelectedPayoutData] = React.useState(null);
  const [sharingLoading, setSharingLoading] = React.useState(false);

  // Share Payout with Accounts
  const handleSharePayoutWithAccounts = async (payout) => {
    setSelectedPayoutData(payout);
    setShowSharePayoutModal(true);
  };

  const confirmSharePayout = async () => {
    if (!selectedPayoutData) return;

    setSharingLoading(true);
    try {
      // Find ambassador details
      const ambassador = ambassadors.find(a => a.referralCode === selectedPayoutData.referralCode);
      
      if (!ambassador) {
        alert('Ambassador not found!');
        return;
      }

      // Create payout request document
      await addDoc(collection(db, 'payoutRequests'), {
        type: 'ambassador_payout',
        referralCode: selectedPayoutData.referralCode,
        ambassadorName: ambassador.fullName,
        ambassadorEmail: ambassador.email,
        month: payoutFilter.month,
        year: payoutFilter.year,
        country: ambassador.countryName || 'Unknown',
        state: ambassador.stateName || 'Unknown',
        countryCode: ambassador.countryCode,
        stateCode: ambassador.stateCode,
        currency: 'INR', // You can make this dynamic based on country
        currencySymbol: '₹',
        salesCount: selectedPayoutData.count,
        totalSales: selectedPayoutData.totalSales,
        commissionAmount: selectedPayoutData.totalCommission,
        bankAccountNumber: ambassador.accountNumber || '',
        bankIFSC: ambassador.ifscCode || '',
        bankName: ambassador.bankName || '',
        accountHolderName: ambassador.bankAccountName || ambassador.fullName,
        status: 'pending',
        sharedBy: currentAdmin.email,
        sharedAt: Timestamp.now(),
        paidBy: null,
        paidAt: null,
        paymentNote: '',
        paymentMethod: ''
      });

      alert('Payout request shared with Accounts team successfully!');
      setShowSharePayoutModal(false);
      setSelectedPayoutData(null);
    } catch (error) {
      console.error('Error sharing payout:', error);
      alert('Error sharing payout: ' + error.message);
    } finally {
      setSharingLoading(false);
    }
  };

  // Share Revenue Report with Accounts
  const handleShareRevenueReport = () => {
    setShowShareRevenueModal(true);
  };

  const confirmShareRevenueReport = async () => {
    setSharingLoading(true);
    try {
      const filteredPayments = getFilteredPayments();
      
      if (filteredPayments.length === 0) {
        alert('No payments found for selected filters');
        return;
      }

      // Calculate totals
      const totals = filteredPayments.reduce((acc, payment) => {
        acc.totalPayments++;
        acc.totalAmount += payment.amount || 0;
        
        if (payment.planType === 'individual') {
          acc.individualCount++;
          acc.individualAmount += payment.amount || 0;
        } else if (payment.planType === 'family') {
          acc.familyCount++;
          acc.familyAmount += payment.amount || 0;
        }
        
        if (payment.referralCode) {
          acc.withReferralCount++;
          acc.withReferralAmount += payment.amount || 0;
        } else {
          acc.withoutReferralCount++;
          acc.withoutReferralAmount += payment.amount || 0;
        }
        
        if (payment.gateway === 'razorpay') {
          acc.razorpayCount++;
          acc.razorpayAmount += payment.amount || 0;
        } else if (payment.gateway === 'paypal') {
          acc.paypalCount++;
          acc.paypalAmount += payment.amount || 0;
        }
        
        return acc;
      }, {
        totalPayments: 0,
        totalAmount: 0,
        individualCount: 0,
        individualAmount: 0,
        familyCount: 0,
        familyAmount: 0,
        withReferralCount: 0,
        withReferralAmount: 0,
        withoutReferralCount: 0,
        withoutReferralAmount: 0,
        razorpayCount: 0,
        razorpayAmount: 0,
        paypalCount: 0,
        paypalAmount: 0
      });

      // Determine country and currency
      const country = paymentFilter.country !== 'all' 
        ? COUNTRIES[paymentFilter.country]?.name || 'Unknown'
        : 'All Countries';
      
      const countryCode = paymentFilter.country !== 'all' ? paymentFilter.country : 'ALL';
      
      // Assume INR for India, USD for others (you can make this more sophisticated)
      const currency = countryCode === 'IN' ? 'INR' : 'USD';
      const currencySymbol = countryCode === 'IN' ? '₹' : '$';

      // Create revenue report document
      await addDoc(collection(db, 'revenueReports'), {
        type: 'revenue_report',
        country: country,
        countryCode: countryCode,
        currency: currency,
        currencySymbol: currencySymbol,
        month: paymentFilter.month,
        year: paymentFilter.year,
        reportPeriod: `${months[paymentFilter.month - 1]} ${paymentFilter.year}`,
        ...totals,
        sharedBy: currentAdmin.email,
        sharedAt: Timestamp.now()
      });

      alert('Revenue report shared with Accounts team successfully!');
      setShowShareRevenueModal(false);
    } catch (error) {
      console.error('Error sharing revenue report:', error);
      alert('Error sharing revenue report: ' + error.message);
    } finally {
      setSharingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">NameVibes Admin</h1>
              <p className="text-xs text-gray-500">
                {currentAdmin?.email}
                {currentAdmin?.role === 'super' && <span className="ml-2 text-purple-600 font-bold">● SUPER ADMIN</span>}
              </p>
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'dashboard'
                  ? 'bg-purple-100 text-purple-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings size={20} />
              Dashboard
            </button>

            {currentAdmin?.role === 'super' && (
              <button
                onClick={() => setActiveTab('superadmin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === 'superadmin'
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield size={20} />
                Super Admin
              </button>
            )}

            {canViewFeature('users') && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === 'users'
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users size={20} />
                Users
              </button>
            )}

            {canViewFeature('ambassadors') && (
              <button
                onClick={() => setActiveTab('ambassadors')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === 'ambassadors'
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <UserCheck size={20} />
                Ambassadors
                {stats.pendingAmbassadors > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pendingAmbassadors}
                  </span>
                )}
              </button>
            )}

            {canViewFeature('payments') && (
              <>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === 'payments'
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard size={20} />
                  Payments
                </button>

                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === 'payouts'
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign size={20} />
                  Ambassador Payouts
                </button>

                <button
                  onClick={() => setActiveTab('payoutsManagement')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === 'payoutsManagement'
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText size={20} />
                  Payout Management
                </button>
              </>
            )}
            
            {(currentAdmin?.role === 'super' || canViewFeature('countries')) && (
              <button
                onClick={() => setActiveTab('countries')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === 'countries'
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Globe size={20} />
                Country Pricing
              </button>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>

              <div className="grid md:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Payments</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalPayments}</p>
                    </div>
                    <CreditCard className="w-12 h-12 text-green-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-800">₹{stats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-purple-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Ambassadors</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.pendingAmbassadors}</p>
                    </div>
                    <UserCheck className="w-12 h-12 text-yellow-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Ambassadors</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.activeAmbassadors}</p>
                    </div>
                    <UserCheck className="w-12 h-12 text-indigo-500 opacity-20" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {canViewFeature('ambassadors') && (
                    <button
                      onClick={() => setActiveTab('ambassadors')}
                      className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition text-left"
                    >
                      <UserCheck className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="font-semibold text-gray-800">Review Ambassadors</p>
                      <p className="text-sm text-gray-600">{stats.pendingAmbassadors} pending</p>
                    </button>
                  )}

                  {canViewFeature('users') && (
                    <button
                      onClick={() => setActiveTab('users')}
                      className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition text-left"
                    >
                      <Users className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="font-semibold text-gray-800">Manage Users</p>
                      <p className="text-sm text-gray-600">{stats.totalUsers} total</p>
                    </button>
                  )}

                  {canViewFeature('payments') && (
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition text-left"
                    >
                      <CreditCard className="w-6 h-6 text-green-600 mb-2" />
                      <p className="font-semibold text-gray-800">View Payments</p>
                      <p className="text-sm text-gray-600">{stats.totalPayments} transactions</p>
                    </button>
                  )}

                  {(currentAdmin?.role === 'super' || canViewFeature('countries')) && (
                    <button
                      onClick={() => setActiveTab('countries')}
                      className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition text-left"
                    >
                      <Globe className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="font-semibold text-gray-800">Country Settings</p>
                      <p className="text-sm text-gray-600">Manage pricing</p>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN TAB */}
          {activeTab === 'superadmin' && currentAdmin?.role === 'super' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Super Admin - Manage Admins</h2>
                <button
                  onClick={handleAddAdmin}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus size={20} />
                  Add Admin
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Countries</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map(admin => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{admin.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            admin.role === 'super' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {admin.countries?.join(', ') || 'None'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {admin.features?.join(', ') || 'None'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAdmin(admin)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {admins.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No admins found
                  </div>
                )}
              </div>
            </div>
          )}
          {/* USERS TAB */}
          {activeTab === 'users' && canViewFeature('users') && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Refresh
                </button>
              </div>

              <FilterPanel
                filterType="users"
                filters={userFilters}
                onFilterChange={setUserFilters}
                COUNTRIES={COUNTRIES}
                getAvailableStates={getAvailableStates}
                months={months}
                years={years}
              />

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredUsers().map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.planType === 'family' ? 'bg-purple-100 text-purple-800' :
                            user.planType === 'individual' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.planType || 'none'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.countryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.stateName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredUsers().length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AMBASSADORS TAB */}
          {activeTab === 'ambassadors' && canViewFeature('ambassadors') && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Ambassador Management</h2>
                <button
                  onClick={loadAmbassadors}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Refresh
                </button>
              </div>

              <FilterPanel
                filterType="ambassadors"
                filters={ambassadorFilters}
                onFilterChange={setAmbassadorFilters}
                COUNTRIES={COUNTRIES}
                getAvailableStates={getAvailableStates}
                months={months}
                years={years}
              />

              {ambassadors.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No ambassadors yet</p>
                  <p className="text-gray-500 text-sm mt-2">Ambassador applications will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ambassadors.map(ambassador => (
                    <div key={ambassador.id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-800">
                              {ambassador.fullName}
                            </h3>
                            {!ambassador.isApproved && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                PENDING
                              </span>
                            )}
                            {ambassador.isApproved && ambassador.isActive && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                ACTIVE
                              </span>
                            )}
                            {ambassador.isApproved && !ambassador.isActive && (
                              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          {ambassador.referralCode && (
                            <p className="text-sm text-purple-600 font-mono font-bold mb-2">
                              Code: {ambassador.referralCode}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {!ambassador.isApproved && (
                            <>
                              <button
                                onClick={() => handleApproveClick(ambassador)}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(ambassador)}
                                className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </>
                          )}
                          {ambassador.isApproved && (
                            <>
                              <button
                                onClick={() => handleToggleActive(ambassador)}
                                className={`px-4 py-2 rounded-lg text-sm ${
                                  ambassador.isActive
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {ambassador.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleEditBankDetails(ambassador)}
                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                <Edit size={16} />
                                Edit Bank
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-500 text-xs">Email</p>
                            <p className="text-gray-800">{ambassador.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-500 text-xs">Mobile</p>
                            <p className="text-gray-800">{ambassador.mobileNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-500 text-xs">Location</p>
                            <p className="text-gray-800">{ambassador.city}, {ambassador.stateName}</p>
                          </div>
                        </div>
                      </div>

                      {ambassador.isApproved && (
                        <div className="mt-4 pt-4 border-t border-gray-200 grid md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-gray-500 text-xs">Bank</p>
                              <p className="text-gray-800">{ambassador.bankName || 'Not set'}</p>
                              <p className="text-gray-600 text-xs">A/C: {ambassador.accountNumber || 'Not set'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-gray-500 text-xs">Payout</p>
                              <p className="text-gray-800 capitalize">{ambassador.payoutFrequency || 'Monthly'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS TAB - WITH STATE AND MONTH/YEAR FILTERS */}
          {activeTab === 'payments' && canViewFeature('payments') && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Payment Tracking</h2>
                <div className="flex gap-2">
                  {currentAdmin?.role === 'super' && (
                    <button
                      onClick={handleShareRevenueReport}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Share2 size={18} />
                      Share Revenue Report with Accounts
                    </button>
                  )}
                  <button
                    onClick={loadPayments}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Enhanced Filters */}
              <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <div className="grid md:grid-cols-5 gap-4">
                  <select
                    value={paymentFilter.gateway}
                    onChange={(e) => setPaymentFilter({...paymentFilter, gateway: e.target.value})}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">All Gateways</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="paypal">PayPal</option>
                  </select>
                  
                  <select
                    value={paymentFilter.country}
                    onChange={(e) => {
                      setPaymentFilter({...paymentFilter, country: e.target.value, state: 'all'});
                    }}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">All Countries</option>
                    {Object.values(COUNTRIES).map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>

                  <select
                    value={paymentFilter.state}
                    onChange={(e) => setPaymentFilter({...paymentFilter, state: e.target.value})}
                    disabled={paymentFilter.country === 'all'}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100"
                  >
                    <option value="all">All States</option>
                    {paymentFilter.country !== 'all' && 
                      getAvailableStates(paymentFilter.country).map(state => (
                        <option key={state.code} value={state.code}>{state.name}</option>
                      ))
                    }
                  </select>

                  <select
                    value={paymentFilter.month}
                    onChange={(e) => setPaymentFilter({...paymentFilter, month: parseInt(e.target.value)})}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {months.map((month, idx) => (
                      <option key={idx} value={idx + 1}>{month}</option>
                    ))}
                  </select>

                  <select
                    value={paymentFilter.year}
                    onChange={(e) => setPaymentFilter({...paymentFilter, year: parseInt(e.target.value)})}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">State</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Referral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredPayments().map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {payment.planType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {payment.currency === 'INR' ? '₹' : '$'}{payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 capitalize">{payment.gateway}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.countryCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.stateCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'success' || payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {payment.referralCode || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredPayments().length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No payments found for selected filters
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AMBASSADOR PAYOUTS TAB - WITH SHARE BUTTON */}
          {activeTab === 'payouts' && canViewFeature('payments') && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Ambassador Payouts</h2>
                <button
                  onClick={loadAmbassadorPayouts}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Refresh
                </button>
              </div>

              <FilterPanel
                filterType="payouts"
                filters={payoutFilter}
                onFilterChange={setPayoutFilter}
                COUNTRIES={COUNTRIES}
                getAvailableStates={getAvailableStates}
                months={months}
                years={years}
              />

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Referral Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Sales Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Total Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Total Commission</th>
                      {currentAdmin?.role === 'super' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-white bg-blue-600 uppercase">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ambassadorPayouts.map((payout, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-purple-600">{payout.referralCode}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payout.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          ₹{payout.totalSales.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          ₹{payout.totalCommission.toFixed(2)}
                        </td>
                        {currentAdmin?.role === 'super' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleSharePayoutWithAccounts(payout)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              <Share2 size={16} />
                              Share with Accounts
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ambassadorPayouts.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No payouts for {months[payoutFilter.month - 1]} {payoutFilter.year}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COUNTRIES TAB */}
          {activeTab === 'countries' && (currentAdmin?.role === 'super' || canViewFeature('countries')) && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Country Pricing Management</h2>
                <button
                  onClick={handleAddCountry}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus size={20} />
                  Add Country
                </button>
              </div>

              {countrySettings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No country settings configured</p>
                  <p className="text-gray-500 text-sm mt-2">Add countries to set custom pricing</p>
                  <button
                    onClick={handleAddCountry}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add First Country
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {countrySettings.map(country => (
                    <div key={country.id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{country.countryName}</h3>
                          <p className="text-sm text-gray-500">Code: {country.countryCode}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCountry(country)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            <Edit size={16} />
                          </button>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            country.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {country.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Individual Plan</span>
                          <span className="text-lg font-bold text-gray-800">
                            {country.symbol}{country.individualPrice}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Family Plan</span>
                          <span className="text-lg font-bold text-gray-800">
                            {country.symbol}{country.familyPrice}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Individual Discount</span>
                          <span className="text-sm font-semibold text-green-600">
                            {country.individualDiscount}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Family Discount</span>
                          <span className="text-sm font-semibold text-green-600">
                            {country.familyDiscount}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Individual Commission</span>
                          <span className="text-sm font-semibold text-purple-600">
                            {country.individualCommission}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Family Commission</span>
                          <span className="text-sm font-semibold text-purple-600">
                            {country.familyCommission}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* PAYOUT MANAGEMENT TAB - NEW */}
          {activeTab === 'payoutsManagement' && (
            <PayoutManagement 
              currentAdmin={currentAdmin}
              ambassadors={ambassadors}
              canViewFeature={canViewFeature}
            />
          )}

      {/* Share Payout Modal */}
      {showSharePayoutModal && selectedPayoutData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Share Payout with Accounts</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Referral Code:</span>
                <span className="font-mono font-bold text-purple-600">{selectedPayoutData.referralCode}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Period:</span>
                <span className="font-semibold">{months[payoutFilter.month - 1]} {payoutFilter.year}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Sales Count:</span>
                <span className="font-semibold">{selectedPayoutData.count}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total Sales:</span>
                <span className="font-semibold">₹{selectedPayoutData.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Commission Amount:</span>
                <span className="font-bold text-green-600 text-lg">₹{selectedPayoutData.totalCommission.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              This will create a payout request that the Accounts team can process and mark as paid.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSharePayoutModal(false);
                  setSelectedPayoutData(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                disabled={sharingLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmSharePayout}
                disabled={sharingLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sharingLoading ? 'Sharing...' : 'Confirm & Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Revenue Report Modal */}
      {showShareRevenueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Share Revenue Report with Accounts</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Period:</span>
                <span className="font-semibold">{months[paymentFilter.month - 1]} {paymentFilter.year}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Country:</span>
                <span className="font-semibold">
                  {paymentFilter.country === 'all' ? 'All Countries' : COUNTRIES[paymentFilter.country]?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total Payments:</span>
                <span className="font-semibold">{getFilteredPayments().length}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              This will create a revenue report that the Accounts team can use for tax filing and financial tracking.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShareRevenueModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                disabled={sharingLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmShareRevenueReport}
                disabled={sharingLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {sharingLoading ? 'Sharing...' : 'Confirm & Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Bank Details</h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankData.bankAccountName}
                    onChange={(e) => setBankData({...bankData, bankAccountName: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankData.bankName}
                    onChange={(e) => setBankData({...bankData, bankName: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <select
                    value={bankData.accountType}
                    onChange={(e) => setBankData({...bankData, accountType: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankData.ifscCode}
                    onChange={(e) => setBankData({...bankData, ifscCode: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankData.branchName}
                    onChange={(e) => setBankData({...bankData, branchName: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID (India)
                  </label>
                  <input
                    type="text"
                    value={bankData.upiId}
                    onChange={(e) => setBankData({...bankData, upiId: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="username@paytm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number (India)
                  </label>
                  <input
                    type="text"
                    value={bankData.panNumber}
                    onChange={(e) => setBankData({...bankData, panNumber: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Frequency
                </label>
                <select
                  value={bankData.payoutFrequency}
                  onChange={(e) => setBankData({...bankData, payoutFrequency: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBankModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBankDetails}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Country Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {editingCountry ? 'Edit Country Settings' : 'Add Country'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={countryFormData.countryCode}
                  onChange={(e) => setCountryFormData({...countryFormData, countryCode: e.target.value})}
                  disabled={editingCountry !== null}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select Country</option>
                  {Object.values(COUNTRIES).map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Individual Price
                  </label>
                  <input
                    type="number"
                    value={countryFormData.individualPrice}
                    onChange={(e) => setCountryFormData({...countryFormData, individualPrice: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Price
                  </label>
                  <input
                    type="number"
                    value={countryFormData.familyPrice}
                    onChange={(e) => setCountryFormData({...countryFormData, familyPrice: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Individual Discount (%)
                  </label>
                  <input
                    type="number"
                    value={countryFormData.individualDiscount}
                    onChange={(e) => setCountryFormData({...countryFormData, individualDiscount: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Discount (%)
                  </label>
                  <input
                    type="number"
                    value={countryFormData.familyDiscount}
                    onChange={(e) => setCountryFormData({...countryFormData, familyDiscount: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Individual Commission (%)
                  </label>
                  <input
                    type="number"
                    value={countryFormData.individualCommission}
                    onChange={(e) => setCountryFormData({...countryFormData, individualCommission: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Commission (%)
                  </label>
                  <input
                    type="number"
                    value={countryFormData.familyCommission}
                    onChange={(e) => setCountryFormData({...countryFormData, familyCommission: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={countryFormData.isActive}
                  onChange={(e) => setCountryFormData({...countryFormData, isActive: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCountryModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCountry}
                disabled={loading || !countryFormData.countryCode}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Country'}
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* MODALS */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={adminFormData.role}
                  onChange={(e) => setAdminFormData({...adminFormData, role: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                >
                  <option value="admin">Admin</option>
                  <option value="super">Super Admin</option>
                </select>
              </div>

              {adminFormData.role === 'admin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Countries</label>
                    <select
                      multiple
                      value={adminFormData.countries}
                      onChange={(e) => setAdminFormData({
                        ...adminFormData,
                        countries: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg h-32"
                    >
                      <option value="ALL">All Countries</option>
                      {Object.values(COUNTRIES).map(country => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                    <div className="space-y-2">
                      {['users', 'payments', 'ambassadors', 'countries', 'Accounts'].map(feature => (
                        <label key={feature} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={adminFormData.features.includes(feature)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAdminFormData({
                                  ...adminFormData,
                                  features: [...adminFormData.features, feature]
                                });
                              } else {
                                setAdminFormData({
                                  ...adminFormData,
                                  features: adminFormData.features.filter(f => f !== feature)
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm capitalize">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdminModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdmin}
                disabled={loading || !adminFormData.email || !adminFormData.password}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Approve Ambassador</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country Code</label>
                <input
                  type="text"
                  value={approvalData.countryCode}
                  disabled
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State Code</label>
                <input
                  type="text"
                  value={approvalData.stateCode}
                  disabled
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referral Number (5 digits)</label>
                <input
                  type="text"
                  value={approvalData.referralNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setApprovalData({...approvalData, referralNumber: value});
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-mono"
                  placeholder="00001"
                  maxLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Full code: {approvalData.countryCode} {approvalData.stateCode} {approvalData.referralNumber.padStart(5, '0')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payout Frequency</label>
                <select
                  value={approvalData.payoutFrequency}
                  onChange={(e) => setApprovalData({...approvalData, payoutFrequency: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading || approvalData.referralNumber.length !== 5}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}