// Test accounts and starting data for mock mode (`npm run dev:mock`).
// Everything lives in the browser's localStorage; "Reset mock data" in the mock badge restores this.

export const MOCK_ACCOUNTS = [
  { uid: 'mock-new', email: 'newuser@namevibes.test', displayName: 'New User', description: 'brand new, no profile' },
  { uid: 'mock-unpaid', email: 'unpaid@namevibes.test', displayName: 'Unpaid User', description: 'profile done, no plan' },
  { uid: 'mock-individual', email: 'individual@namevibes.test', displayName: 'Indira Individual', description: 'Individual plan, India' },
  { uid: 'mock-family', email: 'family@namevibes.test', displayName: 'Farah Family', description: 'Family plan, USA' },
  { uid: 'mock-admin', email: 'admin@namevibes.test', displayName: 'Super Admin', description: 'super admin' },
  { uid: 'mock-accounts', email: 'accounts@namevibes.test', displayName: 'Accounts Admin', description: 'admin with Accounts access' },
  { uid: 'mock-ambassador', email: 'ambassador@namevibes.test', displayName: 'Arjun Ambassador', description: 'approved ambassador (IN KL 00001)' },
  { uid: 'mock-pending', email: 'pending@namevibes.test', displayName: 'Priya Pending', description: 'ambassador awaiting approval' }
];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

