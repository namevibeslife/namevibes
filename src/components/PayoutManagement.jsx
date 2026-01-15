import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
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

function PayoutManagement({ currentAdmin, onUpdate }) {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    country: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, payoutRequests]);

  const fetchPayoutRequests = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payoutRequests];

    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.country !== 'all') {
      filtered = filtered.filter(p => p.country === filters.country);
    }

    if (filters.month !== 'all') {
      filtered = filtered.filter(p => p.month === parseInt(filters.month));
    }

    if (filters.year !== 'all') {
      filtered = filtered.filter(p => p.year === parseInt(filters.year));
    }

    setFilteredPayouts(filtered);
  };

  const handleMarkAsPaid = async () => {
    if (!paymentNote.trim()) {
      alert('Please enter payment note/transaction reference');
      return;
    }

    try {
      const payoutRef = doc(db, 'payoutRequests', selectedPayout.id);
      await updateDoc(payoutRef, {
        status: 'paid',
        paidBy: currentAdmin.email,
        paidAt: Timestamp.now(),
        paymentNote: paymentNote,
        paymentMethod: paymentMethod
      });

      alert('Payment marked as paid successfully!');
      setShowModal(false);
      setPaymentNote('');
      setPaymentMethod('Bank Transfer');
      setSelectedPayout(null);
      fetchPayoutRequests();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error updating payment status');
    }
  };

  const downloadCSV = () => {
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

  const getUniqueCountries = () => {
    const countries = [...new Set(payoutRequests.map(p => p.country))];
    return countries.sort();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading payout requests...</div>;
  }

  return (
    <div className="payout-management">
      <div className="payout-filters">
        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>

        <select 
          value={filters.country} 
          onChange={(e) => setFilters({...filters, country: e.target.value})}
        >
          <option value="all">All Countries</option>
          {getUniqueCountries().map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

        <select 
          value={filters.month} 
          onChange={(e) => setFilters({...filters, month: e.target.value})}
        >
          <option value="all">All Months</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
          ))}
        </select>

        <select 
          value={filters.year} 
          onChange={(e) => setFilters({...filters, year: e.target.value})}
        >
          <option value="all">All Years</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>

        <button onClick={downloadCSV} className="download-csv-btn">
          📥 Download CSV
        </button>
      </div>

      <div className="payout-table-container">
        <table className="payout-table">
          <thead>
            <tr>
              <th>Month/Year</th>
              <th>Ambassador</th>
              <th>Referral Code</th>
              <th>Country</th>
              <th>Sales</th>
              <th>Total Sales</th>
              <th>Commission</th>
              <th>Bank Details</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayouts.length === 0 ? (
              <tr>
                <td colSpan="10" style={{textAlign: 'center', padding: '40px'}}>
                  No payout requests found
                </td>
              </tr>
            ) : (
              filteredPayouts.map(payout => (
                <tr key={payout.id}>
                  <td>{getMonthName(payout.month)} {payout.year}</td>
                  <td>
                    <strong>{payout.ambassadorName}</strong>
                    <br />
                    <small style={{color: '#666'}}>{payout.ambassadorEmail}</small>
                  </td>
                  <td>{payout.referralCode}</td>
                  <td>
                    {payout.country}
                    <br />
                    <small style={{color: '#666'}}>{payout.state}</small>
                  </td>
                  <td>{payout.salesCount}</td>
                  <td>{payout.currencySymbol}{payout.totalSales}</td>
                  <td>
                    <strong style={{color: '#28a745'}}>
                      {payout.currencySymbol}{payout.commissionAmount}
                    </strong>
                  </td>
                  <td>
                    <small>
                      {payout.bankAccountNumber}
                      {payout.bankIFSC && <><br />IFSC: {payout.bankIFSC}</>}
                    </small>
                  </td>
                  <td>
                    <span className={`payout-status-badge ${payout.status}`}>
                      {payout.status.toUpperCase()}
                    </span>
                    {payout.status === 'paid' && payout.paidAt && (
                      <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                        {formatDate(payout.paidAt.toDate())}
                      </div>
                    )}
                  </td>
                  <td>
                    {payout.status === 'pending' ? (
                      <button 
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowModal(true);
                        }}
                        className="payout-mark-paid-btn"
                      >
                        Mark as Paid
                      </button>
                    ) : (
                      <div style={{fontSize: '12px', color: '#28a745'}}>
                        <strong>✓ Paid</strong>
                        {payout.paymentNote && (
                          <div style={{fontSize: '11px', marginTop: '3px'}}>
                            {payout.paymentNote}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {filteredPayouts.length > 0 && (
        <div className="payout-summary">
          <div className="summary-card">
            <h4>Total Requests</h4>
            <p>{filteredPayouts.length}</p>
          </div>
          <div className="summary-card">
            <h4>Pending</h4>
            <p>{filteredPayouts.filter(p => p.status === 'pending').length}</p>
          </div>
          <div className="summary-card">
            <h4>Paid</h4>
            <p>{filteredPayouts.filter(p => p.status === 'paid').length}</p>
          </div>
          <div className="summary-card">
            <h4>Total Commission (All)</h4>
            <p>
              {filteredPayouts.reduce((sum, p) => sum + p.commissionAmount, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && selectedPayout && (
        <div className="payout-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="payout-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Mark Payout as Paid</h2>
            
            <div className="payout-modal-info">
              <div className="info-row">
                <span className="info-label">Ambassador:</span>
                <span className="info-value">{selectedPayout.ambassadorName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Referral Code:</span>
                <span className="info-value">{selectedPayout.referralCode}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Period:</span>
                <span className="info-value">{getMonthName(selectedPayout.month)} {selectedPayout.year}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Commission Amount:</span>
                <span className="info-value" style={{color: '#28a745', fontWeight: 'bold', fontSize: '18px'}}>
                  {selectedPayout.currencySymbol}{selectedPayout.commissionAmount}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Bank Account:</span>
                <span className="info-value">{selectedPayout.bankAccountNumber}</span>
              </div>
              {selectedPayout.bankIFSC && (
                <div className="info-row">
                  <span className="info-label">IFSC Code:</span>
                  <span className="info-value">{selectedPayout.bankIFSC}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Bank Name:</span>
                <span className="info-value">{selectedPayout.bankName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Account Holder:</span>
                <span className="info-value">{selectedPayout.accountHolderName}</span>
              </div>
            </div>

            <div className="payout-modal-form">
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
                <option value="Wire Transfer">Wire Transfer</option>
              </select>

              <label>Payment Note / Transaction Reference: *</label>
              <input 
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., UPI TXN: 123456789 or Bank Ref: ABC123"
                required
              />
            </div>

            <div className="payout-modal-actions">
              <button onClick={handleMarkAsPaid} className="payout-confirm-btn">
                Confirm Payment
              </button>
              <button onClick={() => setShowModal(false)} className="payout-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .payout-management {
          margin-top: 20px;
        }

        .payout-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .payout-filters select {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
          cursor: pointer;
          background: white;
        }

        .download-csv-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .download-csv-btn:hover {
          background: #218838;
        }

        .payout-table-container {
          overflow-x: auto;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .payout-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .payout-table thead tr {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .payout-table th {
          padding: 15px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }

        .payout-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }

        .payout-table tbody tr:hover {
          background: #f8f9fa;
        }

        .payout-status-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }

        .payout-status-badge.pending {
          background: #ffc107;
          color: #856404;
        }

        .payout-status-badge.paid {
          background: #28a745;
          color: white;
        }

        .payout-mark-paid-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
        }

        .payout-mark-paid-btn:hover {
          background: #764ba2;
        }

        .payout-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 30px;
        }

        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }

        .summary-card h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .summary-card p {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }

        .payout-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .payout-modal-content {
          background: white;
          padding: 30px;
          border-radius: 15px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .payout-modal-content h2 {
          margin: 0 0 20px 0;
          color: #667eea;
        }

        .payout-modal-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #dee2e6;
        }

        .info-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .info-label {
          font-weight: 600;
          color: #667eea;
          font-size: 14px;
        }

        .info-value {
          color: #333;
          font-size: 14px;
          text-align: right;
        }

        .payout-modal-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
        }

        .payout-modal-form label {
          font-weight: 600;
          color: #667eea;
          font-size: 14px;
        }

        .payout-modal-form select,
        .payout-modal-form input {
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }

        .payout-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .payout-confirm-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
        }

        .payout-confirm-btn:hover {
          background: #218838;
        }

        .payout-cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 5px;
          cursor: pointer;
        }

        .payout-cancel-btn:hover {
          background: #5a6268;
        }

        @media (max-width: 768px) {
          .payout-filters {
            flex-direction: column;
          }

          .payout-table {
            font-size: 12px;
          }

          .payout-table th,
          .payout-table td {
            padding: 10px;
          }

          .payout-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default PayoutManagement;