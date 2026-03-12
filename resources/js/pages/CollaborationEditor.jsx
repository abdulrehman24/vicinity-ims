
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';

const { FiSave, FiX, FiPlus, FiMinus, FiTrash2, FiCalendar, FiPackage, FiInfo, FiAlertTriangle, FiCheckCircle } = FiIcons;

function CollaborationEditor() {
  const { token } = useParams();
  const navigate = useNavigate();
  const context = useInventory();
  
  // Local state for when context is not available (guest users)
  const [localEquipment, setLocalEquipment] = useState([]);
  const [systemCategories, setSystemCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [invite, setInvite] = useState(null);

  // Local Form State
  const [projTitle, setProjTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Use context if available, otherwise use local state
  const equipmentList = context?.equipment || localEquipment;

  // Category Sort Map
  const categorySortMap = useMemo(() => {
    return systemCategories.reduce((acc, cat) => {
      acc[cat.name] = cat.sort_order;
      return acc;
    }, {});
  }, [systemCategories]);

  // Derive categories for the filter
  const allCategories = useMemo(() => {
    const catsInList = Array.from(new Set(equipmentList.map(item => item.category)));
    
    // Sort based on system sort_order, fallback to alphabetical
    const sorted = catsInList.sort((a, b) => {
      const orderA = categorySortMap[a] ?? 999;
      const orderB = categorySortMap[b] ?? 999;
      if (orderA === orderB) return a.localeCompare(b);
      return orderA - orderB;
    });

    return ['All', ...sorted];
  }, [equipmentList, categorySortMap]);

  const filteredCatalog = useMemo(() => {
    return equipmentList.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const isAvailable = item.status === 'available';
      const isNotInCart = !selectedItems.find(i => i.id === item.id);
      
      return matchesSearch && matchesCategory && isAvailable && isNotInCart;
    });
  }, [equipmentList, searchTerm, selectedCategory, selectedItems]);

  // Grouped cart items
  const groupedItems = useMemo(() => {
    const grouped = selectedItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    // Return as sorted entries
    return Object.entries(grouped).sort(([catA], [catB]) => {
      const orderA = categorySortMap[catA] ?? 999;
      const orderB = categorySortMap[catB] ?? 999;
      if (orderA === orderB) return catA.localeCompare(catB);
      return orderA - orderB;
    });
  }, [selectedItems, categorySortMap]);
  
  const fetchPublicEquipment = useCallback(async () => {
    if (context) return; // Don't fetch if we already have context
    try {
      const response = await axios.get('/api/collaborate/equipment');
      setLocalEquipment(response.data.data);
      if (response.data.categories) {
        setSystemCategories(response.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch public equipment", err);
    }
  }, [context]);

  const fetchInviteData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/collaborate/${token}`);
      const data = response.data;
      setBooking(data.booking);
      setInvite(data.invite);
      if (data.categories) {
        setSystemCategories(data.categories);
      }
      
      setProjTitle(data.booking.project_title || '');
      setRemarks(data.booking.remarks || '');
      
      const items = data.booking.equipments.map(e => ({
        id: e.id,
        qty: e.pivot?.quantity || 1,
        name: e.name,
        image: e.image_path || e.image,
        category: e.category
      }));
      setSelectedItems(items);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load collaborative link');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInviteData();
    fetchPublicEquipment();
  }, [fetchInviteData, fetchPublicEquipment]);

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error("Booking must have at least one item");
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(`/api/collaborate/${token}`, {
        shootName: projTitle,
        remarks: remarks,
        items: selectedItems.map(i => ({
          equipmentId: i.id,
          quantity: i.qty
        }))
      });
      toast.success("Booking updated successfully!");
      fetchInviteData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update booking");
    } finally {
      setIsSaving(false);
    }
  };

  const updateQty = (id, delta) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, qty: Math.max(1, i.qty + delta) };
      }
      return i;
    }));
  };

  const removeItem = (id) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const addItem = (item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      toast.error("Item already in cart");
      return;
    }
    setSelectedItems(prev => [...prev, {
      id: item.id,
      qty: 1,
      name: item.name,
      image: item.image_path || item.image,
      category: item.category
    }]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf9] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#ebc1b6] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-[#4a5a67] uppercase tracking-widest">Loading Project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfaf9] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-xl border border-gray-100">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <SafeIcon icon={FiAlertTriangle} className="text-3xl text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">Access Denied</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-[#4a5a67] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#3a4a57] transition-all shadow-lg shadow-gray-200"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf9] dark:bg-slate-900 pb-20 transition-colors">
      {/* Header */}
      <div className="bg-[#4a5a67] dark:bg-slate-950 pt-12 pb-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="px-3 py-1 bg-[#ebc1b6] text-[#4a5a67] rounded-lg text-[9px] font-black uppercase tracking-widest">
                Collaborative Session
              </div>
              <div className="px-3 py-1 bg-white/10 text-white/60 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                Expires: {format(parseISO(invite.expires_at), 'MMM d, HH:mm')}
              </div>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{booking.project_title}</h1>
            <p className="text-sm text-white/60 font-medium max-w-xl">
              You are collaborating on this project. Changes you make here will be updated in the main system immediately.
            </p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-3 px-8 py-4 bg-[#ebc1b6] text-[#4a5a67] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-[#4a5a67] border-t-transparent rounded-full animate-spin" />
            ) : (
              <SafeIcon icon={FiSave} className="text-sm" />
            )}
            <span>Update Booking</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form & Items */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl border border-gray-50 dark:border-slate-700 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Project Name</label>
                  <input 
                    value={projTitle} 
                    onChange={e => setProjTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Booking ID</label>
                  <div className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-transparent font-bold text-sm text-[#4a5a67]/40 dark:text-[#ebc1b6]/40 cursor-not-allowed">
                    #{booking.id} (Owner: {booking.user?.name})
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Project Remarks</label>
                <textarea 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Additional notes for the owner..."
                  className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] outline-none font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] min-h-[100px] resize-none transition-all"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl border border-gray-50 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-tight">Equipment List</h2>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Current Allocation</p>
                </div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 text-[10px] font-black text-[#4a5a67] dark:text-[#ebc1b6]">
                  {selectedItems.reduce((acc, curr) => acc + curr.qty, 0)} ITEMS TOTAL
                </div>
              </div>

              <div className="space-y-8">
                {groupedItems.map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700">
                      <div className="w-2 h-2 rounded-full bg-[#ebc1b6]" />
                      <h3 className="text-[10px] font-black text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-[0.2em]">{category}</h3>
                      <span className="ml-auto text-[10px] font-black text-gray-400 dark:text-slate-500">{items.length} Units</span>
                    </div>
                    
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 gap-4 transition-colors hover:border-[#ebc1b6]/30 group">
                          <div className="flex items-center space-x-4">
                            <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                            <div>
                              <p className="text-xs font-black text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-wide group-hover:text-[#4a5a67] transition-colors">{item.name}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6">
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                              <button onClick={() => updateQty(item.id, -1)} className="text-[#ebc1b6] hover:text-[#4a5a67] dark:hover:text-white p-1 transition-colors"><SafeIcon icon={FiMinus} /></button>
                              <span className="text-sm font-black text-[#4a5a67] dark:text-[#ebc1b6] w-6 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="text-[#ebc1b6] hover:text-[#4a5a67] dark:hover:text-white p-1 transition-colors"><SafeIcon icon={FiPlus} /></button>
                            </div>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-2.5 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                            >
                              <SafeIcon icon={FiTrash2} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {selectedItems.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                    <SafeIcon icon={FiPackage} className="text-5xl mx-auto mb-4 text-[#4a5a67] dark:text-slate-400" />
                    <p className="text-sm font-black uppercase tracking-widest text-[#4a5a67] dark:text-slate-400">No equipment selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Catalog */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-slate-700 sticky top-24 transition-colors">
              <div className="mb-6">
                <h2 className="text-lg font-black text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-tight mb-4">Add More Gear</h2>
                
                {/* Search & Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <FiIcons.FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search equipment..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] transition-all"
                    />
                  </div>
                  
                  <div className="relative">
                    <FiIcons.FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] appearance-none transition-all cursor-pointer"
                    >
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredCatalog.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="w-full group text-left p-3 bg-gray-50 dark:bg-slate-900 border border-transparent hover:border-[#ebc1b6] dark:hover:border-[#ebc1b6] rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.image} className="w-10 h-10 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-[#4a5a67] dark:text-[#ebc1b6] uppercase truncate group-hover:text-[#ebc1b6] transition-colors">{item.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</p>
                      </div>
                      <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <SafeIcon icon={FiPlus} className="text-[#ebc1b6]" />
                      </div>
                    </div>
                  </button>
                ))}
                
                {filteredCatalog.length === 0 && (
                  <div className="py-10 text-center opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No matching gear found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollaborationEditor;
