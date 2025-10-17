import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { MobileLayout } from './components/layout/MobileLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Health Pages
import { HealthRecordsPage } from './pages/health/HealthRecordsPage';
import { HealthRecordDetailPage } from './pages/health/HealthRecordDetailPage';
import { NewHealthRecordPage } from './pages/health/NewHealthRecordPage';

// Risk Assessment Pages
import { RiskAssessmentPage } from './pages/risk/RiskAssessmentPage';
import { RiskHistoryPage } from './pages/risk/RiskHistoryPage';

// Pregnancy Pages
import { PregnancyPage } from './pages/pregnancy/PregnancyPage';
import { EditPregnancyPage } from './pages/pregnancy/EditPregnancyPage';

// Appointment Pages
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { NewAppointmentPage } from './pages/appointments/NewAppointmentPage';

// Emergency Pages
import { EmergencyPage } from './pages/emergency/EmergencyPage';
import { EmergencyContactsPage } from './pages/emergency/EmergencyContactsPage';
import { NewEmergencyContactPage } from './pages/emergency/NewEmergencyContactPage';

// Profile Pages
import { ProfilePage } from './pages/profile/ProfilePage';

// Education Pages
import { EducationPage } from './pages/education/EducationPage';

// Loading and Error Components
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-neutral-50">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Health Records */}
                    <Route path="/health/records" element={<HealthRecordsPage />} />
                    <Route path="/health/records/:id" element={<HealthRecordDetailPage />} />
                    <Route path="/health/new" element={<NewHealthRecordPage />} />

                    {/* Risk Assessment */}
                    <Route path="/risk/:assessmentId" element={<RiskAssessmentPage />} />
                    <Route path="/risk/history" element={<RiskHistoryPage />} />

                    {/* Pregnancy */}
                    <Route path="/pregnancy" element={<PregnancyPage />} />
                    <Route path="/pregnancy/edit" element={<EditPregnancyPage />} />

                    {/* Appointments */}
                    <Route path="/appointments" element={<AppointmentsPage />} />
                    <Route path="/appointments/new" element={<NewAppointmentPage />} />

                    {/* Emergency */}
                    <Route path="/emergency" element={<EmergencyPage />} />
                    <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />
                    <Route path="/emergency-contacts/new" element={<NewEmergencyContactPage />} />

                    {/* Profile */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Education */}
                    <Route path="/education" element={<EducationPage />} />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Mobile Bottom Navigation */}
        <MobileLayout />
      </div>
    </ErrorBoundary>
  );
}

export default App;