export const SEED_DATA = {
  'users/mock-unpaid': {
    fullName: 'Uma Unpaid', dob: '1990-05-14', gender: 'Female',
    countryCode: 'IN', countryName: 'India', stateCode: 'KA', stateName: 'Karnataka',
    referralCode: '', email: 'unpaid@namevibes.test', profileComplete: true, createdAt: daysAgo(3)
  },
  'users/mock-individual': {
    fullName: 'Indira Individual', dob: '1988-11-02', gender: 'Female',
    countryCode: 'IN', countryName: 'India', stateCode: 'KL', stateName: 'Kerala',
    referralCode: 'IN KL 00001', ambassadorEmail: 'ambassador@namevibes.test',
    email: 'individual@namevibes.test', profileComplete: true, createdAt: daysAgo(40),
    planType: 'individual', planActive: true, paidAmount: 89, paidAt: daysAgo(40),
    planExpiry: daysAhead(325), renewalDate: daysAhead(325)
  },
  'users/mock-individual/analyses/seed-a1': {
    type: 'individual', fullName: 'Indira Nair', elementCount: 5, timestamp: daysAgo(2)
  },
  'users/mock-family': {
    fullName: 'Farah Family', dob: '1985-03-21', gender: 'Female',
    countryCode: 'US', countryName: 'United States', stateCode: 'CA', stateName: 'California',
    referralCode: '', email: 'family@namevibes.test', profileComplete: true, createdAt: daysAgo(340),
    planType: 'family', planActive: true, paidAmount: 6, paidAt: daysAgo(340),
    planExpiry: daysAhead(25), renewalDate: daysAhead(25)
  },
  'users/mock-ambassador-referral-2': {
    fullName: 'Karthik Menon', dob: '1992-07-09', gender: 'Male',
    countryCode: 'IN', countryName: 'India', stateCode: 'KL', stateName: 'Kerala',
    referralCode: 'IN KL 00001', ambassadorEmail: 'ambassador@namevibes.test',
    email: 'karthik@example.test', profileComplete: true, createdAt: daysAgo(10),
    planType: 'family', planActive: true, paidAmount: 239, paidAt: daysAgo(10),
    planExpiry: daysAhead(355), renewalDate: daysAhead(355)
  },

  'payments/mock-individual_1': {
    userId: 'mock-individual', userEmail: 'individual@namevibes.test', planType: 'individual',
    amount: 89, currency: 'INR', gateway: 'mock', transactionId: 'mock_txn_1',
    referralCode: 'IN KL 00001', status: 'success', createdAt: daysAgo(40)
  },
  'payments/mock-family_1': {
    userId: 'mock-family', userEmail: 'family@namevibes.test', planType: 'family',
    amount: 6, currency: 'USD', gateway: 'mock', transactionId: 'mock_txn_2',
    referralCode: null, status: 'success', createdAt: daysAgo(340)
  },
  'payments/mock-ambassador-referral-2_1': {
    userId: 'mock-ambassador-referral-2', userEmail: 'karthik@example.test', planType: 'family',
    amount: 239, currency: 'INR', gateway: 'mock', transactionId: 'mock_txn_3',
    referralCode: 'IN KL 00001', status: 'success', createdAt: daysAgo(10)
  },

  'admins/admin@namevibes.test': {
    email: 'admin@namevibes.test', role: 'super', countries: ['ALL'], states: ['ALL'],
    features: ['users', 'payments', 'ambassadors', 'countries', 'Accounts'], createdAt: daysAgo(100)
  },
  'admins/accounts@namevibes.test': {
    email: 'accounts@namevibes.test', role: 'admin', countries: ['ALL'], states: ['ALL'],
    features: ['payments', 'Accounts'], createdAt: daysAgo(50)
  },

  'ambassadors/mock-amb-1': {
    fullName: 'Arjun Ambassador', firstName: 'Arjun', middleName: '', lastName: 'Ambassador',
    email: 'ambassador@namevibes.test', mobileNumber: '+91 90000 00001', gender: 'Male',
    countryCode: 'IN', countryName: 'India', stateCode: 'KL', stateName: 'Kerala', city: 'Kochi',
    bankAccountName: 'Arjun Ambassador', bankName: 'Test Bank', accountNumber: '000011112222',
    accountType: 'savings', ifscCode: 'TEST0000001', upiId: 'arjun@testupi', panNumber: 'ABCDE1234F',
    idType: 'Aadhaar', idNumber: '0000 0000 0000',
    isApproved: true, isActive: true, approvedAt: daysAgo(60), approvedBy: 'admin@namevibes.test',
    referralCode: 'IN KL 00001', payoutFrequency: 'monthly',
    commissionRateIndividual: 15, commissionRateFamily: 25, createdAt: daysAgo(70)
  },
  'ambassadors/mock-amb-2': {
    fullName: 'Priya Pending', firstName: 'Priya', middleName: '', lastName: 'Pending',
    email: 'pending@namevibes.test', mobileNumber: '+91 90000 00002', gender: 'Female',
    countryCode: 'IN', countryName: 'India', stateCode: 'TN', stateName: 'Tamil Nadu', city: 'Chennai',
    bankAccountName: 'Priya Pending', bankName: 'Test Bank', accountNumber: '000033334444',
    accountType: 'savings', ifscCode: 'TEST0000002', idType: 'Aadhaar', idNumber: '0000 0000 0001',
    isApproved: false, isActive: false, createdAt: daysAgo(1)
  },
  'referralCodes/INKL00001': {
    code: 'IN KL 00001', ambassadorEmail: 'ambassador@namevibes.test', ambassadorId: 'mock-amb-1', active: true
  },

  'payoutRequests/mock-payout-1': {
    type: 'ambassador_payout', referralCode: 'IN KL 00001', ambassadorName: 'Arjun Ambassador',
    ambassadorEmail: 'ambassador@namevibes.test', month: String(daysAgo(35).getMonth()), year: String(daysAgo(35).getFullYear()),
    country: 'India', state: 'Kerala', countryCode: 'IN', stateCode: 'KL',
    currency: 'INR', currencySymbol: '₹', salesCount: 1, totalSales: 89, commissionAmount: 13.35,
    bankAccountNumber: '000011112222', bankIFSC: 'TEST0000001', bankName: 'Test Bank',
    accountHolderName: 'Arjun Ambassador', status: 'pending', sharedBy: 'admin@namevibes.test',
    sharedAt: daysAgo(5), paidBy: null, paidAt: null, paymentNote: ''
  }
};
