import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import * as FiIcons from 'react-icons/fi';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import CheckInOut from './pages/CheckInOut';
import Calendar from './pages/Calendar';
import StockTake from './pages/StockTake';
import Records from './pages/Records';
import ReportProblem from './pages/ReportProblem';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import UserProfile from './pages/UserProfile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInventory from './pages/admin/AdminInventory';
import AdminCategories from './pages/admin/AdminCategories';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTickets from './pages/admin/AdminTickets';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBundles from './pages/admin/AdminBundles';
import { InventoryProvider } from './context/InventoryContext';
import SafeIcon from './common/SafeIcon';
import './App.css';

const { FiAlertTriangle, FiRefreshCw, FiClock } = FiIcons;

function App() {
  const [user, setUser] = useState(window.user || null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const [showSessionModal, setShowSessionModal] = useState(false);

  const handleLogout = async () => {
    try {
        await axios.post('/logout');
    } catch (error) {
        console.error("Logout failed", error);
    } finally {
        localStorage.removeItem('isAdmin');
        window.location.href = '/';
    }
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        if (user && (status === 419 || status === 401)) {
          setShowSessionModal(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const lifetimeMinutes = window.sessionLifetimeMinutes || 120;
    const issuedAtMs = window.sessionIssuedAt || Date.now();
    const now = Date.now();
    const expiryAt = issuedAtMs + lifetimeMinutes * 60 * 1000;

    if (expiryAt <= now) {
      handleLogout();
      return;
    }

    const warningOffsetMs = 5 * 60 * 1000;
    const timeUntilExpiry = expiryAt - now;
    const timeUntilWarning = Math.max(0, timeUntilExpiry - warningOffsetMs);

    const warningTimer = setTimeout(() => {
      setShowSessionModal(true);
    }, timeUntilWarning);

    const logoutTimer = setTimeout(() => {
      handleLogout();
    }, timeUntilExpiry);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#4a5a67] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ebc1b6] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (user.must_change_password) {
    return <ChangePassword onUpdate={() => window.location.reload()} />;
  }

  const isSuperAdmin = user?.is_admin >= 2;
  const isAdminRoute = location.pathname.startsWith('/admin');

  const adminElement = isSuperAdmin ? (
    <AdminLayout onLogout={handleLogout} />
  ) : (
    <Navigate to="/" />
  );

  return (
    <InventoryProvider user={user}>
      <div className="min-h-screen flex flex-col bg-[#fcfaf9]">
        {!isAdminRoute && <Navbar onLogout={handleLogout} user={user} />}
        <main className={`${isAdminRoute ? '' : 'pt-16'} flex-grow`}>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Check In/Out is now the Home Page */}
              <Route path="/" element={<CheckInOut />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/stock-take" element={<StockTake />} />
              <Route path="/report" element={<ReportProblem />} />
              <Route path="/records" element={<Records />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<UserProfile user={user} />} />
              <Route path="/admin/*" element={adminElement}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="tickets" element={<AdminTickets />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="bundles" element={<AdminBundles />} />
              </Route>
              
              {/* Legacy redirect for users who had bookmarked the old link */}
              <Route path="/check-in-out" element={<Navigate to="/" />} />
              <Route path="/login" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
        {!isAdminRoute && <Footer />}

        {showSessionModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-[#4a5a67] p-6 text-center text-white relative">
                <div className="inline-flex p-3 bg-[#ebc1b6] rounded-2xl mb-3 shadow-lg">
                  <SafeIcon icon={FiAlertTriangle} className="text-xl text-[#4a5a67]" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-widest">Session Timeout</h2>
                <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">
                  Refresh required to continue
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <SafeIcon icon={FiClock} className="mt-1 text-gray-400" />
                  <p className="text-sm text-[#4a5a67] text-left">
                    Your session has likely expired due to inactivity or a security timeout.
                    Please refresh the page to continue. Any unsaved changes may be lost.
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 hover:bg-gray-200"
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-[#4a5a67] text-[#ebc1b6] flex items-center space-x-2 shadow-md hover:shadow-lg"
                  >
                    <SafeIcon icon={FiRefreshCw} />
                    <span>Refresh Now</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </InventoryProvider>
  );
}

export default App;
