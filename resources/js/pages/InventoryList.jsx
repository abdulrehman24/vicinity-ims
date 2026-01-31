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

const { 
  FiSearch, FiPlus, FiEdit2, FiX, FiCamera, FiHash, FiMapPin, 
  FiCheck, FiUpload, FiBriefcase, FiAlertTriangle, FiShield, 
  FiCalendar, FiFileText, FiTool, FiWrench 
} = FiIcons;

function InventoryList() {
  const { equipment, addEquipment, updateEquipment, isAdmin, toggleAdmin } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);

  const [decommissioningItem, setDecommissioningItem] = useState(null);
  const [repairingItem, setRepairingItem] = useState(null);

  const fuse = useMemo(() => new Fuse(equipment, {
    keys: ['name', 'serialNumber', 'category', 'equipmentType', 'businessUnit'],
    threshold: 0.3
  }), [equipment]);

  const filtered = useMemo(() => {
    let result = searchTerm ? fuse.search(searchTerm).map(r => r.item) : equipment;
    if (selectedCategory) result = result.filter(i => i.category === selectedCategory);
    
    if (!showDecommissioned) {
      result = result.filter(i => i.status !== 'decommissioned');
    } else {
      result = result.filter(i => i.status === 'decommissioned');
    }
    return result;
  }, [searchTerm, selectedCategory, equipment, fuse, showDecommissioned]);

  const handleDecommissionConfirm = (id, data) => {
    updateEquipment({
      id,
      status: 'decommissioned',
      decommissionDate: data.date,
      decommissionReason: data.reason
    });
    setDecommissioningItem(null);
    toast.success("Asset moved to graveyard");
  };

  const handleRepairConfirm = (id, data) => {
    updateEquipment({
      id,
      status: 'maintenance',
      remarks: data.reason,
      repairStartDate: data.date
    });
    setRepairingItem(null);
    toast.success("Asset sent to service bay");
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-[#4a5a67] tracking-tight mb-2">
            {showDecommissioned ? 'Asset Graveyard' : 'Inventory'}
          </h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowDecommissioned(!showDecommissioned)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showDecommissioned ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'bg-gray-100 text-gray-400'}`}
          >
            {showDecommissioned ? 'Show Active' : 'Show Decommissioned'}
          </button>
          <button 
            onClick={() => executeProtectedAction(() => setIsModalOpen(true))} 
            className="bg-[#4a5a67] text-[#ebc1b6] px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95" 
          >
            <SafeIcon icon={FiPlus} />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search assets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none transition-all font-medium text-[#4a5a67]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(item => (
          <AssetCard 
            key={item.id} 
            item={item} 
            isAdmin={isAdmin} 
            onDecommission={() => setDecommissioningItem(item)}
            onRepair={() => setRepairingItem(item)}
            onEdit={() => executeProtectedAction(() => setEditingItem(item))}
            onActivate={(id) => updateEquipment({id, status: 'available'})}
          />
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewEntryModal 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={async (data) => { 
              await addEquipment(data); 
              setIsModalOpen(false); 
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
              await updateEquipment({...data, id: editingItem.id}); 
              setEditingItem(null); 
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
      </AnimatePresence>
    </motion.div>
  );
}

function ActionModal({ item, type, onClose, onConfirm }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const isDecommission = type === 'decommission';
  const themeColor = isDecommission ? 'bg-orange-500' : 'bg-blue-500';
  const icon = isDecommission ? FiAlertTriangle : FiTool;
  const title = isDecommission ? 'Confirm Decommission' : 'Initiate Repair';
  const subTitle = isDecommission ? 'Permanent Removal from Active Fleet' : 'Transfer to Technical Service Bay';
  const buttonText = isDecommission ? 'Confirm Decommission' : 'Send to Repair';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/90 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden" >
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
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Details</p>
              <h4 className="text-sm font-bold text-[#4a5a67]">{item.name}</h4>
              <p className="text-[9px] font-medium text-gray-500">{item.serialNumber}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {isDecommission ? 'Removal Date' : 'Service Start Date'}
              </label>
              <div className="relative">
                <SafeIcon icon={FiCalendar} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] ${isDecommission ? 'focus:border-orange-500' : 'focus:border-blue-500'}`} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {isDecommission ? 'Reason for Decommissioning' : 'Technical Issue Description'}
              </label>
              <div className="relative">
                <SafeIcon icon={FiFileText} className="absolute left-4 top-4 text-gray-300" />
                <textarea 
                  placeholder={isDecommission ? "e.g. End of life, irrepairable damage..." : "Describe the malfunction or damage..."}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className={`w-full pl-11 p-4 bg-gray-50 border border-transparent focus:bg-white rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] h-32 resize-none ${isDecommission ? 'focus:border-orange-500' : 'focus:border-blue-500'}`} 
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(formData)}
              disabled={!formData.reason}
              className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-30 ${themeColor} ${isDecommission ? 'shadow-orange-200' : 'shadow-blue-200'}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AssetCard({ item, isAdmin, onDecommission, onRepair, onEdit, onActivate }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all ${item.status === 'decommissioned' ? 'opacity-60 grayscale' : ''}`}>
      <div className="h-48 relative overflow-hidden">
        <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-lg uppercase tracking-widest ${item.status === 'available' ? 'bg-green-500 text-white' : item.status === 'decommissioned' ? 'bg-black text-white' : item.status === 'maintenance' ? 'bg-blue-500 text-white' : 'bg-[#ebc1b6] text-[#4a5a67]'}`}>
            {item.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-[#4a5a67] mb-1">{item.name}</h3>
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{item.category}</p>
        
        {item.status === 'decommissioned' && item.decommissionReason && (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Graveyard Record</p>
            <p className="text-[10px] italic text-gray-500 line-clamp-2">"{item.decommissionReason}"</p>
            <p className="text-[9px] font-bold text-[#4a5a67] mt-1">{item.decommissionDate}</p>
          </div>
        )}

        {item.status === 'maintenance' && item.remarks && (
          <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Service Notes</p>
            <p className="text-[10px] italic text-[#4a5a67] line-clamp-2">"{item.remarks}"</p>
            <p className="text-[9px] font-bold text-blue-600 mt-1">In since: {item.repairStartDate || 'Recently'}</p>
          </div>
        )}
        
        <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-4">
          <button onClick={onEdit} className={`text-gray-400 hover:text-[#4a5a67] transition-colors p-2`}><SafeIcon icon={FiEdit2} /></button>
          
          <div className={`flex space-x-2 transition-all duration-300 ${isAdmin ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {item.status === 'decommissioned' || item.status === 'maintenance' ? (
              <button 
                onClick={() => onActivate(item.id)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all"
              >
                <SafeIcon icon={FiCheck} />
                <span>Restore</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={onRepair}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  <SafeIcon icon={FiTool} />
                  <span>Repair</span>
                </button>
                <button 
                  onClick={onDecommission}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all"
                >
                  <SafeIcon icon={FiAlertTriangle} />
                  <span>Decommission</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NewEntryModal({ onClose, onSubmit, initialData }) {
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    name: '',
    category: 'Camera Body',
    equipmentType: 'Camera',
    serialNumber: '',
    status: 'available',
    businessUnit: 'Studio',
    condition: 'excellent',
    location: '',
    image: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    totalQuantity: 1
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axios.get('/api/admin/categories');
        const list = (response.data.data || []).filter(c => c.is_active);
        if (!initialData && list.length > 0) {
          setFormData(prev => ({ ...prev, category: list[0].name }));
        }
        setCategories(list);
      } catch (e) {
        setCategories([]);
      }
    };
    loadCategories();
  }, [initialData]);

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
        
        toast.success(`Image optimized: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
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
      await onSubmit(formData);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false); // Only stop loading on error, as success unmounts component
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#4a5a67] p-6 flex justify-between items-center text-white">
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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Visual</label>
              <div {...getRootProps()} className={`relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${isDragActive ? 'border-[#ebc1b6] bg-[#ebc1b611]' : 'border-gray-100 hover:border-[#ebc1b6] bg-gray-50'}`}>
                <input {...getInputProps()} />
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <SafeIcon icon={FiUpload} className="text-4xl text-[#ebc1b6] mb-4 mx-auto" />
                    <p className="text-sm font-bold text-[#4a5a67]">Drop asset photo here</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <InputField label="Equipment Name" icon={FiCamera} required value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Sony FX6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
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
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`bg-[#4a5a67] text-[#ebc1b6] px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
      <div className="relative">
        <SafeIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]" />
      </div>
    </div>
  );
}

export default InventoryList;
