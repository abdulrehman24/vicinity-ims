import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
import { InventoryProvider } from './context/InventoryContext';
import './App.css';

function App() {
  const [user, setUser] = useState(window.user || null);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
        await axios.post('/logout');
        window.location.href = '/';
    } catch (error) {
        console.error("Logout failed", error);
    }
  };

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
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <InventoryProvider>
      <div className="min-h-screen flex flex-col bg-[#fcfaf9]">
        <Navbar onLogout={handleLogout} user={user} />
        <main className="pt-16 flex-grow">
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
              
              {/* Legacy redirect for users who had bookmarked the old link */}
              <Route path="/check-in-out" element={<Navigate to="/" />} />
              <Route path="/login" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </InventoryProvider>
  );
}

export default App;
