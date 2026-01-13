import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ServicesPage from './pages/ServicesPage';
import SchedulePage from './pages/SchedulePage';
import AgendaPage from './pages/AgendaPage';
import ProfilePage from './pages/ProfilePage';
import ManageStaff from './pages/ManageStaff';
import ClientBooking from './pages/ClientBooking';
import TestNotifications from './pages/TestNotifications';
import ClientAuth from './pages/ClientAuth';
import ClientBookings from './pages/ClientBookings';
import ClientFavorites from './pages/ClientFavorites';
import ClientExplore from './pages/ClientExplore';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0c] text-white font-sans">
        <Routes>
          <Route path="/" element={<PricingPage />} />
          <Route path="/auth" element={<Auth />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/test-notifications"
            element={
              <ProtectedRoute roleRequired="admin">
                <TestNotifications />
              </ProtectedRoute>
            }
          />

          {/* Professional Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roleRequired="professional">
                <ProfessionalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/services"
            element={
              <ProtectedRoute roleRequired="professional">
                <ServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/schedule"
            element={
              <ProtectedRoute roleRequired="professional">
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/agenda"
            element={
              <ProtectedRoute roleRequired="professional">
                <AgendaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute roleRequired="professional">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute roleRequired="professional">
                <ManageStaff />
              </ProtectedRoute>
            }
          />

          {/* Client Routes */}
          <Route path="/client/auth" element={<ClientAuth />} />
          <Route path="/client/explore" element={<ClientExplore />} />
          <Route path="/client/bookings" element={<ClientBookings />} />
          <Route path="/client/favorites" element={<ClientFavorites />} />

          {/* Pricing & Payment Routes */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />

          {/* Public Client Booking Route */}
          <Route path="/book/:slug" element={<ClientBooking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
