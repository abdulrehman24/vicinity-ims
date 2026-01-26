import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { conditions } from '../data/inventoryData';
import { format, addMonths, isPast, parseISO, differenceInDays } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import axios from 'axios';

const { FiUpload, FiCamera, FiCheck, FiX, FiSave, FiImage, FiMapPin, FiInfo, FiLayers, FiShield, FiLock, FiClock, FiAlertCircle } = FiIcons;

function StockTake() {
  const { equipment, stockTakes, addStockTake, updateEquipment, isAdmin } = useInventory();
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [stockTakeData, setStockTakeData] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [auditSettings, setAuditSettings] = useState({ interval: 6, nextDate: null });

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

  // Audit Reminder Logic
  const auditStatus = useMemo(() => {
    let nextAuditDue;

    if (auditSettings.nextDate) {
      nextAuditDue = parseISO(auditSettings.nextDate);
    } else if (!stockTakes || stockTakes.length === 0) {
      return { status: 'urgent', message: 'First audit required' };
    } else {
      const lastAudit = parseISO(stockTakes[0].date);
      nextAuditDue = addMonths(lastAudit, auditSettings.interval);
    }
    
    const daysRemaining = differenceInDays(nextAuditDue, new Date());
    
    if (isPast(nextAuditDue) && daysRemaining < 0) {
      return { status: 'overdue', date: format(nextAuditDue, 'MMM d, yyyy'), message: 'Full audit overdue!' };
    }
    return { status: 'current', date: format(nextAuditDue, 'MMM d, yyyy'), days: daysRemaining, message: 'Next audit due' };
  }, [stockTakes, auditSettings]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles, equipmentId) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImages(prev => ({
          ...prev,
          [equipmentId]: [...(prev[equipmentId] || []), { id: Date.now(), file, preview: reader.result, name: file.name }]
        }));
      };
      reader.readAsDataURL(file);
    });
  }, []);

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
        <div className="xl:col-span-4 space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Select Assets to Audit</label>
          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {equipment.map((item) => (
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
            ))}
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
                  const item = equipment.find(e => e.id === equipmentId);
                  const data = stockTakeData[equipmentId] || {};
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
            <div key={image.id} className="relative group aspect-square">
              <img src={image.preview} alt={image.name} className="w-full h-full object-cover rounded-lg border border-gray-100" />
              <button onClick={() => onRemoveImage(equipmentId, image.id)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <SafeIcon icon={FiX} className="text-[8px]" />
              </button>
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