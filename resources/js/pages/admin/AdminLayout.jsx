import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSettings, FiTag, FiMenu, FiChevronLeft } = FiIcons;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-[#fcfaf9]">
      <aside
        className={`h-screen bg-[#4a5a67] text-white flex flex-col transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#ebc1b6] flex items-center justify-center">
              <span className="text-[#4a5a67] font-black text-xs">ADM</span>
            </div>
            {!collapsed && <span className="font-bold tracking-tight">Admin Panel</span>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-full text-[#ebc1b6] hover:bg-white/10 transition-colors"
          >
            <SafeIcon icon={collapsed ? FiMenu : FiChevronLeft} />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'text-gray-200 hover:bg-white/10'
              }`
            }
          >
            <SafeIcon icon={FiTag} className={collapsed ? 'mx-auto' : 'mr-3'} />
            {!collapsed && <span>Categories</span>}
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'text-gray-200 hover:bg-white/10'
              }`
            }
          >
            <SafeIcon icon={FiSettings} className={collapsed ? 'mx-auto' : 'mr-3'} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
