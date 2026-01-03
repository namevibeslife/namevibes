import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { COUNTRIES } from '../data/countries';
import { 
  Users, 
  CreditCard, 
  UserCheck, 
  Globe, 
  Settings,
  LogOut,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building,
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Shield,
  Trash2,
  Calendar
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    pendingAmbassadors: 0,
    activeAmbassadors: 0,
    totalRevenue: 0
  });

  // Super Admin - Admin Management
  const [admins, setAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: '',
    role: 'admin',
    countries: [],
    states: [],
    features: ['users', 'payments', 'ambassadors']
  });

  // Ambassador data
  const [ambassadors, setAmbassadors] = useState([]);
  const [selectedAmbassador, setSelectedAmbassador] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    countryCode: '',
    stateCode: '',
    referralNumber: '',
    payoutFrequency: 'monthly'
  });
  const [bankData, setBankData] = useState({});

  // User data
  const [users, setUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  // Payment data
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState({
    gateway: 'all',
    country: 'all',
    state: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Ambassador Payouts
  const [ambassadorPayouts, setAmbassadorPayouts] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Country pricing
  const [countrySettings, setCountrySettings] = useState([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [countryFormData, setCountryFormData] = useState({
    countryCode: '',
    individualPrice: 0,
    familyPrice: 0,
    individualCommission: 15,
    familyCommission: 25,
    isActive: true
  });

  useEffect(() => {
    checkAdminSession();
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentAdmin) {
      if (activeTab === 'superadmin' && currentAdmin.role === 'super') loadAdmins();
      if (activeTab === 'ambassadors') loadAmbassadors();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'payments') loadPayments();
      if (activeTab === 'payouts') loadAmbassadorPayouts();
      if (activeTab === 'countries') loadCountrySettings();
    }
  }, [isLoggedIn, currentAdmin, activeTab, paymentFilter.month, paymentFilter.year, payoutFilter.month, payoutFilter.year]);

  const checkAdminSession = async () => {
    const adminSession = sessionStorage.getItem('adminLoggedIn');
    const adminEmail = sessionStorage.getItem('adminEmail');
    
    if (adminSession === 'true' && adminEmail) {
      try {
        const adminsRef = collection(db, 'admins');
        const querySnapshot = await getDocs(adminsRef);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.email === adminEmail) {
            setCurrentAdmin({ id: doc.id, ...data });
            setIsLoggedIn(true);
            loadDashboardStats();
          }
        });
      } catch (error) {
        console.error('Session check error:', error);
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const adminsRef = collection(db, 'admins');
      const querySnapshot = await getDocs(adminsRef);

      let adminFound = false;
      let adminData = null;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email === email && data.password === password) {
          adminFound = true;
          adminData = { id: doc.id, ...data };
        }
      });

      if (adminFound) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminEmail', email);
        sessionStorage.setItem('adminRole', adminData.role || 'admin');
        setCurrentAdmin(adminData);
        setIsLoggedIn(true);
        loadDashboardStats();
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminRole');
    setCurrentAdmin(null);
    setIsLoggedIn(false);
    navigate('/');
  };

  const canViewFeature = (feature) => {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'super') return true;
    return currentAdmin.features?.includes(feature);
  };

  const getAvailableStates = (countryCode) => {
    const country = COUNTRIES[countryCode];
    return country ? country.states : [];
  };

  const filterByAdminAccess = (items, itemType) => {
    if (!currentAdmin) return items;
    if (currentAdmin.role === 'super') return items;

    return items.filter(item => {
      if (itemType === 'user' || itemType === 'payment') {
        const matchesCountry = currentAdmin.countries?.includes('ALL') || currentAdmin.countries?.includes(item.countryCode);
        const matchesState = currentAdmin.states?.includes('ALL') || currentAdmin.states?.includes(item.stateCode);
        return matchesCountry && matchesState;
      }
      if (itemType === 'ambassador') {
        const matchesCountry = currentAdmin.countries?.includes('ALL') || currentAdmin.countries?.includes(item.countryCode);
        const matchesState = currentAdmin.states?.includes('ALL') || currentAdmin.states?.includes(item.stateCode);
        return matchesCountry && matchesState;
      }
      return true;
    });
  };

  // SUPER ADMIN - Admin Management Functions
  const loadAdmins = async () => {
    if (currentAdmin?.role !== 'super') return;
    
    try {
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const adminsList = [];
      
      adminsSnapshot.forEach(doc => {
        adminsList.push({ id: doc.id, ...doc.data() });
      });

      setAdmins(adminsList);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const handleAddAdmin = () => {
    setEditingAdmin(null);
    setAdminFormData({
      email: '',
      password: '',
      role: 'admin',
      countries: [],
      states: [],
      features: ['users', 'payments', 'ambassadors']
    });
    setShowAdminModal(true);
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setAdminFormData({
      email: admin.email,
      password: admin.password,
      role: admin.role,
      countries: admin.countries || [],
      states: admin.states || [],
      features: admin.features || []
    });
    setShowAdminModal(true);
  };

  const handleSaveAdmin = async () => {
    try {
      setLoading(true);

      const adminData = {
        email: adminFormData.email,
        password: adminFormData.password,
        role: adminFormData.role,
        countries: adminFormData.countries,
        states: adminFormData.states,
        features: adminFormData.features,
        updatedAt: Timestamp.now(),
        updatedBy: currentAdmin.email
      };

      if (editingAdmin) {
        await updateDoc(doc(db, 'admins', editingAdmin.id), adminData);
        alert('Admin updated successfully!');
      } else {
        await addDoc(collection(db, 'admins'), {
          ...adminData,
          createdAt: Timestamp.now()
        });
        alert('Admin created successfully!');
      }

      setShowAdminModal(false);
      loadAdmins();
    } catch (error) {
      console.error('Error saving admin:', error);
      alert('Error saving admin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!confirm(`Delete admin ${admin.email}?`)) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'admins', admin.id));
      alert('Admin deleted successfully!');
      loadAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let filteredUsers = [];
      usersSnapshot.forEach(doc => {
        filteredUsers.push({ id: doc.id, ...doc.data() });
      });
      filteredUsers = filterByAdminAccess(filteredUsers, 'user');
      const totalUsers = filteredUsers.length;

      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      let filteredPayments = [];
      let totalRevenue = 0;
      
      paymentsSnapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        filteredPayments.push(data);
        if (data.status === 'success' || data.status === 'paid') {
          totalRevenue += data.amount || 0;
        }
      });
      
      filteredPayments = filterByAdminAccess(filteredPayments, 'payment');
      const totalPayments = filteredPayments.length;

      const ambassadorsSnapshot = await getDocs(collection(db, 'ambassadors'));
      let filteredAmbassadors = [];
      let pendingAmbassadors = 0;
      let activeAmbassadors = 0;

      ambassadorsSnapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        filteredAmbassadors.push(data);
      });

      filteredAmbassadors = filterByAdminAccess(filteredAmbassadors, 'ambassador');
      
      filteredAmbassadors.forEach(amb => {
        if (!amb.isApproved) {
          pendingAmbassadors++;
        } else if (amb.isActive) {
          activeAmbassadors++;
        }
      });

      setStats({
        totalUsers,
        totalPayments,
        pendingAmbassadors,
        activeAmbassadors,
        totalRevenue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAmbassadors = async () => {
    if (!canViewFeature('ambassadors')) return;
    
    try {
      const ambassadorsSnapshot = await getDocs(collection(db, 'ambassadors'));
      let ambassadorsList = [];
      
      ambassadorsSnapshot.forEach(doc => {
        ambassadorsList.push({ id: doc.id, ...doc.data() });
      });

      ambassadorsList = filterByAdminAccess(ambassadorsList, 'ambassador');

      ambassadorsList.sort((a, b) => {
        if (!a.isApproved && b.isApproved) return -1;
        if (a.isApproved && !b.isApproved) return 1;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });

      setAmbassadors(ambassadorsList);
    } catch (error) {
      console.error('Error loading ambassadors:', error);
    }
  };

  const loadUsers = async () => {
    if (!canViewFeature('users')) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let usersList = [];
      
      usersSnapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      usersList = filterByAdminAccess(usersList, 'user');

      usersList.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPayments = async () => {
    if (!canViewFeature('payments')) return;
    
    try {
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      let paymentsList = [];
      
      paymentsSnapshot.forEach(doc => {
        paymentsList.push({ id: doc.id, ...doc.data() });
      });

      paymentsList = filterByAdminAccess(paymentsList, 'payment');

      paymentsList.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setPayments(paymentsList);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadAmbassadorPayouts = async () => {
    try {
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const payoutMap = {};

      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        const paymentDate = payment.createdAt?.toDate();
        
        if (payment.referralCode && paymentDate) {
          const month = paymentDate.getMonth() + 1;
          const year = paymentDate.getFullYear();
          
          if (month === payoutFilter.month && year === payoutFilter.year) {
            if (!payoutMap[payment.referralCode]) {
              payoutMap[payment.referralCode] = {
                referralCode: payment.referralCode,
                totalSales: 0,
                totalCommission: 0,
                count: 0
              };
            }

            const commissionRate = payment.planType === 'family' ? 0.25 : 0.15;
            const commission = payment.amount * commissionRate;

            payoutMap[payment.referralCode].totalSales += payment.amount;
            payoutMap[payment.referralCode].totalCommission += commission;
            payoutMap[payment.referralCode].count += 1;
          }
        }
      });

      setAmbassadorPayouts(Object.values(payoutMap));
    } catch (error) {
      console.error('Error loading ambassador payouts:', error);
    }
  };

  const loadCountrySettings = async () => {
    try {
      const settingsSnapshot = await getDocs(collection(db, 'countrySettings'));
      const settingsList = [];
      
      settingsSnapshot.forEach(doc => {
        settingsList.push({ id: doc.id, ...doc.data() });
      });

      setCountrySettings(settingsList);
    } catch (error) {
      console.error('Error loading country settings:', error);
    }
  };

  const generateNextReferralNumber = async (countryCode, stateCode) => {
    const existing = ambassadors.filter(a => 
      a.referralCode && a.referralCode.startsWith(`${countryCode} ${stateCode}`)
    );
    
    const nextNumber = existing.length + 1;
    return nextNumber.toString().padStart(5, '0');
  };

  const handleApproveClick = async (ambassador) => {
    setSelectedAmbassador(ambassador);
    const nextNumber = await generateNextReferralNumber(
      ambassador.countryCode,
      ambassador.stateCode
    );
    
    setApprovalData({
      countryCode: ambassador.countryCode,
      stateCode: ambassador.stateCode,
      referralNumber: nextNumber,
      payoutFrequency: 'monthly'
    });
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    try {
      setLoading(true);

      const referralCode = `${approvalData.countryCode} ${approvalData.stateCode} ${approvalData.referralNumber}`;

      const ambassadorRef = doc(db, 'ambassadors', selectedAmbassador.id);
      await updateDoc(ambassadorRef, {
        isApproved: true,
        isActive: true,
        approvedAt: Timestamp.now(),
        approvedBy: currentAdmin.email,
        referralCode: referralCode,
        payoutFrequency: approvalData.payoutFrequency,
        commissionRateIndividual: 15,
        commissionRateFamily: 25
      });

      alert('Ambassador approved successfully!');
      setShowApprovalModal(false);
      loadAmbassadors();
      loadDashboardStats();
    } catch (error) {
      console.error('Error approving ambassador:', error);
      alert('Error approving ambassador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (ambassador, reason) => {
    if (!reason) {
      reason = prompt('Enter rejection reason:');
      if (!reason) return;
    }

    try {
      setLoading(true);

      const ambassadorRef = doc(db, 'ambassadors', ambassador.id);
      await updateDoc(ambassadorRef, {
        isApproved: false,
        isActive: false,
        rejectedAt: Timestamp.now(),
        rejectedBy: currentAdmin.email,
        rejectionReason: reason
      });

      alert('Ambassador rejected.');
      loadAmbassadors();
      loadDashboardStats();
    } catch (error) {
      console.error('Error rejecting ambassador:', error);
      alert('Error rejecting ambassador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ambassador) => {
    try {
      setLoading(true);

      const ambassadorRef = doc(db, 'ambassadors', ambassador.id);
      await updateDoc(ambassadorRef, {
        isActive: !ambassador.isActive,
        deactivatedAt: !ambassador.isActive ? null : Timestamp.now(),
        deactivatedBy: !ambassador.isActive ? null : currentAdmin.email
      });

      alert(`Ambassador ${!ambassador.isActive ? 'activated' : 'deactivated'} successfully!`);
      loadAmbassadors();
      loadDashboardStats();
    } catch (error) {
      console.error('Error toggling ambassador status:', error);
      alert('Error updating status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBankDetails = (ambassador) => {
    setSelectedAmbassador(ambassador);
    setBankData({
      bankAccountName: ambassador.bankAccountName || '',
      bankName: ambassador.bankName || '',
      accountNumber: ambassador.accountNumber || '',
      ifscCode: ambassador.ifscCode || '',
      swiftCode: ambassador.swiftCode || '',
      branchName: ambassador.branchName || '',
      accountType: ambassador.accountType || 'savings',
      upiId: ambassador.upiId || '',
      panNumber: ambassador.panNumber || '',
      payoutFrequency: ambassador.payoutFrequency || 'monthly'
    });
    setShowBankModal(true);
  };

  const handleSaveBankDetails = async () => {
    try {
      setLoading(true);

      const ambassadorRef = doc(db, 'ambassadors', selectedAmbassador.id);
      await updateDoc(ambassadorRef, {
        ...bankData,
        bankDetailsUpdatedAt: Timestamp.now(),
        bankDetailsUpdatedBy: currentAdmin.email
      });

      alert('Bank details updated successfully!');
      setShowBankModal(false);
      loadAmbassadors();
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert('Error updating bank details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCountry = () => {
    setEditingCountry(null);
    setCountryFormData({
      countryCode: '',
      individualPrice: 0,
      familyPrice: 0,
      individualCommission: 15,
      familyCommission: 25,
      isActive: true
    });
    setShowCountryModal(true);
  };

  const handleEditCountry = (country) => {
    setEditingCountry(country);
    setCountryFormData({
      countryCode: country.countryCode,
      individualPrice: country.individualPrice,
      familyPrice: country.familyPrice,
      individualCommission: country.individualCommission,
      familyCommission: country.familyCommission,
      isActive: country.isActive
    });
    setShowCountryModal(true);
  };

  const handleSaveCountry = async () => {
    try {
      setLoading(true);

      const countryInfo = COUNTRIES[countryFormData.countryCode];
      if (!countryInfo) {
        alert('Invalid country code');
        return;
      }

      const countryData = {
        countryCode: countryFormData.countryCode,
        countryName: countryInfo.name,
        currency: countryInfo.currency,
        symbol: countryInfo.symbol,
        individualPrice: parseFloat(countryFormData.individualPrice),
        familyPrice: parseFloat(countryFormData.familyPrice),
        individualCommission: parseFloat(countryFormData.individualCommission),
        familyCommission: parseFloat(countryFormData.familyCommission),
        isActive: countryFormData.isActive,
        updatedAt: Timestamp.now(),
        updatedBy: currentAdmin.email
      };

      if (editingCountry) {
        await updateDoc(doc(db, 'countrySettings', editingCountry.id), countryData);
        alert('Country settings updated!');
      } else {
        await addDoc(collection(db, 'countrySettings'), {
          ...countryData,
          createdAt: Timestamp.now()
        });
        alert('Country added successfully!');
      }

      setShowCountryModal(false);
      loadCountrySettings();
    } catch (error) {
      console.error('Error saving country:', error);
      alert('Error saving country: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = 
        user.fullName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchesFilter = 
        userFilter === 'all' || 
        user.planType === userFilter;
      
      return matchesSearch && matchesFilter;
    });
  };

  const getFilteredPayments = () => {
    return payments.filter(payment => {
      const matchesGateway = 
        paymentFilter.gateway === 'all' || 
        payment.gateway === paymentFilter.gateway;
      
      const matchesCountry =
        paymentFilter.country === 'all' ||
        payment.countryCode === paymentFilter.country;

      const matchesState =
        paymentFilter.state === 'all' ||
        payment.stateCode === paymentFilter.state;

      const paymentDate = payment.createdAt?.toDate();
      const matchesMonth = !paymentDate || 
        (paymentDate.getMonth() + 1 === paymentFilter.month && 
         paymentDate.getFullYear() === paymentFilter.year);
      
      return matchesGateway && matchesCountry && matchesState && matchesMonth;
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600 mt-2">NameVibes Management System</p>
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
                placeholder="admin@namevibes.life"
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

            {loginError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  
  // Return the dashboard component with all props  
  return <AdminDashboard
    currentAdmin={currentAdmin}
    stats={stats}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    handleLogout={handleLogout}
    canViewFeature={canViewFeature}
    admins={admins}
    handleAddAdmin={handleAddAdmin}
    handleEditAdmin={handleEditAdmin}
    handleDeleteAdmin={handleDeleteAdmin}
    showAdminModal={showAdminModal}
    setShowAdminModal={setShowAdminModal}
    editingAdmin={editingAdmin}
    adminFormData={adminFormData}
    setAdminFormData={setAdminFormData}
    handleSaveAdmin={handleSaveAdmin}
    loading={loading}
    COUNTRIES={COUNTRIES}
    users={users}
    getFilteredUsers={getFilteredUsers}
    userSearchTerm={userSearchTerm}
    setUserSearchTerm={setUserSearchTerm}
    userFilter={userFilter}
    setUserFilter={setUserFilter}
    loadUsers={loadUsers}
    ambassadors={ambassadors}
    loadAmbassadors={loadAmbassadors}
    handleApproveClick={handleApproveClick}
    handleReject={handleReject}
    handleToggleActive={handleToggleActive}
    handleEditBankDetails={handleEditBankDetails}
    payments={payments}
    getFilteredPayments={getFilteredPayments}
    paymentFilter={paymentFilter}
    setPaymentFilter={setPaymentFilter}
    getAvailableStates={getAvailableStates}
    months={months}
    years={years}
    loadPayments={loadPayments}
    ambassadorPayouts={ambassadorPayouts}
    payoutFilter={payoutFilter}
    setPayoutFilter={setPayoutFilter}
    loadAmbassadorPayouts={loadAmbassadorPayouts}
    countrySettings={countrySettings}
    handleAddCountry={handleAddCountry}
    handleEditCountry={handleEditCountry}
    showApprovalModal={showApprovalModal}
    setShowApprovalModal={setShowApprovalModal}
    selectedAmbassador={selectedAmbassador}
    approvalData={approvalData}
    setApprovalData={setApprovalData}
    handleApprove={handleApprove}
    showBankModal={showBankModal}
    setShowBankModal={setShowBankModal}
    bankData={bankData}
    setBankData={setBankData}
    handleSaveBankDetails={handleSaveBankDetails}
    showCountryModal={showCountryModal}
    setShowCountryModal={setShowCountryModal}
    editingCountry={editingCountry}
    countryFormData={countryFormData}
    setCountryFormData={setCountryFormData}
    handleSaveCountry={handleSaveCountry}
  />;
}