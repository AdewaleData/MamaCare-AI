import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import GovernmentDashboardPage from './pages/GovernmentDashboardPage';
import RecommendationsPage from './pages/RecommendationsPage';
import PregnancyPage from './pages/pregnancy/PregnancyPage';
import HealthRecordsPage from './pages/health/HealthRecordsPage';
import NewHealthRecordPage from './pages/health/NewHealthRecordPage';
import HealthRecordDetailPage from './pages/health/HealthRecordDetailPage';
import RiskAssessmentPage from './pages/RiskAssessmentPage';
import RiskGaugeDemo from './components/RiskGaugeDemo';
import EmergencyPage from './pages/EmergencyPage';
import EmergencyContactsPage from './pages/EmergencyContactsPage';
import ProfilePage from './pages/ProfilePage';
import AppointmentsPage from './pages/AppointmentsPage';
import ProviderAppointmentsPage from './pages/ProviderAppointmentsPage';
import HospitalsPage from './pages/HospitalsPage';
import RiskAssessmentHistoryPage from './pages/RiskAssessmentHistoryPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ChatPage from './pages/ChatPage';
import ProvidersPage from './pages/ProvidersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  // Simple check: look in localStorage directly (most reliable)
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  
  React.useEffect(() => {
    // Check if we have a token
    const token = localStorage.getItem('access_token');
    const hasToken = !!token;
    
    // If we have token in localStorage but not in store, sync it
    if (hasToken) {
      const storeToken = useAuthStore.getState().token;
      if (!storeToken) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            useAuthStore.setState({ token, user: parsedUser });
          } catch {
            // Invalid user data, but we still have token
            useAuthStore.setState({ token, user: null });
          }
        } else {
          useAuthStore.setState({ token, user: null });
        }
      }
    }
    
    setIsAuthenticated(hasToken);
  }, []);
  
  // Wait for initial check - show loading instead of blank
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <div className="text-center fade-in">
          <div className="relative">
            <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary-200 border-r-primary-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-primary-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading MamaCare AI...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait</p>
        </div>
      </div>
    );
  }
  
  // If no token, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If we have token, show children
  return <>{children}</>;
}

function PublicRoute({ children, allowAuthenticated = false }: { children: React.ReactNode; allowAuthenticated?: boolean }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  
  // Use React.useMemo to prevent unnecessary re-renders - MUST be called before any conditional returns
  const shouldRedirect = React.useMemo(() => {
    return !!token && !!user;
  }, [token, user]);
  
  // If allowAuthenticated is true (for home page), show content regardless of auth status
  if (allowAuthenticated) {
    return <>{children}</>;
  }
  
  if (!shouldRedirect) {
    return <>{children}</>;
  }
  
  // Redirect based on role
  const role = user?.role || 'patient';
  if (role === 'provider') {
    return <Navigate to="/app/provider-dashboard" replace />;
  }
  if (role === 'government') {
    return <Navigate to="/app/government-dashboard" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute allowAuthenticated={true}><HomePage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="provider-dashboard" element={<ProviderDashboardPage />} />
          <Route path="government-dashboard" element={<GovernmentDashboardPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="pregnancy" element={<PregnancyPage />} />
          <Route path="health" element={<HealthRecordsPage />} />
          <Route path="health/new" element={<NewHealthRecordPage />} />
          <Route path="health/:id" element={<HealthRecordDetailPage />} />
          <Route path="risk-assessment" element={<RiskAssessmentPage />} />
          <Route path="risk-assessment/history" element={<RiskAssessmentHistoryPage />} />
          <Route path="risk-gauge-demo" element={<RiskGaugeDemo />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="provider-appointments" element={<ProviderAppointmentsPage />} />
          <Route path="hospitals" element={<HospitalsPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="emergency/contacts" element={<EmergencyContactsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        
        {/* Legacy routes - redirect to /app/* */}
        <Route path="/dashboard" element={<PrivateRoute><Navigate to="/app/dashboard" replace /></PrivateRoute>} />
        <Route path="/provider-dashboard" element={<PrivateRoute><Navigate to="/app/provider-dashboard" replace /></PrivateRoute>} />
        <Route path="/government-dashboard" element={<PrivateRoute><Navigate to="/app/government-dashboard" replace /></PrivateRoute>} />
        <Route path="/health/new" element={<PrivateRoute><Navigate to="/app/health/new" replace /></PrivateRoute>} />
        <Route path="/health" element={<PrivateRoute><Navigate to="/app/health" replace /></PrivateRoute>} />
        <Route path="/risk-assessment" element={<PrivateRoute><Navigate to="/app/risk-assessment" replace /></PrivateRoute>} />
        <Route path="/emergency/contacts" element={<PrivateRoute><Navigate to="/app/emergency/contacts" replace /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

