import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import './AccountsDashboard.css';

function AccountsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payouts');
  
  // Payout Requests State
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [payoutFilters, setPayoutFilters] = useState({
    status: 'all',
    country: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Revenue Reports State
  const [revenueReports, setRevenueReports] = useState([]);
  const [filteredRevenue, setFilteredRevenue] = useState([]);
  const [revenueFilters, setRevenueFilters] = useState({
    currency: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Download All Data State
  const [downloadFilters, setDownloadFilters] = useState({
    fromMonth: 1,
    fromYear: new Date().getFullYear(),
    toMonth: new Date().getMonth() + 1,
    toYear: new Date().getFullYear()
  });

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  // Check authentication and permissions
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/admin');
        return;
      }

      // Check if user has Accounts permission
      const adminQuery = query(
        collection(db, 'admins'),
        where('email', '==', user.email)
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (adminSnapshot.empty) {
        alert('Access denied. Accounts permission required.');
        navigate('/admin');
        return;
      }

      const adminData = adminSnapshot.docs[0].data();
      if (!adminData.features || !adminData.features.includes('Accounts')) {
        alert('Access denied. Accounts permission required.');
        navigate('/admin');
        return;
      }

      setLoading(false);
      fetchPayoutRequests();
      fetchRevenueReports();
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch Payout Requests
  const fetchPayoutRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, 'payoutRequests'),
        orderBy('sharedAt', 'desc')
      );
      const snapshot = await getDocs(requestsQuery);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayoutRequests(requests);
      setFilteredPayouts(requests);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
    }
  };

  // Fetch Revenue Reports
  const fetchRevenueReports = async () => {
    try {
      const reportsQuery = query(
        collection(db, 'revenueReports'),
        orderBy('sharedAt', 'desc')
      );
      const snapshot = await getDocs(reportsQuery);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRevenueReports(reports);
      setFilteredRevenue(reports);
    } catch (error) {
      console.error('Error fetching revenue reports:', error);
    }
  };

  // Filter Payout Requests
  useEffect(() => {
    let filtered = [...payoutRequests];

    if (payoutFilters.status !== 'all') {
      filtered = filtered.filter(p => p.status === payoutFilters.status);
    }

    if (payoutFilters.country !== 'all') {
      filtered = filtered.filter(p => p.country === payoutFilters.country);
    }

    if (payoutFilters.month !== 'all') {
      filtered = filtered.filter(p => p.month === parseInt(payoutFilters.month));
    }

    if (payoutFilters.year !== 'all') {
      filtered = filtered.filter(p => p.year === parseInt(payoutFilters.year));
    }

    setFilteredPayouts(filtered);
  }, [payoutFilters, payoutRequests]);

  // Filter Revenue Reports
  useEffect(() => {
    let filtered = [...revenueReports];

    if (revenueFilters.currency !== 'all') {
      filtered = filtered.filter(r => r.currency === revenueFilters.currency);
    }

    if (revenueFilters.month !== 'all') {
      filtered = filtered.filter(r => r.month === parseInt(revenueFilters.month));
    }

    if (revenueFilters.year !== 'all') {
      filtered = filtered.filter(r => r.year === parseInt(revenueFilters.year));
    }

    setFilteredRevenue(filtered);
  }, [revenueFilters, revenueReports]);

  // Mark Payout as Paid
  const handleMarkAsPaid = async () => {
    if (!paymentNote.trim()) {
      alert('Please enter payment note/transaction reference');
      return;
    }

    try {
      const payoutRef = doc(db, 'payoutRequests', selectedPayout.id);
      await updateDoc(payoutRef, {
        status: 'paid',
        paidBy: auth.currentUser.email,
        paidAt: Timestamp.now(),
        paymentNote: paymentNote,
        paymentMethod: paymentMethod
      });

      alert('Payment marked as paid successfully!');
      setShowPaymentModal(false);
      setPaymentNote('');
      setPaymentMethod('Bank Transfer');
      setSelectedPayout(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error updating payment status');
    }
  };

  // Download Payout Requests CSV
  const downloadPayoutCSV = () => {
    if (filteredPayouts.length === 0) {
      alert('No payout requests to download');
      return;
    }

    const headers = [
      'Month/Year',
      'Ambassador Name',
      'Referral Code',
      'Country',
      'State',
      'Sales Count',
      'Total Sales',
      'Commission Amount',
      'Currency',
      'Bank Account',
      'IFSC/Bank Code',
      'Bank Name',
      'Account Holder',
      'Status',
      'Paid Date',
      'Payment Note',
      'Payment Method'
    ];

    const rows = filteredPayouts.map(p => [
      `${getMonthName(p.month)} ${p.year}`,
      p.ambassadorName,
      p.referralCode,
      p.country,
      p.state,
      p.salesCount,
      `${p.currencySymbol}${p.totalSales}`,
      `${p.currencySymbol}${p.commissionAmount}`,
      p.currency,
      p.bankAccountNumber,
      p.bankIFSC || '-',
      p.bankName,
      p.accountHolderName,
      p.status.toUpperCase(),
      p.paidAt ? formatDate(p.paidAt.toDate()) : '-',
      p.paymentNote || '-',
      p.paymentMethod || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ambassador_payouts_${Date.now()}.csv`;
    a.click();
  };

  // Download Revenue Report CSV (Separate for INR and USD)
  const downloadRevenueCSV = (currency) => {
    const filtered = filteredRevenue.filter(r => r.currency === currency);

    if (filtered.length === 0) {
      alert(`No ${currency} revenue reports to download`);
      return;
    }

    const headers = [
      'Report Period',
      'Country',
      'Currency',
      'Total Payments',
      'Total Amount',
      'Individual Count',
      'Individual Amount',
      'Family Count',
      'Family Amount',
      'With Referral Count',
      'With Referral Amount',
      'Without Referral Count',
      'Without Referral Amount',
      'Shared By',
      'Shared Date'
    ];

    const rows = filtered.map(r => [
      r.reportPeriod,
      r.country,
      r.currency,
      r.totalPayments,
      `${r.currencySymbol}${r.totalAmount}`,
      r.individualCount,
      `${r.currencySymbol}${r.individualAmount}`,
      r.familyCount,
      `${r.currencySymbol}${r.familyAmount}`,
      r.withReferralCount,
      `${r.currencySymbol}${r.withReferralAmount}`,
      r.withoutReferralCount,
      `${r.currencySymbol}${r.withoutReferralAmount}`,
      r.sharedBy,
      formatDate(r.sharedAt.toDate())
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${currency}_${Date.now()}.csv`;
    a.click();
  };

  // Download All User Payments (for auditors)
  const downloadAllUserPayments = async (currency) => {
    try {
      const { fromMonth, fromYear, toMonth, toYear } = downloadFilters;

      // Query payments collection
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('currency', '==', currency),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => doc.data());

      // Filter by date range
      const filtered = payments.filter(payment => {
        const paymentDate = payment.createdAt.toDate();
        const paymentMonth = paymentDate.getMonth() + 1;
        const paymentYear = paymentDate.getFullYear();

        const fromDate = new Date(fromYear, fromMonth - 1, 1);
        const toDate = new Date(toYear, toMonth, 0);
        const pDate = new Date(paymentYear, paymentMonth - 1, paymentDate.getDate());

        return pDate >= fromDate && pDate <= toDate;
      });

      if (filtered.length === 0) {
        alert(`No ${currency} payments found in selected period`);
        return;
      }

      const headers = [
        'Date',
        'User Name',
        'User Email',
        'Country',
        'State',
        'Plan Type',
        'Amount',
        'Currency',
        'Gateway',
        'Transaction ID',
        'Referral Code',
        'Status'
      ];

      const rows = filtered.map(p => [
        formatDate(p.createdAt.toDate()),
        p.userEmail || '-',
        p.userEmail,
        p.country || '-',
        p.state || '-',
        p.planType,
        `${currency === 'INR' ? '₹' : '$'}${p.amount}`,
        p.currency,
        p.gateway,
        p.transactionId,
        p.referralCode || '-',
        p.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_payments_${currency}_${Date.now()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error downloading user payments:', error);
      alert('Error downloading CSV');
    }
  };

  // Download All Ambassador Payouts (for auditors)
  const downloadAllPayouts = async () => {
    try {
      const { fromMonth, fromYear, toMonth, toYear } = downloadFilters;

      const filtered = payoutRequests.filter(payout => {
        const payoutDate = new Date(payout.year, payout.month - 1, 1);
        const fromDate = new Date(fromYear, fromMonth - 1, 1);
        const toDate = new Date(toYear, toMonth, 0);

        return payoutDate >= fromDate && payoutDate <= toDate;
      });

      if (filtered.length === 0) {
        alert('No payouts found in selected period');
        return;
      }

      const headers = [
        'Month/Year',
        'Ambassador Name',
        'Referral Code',
        'Country',
        'State',
        'Sales Count',
        'Total Sales',
        'Commission Amount',
        'Currency',
        'Status',
        'Paid Date',
        'Payment Note'
      ];

      const rows = filtered.map(p => [
        `${getMonthName(p.month)} ${p.year}`,
        p.ambassadorName,
        p.referralCode,
        p.country,
        p.state,
        p.salesCount,
        `${p.currencySymbol}${p.totalSales}`,
        `${p.currencySymbol}${p.commissionAmount}`,
        p.currency,
        p.status.toUpperCase(),
        p.paidAt ? formatDate(p.paidAt.toDate()) : '-',
        p.paymentNote || '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_ambassador_payouts_${Date.now()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error downloading payouts:', error);
      alert('Error downloading CSV');
    }
  };

  // Helper Functions
  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/admin');
  };

  if (loading) {
    return <div className="accounts-loading">Loading...</div>;
  }

  return (
    <div className="accounts-dashboard">
      <div className="accounts-header">
        <h1>Accounts Dashboard</h1>
        <button onClick={handleLogout} className="accounts-logout-btn">Logout</button>
      </div>

      <div className="accounts-tabs">
        <button 
          className={activeTab === 'payouts' ? 'active' : ''} 
          onClick={() => setActiveTab('payouts')}
        >
          Payout Requests
        </button>
        <button 
          className={activeTab === 'revenue' ? 'active' : ''} 
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Reports
        </button>
        <button 
          className={activeTab === 'download' ? 'active' : ''} 
          onClick={() => setActiveTab('download')}
        >
          Download All Data
        </button>
      </div>

      {/* PAYOUT REQUESTS TAB */}
      {activeTab === 'payouts' && (
        <div className="accounts-section">
          <div className="accounts-filters">
            <select 
              value={payoutFilters.status} 
              onChange={(e) => setPayoutFilters({...payoutFilters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>

            <select 
              value={payoutFilters.country} 
              onChange={(e) => setPayoutFilters({...payoutFilters, country: e.target.value})}
            >
              <option value="all">All Countries</option>
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
            </select>

            <select 
              value={payoutFilters.month} 
              onChange={(e) => setPayoutFilters({...payoutFilters, month: e.target.value})}
            >
              <option value="all">All Months</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>

            <select 
              value={payoutFilters.year} 
              onChange={(e) => setPayoutFilters({...payoutFilters, year: e.target.value})}
            >
              <option value="all">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>

            <button onClick={downloadPayoutCSV} className="accounts-download-btn">
              📥 Download CSV
            </button>
          </div>

          <div className="accounts-table-container">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Month/Year</th>
                  <th>Ambassador</th>
                  <th>Referral Code</th>
                  <th>Country</th>
                  <th>Sales</th>
                  <th>Total Sales</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{textAlign: 'center'}}>No payout requests found</td>
                  </tr>
                ) : (
                  filteredPayouts.map(payout => (
                    <tr key={payout.id}>
                      <td>{getMonthName(payout.month)} {payout.year}</td>
                      <td>{payout.ambassadorName}</td>
                      <td>{payout.referralCode}</td>
                      <td>{payout.country}</td>
                      <td>{payout.salesCount}</td>
                      <td>{payout.currencySymbol}{payout.totalSales}</td>
                      <td>{payout.currencySymbol}{payout.commissionAmount}</td>
                      <td>
                        <span className={`status-badge ${payout.status}`}>
                          {payout.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {payout.status === 'pending' ? (
                          <button 
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowPaymentModal(true);
                            }}
                            className="mark-paid-btn"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span className="paid-info">
                            Paid on {formatDate(payout.paidAt.toDate())}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVENUE REPORTS TAB */}
      {activeTab === 'revenue' && (
        <div className="accounts-section">
          <div className="accounts-filters">
            <select 
              value={revenueFilters.currency} 
              onChange={(e) => setRevenueFilters({...revenueFilters, currency: e.target.value})}
            >
              <option value="all">All Currencies</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>

            <select 
              value={revenueFilters.month} 
              onChange={(e) => setRevenueFilters({...revenueFilters, month: e.target.value})}
            >
              <option value="all">All Months</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>

            <select 
              value={revenueFilters.year} 
              onChange={(e) => setRevenueFilters({...revenueFilters, year: e.target.value})}
            >
              <option value="all">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>

            <button onClick={() => downloadRevenueCSV('INR')} className="accounts-download-btn">
              📥 Download INR CSV
            </button>
            <button onClick={() => downloadRevenueCSV('USD')} className="accounts-download-btn">
              📥 Download USD CSV
            </button>
          </div>

          {/* INR Revenue Table */}
          <h3 className="revenue-section-title">India Revenue (₹ INR)</h3>
          <div className="accounts-table-container">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Country</th>
                  <th>Total Payments</th>
                  <th>Total Amount</th>
                  <th>Individual</th>
                  <th>Family</th>
                  <th>With Referral</th>
                  <th>Shared Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenue.filter(r => r.currency === 'INR').length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{textAlign: 'center'}}>No INR revenue reports</td>
                  </tr>
                ) : (
                  filteredRevenue.filter(r => r.currency === 'INR').map(report => (
                    <tr key={report.id}>
                      <td>{report.reportPeriod}</td>
                      <td>{report.country}</td>
                      <td>{report.totalPayments}</td>
                      <td>₹{report.totalAmount}</td>
                      <td>{report.individualCount} (₹{report.individualAmount})</td>
                      <td>{report.familyCount} (₹{report.familyAmount})</td>
                      <td>{report.withReferralCount} (₹{report.withReferralAmount})</td>
                      <td>{formatDate(report.sharedAt.toDate())}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* USD Revenue Table */}
          <h3 className="revenue-section-title">International Revenue ($ USD)</h3>
          <div className="accounts-table-container">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Country</th>
                  <th>Total Payments</th>
                  <th>Total Amount</th>
                  <th>Individual</th>
                  <th>Family</th>
                  <th>With Referral</th>
                  <th>Shared Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenue.filter(r => r.currency === 'USD').length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{textAlign: 'center'}}>No USD revenue reports</td>
                  </tr>
                ) : (
                  filteredRevenue.filter(r => r.currency === 'USD').map(report => (
                    <tr key={report.id}>
                      <td>{report.reportPeriod}</td>
                      <td>{report.country}</td>
                      <td>{report.totalPayments}</td>
                      <td>${report.totalAmount}</td>
                      <td>{report.individualCount} (${report.individualAmount})</td>
                      <td>{report.familyCount} (${report.familyAmount})</td>
                      <td>{report.withReferralCount} (${report.withReferralAmount})</td>
                      <td>{formatDate(report.sharedAt.toDate())}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOWNLOAD ALL DATA TAB */}
      {activeTab === 'download' && (
        <div className="accounts-section">
          <h2>Download Data for Auditors</h2>
          <p>Select date range and download complete reports</p>

          <div className="download-filters">
            <div className="date-range">
              <div className="date-input">
                <label>From:</label>
                <select 
                  value={downloadFilters.fromMonth}
                  onChange={(e) => setDownloadFilters({...downloadFilters, fromMonth: parseInt(e.target.value)})}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </select>
                <select 
                  value={downloadFilters.fromYear}
                  onChange={(e) => setDownloadFilters({...downloadFilters, fromYear: parseInt(e.target.value)})}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div className="date-input">
                <label>To:</label>
                <select 
                  value={downloadFilters.toMonth}
                  onChange={(e) => setDownloadFilters({...downloadFilters, toMonth: parseInt(e.target.value)})}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </select>
                <select 
                  value={downloadFilters.toYear}
                  onChange={(e) => setDownloadFilters({...downloadFilters, toYear: parseInt(e.target.value)})}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
            </div>

            <div className="download-buttons">
              <h3>User Payments (Revenue)</h3>
              <button onClick={() => downloadAllUserPayments('INR')} className="download-large-btn">
                📥 Download INR Payments CSV
              </button>
              <button onClick={() => downloadAllUserPayments('USD')} className="download-large-btn">
                📥 Download USD Payments CSV
              </button>

              <h3>Ambassador Payouts (Expenses)</h3>
              <button onClick={downloadAllPayouts} className="download-large-btn">
                📥 Download All Payouts CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedPayout && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Mark Payout as Paid</h2>
            
            <div className="modal-info">
              <p><strong>Ambassador:</strong> {selectedPayout.ambassadorName}</p>
              <p><strong>Referral Code:</strong> {selectedPayout.referralCode}</p>
              <p><strong>Period:</strong> {getMonthName(selectedPayout.month)} {selectedPayout.year}</p>
              <p><strong>Commission Amount:</strong> {selectedPayout.currencySymbol}{selectedPayout.commissionAmount}</p>
              <p><strong>Bank Account:</strong> {selectedPayout.bankAccountNumber}</p>
              {selectedPayout.bankIFSC && <p><strong>IFSC:</strong> {selectedPayout.bankIFSC}</p>}
            </div>

            <div className="modal-form">
              <label>Payment Method:</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="PayPal">PayPal</option>
              </select>

              <label>Payment Note / Transaction Reference:</label>
              <input 
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., UPI TXN: 123456789"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleMarkAsPaid} className="confirm-btn">Confirm Payment</button>
              <button onClick={() => setShowPaymentModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsDashboard;