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
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
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
  const [loginError, setLoginError] = useState('');
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    pendingAmbassadors: 0,
    activeAmbassadors: 0,
    revenueByCurrency: {}
  });

  // Super Admin - Admin Management
  const [admins, setAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    email: '',
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

  // Ambassador Payouts - UPDATED with country/state
  const [ambassadorPayouts, setAmbassadorPayouts] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState({
    country: 'all',
    state: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // User filters - NEW
  const [userFilters, setUserFilters] = useState({
    country: 'all',
    state: 'all',
    month: 'all',
    year: 'all',
    planType: 'all'
  });

  // Ambassador filters - NEW
  const [ambassadorFilters, setAmbassadorFilters] = useState({
    country: 'all',
    state: 'all',
    month: 'all',
    year: 'all',
    status: 'all'
  });

  // Country pricing
  const [countrySettings, setCountrySettings] = useState([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [countryFormData, setCountryFormData] = useState({
    countryCode: '',
    individualPrice: 0,
    familyPrice: 0,
    individualDiscount: 10,
    familyDiscount: 20,
    individualCommission: 15,
    familyCommission: 25,
    isActive: true
  });

  // Admins sign in with Google; access comes from an admins/{email} document
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentAdmin(null);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email.toLowerCase()));
        if (adminDoc.exists()) {
          setCurrentAdmin({ id: adminDoc.id, ...adminDoc.data() });
          setIsLoggedIn(true);
          setLoginError('');
          loadDashboardStats();
        } else {
          setCurrentAdmin(null);
          setIsLoggedIn(false);
          setLoginError(`${user.email} is not an admin account.`);
        }
      } catch (error) {
        console.error('Admin check error:', error);
        setLoginError('Could not verify admin access: ' + error.message);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
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
  }, [
    isLoggedIn, 
    currentAdmin, 
    activeTab, 
    paymentFilter.month, 
    paymentFilter.year, 
    payoutFilter.month, 
    payoutFilter.year,
    userFilters,
    ambassadorFilters
  ]);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // onAuthStateChanged above checks admin access once signed in
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setLoginError('Sign-in failed: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
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

      // Admin documents are keyed by the admin's Google email; security rules look them up that way
      const adminEmail = adminFormData.email.trim().toLowerCase();
      const adminData = {
        email: adminEmail,
        role: adminFormData.role,
        countries: adminFormData.countries,
        states: adminFormData.states,
        features: adminFormData.features,
        updatedAt: Timestamp.now(),
        updatedBy: currentAdmin.email
      };

      if (editingAdmin && editingAdmin.id === adminEmail) {
        await updateDoc(doc(db, 'admins', adminEmail), adminData);
        alert('Admin updated successfully!');
      } else {
        await setDoc(doc(db, 'admins', adminEmail), {
          ...adminData,
          createdAt: editingAdmin?.createdAt || Timestamp.now()
        });
        // Email changed while editing: the old document no longer grants access
        if (editingAdmin) await deleteDoc(doc(db, 'admins', editingAdmin.id));
        alert(editingAdmin ? 'Admin updated successfully!' : 'Admin created! They can now sign in with Google using ' + adminEmail);
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

      paymentsSnapshot.forEach(doc => {
        filteredPayments.push({ id: doc.id, ...doc.data() });
      });

      filteredPayments = filterByAdminAccess(filteredPayments, 'payment');
      const totalPayments = filteredPayments.length;

      // Totals are kept per currency; adding rupees and dollars together is meaningless
      const revenueByCurrency = {};
      filteredPayments.forEach(payment => {
        if (payment.status === 'success' || payment.status === 'paid') {
          const currency = payment.currency || 'INR';
          revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + (payment.amount || 0);
        }
      });

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
        revenueByCurrency
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // UPDATED loadAmbassadors with filter logic
  const loadAmbassadors = async () => {
    if (!canViewFeature('ambassadors')) return;
    
    try {
      const ambassadorsSnapshot = await getDocs(collection(db, 'ambassadors'));
      let ambassadorsList = [];
      
      ambassadorsSnapshot.forEach(doc => {
        ambassadorsList.push({ id: doc.id, ...doc.data() });
      });

      ambassadorsList = filterByAdminAccess(ambassadorsList, 'ambassador');

      // Apply ambassador filters
      ambassadorsList = ambassadorsList.filter(ambassador => {
        // Country filter
        if (ambassadorFilters.country !== 'all' && ambassador.countryCode !== ambassadorFilters.country) return false;
        
        // State filter
        if (ambassadorFilters.state !== 'all' && ambassador.stateCode !== ambassadorFilters.state) return false;
        
        // Month/Year filter
        if (ambassadorFilters.month !== 'all' || ambassadorFilters.year !== 'all') {
          const createdDate = ambassador.createdAt?.toDate();
          if (createdDate) {
            if (ambassadorFilters.month !== 'all' && createdDate.getMonth() + 1 !== parseInt(ambassadorFilters.month)) return false;
            if (ambassadorFilters.year !== 'all' && createdDate.getFullYear() !== parseInt(ambassadorFilters.year)) return false;
          }
        }
        
        // Status filter
        if (ambassadorFilters.status !== 'all') {
          if (ambassadorFilters.status === 'pending' && ambassador.isApproved) return false;
          if (ambassadorFilters.status === 'approved' && !ambassador.isApproved) return false;
          if (ambassadorFilters.status === 'active' && (!ambassador.isApproved || !ambassador.isActive)) return false;
          if (ambassadorFilters.status === 'inactive' && (!ambassador.isApproved || ambassador.isActive)) return false;
        }
        
        return true;
      });

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

  // UPDATED loadUsers with filter logic
  const loadUsers = async () => {
    if (!canViewFeature('users')) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let usersList = [];
      
      usersSnapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      usersList = filterByAdminAccess(usersList, 'user');

      // Apply user filters
      usersList = usersList.filter(user => {
        // Country filter
        if (userFilters.country !== 'all' && user.countryCode !== userFilters.country) return false;
        
        // State filter
        if (userFilters.state !== 'all' && user.stateCode !== userFilters.state) return false;
        
        // Month/Year filter
        if (userFilters.month !== 'all' || userFilters.year !== 'all') {
          const createdDate = user.createdAt?.toDate();
          if (createdDate) {
            if (userFilters.month !== 'all' && createdDate.getMonth() + 1 !== parseInt(userFilters.month)) return false;
            if (userFilters.year !== 'all' && createdDate.getFullYear() !== parseInt(userFilters.year)) return false;
          }
        }
        
        // Plan type filter
        if (userFilters.planType !== 'all') {
          if (userFilters.planType === 'none' && user.planType) return false;
          if (userFilters.planType !== 'none' && user.planType !== userFilters.planType) return false;
        }
        
        return true;
      });

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

  // UPDATED loadAmbassadorPayouts with country/state filters
  const loadAmbassadorPayouts = async () => {
    try {
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const payoutMap = {};

      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        const paymentDate = payment.createdAt?.toDate();
        
        if (payment.referralCode && paymentDate) {
          // Apply country filter
          if (payoutFilter.country !== 'all' && payment.countryCode !== payoutFilter.country) return;
          
          // Apply state filter
          if (payoutFilter.state !== 'all' && payment.stateCode !== payoutFilter.state) return;
          
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

  // referralCodes/{code without spaces} is what the profile form checks a code against,
  // and what links referred users to their ambassador
  const syncReferralCode = async (ambassador, active) => {
    if (!ambassador.referralCode) return;
    await setDoc(doc(db, 'referralCodes', ambassador.referralCode.replace(/\s/g, '')), {
      code: ambassador.referralCode,
      ambassadorId: ambassador.id,
      ambassadorEmail: ambassador.email.toLowerCase(),
      active,
      updatedAt: Timestamp.now()
    });
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
      await syncReferralCode({ ...selectedAmbassador, referralCode }, true);

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
      await syncReferralCode(ambassador, false);

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
      await syncReferralCode(ambassador, !ambassador.isActive);

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
        setLoading(false);
        return;
      }

      // Check for duplicate country (only when adding new, not editing)
      if (!editingCountry) {
        const duplicate = countrySettings.find(
          c => c.countryCode === countryFormData.countryCode
        );
        if (duplicate) {
          alert(`${countryInfo.name} is already configured. Please edit the existing entry instead.`);
          setLoading(false);
          return;
        }
      }

      const countryData = {
        countryCode: countryFormData.countryCode,
        countryName: countryInfo.name,
        currency: countryInfo.currency,
        symbol: countryInfo.symbol,
        individualPrice: (Number(countryFormData.individualPrice) || 0),
        familyPrice: (Number(countryFormData.familyPrice) || 0),
        individualDiscount: (Number(countryFormData.individualDiscount) || 0),
        familyDiscount: (Number(countryFormData.familyDiscount) || 0),
        individualCommission: (Number(countryFormData.individualCommission) || 0),
        familyCommission: (Number(countryFormData.familyCommission) || 0),
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

          <div className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Sign in with Google'}
            </button>

            {loginError && auth.currentUser && (
              <button
                onClick={() => signOut(auth)}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                Use a different Google account
              </button>
            )}

            <p className="text-xs text-gray-500 text-center">
              Use the Google account a super admin added under Admin Management.
            </p>
          </div>

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

  
  // Return the dashboard component with all props - UPDATED with new filter props
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
    userFilters={userFilters}
    setUserFilters={setUserFilters}
    ambassadorFilters={ambassadorFilters}
    setAmbassadorFilters={setAmbassadorFilters}
  />;
}