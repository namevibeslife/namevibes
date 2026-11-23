import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { isPlanActive } from './utils/plan';
import UserNav from './components/UserNav';
import LandingPage from './pages/LandingPage';

// Pages load on demand so the first visit only downloads what it needs
const LearnMore = lazy(() => import('./pages/LearnMore'));
const ClearCache = lazy(() => import('./pages/ClearCache'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const ProfileComplete = lazy(() => import('./pages/ProfileComplete'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AnalyzeName = lazy(() => import('./pages/AnalyzeName'));
const ZodiacSyllableTable = lazy(() => import('./pages/ZodiacSyllableTable'));
const NumerologyCalculator = lazy(() => import('./pages/NumerologyCalculator'));
const HoraMuhurat = lazy(() => import('./pages/HoraMuhurat'));
const FamilyPackage = lazy(() => import('./pages/FamilyPackage'));
const AnalysisView = lazy(() => import('./pages/AnalysisView'));
const FamilyAnalysisView = lazy(() => import('./pages/FamilyAnalysisView'));
const Pricing = lazy(() => import('./pages/Pricing'));
import LanguageSync from './components/LanguageSync';
const Settings = lazy(() => import('./pages/Settings'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const AmbassadorHome = lazy(() => import('./pages/AmbassadorHome'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ElementInsightsPage = lazy(() => import('./pages/ElementInsightsPage'));
const AccountsDashboard = lazy(() => import('./pages/AccountsDashboard'));
const MerchStore = lazy(() => import('./pages/MerchStore'));
const MerchCart = lazy(() => import('./pages/MerchCart'));
const MerchOrderList = lazy(() => import('./pages/MerchOrders').then((m) => ({ default: m.MerchOrderList })));
const MerchOrderDetail = lazy(() => import('./pages/MerchOrders').then((m) => ({ default: m.MerchOrderDetail })));
const MerchAdmin = lazy(() => import('./pages/MerchAdmin'));
const MerchReturnsPolicy = lazy(() => import('./pages/MerchReturnsPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
    </div>
  );
}

// Where a signed-in user belongs next: finish the profile, then choose a plan, then the dashboard
function homeFor(profile) {
  if (!profile?.profileComplete) return '/profile-complete';
  if (!isPlanActive(profile)) return '/pricing';
  return '/dashboard';
}

/**
 * Route guard.
 * - requiresAuth={false}: only for signed-out visitors (login page)
 * - requiresProfile: the profile form must be completed
 * - requiresPlan: an active paid plan is needed
 * - requiresFamily: an active plan that includes the Family Package is needed
 */
function ProtectedRoute({ children, requiresAuth = true, requiresProfile, requiresPlan, requiresFamily }) {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!requiresAuth) {
    return user ? <Navigate to={homeFor(profile)} replace /> : children;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if ((requiresProfile || requiresPlan || requiresFamily) && !profile?.profileComplete) {
    return <Navigate to="/profile-complete" replace />;
  }
  if ((requiresPlan || requiresFamily) && !isPlanActive(profile)) {
    return <Navigate to="/pricing" replace state={{ reason: 'plan-required' }} />;
  }
  if (requiresFamily && profile.planType !== 'family') {
    return <Navigate to="/pricing" replace state={{ reason: 'family-required' }} />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageSync />
      <UserNav />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/clear-cache" element={<ClearCache />} />
          <Route path="/login" element={<ProtectedRoute requiresAuth={false}><LoginPage /></ProtectedRoute>} />
          <Route path="/learn-more" element={<LearnMore />} />
          <Route path="/profile-complete" element={<ProtectedRoute><ProfileComplete /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute requiresProfile><Pricing /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute requiresProfile><PaymentPage /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute requiresProfile><Dashboard /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute requiresPlan><AnalyzeName /></ProtectedRoute>} />
          <Route path="/family" element={<ProtectedRoute requiresFamily><FamilyPackage /></ProtectedRoute>} />
          <Route path="/analysis/:analysisId" element={<ProtectedRoute requiresProfile><AnalysisView /></ProtectedRoute>} />
          <Route path="/family-analysis/:analysisId" element={<ProtectedRoute requiresProfile><FamilyAnalysisView /></ProtectedRoute>} />
          <Route path="/zodiac-syllables" element={<ProtectedRoute requiresPlan><ZodiacSyllableTable /></ProtectedRoute>} />
          <Route path="/hora-muhurat" element={<ProtectedRoute requiresPlan><HoraMuhurat /></ProtectedRoute>} />
          <Route path="/numerology-calculator" element={<ProtectedRoute requiresPlan><NumerologyCalculator /></ProtectedRoute>} />
          <Route path="/element-insights" element={<ProtectedRoute requiresPlan><ElementInsightsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          {/* Any signed-in user: no profile or plan requirement */}
          <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

          {/* Ambassadors are invite-only: no public sign-up. Old links land on the ambassador page. */}
          <Route path="/ambassador" element={<AmbassadorHome />} />
          <Route path="/ambassador/register" element={<Navigate to="/ambassador" replace />} />
          <Route path="/ambassador/dashboard" element={<Navigate to="/ambassador?tab=followers" replace />} />
          {/* Merchandise: any signed-in user with a completed profile; availability is decided by the server */}
          <Route path="/merch" element={<ProtectedRoute requiresProfile><MerchStore /></ProtectedRoute>} />
          <Route path="/merch/cart" element={<ProtectedRoute requiresProfile><MerchCart /></ProtectedRoute>} />
          <Route path="/merch/orders" element={<ProtectedRoute requiresProfile><MerchOrderList /></ProtectedRoute>} />
          <Route path="/merch/orders/:id" element={<ProtectedRoute requiresProfile><MerchOrderDetail /></ProtectedRoute>} />
          <Route path="/merch/returns-policy" element={<MerchReturnsPolicy />} />
          <Route path="/admin/merch" element={<ProtectedRoute><MerchAdmin /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/accounts" element={<AccountsDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
