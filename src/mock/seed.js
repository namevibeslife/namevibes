import { FRAMED_SIZES, ACRYLIC_SIZES } from '../merch/catalog.js';
import { FRAME_MM } from '../merch/frames.js';

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

// ---- Merchandise TEST data for mock mode only (never real Qikink data) ----------------------------------------------------------------
// The shipped catalogue starts with everything DISABLED and every print area unverified. For offline testing this seeds TEST print areas
// (the nominal paper sizes, marked mockOnly + verified so the designer works), TEST prices and a few enabled products. The real launch
// configuration (admin -> Apply launch configuration) starts with the global and India switches OFF and no prices.
const mm2in = (mm) => Math.round((mm / 25.4) * 100) / 100;
function merchSeed() {
  const bySize = (sizes) => Object.fromEntries(sizes.map((s) => [s, { maxWidthInches: mm2in(FRAME_MM[s][0]), maxHeightInches: mm2in(FRAME_MM[s][1]), verified: true }]));
  const mock = { allowedPlacements: ['fr'], minDpi: 150, verified: true, mockOnly: true };
  return {
    'merch_settings/global': { visibleTo: 'everyone', enabled: true, message: '' },
    'merch_settings/commission': { enabled: true, type: 'percent_margin', value: 20, cap: 0, holdDays: 14, overrides: {} },
    'merch_products/poster': { id: 'poster', enabled: true, verification: { sampleApproved: true }, printSpec: { ...mock, printTypeId: 1, perSize: true, bySize: bySize(FRAMED_SIZES) } },
    'merch_products/acrylic': { id: 'acrylic', enabled: true, verification: { sampleApproved: true }, printSpec: { ...mock, printTypeId: 5, perSize: true, bySize: bySize(ACRYLIC_SIZES) } },
    'merch_products/mug': { id: 'mug', enabled: true, verification: { sampleApproved: true } },
    'merch_products/steel-bottle': { id: 'steel-bottle', enabled: true, verification: { sampleApproved: true }, printSpec: { ...mock, printTypeId: 5, maxWidthInches: 2, maxHeightInches: 4 } },
    'merch_products/tshirt': { id: 'tshirt', enabled: false },
    'merch_products/notebook': { id: 'notebook', enabled: false },
    'merch_countries/IN': {
      countryCode: 'IN', enabled: true, currency: 'INR', taxPercent: 18, taxIncluded: true,
      taxByProduct: { poster: 18, acrylic: 18, 'acrylic-stand': 18, mug: 5, 'steel-bottle': 18 },
      collections: { name_elements: true, blood_group: true },
      prices: { 'poster:A4': 599, 'poster:A3': 899, 'poster:8x8': 449, 'poster:8x10': 499, 'poster:10x10': 549, 'poster:11x14': 649, 'poster:12x12': 699, 'poster:12x16': 749, 'poster:12x18': 799,
        'acrylic:A4': 499, 'acrylic:A3': 749, 'acrylic:8x8': 399, 'acrylic:12x12': 599, 'acrylic:16x16': 899, 'acrylic:16x24': 1199, 'acrylic-stand': 249, mug: 399, 'steel-bottle': 599 },
      costs: { 'poster:A4': 212, 'poster:A3': 326, mug: 115, 'steel-bottle': 213 }, disabledProducts: {},
      shipping: { flat: 60, freeAbove: 1500 }, paymentFeePercent: 2.5, providerPrimary: 'mock', providerBackup: 'mock2', gatewayOverride: 'auto'
    },
    'merch_countries/US': {
      countryCode: 'US', enabled: false, currency: 'USD', taxPercent: 0, taxIncluded: false,
      collections: { name_elements: true, blood_group: true }, prices: { 'poster:A4': 25, 'poster:A3': 35, mug: 15 }, disabledProducts: {}, shipping: { flat: 5, freeAbove: 0 }, providerPrimary: 'mock'
    }
  };
}


export const SEED_DATA = {
  // Merchandise (print-on-demand) TEST configuration for mock mode only. Launch scope: framed posters (A4/A3) and blood-group mugs are
  // the enabled products; T-shirts and notebooks are off. Global and India are ON here so the flows can be exercised; the real launch
  // configuration (admin -> Apply launch configuration) starts with the global and India switches OFF and no prices.
  // The printSpec values on poster and mug below are MOCK TEST VALUES (not Qikink data) so the designer can be tried offline.
  'merch_settings/global': { visibleTo: 'everyone', enabled: true, message: '' },
  'merch_settings/commission': { enabled: true, type: 'percent_margin', value: 20, cap: 0, holdDays: 14, overrides: {} },
  ...merchSeed(),
  'merch_providers/mock': { id: 'mock', name: 'Mock provider', adapter: 'mock', active: true, countries: ['IN', 'US'] },
  'merch_providers/mock2': { id: 'mock2', name: 'Mock backup', adapter: 'mock', active: true, countries: ['IN'] },
  // Inactive Qikink entry (sandbox). Real SKUs/print specs must be filled in admin; the launch preset writes unverified starter SKUs.
  'merch_providers/qikink': { id: 'qikink', name: 'Qikink (sandbox)', adapter: 'qikink', active: false, liveEnabled: false, countries: ['IN'] },
  // Country Pricing (admin) - the app shows prices from these records only
  'countrySettings/mock-in': { countryCode: 'IN', countryName: 'India', currency: 'INR', symbol: '₹', price: 399, referralDiscount: 10, taxPercent: 18, isActive: true },
  'countrySettings/mock-us': { countryCode: 'US', countryName: 'United States', currency: 'USD', symbol: '$', price: 25, referralDiscount: 10, taxPercent: 0, isActive: true },
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
    createdAt: daysAgo(70)
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
