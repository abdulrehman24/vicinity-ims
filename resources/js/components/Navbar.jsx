import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import SecurityModal from './SecurityModal';

const { 
  FiPackage, FiCamera, FiRefreshCw, FiCalendar, 
  FiClipboard, FiFileText, FiMenu, FiX, FiLogOut, 
  FiShield, FiAlertOctagon, FiUser, FiSettings,
  FiSun, FiMoon 
} = FiIcons;

// Updated navItems: Operations (Check In/Out) is now the root path
const navItems = [
  { path: '/', label: 'Operations', icon: FiRefreshCw },
  { path: '/inventory', label: 'Inventory', icon: FiCamera },
  { path: '/calendar', label: 'Calendar', icon: FiCalendar },
  { path: '/report', label: 'Support', icon: FiAlertOctagon },
  { path: '/records', label: 'Records', icon: FiFileText },
  { path: '/stock-take', label: 'Stock Take', icon: FiClipboard },
  { path: '/dashboard', label: 'Dashboard', icon: FiPackage }
];

function Navbar({ onLogout, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, toggleAdmin } = useInventory();
  const { darkMode, toggleDarkMode } = useTheme();

  const handleAdminToggle = () => {
    if (!user?.is_admin) {
      return;
    }
    toggleAdmin(!isAdmin);
  };

  const handleAdminVerified = (level) => {
      toggleAdmin(true);
      setIsAdminModalOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#4a5a67] dark:bg-slate-900 shadow-xl z-50 transition-colors duration-300">
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <SafeIcon icon={FiCamera} className="text-2xl text-[#ebc1b6]" />
            <span className="text-xl font-bold text-white tracking-tight">Vicinity IMS</span>
          </Link>

          {/* Centered Navigation Links - Hidden on Mobile/Tablet/Small Laptop */}
          <div className="hidden xl:flex flex-1 justify-center items-center px-2">
            <div className="flex items-center space-x-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-2 py-2 rounded-lg transition-all duration-300 ${
                      isActive ? 'text-[#ebc1b6]' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 relative z-10">
                      <SafeIcon icon={item.icon} className="text-base" />
                      <span className="font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-x-0 bottom-0 h-1 bg-[#ebc1b6] rounded-t-full"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side Actions - Hidden on Mobile/Tablet/Small Laptop */}
          <div className="hidden xl:flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <SafeIcon icon={darkMode ? FiSun : FiMoon} className="text-base" />
            </button>
            {user?.is_admin > 0 && (
              <>
                <Link
                  to="/admin"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <SafeIcon icon={FiSettings} className="text-xs" />
                  <span>Panel</span>
                </Link>
                <button
                  onClick={handleAdminToggle}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                    isAdmin ? 'bg-red-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <SafeIcon icon={FiShield} className="text-xs" />
                  <span>{isAdmin ? 'Admin' : 'Enable'}</span>
                </button>
              </>
            )}

            <Link
              to="/profile"
              className="p-2 text-gray-400 hover:text-[#ebc1b6] transition-colors"
              title="My Profile"
            >
              <SafeIcon icon={FiUser} className="text-base" />
            </Link>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-[#ebc1b6] transition-colors"
              title="Logout"
            >
              <SafeIcon icon={FiLogOut} className="text-base" />
            </button>
          </div>

          {/* Mobile/Tablet/Small Laptop Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="xl:hidden p-2 rounded-lg text-[#ebc1b6] hover:bg-white/5 transition-colors"
          >
            <SafeIcon icon={isOpen ? FiX : FiMenu} className="text-xl" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-[#4a5a67] dark:bg-slate-900 border-t border-white/10 transition-colors overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar"
          >
            <div className="px-4 py-6 space-y-4">
              {/* Navigation Grid for Tablet-sized devices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-[#ebc1b6] text-[#4a5a67] shadow-lg shadow-black/10' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <SafeIcon icon={item.icon} className="text-xl" />
                      <span className="font-bold tracking-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Action Buttons in Mobile Menu */}
              <div className="pt-6 mt-6 border-t border-white/10 space-y-4">
                {user?.is_admin > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 text-gray-300 hover:text-[#ebc1b6] transition-all"
                    >
                      <SafeIcon icon={FiSettings} className="text-xl mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Admin Panel</span>
                    </Link>
                    <button
                      onClick={handleAdminToggle}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                        isAdmin 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      <SafeIcon icon={FiShield} className="text-xl mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {isAdmin ? 'Admin Active' : 'Enable Admin'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      toggleDarkMode();
                      // Don't close menu to let user see theme change
                    }}
                    className="flex-1 flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl bg-white/5 text-gray-300 hover:text-white transition-all"
                  >
                    <SafeIcon icon={darkMode ? FiSun : FiMoon} className="text-xl" />
                    <span className="font-bold text-xs uppercase tracking-widest">
                      {darkMode ? 'Light' : 'Dark'} Mode
                    </span>
                  </button>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl bg-white/5 text-gray-300 hover:text-white transition-all"
                  >
                    <SafeIcon icon={FiUser} className="text-xl" />
                    <span className="font-bold text-xs uppercase tracking-widest">Profile</span>
                  </Link>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                  <SafeIcon icon={FiLogOut} className="text-xl" />
                  <span className="font-bold uppercase tracking-widest text-xs">Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SecurityModal 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
        onVerified={handleAdminVerified}
      />
    </nav>
  );
}

export default Navbar;
