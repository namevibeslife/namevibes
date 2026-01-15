import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LearnMore from './pages/LearnMore';
import ClearCache from './pages/ClearCache';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PaymentPage from './pages/PaymentPage';
import ProfileComplete from './pages/ProfileComplete';
import Dashboard from './pages/Dashboard';
import AnalyzeName from './pages/AnalyzeName';
import ZodiacSyllableTable from './pages/ZodiacSyllableTable';
import NumerologyCalculator from './pages/NumerologyCalculator';
import FamilyPackage from './pages/FamilyPackage';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import AmbassadorLogin from './pages/AmbassadorLogin';
import AmbassadorRegistration from './pages/AmbassadorRegistration';
import AmbassadorDashboard from './pages/AmbassadorDashboard';
import AdminPanel from './pages/AdminPanel';
import ElementInsightsPage from './pages/ElementInsightsPage';
import AccountsDashboard from './pages/AccountsDashboard';

function ProtectedRoute({ children, requiresAuth = true }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (requiresAuth && !user) {
    return <Navigate to="/login" />;
  }
  
  if (!requiresAuth && user) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/clear-cache" element={<ClearCache />} />
        <Route path="/login" element={<ProtectedRoute requiresAuth={false}><LoginPage /></ProtectedRoute>} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/profile-complete" element={<ProtectedRoute><ProfileComplete /></ProtectedRoute>} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analyze" element={<ProtectedRoute><AnalyzeName /></ProtectedRoute>} />
        <Route path="/family" element={<ProtectedRoute><FamilyPackage /></ProtectedRoute>} />
        <Route path="/zodiac-syllables" element={<ProtectedRoute><ZodiacSyllableTable /></ProtectedRoute>} />
        <Route path="/numerology-calculator" element={<ProtectedRoute><NumerologyCalculator /></ProtectedRoute>} />
        <Route path="/element-insights" element={<ProtectedRoute><ElementInsightsPage /></ProtectedRoute>} />
        
        <Route path="/ambassador" element={<AmbassadorLogin />} />
        <Route path="/ambassador/register" element={<AmbassadorRegistration />} />
        <Route path="/ambassador/dashboard" element={<AmbassadorDashboard />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/accounts" element={<AccountsDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;