import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { conditions } from '../data/inventoryData';
import { format, addMonths, isPast, parseISO, differenceInDays } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';

const { FiUpload, FiCamera, FiCheck, FiX, FiSave, FiImage, FiMapPin, FiInfo, FiLayers, FiShield, FiLock, FiClock, FiAlertCircle, FiSearch, FiFilter } = FiIcons;

function StockTake() {
  const { equipment, stockTakes, addStockTake, updateEquipment, updateLocalEquipment, isAdmin, categories: orderedCategories } = useInventory();
  const categoryOrder = useMemo(() => 
    (orderedCategories || []).reduce((acc, cat, idx) => ({ ...acc, [cat]: idx }), {}), 
    [orderedCategories]
  );
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [stockTakeData, setStockTakeData] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [auditSettings, setAuditSettings] = useState({ interval: 6, nextDate: null });
  const [isSaving, setIsSaving] = useState(false);
  const [verifiedAssets, setVerifiedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [historyModal, setHistoryModal] = useState({ isOpen: false, equipment: null, logs: [], loading: false });

  useEffect(() => {
      if (isAdmin) {
          axios.get('/stock-takes')
              .then(res => {
                  if (res.data.data) {
                      setVerifiedAssets(res.data.data);
                  }
              })
              .catch(err => console.error("Failed to fetch verified assets", err));
      }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      axios.get('/api/admin/audit-settings')
        .then(res => {
          setAuditSettings({
            interval: res.data.audit_interval_months,
            nextDate: res.data.audit_next_date
          });
        })
        .catch(err => console.error('Failed to fetch audit settings', err));
    }
  }, [isAdmin]);

  // Filter equipment that needs audit
  const equipmentToAudit = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return equipment.map(item => {
        let isDue = false;
        if (!item.nextAuditDate) {
            isDue = true;
        } else {
            const nextDate = parseISO(item.nextAuditDate);
            nextDate.setHours(0, 0, 0, 0);
            isDue = nextDate <= today;
        }
        return { ...item, isDue };
    });
  }, [equipment]);

  // Combine pending and verified items for the sidebar list
  const sidebarItems = useMemo(() => {
    // Unique verified assets by equipment ID (taking the most recent record)
    const uniqueVerifiedRecords = [];
    const processedIds = new Set();
    
    // verifiedAssets is already sorted by created_at desc from the backend
    verifiedAssets.forEach(record => {
      const eqId = record.equipment_id || record.equipment?.id;
      if (eqId && !processedIds.has(eqId)) {
        uniqueVerifiedRecords.push(record);
        processedIds.add(eqId);
      }
    });

    // Map unique verified assets to a structure compatible with the list
    const verifiedItems = uniqueVerifiedRecords.map(record => ({
      ...record.equipment,
      id: record.equipment_id || record.equipment?.id,
      isVerified: true,
      auditRecord: record,
      // Ensure we have fallbacks for display
      name: record.equipment?.name || 'Unknown Equipment',
      serialNumber: record.equipment?.serial_number || 'N/A',
      location: record.equipment?.location || 'N/A',
      image: record.equipment?.image || null
    }));

    // Create a Set of verified IDs to exclude duplicates if any
    const verifiedIds = new Set(verifiedItems.map(item => item.id));

    // Filter pending items to ensure they are not in the verified list
    const pendingItems = equipmentToAudit.filter(item => !verifiedIds.has(item.id));

    // Combine lists
    const combined = [...pendingItems, ...verifiedItems];

    // Filter by search term
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = combined.filter(item => 
        (item.name || '').toLowerCase().includes(lowerSearch) ||
        (item.serialNumber || '').toLowerCase().includes(lowerSearch) ||
        (item.location || '').toLowerCase().includes(lowerSearch)
    );

    // Sort by name for consistency
    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [equipmentToAudit, verifiedAssets, searchTerm]);

  // Get all unique categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set(equipment.map(item => item.category || 'Uncategorized'));
    return ['All', ...Array.from(cats).sort((a, b) => (categoryOrder[a] ?? 999) - (categoryOrder[b] ?? 999))];
  }, [equipment, categoryOrder]);

  // Group items by category
  const groupedSidebarItems = useMemo(() => {
    const groups = {};
    sidebarItems.forEach(item => {
      const cat = item.category || 'Uncategorized';
      
      // Filter by category if selected
      if (selectedCategory !== 'All' && cat !== selectedCategory) {
        return;
      }

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => (categoryOrder[a] ?? 999) - (categoryOrder[b] ?? 999))
      .map(category => ({
        category,
        items: groups[category]
      }));
  }, [sidebarItems, selectedCategory, categoryOrder]);

  // Audit Reminder Logic
  const auditStatus = useMemo(() => {
    let nextAuditDue;

    if (auditSettings.nextDate) {
      nextAuditDue = parseISO(auditSettings.nextDate);
    } else if (!stockTakes || stockTakes.length === 0) {
      return { status: 'urgent', message: 'First audit required' };
    } else {
      const lastAuditDate = stockTakes[0].date || stockTakes[0].created_at;
      if (!lastAuditDate) {
         return { status: 'urgent', message: 'First audit required' };
      }
      const lastAudit = parseISO(lastAuditDate);
      nextAuditDue = addMonths(lastAudit, auditSettings.interval);
    }
    
    const daysRemaining = differenceInDays(nextAuditDue, new Date());
    
    if (isPast(nextAuditDue) && daysRemaining < 0) {
      return { status: 'overdue', date: format(nextAuditDue, 'MMM d, yyyy'), message: 'Full audit overdue!' };
    }
    return { status: 'current', date: format(nextAuditDue, 'MMM d, yyyy'), days: daysRemaining, message: 'Next audit due' };
  }, [stockTakes, auditSettings]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles, equipmentId) => {
    acceptedFiles.forEach(async (file) => {
      let fileToProcess = file;
      
      // Compression options
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        initialQuality: 0.7,
      };

      try {
        const compressedFile = await imageCompression(file, options);
        fileToProcess = compressedFile;
      } catch (error) {
        console.error('Image compression failed:', error);
        // Fallback to original file
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newImage = { 
          id: Date.now(), 
          file: fileToProcess, 
          preview: reader.result, 
          name: file.name,
          timestamp: new Date().toLocaleString()
        };
        
        setUploadedImages(prev => ({
          ...prev,
          [equipmentId]: [...(prev[equipmentId] || []), newImage]
        }));

        // OPTIONAL: If you want to auto-complete the audit immediately upon upload,
        // you would call saveSingleStockTake here. However, since state updates are async,
        // we can't rely on uploadedImages being updated yet. 
        // We would need to pass the new image directly to the save function.
        // Given the requirement "once they upload... the audit is done", 
        // we can trigger the save logic immediately with the new image.
        
        // Uncomment the line below to enable auto-save on upload
        saveStockTakeWithImage(equipmentId, newImage);
      };
      reader.readAsDataURL(fileToProcess);
    });
  }, []);

  // Helper to save immediately with a specific image (bypassing state wait)
  const saveStockTakeWithImage = async (equipmentId, image) => {
     const item = equipment.find(e => e.id === equipmentId);
     const data = stockTakeData[equipmentId] || {};
     
     setIsSaving(true);
     const formData = new FormData();
     formData.append('equipment_id', equipmentId);
     formData.append('condition', data.condition || item.condition);
     formData.append('location', data.location || item.location || '');
     formData.append('notes', data.notes || '');
     if (image && image.file) {
         formData.append('image', image.file);
     }

     try {
         const response = await axios.post('/stock-takes', formData, {
             headers: { 'Content-Type': 'multipart/form-data' }
         });

         // Update local context
         if (response.data.equipment) {
             updateLocalEquipment(response.data.equipment);
         }
         
         if (response.data.data) {
             const record = response.data.data;
             // Merge equipment details for UI display since API response doesn't include relation
             const recordWithRel = { ...record, equipment: item };
             addStockTake({ ...recordWithRel, date: record.created_at });
             setVerifiedAssets(prev => [recordWithRel, ...prev]);
         }
         
         toast.success("Audit completed successfully");
         
         setSelectedEquipment(prev => prev.filter(id => id !== equipmentId));
         
         setStockTakeData(prev => {
             const next = { ...prev };
             delete next[equipmentId];
             return next;
         });
         setUploadedImages(prev => {
             const next = { ...prev };
             delete next[equipmentId];
             return next;
         });
     } catch (error) {
         console.error("Audit failed", error);
         toast.error("Failed to save audit record");
     } finally {
         setIsSaving(false);
     }
  };

  const handleEquipmentSelect = (equipmentId) => {
    setSelectedEquipment(prev => {
      if (prev.includes(equipmentId)) {
        return prev.filter(id => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });

    if (!stockTakeData[equipmentId]) {
      const item = equipment.find(e => e.id === equipmentId);
      setStockTakeData(prev => ({
        ...prev,
        [equipmentId]: {
          condition: item.condition,
          location: item.location,
          notes: '',
          status: item.status
        }
      }));
    }
  };

  const updateStockTakeData = (equipmentId, field, value) => {
    setStockTakeData(prev => ({
      ...prev,
      [equipmentId]: { ...prev[equipmentId], [field]: value }
    }));
  };

  const removeImage = (equipmentId, imageId) => {
    setUploadedImages(prev => ({
      ...prev,
      [equipmentId]: prev[equipmentId].filter(img => img.id !== imageId)
    }));
  };

  const fetchHistory = async (equipment) => {
    setHistoryModal({ isOpen: true, equipment, logs: [], loading: true });
    try {
        const res = await axios.get(`/equipment/${equipment.id}/stock-take-logs`);
        setHistoryModal(prev => ({ ...prev, logs: res.data.data, loading: false }));
    } catch (err) {
        console.error("Failed to fetch history logs", err);
        setHistoryModal(prev => ({ ...prev, loading: false }));
        toast.error("Failed to load audit history");
    }
  };

  const saveStockTake = async () => {
    setIsSaving(true);
    let successCount = 0;

    for (const equipmentId of selectedEquipment) {
      const item = equipment.find(e => e.id === equipmentId);
      const data = stockTakeData[equipmentId] || {};
      const images = uploadedImages[equipmentId] || [];

      const formData = new FormData();
      formData.append('equipment_id', equipmentId);
      formData.append('condition', data.condition || item.condition);
      formData.append('location', data.location || item.location || '');
      formData.append('notes', data.notes || '');
      
      if (images.length > 0 && images[images.length - 1].file) {
        formData.append('image', images[images.length - 1].file);
      }

      try {
        const response = await axios.post('/stock-takes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.equipment) {
          updateLocalEquipment(response.data.equipment);
        }
        
        if (response.data.data) {
          const record = response.data.data;
          const recordWithRel = { ...record, equipment: item };
          addStockTake({ ...recordWithRel, date: record.created_at });
          setVerifiedAssets(prev => [recordWithRel, ...prev]);
        }
        successCount++;
      } catch (error) {
        console.error(`Audit failed for ${item.name}`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully saved ${successCount} audit records`);
    }

    setSelectedEquipment([]);
    setStockTakeData({});
    setUploadedImages({});
    setIsSaving(false);
  };

  const saveSingleStockTake = async (equipmentId) => {
    const item = equipment.find(e => e.id === equipmentId);
    const data = stockTakeData[equipmentId] || {};
    const images = uploadedImages[equipmentId] || [];
    
    setIsSaving(true);
    const formData = new FormData();
    formData.append('equipment_id', equipmentId);
    formData.append('condition', data.condition || item.condition);
    formData.append('location', data.location || item.location || '');
    formData.append('notes', data.notes || '');
    
    if (images.length > 0 && images[images.length - 1].file) {
      formData.append('image', images[images.length - 1].file);
    }

    try {
      const response = await axios.post('/stock-takes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.equipment) {
        updateLocalEquipment(response.data.equipment);
      }
      
      if (response.data.data) {
        const record = response.data.data;
        const recordWithRel = { ...record, equipment: item };
        addStockTake({ ...recordWithRel, date: record.created_at });
        setVerifiedAssets(prev => [recordWithRel, ...prev]);
      }
      
      toast.success("Audit completed successfully");
      
      setSelectedEquipment(prev => prev.filter(id => id !== equipmentId));
      
      setStockTakeData(prev => {
        const next = { ...prev };
        delete next[equipmentId];
        return next;
      });
      setUploadedImages(prev => {
        const next = { ...prev };
        delete next[equipmentId];
        return next;
      });
    } catch (error) {
      console.error("Audit failed", error);
      toast.error("Failed to save audit record");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 transition-colors">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 text-center border border-gray-100 dark:border-slate-700 shadow-xl transition-colors">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100 dark:border-red-500/20">
            <SafeIcon icon={FiLock} className="text-3xl text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight mb-4">Access Restricted</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-8">
            Digital inventory auditing and stock-take protocols are reserved for administrative accounts. Please enable Admin Mode to proceed.
          </p>
          <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            <SafeIcon icon={FiShield} />
            <span>Authorized Personnel Only</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto min-h-screen transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight mb-2">STOCK TAKE</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>

        {/* Audit Reminder Banner */}
        <div className={`px-6 py-3 rounded-2xl border flex items-center space-x-4 transition-colors ${
          auditStatus.status === 'overdue' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400' : 
          auditStatus.status === 'urgent' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400' :
          'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20 text-green-600 dark:text-green-400'
        }`}>
          <div className={`p-2 rounded-xl ${
            auditStatus.status === 'overdue' ? 'bg-red-500 text-white' : 
            auditStatus.status === 'urgent' ? 'bg-orange-500 text-white' :
            'bg-green-500 text-white'
          }`}>
            <SafeIcon icon={auditStatus.status === 'overdue' ? FiAlertCircle : FiClock} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Recurring Audit Policy</p>
            <p className="text-xs font-bold leading-none mt-1">
              {auditStatus.message}: <span className="underline">{auditStatus.date || 'TBD'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-[#4a5a67] dark:text-slate-200 text-xs font-bold rounded-2xl px-4 py-3 appearance-none cursor-pointer focus:ring-2 focus:ring-[#ebc1b6] focus:border-[#ebc1b6] transition-all shadow-sm"
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <SafeIcon icon={FiFilter} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                <SafeIcon icon={FiSearch} className="text-gray-400 dark:text-slate-500 ml-1" />
                <input 
                    type="text" 
                    placeholder="Search assets to audit..." 
                    className="bg-transparent border-none focus:ring-0 text-xs w-full text-[#4a5a67] dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {groupedSidebarItems.map((group) => (
                <div key={group.category}>
                  <div className="sticky top-0 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 py-2 mb-2 border-b border-gray-200/50 dark:border-slate-700/50 transition-colors">
                    <h3 className="text-[10px] font-black text-[#4a5a67] dark:text-slate-400 uppercase tracking-widest px-1 flex justify-between items-center">
                      <span>{group.category}</span>
                      <span className="bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[9px]">{group.items.length}</span>
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      if (item.isVerified) {
                         return (
                            <div key={item.id} className="w-full text-left p-3 rounded-2xl border border-green-100 dark:border-green-500/20 bg-green-50/30 dark:bg-green-500/5 flex items-center space-x-3 opacity-80 hover:opacity-100 transition-all">
                                <div className="relative shrink-0">
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-10 h-10 rounded-xl object-cover border border-white/50 dark:border-slate-700 shadow-sm" 
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white dark:border-slate-800 shadow-sm">
                                        <SafeIcon icon={FiCheck} className="text-[8px]" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-bold text-xs truncate text-[#4a5a67] dark:text-slate-200">{item.name}</h3>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          fetchHistory(item);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/50 dark:bg-slate-800/50 text-gray-400 hover:text-[#ebc1b6] transition-colors"
                                        title="View History"
                                      >
                                        <SafeIcon icon={FiClock} className="text-[10px]" />
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                        {item.serialNumber}
                                      </p>
                                      <p className="text-[9px] font-mono text-gray-400 dark:text-slate-500 flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-slate-700">
                                          <SafeIcon icon={FiClock} className="text-[8px]" />
                                          {format(parseISO(item.auditRecord?.created_at), 'h:mm a')}
                                      </p>
                                    </div>
                                </div>
                            </div>
                         );
                      }

                      return (
                        <div key={item.id} className="relative group">
                          <button onClick={() => handleEquipmentSelect(item.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedEquipment.includes(item.id) ? 'bg-[#ebc1b6] border-[#ebc1b6] text-[#4a5a67] shadow-md' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-[#ebc1b6] text-[#4a5a67] dark:text-slate-200'}`} >
                            <div className="flex items-center space-x-3">
                              <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-white/20 dark:border-slate-700" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xs truncate">{item.name}</h3>
                                <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${selectedEquipment.includes(item.id) ? 'text-[#4a5a67]/60' : 'text-gray-400 dark:text-slate-500'}`}>
                                  {item.serialNumber} • {item.location}
                                </p>
                              </div>
                              {selectedEquipment.includes(item.id) && <SafeIcon icon={FiCheck} className="text-sm" />}
                            </div>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchHistory(item);
                            }}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                              selectedEquipment.includes(item.id) 
                                ? 'bg-white/20 text-[#4a5a67] hover:bg-white/40' 
                                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-400 hover:text-[#ebc1b6] opacity-0 group-hover:opacity-100'
                            }`}
                            title="View Audit History"
                          >
                            <SafeIcon icon={FiClock} className="text-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {sidebarItems.length === 0 && (
                 <div className="p-8 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                     <SafeIcon icon={FiSearch} className="mx-auto text-2xl text-gray-300 dark:text-slate-700 mb-2" />
                     <p className="text-xs font-bold text-gray-400 dark:text-slate-500">No assets found</p>
                     <p className="text-[10px] text-gray-300 dark:text-slate-600">{searchTerm ? "Try a different search" : "Inventory is empty"}</p>
                 </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          {selectedEquipment.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                <div>
                  <h2 className="text-sm font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-widest">Active Audit Queue</h2>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mt-1">Reviewing {selectedEquipment.length} item(s)</p>
                </div>
                <button onClick={saveStockTake} className="bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-2" >
                  <SafeIcon icon={FiSave} />
                  <span>Save All Changes</span>
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedEquipment.map((equipmentId) => {
                  const item = equipmentToAudit.find(e => e.id === equipmentId);
                  if (!item) return null; // Safety check
                  
                  const data = stockTakeData[equipmentId] || {};
                  
                  // If audit is not due yet, show read-only view
                  if (!item.isDue) {
                      return (
                        <motion.div key={equipmentId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 p-2 rounded-lg">
                                <SafeIcon icon={FiCheck} className="text-lg" />
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-widest">{item.name}</h3>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{item.category} • {item.serialNumber}</p>
                              </div>
                            </div>
                            <button onClick={() => handleEquipmentSelect(equipmentId)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                              <SafeIcon icon={FiX} />
                            </button>
                          </div>

                          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                              <div className="relative">
                                <img src={item.image} alt={item.name} className="w-64 h-64 rounded-2xl object-cover border-4 border-white dark:border-slate-700 shadow-lg" />
                                <div className="absolute -bottom-3 -right-3 bg-white dark:bg-slate-800 text-[#4a5a67] dark:text-slate-200 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-md flex items-center gap-2">
                                     <SafeIcon icon={FiShield} className="text-green-500" />
                                     <span className="font-black text-xs">VERIFIED</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-6 w-full max-w-md border border-gray-100 dark:border-slate-700 transition-colors">
                                  <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Next Audit Scheduled For</p>
                                  <div className="flex items-center justify-center gap-2 text-[#4a5a67] dark:text-slate-200">
                                      <SafeIcon icon={FiClock} className="text-xl text-[#ebc1b6]" />
                                      <p className="text-2xl font-black">
                                        {item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'MMMM do, yyyy') : 'Date not set'}
                                      </p>
                                  </div>
                                  {item.nextAuditDate && (
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold mt-2">
                                        {differenceInDays(parseISO(item.nextAuditDate), new Date())} days remaining
                                    </p>
                                  )}
                              </div>
                          </div>
                        </motion.div>
                      );
                  }

                  // If audit is due, show the form
                  return (
                    <motion.div key={equipmentId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                      <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-white dark:border-slate-700 shadow-sm" />
                          <div>
                            <h3 className="text-xs font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-widest">{item.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{item.category} • {item.serialNumber}</p>
                          </div>
                        </div>
                        <button onClick={() => handleEquipmentSelect(equipmentId)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                          <SafeIcon icon={FiX} />
                        </button>
                      </div>

                      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <InputWrapper label="Current Condition">
                              <select value={data.condition || item.condition} onChange={(e) => updateStockTakeData(equipmentId, 'condition', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] dark:text-slate-200 outline-none border border-transparent focus:border-[#ebc1b6] transition-colors">
                                {conditions.map(c => <option key={c} value={c} className="dark:bg-slate-800">{c.toUpperCase()}</option>)}
                              </select>
                            </InputWrapper>
                            <InputWrapper label="Current Location">
                              <input type="text" value={data.location || item.location} onChange={(e) => updateStockTakeData(equipmentId, 'location', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] dark:text-slate-200 outline-none border border-transparent focus:border-[#ebc1b6] transition-colors" />
                            </InputWrapper>
                          </div>
                          <InputWrapper label="Internal Notes">
                            <textarea value={data.notes || ''} onChange={(e) => updateStockTakeData(equipmentId, 'notes', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] dark:text-slate-200 h-20 resize-none outline-none border border-transparent focus:border-[#ebc1b6] transition-colors" placeholder="Describe any wear or missing accessories..." />
                          </InputWrapper>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Asset Verification Photo</label>
                          <ImageDropzone equipmentId={equipmentId} onDrop={onDrop} uploadedImages={uploadedImages[equipmentId] || []} onRemoveImage={removeImage} />
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">
                           {uploadedImages[equipmentId]?.length > 0 ? (
                               <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                                   <SafeIcon icon={FiCheck} /> Photo Verified
                               </span>
                           ) : (
                               <span className="text-orange-400 dark:text-orange-500/80 flex items-center gap-2">
                                   <SafeIcon icon={FiAlertCircle} /> Photo Required
                               </span>
                           )}
                        </div>
                        <button 
                            onClick={() => saveSingleStockTake(equipmentId)}
                            disabled={!uploadedImages[equipmentId] || uploadedImages[equipmentId].length === 0}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                                uploadedImages[equipmentId] && uploadedImages[equipmentId].length > 0
                                ? 'bg-[#ebc1b6] text-[#4a5a67] hover:bg-[#e0b0a5] shadow-md transform hover:-translate-y-0.5' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            <SafeIcon icon={FiCheck} />
                            <span>Complete Audit</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[60vh] bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-12 transition-colors">
              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 rounded-full mb-6 transition-colors">
                <SafeIcon icon={FiLayers} className="text-5xl text-gray-200 dark:text-slate-700" />
              </div>
              <h2 className="text-xl font-bold text-[#4a5a67] dark:text-slate-200 mb-2">Initialize Stock Take</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 max-w-xs leading-relaxed">Select equipment from the left sidebar to start verifying conditions and updating asset imagery.</p>
            </div>
          )}
        </div>
      </div>
      <HistoryModal 
        isOpen={historyModal.isOpen} 
        onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
        equipment={historyModal.equipment}
        logs={historyModal.logs}
        loading={historyModal.loading}
      />
    </motion.div>
  );
}

function HistoryModal({ isOpen, onClose, equipment, logs, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-slate-700"
      >
        <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/30">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#ebc1b6] rounded-2xl text-[#4a5a67] shadow-sm">
              <SafeIcon icon={FiClock} className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight">Audit History</h2>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                {equipment?.name} • {equipment?.serialNumber || equipment?.serial_number}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-gray-400 hover:text-red-500 shadow-sm border border-gray-100 dark:border-slate-700 transition-all hover:scale-110">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#ebc1b6] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving Logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <SafeIcon icon={FiInfo} className="text-5xl text-gray-300" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No audit records found for this asset</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Verification Photo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Date & User</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Status/Location</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4">
                        {log.image_path ? (
                          <div className="relative group w-24 aspect-square">
                            <img 
                              src={log.image_path} 
                              alt="Verification" 
                              className="w-full h-full object-cover rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105" 
                            />
                            <a 
                              href={log.image_path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white text-[10px] font-black uppercase tracking-widest"
                            >
                              View Full
                            </a>
                          </div>
                        ) : (
                          <div className="w-24 aspect-square bg-gray-100 dark:bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-700">
                            <SafeIcon icon={FiImage} className="text-gray-300 dark:text-slate-700 text-xl" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight">
                            {format(parseISO(log.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">
                            {format(parseISO(log.created_at), 'h:mm a')}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[8px] font-black">
                                {log.user?.name?.[0]?.toUpperCase() || '?'}
                             </div>
                             <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{log.user?.name || 'Unknown User'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                              log.condition === 'good' ? 'bg-green-100 dark:bg-green-500/10 text-green-600' :
                              log.condition === 'fair' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' :
                              'bg-red-100 dark:bg-red-500/10 text-red-600'
                            }`}>
                              {log.condition}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500">
                            <SafeIcon icon={FiMapPin} className="text-[#ebc1b6]" />
                            {log.location || 'No location recorded'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs italic">
                          {log.notes || 'No internal notes provided for this audit.'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-6 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-700 text-center">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Audit Log Integrity Verified • {logs.length} Total Records</p>
        </div>
      </motion.div>
    </div>
  );
}

function ImageDropzone({ equipmentId, onDrop, uploadedImages, onRemoveImage }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => onDrop(acceptedFiles, rejectedFiles, equipmentId),
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true
  });

  return (
    <div className="space-y-3">
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-[#ebc1b6] bg-[#ebc1b611]' : 'border-gray-100 dark:border-slate-700 hover:border-[#ebc1b6] bg-gray-50 dark:bg-slate-900/50'}`}>
        <input {...getInputProps()} />
        <SafeIcon icon={FiUpload} className="text-2xl text-[#ebc1b6] mx-auto mb-2" />
        <p className="text-[10px] font-bold text-[#4a5a67] dark:text-slate-300 uppercase tracking-widest">Capture or Drop Image</p>
      </div>
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square mb-1">
                <img src={image.preview} alt={image.name} className="w-full h-full object-cover rounded-lg border border-gray-100 dark:border-slate-700" />
                <button onClick={() => onRemoveImage(equipmentId, image.id)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <SafeIcon icon={FiX} className="text-[8px]" />
                </button>
              </div>
              <p className="text-[8px] text-center text-gray-400 dark:text-slate-500 font-mono">{image.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputWrapper({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

export default StockTake;