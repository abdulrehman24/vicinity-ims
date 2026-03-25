import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { equipmentTypes, businessUnits, statuses } from '../data/inventoryData';
import axios from 'axios';
import Fuse from 'fuse.js';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import AdminAuthModal from '../components/AdminAuthModal'; // Deprecated but keeping for reference if needed
import SecurityModal from '../components/SecurityModal';
import imageCompression from 'browser-image-compression';
import RecommissionModal from '../components/RecommissionModal';

const { 
  FiSearch, FiPlus, FiEdit2, FiX, FiCamera, FiHash, FiMapPin, 
  FiCheck, FiUpload, FiBriefcase, FiAlertTriangle, FiShield, 
  FiCalendar, FiFileText, FiTool, FiWrench, FiFilter 
} = FiIcons;

function InventoryList() {
  const { equipment, categories, bookings, addEquipment, updateEquipment, recommissionEquipment, isAdmin, toggleAdmin } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const dateInputRef = React.useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [editingItem, setEditingItem] = useState(null);

  const [decommissioningItem, setDecommissioningItem] = useState(null);
  const [repairingItem, setRepairingItem] = useState(null);
  const [recommissioningItem, setRecommissioningItem] = useState(null);

  const uniqueCategories = useMemo(() => {
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  const fuse = useMemo(() => new Fuse(equipment, {
    keys: ['name', 'serialNumber', 'category', 'equipmentType', 'businessUnit'],
    threshold: 0.3
  }), [equipment]);

  const equipmentBookedQuantities = useMemo(() => {
    const counts = {};
    
    let targetDate = filterDate;
    if (!targetDate) {
      const today = new Date();
      targetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    // Calculate quantities booked for each equipment on the target date (either selected date or today)
    bookings.forEach(b => {
      // Don't count returned or cancelled bookings against availability
      if (b.status === 'cancelled' || b.status === 'returned') return;
      
      // If the targeted date falls within the booking dates, it's considered booked
      if (b.dates && b.dates.includes(targetDate)) {
        counts[b.equipmentId] = (counts[b.equipmentId] || 0) + (b.quantity || 1);
      }
    });
    return counts;
  }, [bookings, filterDate]);

  const filtered = useMemo(() => {
    let result = searchTerm ? fuse.search(searchTerm).map(r => r.item) : equipment;
    if (selectedCategory) result = result.filter(i => i.category === selectedCategory);
    
    if (!showDecommissioned) {
      // Active view: show items that have at least one non-decommissioned unit
      result = result.filter(i => {
        const total = i.totalQuantity ?? 0;
        const decommissioned = i.decommissionedQuantity ?? 0;

        return i.status !== 'decommissioned' && (total - decommissioned) > 0;
      });
    } else {
      // Decommission view: show any items with decommissioned units
      result = result.filter(i => (i.decommissionedQuantity ?? 0) > 0);
    }
    return result;
  }, [searchTerm, selectedCategory, equipment, fuse, showDecommissioned, filterDate, equipmentBookedQuantities]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, showDecommissioned, filterDate]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, page * pageSize);

  const handleDecommissionConfirm = (id, data) => {
    const item = equipment.find(e => e.id === id);
    if (!item) return;

    const total = item.totalQuantity ?? 1;
    const maintenance = item.maintenanceQuantity ?? 0;
    const decommissioned = item.decommissionedQuantity ?? 0;
    const rawQty = parseInt(data.quantity, 10) || 1;
    const maxDecommission = Math.max(1, total - maintenance - decommissioned);
    const qty = Math.min(rawQty, maxDecommission);

    const newDecommissioned = Math.min(total, decommissioned + qty);
    const remaining = total - newDecommissioned;
    const newStatus = remaining <= 0
      ? 'decommissioned'
      : (maintenance > 0 && maintenance >= remaining ? 'maintenance' : 'available');

    updateEquipment({
      ...item,
      id,
      status: newStatus,
      decommissionedQuantity: newDecommissioned,
      decommissionDate: data.date,
      decommissionReason: data.reason
    });
    setDecommissioningItem(null);
    toast.success(qty === total ? "Asset moved to graveyard" : `Decommissioned ${qty} unit(s)`);
  };

  const handleRepairConfirm = (id, data) => {
    const item = equipment.find(e => e.id === id);
    if (!item) return;

    const total = item.totalQuantity ?? 1;
    const maintenance = item.maintenanceQuantity ?? 0;
    const decommissioned = item.decommissionedQuantity ?? 0;
    const available = Math.max(0, total - maintenance - decommissioned);
    const rawQty = parseInt(data.quantity, 10) || 1;
    const qty = Math.min(rawQty, available);

    if (qty <= 0) {
      setRepairingItem(null);
      return;
    }

    const newMaintenance = Math.min(total, maintenance + qty);
    const remaining = total - (item.decommissionedQuantity ?? 0);
    const newStatus = newMaintenance > 0 && newMaintenance >= remaining ? 'maintenance' : 'available';

    updateEquipment({
      ...item,
      id,
      status: newStatus,
      remarks: data.reason,
      repairStartDate: data.date,
      maintenanceQuantity: newMaintenance
    });
    setRepairingItem(null);
    toast.success(`Sent ${qty} unit(s) to service bay`);
  };

  const handleRecommissionConfirm = async (quantity) => {
    if (!recommissioningItem) return;
    
    const ok = await recommissionEquipment(recommissioningItem.id, {
      quantity,
      source_status: recommissioningItem.status
    });
    
    if (ok) {
      setRecommissioningItem(null);
    }
  };

  const executeProtectedAction = (action) => {
    // Deprecated: Now we rely on global admin mode
    if (isAdmin) {
      action();
    } else {
        toast.error("Please enable Admin Mode in the navigation bar first.");
    }
  };

  const handleAuthSuccess = () => {
      toggleAdmin(true);
      if (pendingAction) {
          pendingAction();
          setPendingAction(null);
      }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto min-h-screen transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-[#4a5a67] dark:text-white tracking-tight mb-2">
            {showDecommissioned ? 'Asset Graveyard' : 'Inventory'}
          </h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowDecommissioned(!showDecommissioned)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showDecommissioned ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 hover:text-[#4a5a67] dark:hover:text-white'}`}
          >
            {showDecommissioned ? 'Show Active' : 'Show Decommissioned'}
          </button>
          <button 
            onClick={() => executeProtectedAction(() => setIsModalOpen(true))} 
            className="bg-[#4a5a67] dark:bg-slate-800 text-[#ebc1b6] px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-transparent dark:border-slate-700" 
          >
            <SafeIcon icon={FiPlus} />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-10 flex flex-col md:flex-row gap-6 transition-colors">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search assets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none transition-all font-medium text-[#4a5a67] dark:text-[#ebc1b6]" />
        </div>
        
        <div 
          className="relative w-full md:w-48 cursor-pointer group"
          onClick={(e) => {
            if (e.target.closest('button')) return;
            if (dateInputRef.current) {
               try { dateInputRef.current.showPicker(); } catch (err) { dateInputRef.current.focus(); }
            }
          }}
        >
          <SafeIcon icon={FiCalendar} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#ebc1b6] transition-colors" />
          <input 
            ref={dateInputRef}
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none transition-all font-medium text-[#4a5a67] dark:text-[#ebc1b6] text-sm cursor-pointer"
          />
          {filterDate && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setFilterDate('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4a5a67] dark:hover:text-white transition-colors"
            >
              <SafeIcon icon={FiX} />
            </button>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <SafeIcon icon={FiFilter} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)} 
            className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none transition-all font-medium text-[#4a5a67] dark:text-[#ebc1b6] appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginated.map(item => (
          <AssetCard 
            key={item.id} 
            item={item} 
            isAdmin={isAdmin} 
            bookedQuantity={equipmentBookedQuantities[item.id] || 0}
            filterDate={filterDate}
            onDecommission={() => setDecommissioningItem(item)}
            onRepair={() => setRepairingItem(item)}
            onEdit={() => executeProtectedAction(() => setEditingItem(item))}
            onActivate={(id, status) => {
              const original = equipment.find(e => e.id === id);
              if (!original) return;
              setRecommissioningItem({...original, status: status || original.status});
            }}
          />
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {totalItems === 0 ? 'No assets found' : `Showing ${startIndex}-${endIndex} of ${totalItems} assets`}
        </p>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Per Page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value) || 12);
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#4a5a67] dark:text-[#ebc1b6] outline-none transition-colors"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 text-[#4a5a67] dark:text-[#ebc1b6] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Prev
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {totalItems === 0 ? 0 : page} of {totalItems === 0 ? 0 : totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || totalItems === 0}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 text-[#4a5a67] dark:text-[#ebc1b6] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all ${page >= totalPages || totalItems === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewEntryModal 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={async (data) => { 
              const ok = await addEquipment(data); 
              if (ok) {
                setIsModalOpen(false); 
              }
              return ok;
            }} 
          />
        )}

        {/* <AdminAuthModal 
          isOpen={adminAuthOpen} 
          onClose={() => { setAdminAuthOpen(false); setPendingAction(null); }} 
          onVerified={handleAuthSuccess} 
        /> */}

        {editingItem && (
          <NewEntryModal 
            initialData={editingItem}
            onClose={() => setEditingItem(null)} 
            onSubmit={async (data) => { 
              const ok = await updateEquipment({...data, id: editingItem.id}); 
              if (ok) {
                setEditingItem(null); 
              }
              return ok;
            }} 
          />
        )}
        
        {decommissioningItem && (
          <ActionModal 
            item={decommissioningItem} 
            type="decommission"
            onClose={() => setDecommissioningItem(null)} 
            onConfirm={(data) => handleDecommissionConfirm(decommissioningItem.id, data)} 
          />
        )}

        {repairingItem && (
          <ActionModal 
            item={repairingItem} 
            type="repair"
            onClose={() => setRepairingItem(null)} 
            onConfirm={(data) => handleRepairConfirm(repairingItem.id, data)} 
          />
        )}

        {recommissioningItem && (
          <RecommissionModal
            isOpen={!!recommissioningItem}
            equipment={recommissioningItem}
            onClose={() => setRecommissioningItem(null)}
            onSubmit={handleRecommissionConfirm}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionModal({ item, type, onClose, onConfirm }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    quantity: 1
  });

  const isDecommission = type === 'decommission';
  const isRepair = type === 'repair';
  const isRestore = type === 'restore';

  const themeColor = isDecommission ? 'bg-orange-500' : isRestore ? 'bg-green-500' : 'bg-blue-500';
  const icon = isDecommission ? FiAlertTriangle : FiTool;
  const title = isDecommission ? 'Confirm Decommission' : isRestore ? 'Restore From Repair' : 'Initiate Repair';
  const subTitle = isDecommission ? 'Permanent Removal from Active Fleet' : isRestore ? 'Return Units to Active Fleet' : 'Transfer to Technical Service Bay';
  const buttonText = isDecommission ? 'Confirm Decommission' : isRestore ? 'Restore Units' : 'Send to Repair';

  const totalQty = item.totalQuantity ?? 1;
  const maintenanceQty = item.maintenanceQuantity ?? 0;
  const decommissionedQty = item.decommissionedQuantity ?? 0;
  const maxRepairUnits = Math.max(1, totalQty - maintenanceQty - decommissionedQty);
  const maxDecommissionUnits = Math.max(1, totalQty - maintenanceQty - decommissionedQty);
  const maxRestoreUnits = Math.max(1, maintenanceQty || 1);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/90 dark:bg-slate-950/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors" >
        <div className={`${themeColor} p-8 text-center text-white relative`}>
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <SafeIcon icon={FiX} />
            </button>
          </div>
          <div className="inline-flex p-4 bg-white/20 rounded-2xl mb-4 shadow-lg">
            <SafeIcon icon={icon} className="text-2xl text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mt-1">{subTitle}</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
            <img src={item.image} className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-800" alt="" />
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Asset Details</p>
              <h4 className="text-sm font-bold text-[#4a5a67] dark:text-[#ebc1b6]">{item.name}</h4>
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400">{item.serialNumber}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {isDecommission ? 'Removal Date' : isRestore ? 'Restoration Date' : 'Service Start Date'}
              </label>
              <div className="relative">
                <SafeIcon icon={FiCalendar} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] ${isDecommission ? 'focus:border-orange-500' : 'focus:border-blue-500'}`} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {isDecommission ? 'Reason for Decommissioning' : isRestore ? 'Restoration Note' : 'Technical Issue Description'}
              </label>
              <div className="relative">
                <SafeIcon icon={FiFileText} className="absolute left-4 top-4 text-gray-300 dark:text-gray-600" />
                <textarea 
                  placeholder={isDecommission ? "e.g. End of life, irrepairable damage..." : "Describe the malfunction or damage..."}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className={`w-full pl-11 p-4 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] h-32 resize-none ${isDecommission ? 'focus:border-orange-500' : 'focus:border-blue-500'}`} 
                />
              </div>
            </div>

            {(isRestore ? maintenanceQty > 0 : totalQty > 1) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                  {isDecommission ? 'Units to Decommission' : isRestore ? 'Units to Restore' : 'Units to Move to Repair'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={isDecommission ? maxDecommissionUnits : isRestore ? maxRestoreUnits : maxRepairUnits}
                    value={formData.quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10) || 1;
                      const max = isDecommission ? maxDecommissionUnits : isRestore ? maxRestoreUnits : maxRepairUnits;
                      const clamped = Math.max(1, Math.min(value, max));
                      setFormData({ ...formData, quantity: clamped });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(formData)}
              disabled={type !== 'restore' && !formData.reason}
              className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-30 ${themeColor} ${isDecommission ? 'shadow-orange-200 dark:shadow-none' : 'shadow-blue-200 dark:shadow-none'}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AssetCard({ item, isAdmin, onDecommission, onRepair, onEdit, onActivate, bookedQuantity = 0, filterDate = null }) {
  const availableCount = Math.max(0, (item.totalQuantity || 0) - (item.maintenanceQuantity || 0) - (item.decommissionedQuantity || 0) - bookedQuantity);
  const totalCount = item.totalQuantity || 1;
  const availabilityRate = (availableCount / totalCount) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col h-full ${item.status === 'decommissioned' ? 'opacity-75' : ''}`}
    >
      {/* Image Section */}
      <div className="h-52 relative overflow-hidden shrink-0">
        <img
          src={item.image}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          alt={item.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-xl uppercase tracking-[0.15em] backdrop-blur-md border border-white/20 ${
            item.status === 'available' ? 'bg-emerald-500/90 text-white' : 
            item.status === 'decommissioned' ? 'bg-rose-500/90 text-white' : 
            item.status === 'maintenance' ? 'bg-amber-500/90 text-white' : 
            'bg-[#ebc1b6]/90 text-[#4a5a67]'
          }`}>
            {item.status.replace('_', ' ')}
          </span>
          {availableCount === 0 && item.status !== 'decommissioned' && (
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-rose-500 text-white shadow-xl uppercase tracking-[0.15em] border border-white/20">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="mb-1">
            <h3 className="text-lg font-extrabold text-[#4a5a67] dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-[#ebc1b6] transition-colors line-clamp-2">
              {item.name}
            </h3>
            {item.serialNumber && (
              <div className="mt-1.5 flex">
                <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded-md max-w-full truncate" title={item.serialNumber}>
                  {item.serialNumber}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
            {item.category}
          </p>
        </div>

        {item.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed line-clamp-2 italic">
            {item.description}
          </p>
        )}

        <div className="mt-auto space-y-5">
          {/* Availability Info */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-[#4a5a67] dark:text-gray-400 uppercase tracking-widest">
                Availability
              </span>
              <span className="text-xs font-black text-[#4a5a67] dark:text-white">
                {availableCount}<span className="text-gray-400 dark:text-gray-600 font-bold mx-0.5">/</span>{totalCount} <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">Units</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${availabilityRate}%` }}
                className={`h-full rounded-full ${
                  availabilityRate > 50 ? 'bg-emerald-500' : 
                  availabilityRate > 0 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
          </div>

          {/* Sub-status Badges */}
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {item.maintenanceQuantity > 0 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <SafeIcon icon={FiIcons.FiTool} size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest">{item.maintenanceQuantity} Repairing</span>
              </div>
            )}
            {item.decommissionedQuantity > 0 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-slate-700">
                <SafeIcon icon={FiIcons.FiAlertTriangle} size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest">{item.decommissionedQuantity} Graveyard</span>
              </div>
            )}
            {bookedQuantity > 0 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-800/50" title={`Booked on ${filterDate || 'Today'}`}>
                <SafeIcon icon={FiIcons.FiCalendar} size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest">{bookedQuantity} Booked</span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-5 border-t border-gray-50 dark:border-slate-700/50 mt-4">
            <button 
              onClick={onEdit} 
              className="p-2.5 bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-[#ebc1b6] hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90"
              title="Edit Asset"
            >
              <SafeIcon icon={FiIcons.FiEdit2} size={16} />
            </button>
            
            <div className={`flex items-center gap-2 transition-all duration-300 ${isAdmin ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {item.maintenanceQuantity > 0 && (
                <button 
                  onClick={() => onActivate(item.id, 'maintenance')}
                  className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] hover:bg-emerald-600 hover:text-white transition-all active:scale-95 border border-emerald-100 dark:border-emerald-800/50 shadow-sm"
                >
                  Unrepair
                </button>
              )}

              {item.decommissionedQuantity > 0 && (
                <button 
                  onClick={() => onActivate(item.id, 'decommissioned')}
                  className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-100 dark:border-indigo-800/50 shadow-sm"
                >
                  Recommission
                </button>
              )}

              {availableCount > 0 && (
                <div className="flex gap-1.5 ml-1 pl-3 border-l border-gray-100 dark:border-slate-700/50">
                  <button 
                    onClick={onRepair}
                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 border border-blue-100 dark:border-blue-800/50 shadow-sm"
                    title="Send to Repair"
                  >
                    <SafeIcon icon={FiIcons.FiTool} size={14} />
                  </button>
                  <button 
                    onClick={onDecommission}
                    className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all active:scale-95 border border-orange-100 dark:border-orange-800/50 shadow-sm"
                    title="Decommission"
                  >
                    <SafeIcon icon={FiIcons.FiAlertTriangle} size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NewEntryModal({ onClose, onSubmit, initialData }) {
  const { categories } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || '',
    category: initialData?.category || (categories.length > 0 ? categories[0] : 'Camera Body'),
    equipmentType: initialData?.equipmentType || 'Camera',
    serialNumber: initialData?.serialNumber || '',
    status: initialData?.status || 'available',
    businessUnit: initialData?.businessUnit || 'Studio',
    condition: initialData?.condition || 'excellent',
    location: initialData?.location || '',
    image: initialData?.image || '',
    description: initialData?.description || '',
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    totalQuantity: initialData?.totalQuantity || 1
  }));

  useEffect(() => {
    if (!initialData && categories.length > 0 && !formData.category) {
       setFormData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [categories, initialData]);

  const isEditing = !!initialData;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      // Compress image before setting state
      const options = {
        maxSizeMB: 0.2, // Aggressive compression: Max 200KB
        maxWidthOrHeight: 1024, // Max 1024px
        useWebWorker: true,
        initialQuality: 0.7,
      };

      try {
        const compressedFile = await imageCompression(file, options);
        
        // Use compressed file for preview and upload
        const reader = new FileReader();
        reader.onload = () => setFormData(prev => ({ 
          ...prev, 
          image: reader.result,
          imageFile: compressedFile 
        }));
        reader.readAsDataURL(compressedFile);
        
      } catch (error) {
        console.error('Image compression failed:', error);
        toast.error('Image compression failed, using original file');
        
        // Fallback to original file
        const reader = new FileReader();
        reader.onload = () => setFormData(prev => ({ 
          ...prev, 
          image: reader.result,
          imageFile: file 
        }));
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        description: (() => {
          const cleaned = (formData.description || '').trim();
          return cleaned === '' ? '' : formData.description;
        })(),
      };

      const ok = await onSubmit(payload);
      if (!ok) {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false); // Only stop loading on error, as success unmounts component
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/80 dark:bg-slate-950/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-colors">
        <div className="bg-[#4a5a67] dark:bg-slate-900 p-6 flex justify-between items-center text-white transition-colors">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#ebc1b6] rounded-lg">
              <SafeIcon icon={isEditing ? FiEdit2 : FiPlus} className="text-[#4a5a67]" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight">{isEditing ? 'Edit Asset' : 'Register New Asset'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <SafeIcon icon={FiX} className="text-xl text-[#ebc1b6]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Asset Visual</label>
              <div {...getRootProps()} className={`relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${isDragActive ? 'border-[#ebc1b6] bg-[#ebc1b611]' : 'border-gray-100 dark:border-slate-700 hover:border-[#ebc1b6] bg-gray-50 dark:bg-slate-900'}`}>
                <input {...getInputProps()} />
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <SafeIcon icon={FiUpload} className="text-4xl text-[#ebc1b6] mb-4 mx-auto" />
                    <p className="text-sm font-bold text-[#4a5a67] dark:text-[#ebc1b6]">Drop asset photo here</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <InputField label="Equipment Name" icon={FiCamera} required value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Sony FX6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-colors"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((cat, index) => (
                      <option key={index} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <InputField label="Serial Number" icon={FiHash} value={formData.serialNumber} onChange={(v) => setFormData({ ...formData, serialNumber: v })} placeholder="SN-XXXX" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <InputField label="Quantity" icon={FiHash} value={formData.totalQuantity} onChange={(v) => setFormData({ ...formData, totalQuantity: parseInt(v) || 1 })} placeholder="1" />
                 <InputField label="Location" icon={FiMapPin} value={formData.location} onChange={(v) => setFormData({ ...formData, location: v })} placeholder="e.g. Studio A" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="List what's included in this package..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] min-h-[80px] resize-none transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border border-transparent dark:border-slate-700 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            > 
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Equipment' : 'Register Equipment'}</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function InputField({ label, icon, value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
      <div className="relative">
        <SafeIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-colors" />
      </div>
    </div>
  );
}

export default InventoryList;
