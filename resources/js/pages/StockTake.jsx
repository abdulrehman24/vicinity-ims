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

const { FiUpload, FiCamera, FiCheck, FiX, FiSave, FiImage, FiMapPin, FiInfo, FiLayers, FiShield, FiLock, FiClock, FiAlertCircle, FiSearch } = FiIcons;

function StockTake() {
  const { equipment, stockTakes, addStockTake, updateEquipment, updateLocalEquipment, isAdmin } = useInventory();
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [stockTakeData, setStockTakeData] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [auditSettings, setAuditSettings] = useState({ interval: 6, nextDate: null });
  const [isSaving, setIsSaving] = useState(false);
  const [verifiedAssets, setVerifiedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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
    // Map verified assets to a structure compatible with the list
    const verifiedItems = verifiedAssets.map(record => ({
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

  const saveStockTake = () => {
    const stockTakeRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      equipment: selectedEquipment.map(equipmentId => {
        const item = equipment.find(e => e.id === equipmentId);
        return {
          equipmentId,
          equipmentName: item.name,
          oldCondition: item.condition,
          newCondition: stockTakeData[equipmentId].condition,
          oldLocation: item.location,
          newLocation: stockTakeData[equipmentId].location,
          notes: stockTakeData[equipmentId].notes,
          images: uploadedImages[equipmentId] || []
        };
      })
    };

    selectedEquipment.forEach(equipmentId => {
      const updates = { ...stockTakeData[equipmentId] };
      const newPhotos = uploadedImages[equipmentId];
      if (newPhotos && newPhotos.length > 0) {
        updates.image = newPhotos[newPhotos.length - 1].preview;
      }
      updateEquipment({ id: equipmentId, ...updates });
    });

    addStockTake(stockTakeRecord);
    setSelectedEquipment([]);
    setStockTakeData({});
    setUploadedImages({});
  };

  const saveSingleStockTake = (equipmentId) => {
    const item = equipment.find(e => e.id === equipmentId);
    const data = stockTakeData[equipmentId] || {};
    const images = uploadedImages[equipmentId] || [];

    const stockTakeRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      equipment: [{
        equipmentId,
        equipmentName: item.name,
        oldCondition: item.condition,
        newCondition: data.condition || item.condition,
        oldLocation: item.location,
        newLocation: data.location || item.location,
        notes: data.notes || '',
        images: images
      }]
    };

    const nextAuditDate = addMonths(new Date(), auditSettings.interval);
    
    // Merge existing item properties with updates to ensure all required fields are present
    const updates = { 
        ...item, // Include all existing fields first
        ...data, // Overwrite with stock take changes
        nextAuditDate: format(nextAuditDate, 'yyyy-MM-dd')
    };

    // Remove backend-only or problematic fields that shouldn't be sent back as-is if they cause issues,
    // but InventoryContext.updateEquipment handles most mapping.
    // However, we must ensure fields match what mapFrontendToBackend expects.
    // The context sends the spread object.

    if (images.length > 0) {
      updates.image = images[images.length - 1].preview;
    }
    updateEquipment({ id: equipmentId, ...updates });
    addStockTake(stockTakeRecord);
    
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
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-xl">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100">
            <SafeIcon icon={FiLock} className="text-3xl text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-[#4a5a67] uppercase tracking-tight mb-4">Access Restricted</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Digital inventory auditing and stock-take protocols are reserved for administrative accounts. Please enable Admin Mode to proceed.
          </p>
          <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <SafeIcon icon={FiShield} />
            <span>Authorized Personnel Only</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">STOCK TAKE</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>

        {/* Audit Reminder Banner */}
        <div className={`px-6 py-3 rounded-2xl border flex items-center space-x-4 ${
          auditStatus.status === 'overdue' ? 'bg-red-50 border-red-100 text-red-600' : 
          auditStatus.status === 'urgent' ? 'bg-orange-50 border-orange-100 text-orange-600' :
          'bg-green-50 border-green-100 text-green-600'
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
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <SafeIcon icon={FiSearch} className="text-gray-400 ml-1" />
                <input 
                    type="text" 
                    placeholder="Search assets to audit..." 
                    className="bg-transparent border-none focus:ring-0 text-xs w-full text-[#4a5a67] placeholder-gray-400 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {sidebarItems.map((item) => {
                if (item.isVerified) {
                   return (
                      <div key={item.id} className="w-full text-left p-3 rounded-2xl border border-green-100 bg-green-50/30 flex items-center space-x-3 opacity-80 hover:opacity-100 transition-opacity">
                          <div className="relative shrink-0">
                              <img 
                                src={item.auditRecord?.image_path || item.image} 
                                alt={item.name} 
                                className="w-10 h-10 rounded-xl object-cover border border-white/50 shadow-sm" 
                              />
                              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white shadow-sm">
                                  <SafeIcon icon={FiCheck} className="text-[8px]" />
                              </div>
                          </div>
                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xs truncate text-[#4a5a67]">{item.name}</h3>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                  {item.serialNumber}
                                </p>
                                <p className="text-[9px] font-mono text-gray-400 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-gray-100">
                                    <SafeIcon icon={FiClock} className="text-[8px]" />
                                    {format(parseISO(item.auditRecord?.created_at), 'h:mm a')}
                                </p>
                              </div>
                          </div>
                      </div>
                   );
                }

                return (
                  <button key={item.id} onClick={() => handleEquipmentSelect(item.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedEquipment.includes(item.id) ? 'bg-[#ebc1b6] border-[#ebc1b6] text-[#4a5a67] shadow-md' : 'bg-white border-gray-100 hover:border-[#ebc1b6] text-[#4a5a67]'}`} >
                    <div className="flex items-center space-x-3">
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-white/20" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs truncate">{item.name}</h3>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${selectedEquipment.includes(item.id) ? 'text-[#4a5a67]/60' : 'text-gray-400'}`}>
                          {item.serialNumber} • {item.location}
                        </p>
                      </div>
                      {selectedEquipment.includes(item.id) && <SafeIcon icon={FiCheck} className="text-sm" />}
                    </div>
                  </button>
                );
              })}
              {sidebarItems.length === 0 && (
                 <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                     <SafeIcon icon={FiSearch} className="mx-auto text-2xl text-gray-300 mb-2" />
                     <p className="text-xs font-bold text-gray-400">No assets found</p>
                     <p className="text-[10px] text-gray-300">{searchTerm ? "Try a different search" : "Inventory is empty"}</p>
                 </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          {selectedEquipment.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                  <h2 className="text-sm font-black text-[#4a5a67] uppercase tracking-widest">Active Audit Queue</h2>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">Reviewing {selectedEquipment.length} item(s)</p>
                </div>
                <button onClick={saveStockTake} className="bg-[#4a5a67] text-[#ebc1b6] px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-2" >
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
                        <motion.div key={equipmentId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                                <SafeIcon icon={FiCheck} className="text-lg" />
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-[#4a5a67] uppercase tracking-widest">{item.name}</h3>
                                <p className="text-[10px] font-bold text-gray-400">{item.serialNumber}</p>
                              </div>
                            </div>
                            <button onClick={() => handleEquipmentSelect(equipmentId)} className="text-gray-300 hover:text-red-500">
                              <SafeIcon icon={FiX} />
                            </button>
                          </div>

                          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                              <div className="relative">
                                <img src={item.image} alt={item.name} className="w-64 h-64 rounded-2xl object-cover border-4 border-white shadow-lg" />
                                <div className="absolute -bottom-3 -right-3 bg-white text-[#4a5a67] px-4 py-2 rounded-xl border border-gray-100 shadow-md flex items-center gap-2">
                                     <SafeIcon icon={FiShield} className="text-green-500" />
                                     <span className="font-black text-xs">VERIFIED</span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-2xl p-6 w-full max-w-md border border-gray-100">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Next Audit Scheduled For</p>
                                  <div className="flex items-center justify-center gap-2 text-[#4a5a67]">
                                      <SafeIcon icon={FiClock} className="text-xl text-[#ebc1b6]" />
                                      <p className="text-2xl font-black">
                                        {item.nextAuditDate ? format(parseISO(item.nextAuditDate), 'MMMM do, yyyy') : 'Date not set'}
                                      </p>
                                  </div>
                                  {item.nextAuditDate && (
                                    <p className="text-[10px] text-gray-400 font-bold mt-2">
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
                    <motion.div key={equipmentId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" />
                          <div>
                            <h3 className="text-xs font-black text-[#4a5a67] uppercase tracking-widest">{item.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400">{item.serialNumber}</p>
                          </div>
                        </div>
                        <button onClick={() => handleEquipmentSelect(equipmentId)} className="text-gray-300 hover:text-red-500">
                          <SafeIcon icon={FiX} />
                        </button>
                      </div>

                      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <InputWrapper label="Current Condition">
                              <select value={data.condition || item.condition} onChange={(e) => updateStockTakeData(equipmentId, 'condition', e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6]">
                                {conditions.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                              </select>
                            </InputWrapper>
                            <InputWrapper label="Current Location">
                              <input type="text" value={data.location || item.location} onChange={(e) => updateStockTakeData(equipmentId, 'location', e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6]" />
                            </InputWrapper>
                          </div>
                          <InputWrapper label="Internal Notes">
                            <textarea value={data.notes || ''} onChange={(e) => updateStockTakeData(equipmentId, 'notes', e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-[#4a5a67] h-20 resize-none outline-none border border-transparent focus:border-[#ebc1b6]" placeholder="Describe any wear or missing accessories..." />
                          </InputWrapper>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Asset Verification Photo</label>
                          <ImageDropzone equipmentId={equipmentId} onDrop={onDrop} uploadedImages={uploadedImages[equipmentId] || []} onRemoveImage={removeImage} />
                          <p className="text-[8px] text-gray-400 italic">Note: Saving will replace the asset's main display image with the latest upload.</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="text-[10px] text-gray-400 font-bold">
                           {uploadedImages[equipmentId]?.length > 0 ? (
                               <span className="text-green-600 flex items-center gap-2">
                                   <SafeIcon icon={FiCheck} /> Photo Verified
                               </span>
                           ) : (
                               <span className="text-orange-400 flex items-center gap-2">
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
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
            <div className="h-[60vh] bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-12">
              <div className="p-6 bg-gray-50 rounded-full mb-6">
                <SafeIcon icon={FiLayers} className="text-5xl text-gray-200" />
              </div>
              <h2 className="text-xl font-bold text-[#4a5a67] mb-2">Initialize Stock Take</h2>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Select equipment from the left sidebar to start verifying conditions and updating asset imagery.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-[#ebc1b6] bg-[#ebc1b611]' : 'border-gray-100 hover:border-[#ebc1b6] bg-gray-50'}`}>
        <input {...getInputProps()} />
        <SafeIcon icon={FiUpload} className="text-2xl text-[#ebc1b6] mx-auto mb-2" />
        <p className="text-[10px] font-bold text-[#4a5a67] uppercase tracking-widest">Capture or Drop Image</p>
      </div>
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square mb-1">
                <img src={image.preview} alt={image.name} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                <button onClick={() => onRemoveImage(equipmentId, image.id)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <SafeIcon icon={FiX} className="text-[8px]" />
                </button>
              </div>
              <p className="text-[8px] text-center text-gray-400 font-mono">{image.timestamp}</p>
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
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

export default StockTake;