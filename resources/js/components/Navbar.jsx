import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useInventory } from '../context/InventoryContext';
import SecurityModal from './SecurityModal';

const { 
  FiPackage, FiCamera, FiRefreshCw, FiCalendar, 
  FiClipboard, FiFileText, FiMenu, FiX, FiLogOut, 
  FiShield, FiAlertOctagon, FiUser 
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
    <nav className="fixed top-0 left-0 right-0 bg-[#4a5a67] shadow-xl z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <SafeIcon icon={FiCamera} className="text-2xl text-[#ebc1b6]" />
            <span className="text-xl font-bold text-white tracking-tight">Vicinity IMS</span>
          </Link>

          {/* Centered Navigation Links */}
          <div className="hidden md:flex flex-1 justify-center items-center px-4">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-3 py-2 rounded-lg transition-all duration-300 ${
                      isActive ? 'text-[#ebc1b6]' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 relative z-10">
                      <SafeIcon icon={item.icon} className="text-lg" />
                      <span className="font-semibold text-sm">{item.label}</span>
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

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
            {user?.is_admin > 0 && (
              <button
                onClick={handleAdminToggle}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAdmin ? 'bg-red-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <SafeIcon icon={FiShield} />
                <span>{isAdmin ? 'Admin Active' : 'Enable Admin'}</span>
              </button>
            )}

            <Link
              to="/profile"
              className="p-2 text-gray-400 hover:text-[#ebc1b6] transition-colors"
              title="My Profile"
            >
              <SafeIcon icon={FiUser} className="text-lg" />
            </Link>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-[#ebc1b6] transition-colors"
            >
              <SafeIcon icon={FiLogOut} className="text-lg" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-[#ebc1b6]"
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
            className="md:hidden bg-[#4a5a67] border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-white/10 text-[#ebc1b6]' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <SafeIcon icon={item.icon} className="text-xl" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-[#ebc1b6] transition-colors"
                >
                  <SafeIcon icon={FiUser} className="text-xl" />
                  <span className="font-medium">My Profile</span>
                </Link>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-[#ebc1b6] transition-colors"
                >
                  <SafeIcon icon={FiLogOut} className="text-xl" />
                  <span className="font-medium">Logout</span>
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
