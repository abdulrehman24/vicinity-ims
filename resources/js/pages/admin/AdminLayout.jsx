import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSettings, FiTag, FiMenu, FiChevronLeft, FiHome, FiLogOut, FiAlertCircle, FiUsers, FiPackage, FiRefreshCw } =
  FiIcons;

function AdminLayout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleResetDatabase = async () => {
    if (window.confirm('Are you sure you want to reset the database? ALL DATA WILL BE LOST! This action cannot be undone.')) {
      try {
        setIsResetting(true);
        await axios.post('/api/admin/reset-database');
        alert('Database has been reset successfully. You will now be logged out.');
        onLogout();
      } catch (error) {
        console.error('Failed to reset database:', error);
        alert('Failed to reset database. Please check the console for details.');
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="h-screen flex bg-[#fcfaf9]">
      {isResetting && (
        <div className="fixed inset-0 z-[9999] bg-[#4a5a67]/90 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#ebc1b6] border-t-transparent mb-4"></div>
          <h2 className="text-2xl font-bold tracking-tight">Resetting Database...</h2>
          <p className="text-white/60 mt-2">Please wait while we clear and re-seed the system.</p>
        </div>
      )}
      <aside
        className={`h-screen sticky top-0 bg-gradient-to-b from-[#4a5a67] to-[#2f3b44] text-white flex flex-col transition-all duration-300 shadow-xl ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-[#ebc1b6] flex items-center justify-center shadow-sm">
              <span className="text-[#4a5a67] font-black text-xs">ADM</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-wide text-white/80">
                  Vicinity IMS
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Admin Panel
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-full text-[#ebc1b6] hover:bg-white/10 hover:scale-105 transition-all"
          >
            <SafeIcon icon={collapsed ? FiMenu : FiChevronLeft} />
          </button>
        </div>
        <div className="flex-1 flex flex-col">
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                Navigation
              </p>
            )}
            <NavLink
              to="/admin/categories"
              className={({ isActive }) =>
                `group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#4a5a67] shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div
                className={`absolute left-0 inset-y-1 w-1 rounded-full transition-opacity ${
                  collapsed ? 'opacity-0' : 'opacity-100'
                } ${location.pathname.startsWith('/admin/categories') ? 'bg-[#ebc1b6]' : 'bg-transparent'}`}
              />
              <SafeIcon
                icon={FiTag}
                className={`text-lg ${collapsed ? 'mx-auto' : 'mr-3'}`}
              />
              {!collapsed && <span>Categories</span>}
            </NavLink>
            <NavLink
              to="/admin/bundles"
              className={({ isActive }) =>
                `group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#4a5a67] shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div
                className={`absolute left-0 inset-y-1 w-1 rounded-full transition-opacity ${
                  collapsed ? 'opacity-0' : 'opacity-100'
                } ${location.pathname.startsWith('/admin/bundles') ? 'bg-[#ebc1b6]' : 'bg-transparent'}`}
              />
              <SafeIcon
                icon={FiPackage}
                className={`text-lg ${collapsed ? 'mx-auto' : 'mr-3'}`}
              />
              {!collapsed && <span>Bundles</span>}
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#4a5a67] shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div
                className={`absolute left-0 inset-y-1 w-1 rounded-full transition-opacity ${
                  collapsed ? 'opacity-0' : 'opacity-100'
                } ${location.pathname.startsWith('/admin/users') ? 'bg-[#ebc1b6]' : 'bg-transparent'}`}
              />
              <SafeIcon
                icon={FiUsers}
                className={`text-lg ${collapsed ? 'mx-auto' : 'mr-3'}`}
              />
              {!collapsed && <span>Users</span>}
            </NavLink>
            <NavLink
              to="/admin/tickets"
              className={({ isActive }) =>
                `group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#4a5a67] shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div
                className={`absolute left-0 inset-y-1 w-1 rounded-full transition-opacity ${
                  collapsed ? 'opacity-0' : 'opacity-100'
                } ${location.pathname.startsWith('/admin/tickets') ? 'bg-[#ebc1b6]' : 'bg-transparent'}`}
              />
              <SafeIcon
                icon={FiAlertCircle}
                className={`text-lg ${collapsed ? 'mx-auto' : 'mr-3'}`}
              />
              {!collapsed && <span>Support tickets</span>}
            </NavLink>
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `group relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#4a5a67] shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div
                className={`absolute left-0 inset-y-1 w-1 rounded-full transition-opacity ${
                  collapsed ? 'opacity-0' : 'opacity-100'
                } ${location.pathname.startsWith('/admin/settings') ? 'bg-[#ebc1b6]' : 'bg-transparent'}`}
              />
              <SafeIcon
                icon={FiSettings}
                className={`text-lg ${collapsed ? 'mx-auto' : 'mr-3'}`}
              />
              {!collapsed && <span>Settings</span>}
            </NavLink>
            {!collapsed && (
              <div className="mt-6 px-3 pt-3 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  System
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Changes here affect all users of the IMS.
                </p>
              </div>
            )}
          </nav>
          <div className="px-3 py-4 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={handleGoHome}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center' : 'justify-between'
              } px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold tracking-wide transition-all`}
            >
              <div className="flex items-center space-x-2">
                <SafeIcon
                  icon={FiHome}
                  className={`text-lg ${collapsed ? '' : ''}`}
                />
                {!collapsed && <span>Back to IMS</span>}
              </div>
            </button>
            <button
              type="button"
              onClick={handleResetDatabase}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center' : 'justify-between'
              } px-3 py-2 rounded-xl bg-orange-500/80 hover:bg-orange-500 text-xs font-semibold tracking-wide transition-all`}
            >
              <div className="flex items-center space-x-2">
                <SafeIcon
                  icon={FiRefreshCw}
                  className="text-lg"
                />
                {!collapsed && <span>Reset DB</span>}
              </div>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center' : 'justify-between'
              } px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-xs font-semibold tracking-wide transition-all`}
            >
              <div className="flex items-center space-x-2">
                <SafeIcon
                  icon={FiLogOut}
                  className="text-lg"
                />
                {!collapsed && <span>Logout</span>}
              </div>
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 h-screen flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center px-8 justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#4a5a67] flex items-center justify-center">
              <span className="text-[#ebc1b6] font-black text-xs">ADM</span>
            </div>
            <h1 className="text-sm font-bold tracking-tight text-[#4a5a67]">
              Admin Panel
            </h1>
          </div>
        </header>
        <div className="flex-1">
          <div className="max-w-6xl mx-auto p-8">
            <Outlet />
          </div>
        </div>
        <footer className="py-4 px-8 border-t border-gray-200 bg-white/80 text-[10px] font-black uppercase tracking-[0.3em] text-[#4a5a67]/60 text-center">
          Admin tools for Vicinity IMS
        </footer>
      </main>
    </div>
  );
}

export default AdminLayout;
