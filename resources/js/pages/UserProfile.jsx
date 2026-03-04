import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import imageCompression from 'browser-image-compression';
import { useInventory } from '../context/InventoryContext';

const { FiUser, FiLock, FiMail, FiShield, FiSave, FiCamera, FiPlus, FiTrash2, FiEdit2, FiBox, FiInfo, FiX } = FiIcons;

function UserProfile({ user }) {
  const { equipment, personalBundles, fetchPersonalBundles } = useInventory();
  // If user is not passed as prop, we might need to get it from context or window, 
  // but App.jsx typically passes user to components or provides it via context.
  // We'll assume it's available via props or window.user for now if not passed.
  const currentUser = user || window.user;

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(currentUser?.avatar || null);

  // Personal Bundles UI State
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundleForm, setBundleForm] = useState({ id: null, name: '', description: '', items: [] });
  const [bundleLoading, setBundleLoading] = useState(false);

  const handleEditBundle = (bundle) => {
    setBundleForm({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description || '',
      items: bundle.items.map(i => ({
        equipment_id: i.equipment_id,
        quantity: i.quantity,
        tempId: Date.now() + Math.random()
      }))
    });
    setIsBundleModalOpen(true);
  };

  const handleDeleteBundle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bundle?')) return;
    try {
      await axios.delete(`/api/personal-bundles/${id}`);
      toast.success('Bundle deleted');
      fetchPersonalBundles();
    } catch (error) {
      toast.error('Failed to delete bundle');
    }
  };

  const handleSaveBundle = async (e) => {
    e.preventDefault();
    if (bundleForm.items.length === 0) {
      toast.error('Add at least one item to the bundle');
      return;
    }

    setBundleLoading(true);
    try {
      if (bundleForm.id) {
        await axios.put(`/api/personal-bundles/${bundleForm.id}`, bundleForm);
        toast.success('Bundle updated');
      } else {
        await axios.post('/api/personal-bundles', bundleForm);
        toast.success('Bundle created');
      }
      setIsBundleModalOpen(false);
      fetchPersonalBundles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save bundle');
    } finally {
      setBundleLoading(false);
    }
  };

  const addBundleItem = () => {
    setBundleForm(prev => ({
      ...prev,
      items: [...prev.items, { equipment_id: '', quantity: 1, tempId: Date.now() }]
    }));
  };

  const updateBundleItem = (index, field, value) => {
    setBundleForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const removeBundleItem = (index) => {
    setBundleForm(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
      toast.error('Image size must be less than 10MB');
      return;
    }

    // Compression options
    const options = {
      maxSizeMB: 0.5, // Compress to ~500KB
      maxWidthOrHeight: 800,
      useWebWorker: true,
      initialQuality: 0.8,
    };

    setAvatarLoading(true);
    let fileToUpload = file;

    try {
      // Create preview immediately with original file
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Compress
      try {
        const compressedFile = await imageCompression(file, options);
        fileToUpload = compressedFile;
        // console.log(`Compressed: ${(compressedFile.size / 1024).toFixed(2)}KB`);
      } catch (compressionError) {
        console.error('Compression failed, using original:', compressionError);
        // Continue with original file if compression fails
      }

      // Upload
      const formData = new FormData();
      formData.append('avatar', fileToUpload);
      formData.append('name', currentUser.name);
      formData.append('email', currentUser.email);

      const response = await axios.post('/profile/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Profile picture updated');
      if (window.user) {
        window.user.avatar = response.data.user.avatar;
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile picture');
      setPreviewUrl(currentUser?.avatar || null); // Revert on error
    } finally {
      setAvatarLoading(false);
    }
  };

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
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-[#4a5a67] overflow-hidden border-4 border-white shadow-lg">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <SafeIcon icon={FiUser} className="text-4xl" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mb-4">
                 <SafeIcon icon={FiCamera} className="text-white text-2xl" />
              </div>
              {avatarLoading && (
                 <div className="absolute inset-0 bg-white/50 rounded-full flex items-center justify-center mb-4">
                    <div className="w-8 h-8 border-4 border-[#ebc1b6] border-t-transparent rounded-full animate-spin"></div>
                 </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />

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

      {/* Personal Bundles Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#ebc1b6] rounded-lg">
              <SafeIcon icon={FiBox} className="text-[#4a5a67]" />
            </div>
            <h3 className="text-xl font-bold text-[#4a5a67] tracking-tight">Personal Bundles</h3>
          </div>
          <button 
            onClick={() => {
              setBundleForm({ id: null, name: '', description: '', items: [] });
              setIsBundleModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-[#4a5a67] text-[#ebc1b6] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:shadow-lg transition-all"
          >
            <SafeIcon icon={FiPlus} />
            <span>New Bundle</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personalBundles.map(bundle => (
            <div key={bundle.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-[#4a5a67] text-lg">{bundle.name}</h4>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{bundle.description || 'No description'}</p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditBundle(bundle)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-blue-500 transition-colors"
                  >
                    <SafeIcon icon={FiEdit2} />
                  </button>
                  <button 
                    onClick={() => handleDeleteBundle(bundle.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-red-500 transition-colors"
                  >
                    <SafeIcon icon={FiTrash2} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  <SafeIcon icon={FiInfo} className="mr-1" />
                  <span>{bundle.items.length} Items</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bundle.items.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="bg-gray-50 text-[10px] font-bold text-[#4a5a67] px-2 py-1 rounded-lg">
                      {item.equipment?.name} (x{item.quantity})
                    </span>
                  ))}
                  {bundle.items.length > 3 && (
                    <span className="bg-gray-50 text-[10px] font-bold text-gray-400 px-2 py-1 rounded-lg">
                      +{bundle.items.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {personalBundles.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
              <SafeIcon icon={FiBox} className="text-4xl mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">No personal bundles yet</p>
              <p className="text-xs mt-2">Create a bundle to speed up your checkout process</p>
            </div>
          )}
        </div>
      </div>

      {/* Bundle Modal */}
      <AnimatePresence>
        {isBundleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#4a5a67]">
                  {bundleForm.id ? 'Edit Bundle' : 'New Personal Bundle'}
                </h3>
                <button 
                  onClick={() => setIsBundleModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <SafeIcon icon={FiX} />
                </button>
              </div>

              <form onSubmit={handleSaveBundle} className="p-6">
                <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bundle Name</label>
                      <input 
                        type="text"
                        value={bundleForm.name}
                        onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] transition-all"
                        placeholder="e.g. Photography Kit"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        value={bundleForm.description}
                        onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] transition-all min-h-[80px]"
                        placeholder="What's in this bundle?"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Items</label>
                      <button 
                        type="button"
                        onClick={addBundleItem}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                      >
                        + Add Equipment
                      </button>
                    </div>

                    {bundleForm.items.map((item, index) => (
                      <div key={item.tempId || index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl group">
                        <div className="flex-1">
                          <select 
                            value={item.equipment_id}
                            onChange={(e) => updateBundleItem(index, 'equipment_id', e.target.value)}
                            required
                            className="w-full bg-transparent border-none outline-none font-bold text-sm text-[#4a5a67] focus:ring-0"
                          >
                            <option value="">Select Equipment...</option>
                            {equipment.map(eq => (
                              <option key={eq.id} value={eq.id}>{eq.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input 
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateBundleItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full bg-white border border-transparent focus:border-[#ebc1b6] rounded-lg px-2 py-1 text-center font-bold text-sm text-[#4a5a67] outline-none transition-all"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeBundleItem(index)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <SafeIcon icon={FiTrash2} />
                        </button>
                      </div>
                    ))}
                    
                    {bundleForm.items.length === 0 && (
                      <div className="text-center py-6 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest">
                        No items added yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button 
                    type="button"
                    onClick={() => setIsBundleModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={bundleLoading}
                    className="bg-[#4a5a67] text-[#ebc1b6] px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
                  >
                    {bundleLoading ? (
                      <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <SafeIcon icon={FiSave} />
                        <span>{bundleForm.id ? 'Update Bundle' : 'Save Bundle'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default UserProfile;
