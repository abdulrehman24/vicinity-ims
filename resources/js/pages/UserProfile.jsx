import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUser, FiLock, FiMail, FiShield, FiSave } = FiIcons;

function UserProfile({ user }) {
  // If user is not passed as prop, we might need to get it from context or window, 
  // but App.jsx typically passes user to components or provides it via context.
  // We'll assume it's available via props or window.user for now if not passed.
  const currentUser = user || window.user;

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/change-password', {
        password: passwordData.password,
        password_confirmation: passwordData.confirmPassword,
      });
      
      toast.success(response.data.message || 'Password updated successfully');
      setPasswordData({ password: '', confirmPassword: '' });
      
      if (response.data.require_approval) {
        window.location.href = '/login';
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-8 max-w-4xl mx-auto min-h-screen"
    >
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#4a5a67] tracking-tight mb-2">
          My Profile
        </h1>
        <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#4a5a67]">
              <SafeIcon icon={FiUser} className="text-4xl" />
            </div>
            <h2 className="text-xl font-bold text-[#4a5a67]">{currentUser?.name}</h2>
            <p className="text-sm text-gray-400 font-medium mb-4">{currentUser?.email}</p>
            
            <div className="w-full pt-4 border-t border-gray-50 flex justify-center">
               <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${currentUser?.is_admin ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                 <div className="flex items-center space-x-1">
                   <SafeIcon icon={FiShield} />
                   <span>{currentUser?.is_admin ? 'Admin Access' : 'Standard User'}</span>
                 </div>
               </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-[#ebc1b6] rounded-lg">
                <SafeIcon icon={FiLock} className="text-[#4a5a67]" />
              </div>
              <h3 className="text-lg font-bold text-[#4a5a67] uppercase tracking-tight">Change Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative">
                  <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="password" 
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] transition-all"
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="password" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] transition-all"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading || !passwordData.password}
                  className="bg-[#4a5a67] text-[#ebc1b6] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <SafeIcon icon={FiSave} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default UserProfile;
