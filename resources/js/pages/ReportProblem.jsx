import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import Fuse from 'fuse.js';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const { 
  FiSearch, FiAlertTriangle, FiCheck, FiInfo, FiCamera, 
  FiBox, FiMessageSquare, FiSend, FiZap, FiTool, FiEye, 
  FiPackage, FiActivity, FiShield, FiUser, FiClock, FiX
} = FiIcons;

const issueTypes = [
  { id: 'mechanical', label: 'Mechanical Failure', icon: 'FiTool' },
  { id: 'optical', label: 'Optical/Lens Issue', icon: 'FiEye' },
  { id: 'electronic', label: 'Electronic Malfunction', icon: 'FiZap' },
  { id: 'missing', label: 'Missing Accessories', icon: 'FiPackage' },
  { id: 'cosmetic', label: 'Cosmetic / Housing', icon: 'FiActivity' },
  { id: 'other', label: 'Other / Unknown', icon: 'FiInfo' }
];

function ReportProblem() {
  const { equipment, reportProblem, updateEquipment, fetchEquipmentLogs, user } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnMax, setReturnMax] = useState(1);
  const [returnQty, setReturnQty] = useState(1);
  const [report, setReport] = useState({
    issueType: 'mechanical',
    severity: 'minor',
    description: '',
    reportedBy: '',
    status: 'maintenance',
    quantity: 1
  });

  // Update suggested status when item is selected
  React.useEffect(() => {
    if (selectedItem) {
        setReport(prev => ({
            ...prev,
            status: selectedItem.status === 'available' ? 'maintenance' : selectedItem.status
        }));
    }
  }, [selectedItem]);

  const fuse = useMemo(() => new Fuse(equipment, {
    keys: ['name', 'serialNumber', 'category', 'currentBooking.shootName'],
    threshold: 0.3
  }), [equipment]);

  const filtered = useMemo(() => {
    if (!searchTerm) return equipment;
    return fuse.search(searchTerm).map(r => r.item);
  }, [searchTerm, equipment, fuse]);

  const handleReturnUpdate = async (updates) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await updateEquipment(updates);
      setSelectedItem(null);
      setSearchTerm('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedItem || !report.description || !report.reportedBy) {
      toast.error("Please provide your name and issue details");
      return;
    }

    if (selectedItem.totalQuantity > 1 && report.status === 'maintenance') {
      const currentMaintenance = selectedItem.maintenanceQuantity || 0;
      const maxMovable = Math.max(0, (selectedItem.totalQuantity || 0) - currentMaintenance);
      const requested = report.quantity || 1;

      if (requested < 1 || requested > maxMovable) {
        toast.error(`Please enter a quantity between 1 and ${maxMovable}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await reportProblem({
        equipmentId: selectedItem.id,
        equipmentName: selectedItem.name,
        ...report
      });

      if (report.status && report.status !== selectedItem.status) {
          let maintenanceQuantity = selectedItem.maintenanceQuantity || 0;

          if (report.status === 'maintenance' && selectedItem.totalQuantity > 1) {
            const total = selectedItem.totalQuantity || 0;
            const increment = report.quantity || 1;
            maintenanceQuantity = Math.max(0, Math.min(total, maintenanceQuantity + increment));
          }

          const nextStatus = report.status === 'maintenance' && selectedItem.totalQuantity > 1 && maintenanceQuantity < (selectedItem.totalQuantity || 0)
            ? 'available'
            : report.status;

          await updateEquipment({
              ...selectedItem,
              status: nextStatus,
              maintenanceQuantity
          });
      }

      setSelectedItem(null);
      setReport({
        issueType: 'mechanical',
        severity: 'minor',
        description: '',
        reportedBy: '',
        status: 'maintenance',
        quantity: 1
      });
      setSearchTerm('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowLogs = async () => {
    if (selectedItem) {
        const data = await fetchEquipmentLogs(selectedItem.id);
        setLogs(data);
        setShowLogs(true);
    }
  };

  const handleResolve = async () => {
    if (!selectedItem || isSubmitting) return;

    if (!user || (user.is_admin !== 1 && user.is_admin !== 2)) {
        toast.error("Only admins can return items to inventory");
        return;
    }
    
    if (selectedItem.totalQuantity > 1) {
      const total = selectedItem.totalQuantity || 0;
      const currentMaintenance = selectedItem.maintenanceQuantity || 0;
      const maxRestorable = currentMaintenance > 0 ? currentMaintenance : total;

      if (maxRestorable < 1) {
        await handleReturnUpdate({
          ...selectedItem,
          status: 'available',
          maintenanceQuantity: 0
        });
        return;
      }

      setReturnMax(maxRestorable);
      setReturnQty(maxRestorable);
      setShowReturnModal(true);
      return;
    }

    await handleReturnUpdate({
      ...selectedItem,
      status: 'available',
      maintenanceQuantity: 0
    });
  };

  const handleConfirmReturn = async () => {
    if (!selectedItem || isSubmitting) return;

    const max = returnMax;
    const qty = parseInt(returnQty, 10) || 0;

    if (qty < 1 || qty > max) {
      toast.error(`Please enter a number between 1 and ${max}`);
      return;
    }

    const currentMaintenance = selectedItem.maintenanceQuantity || 0;
    const nextMaintenance = Math.max(0, currentMaintenance - qty);
    const nextStatus = nextMaintenance > 0 ? 'maintenance' : 'available';

    await handleReturnUpdate({
      ...selectedItem,
      status: nextStatus,
      maintenanceQuantity: nextMaintenance
    });

    setShowReturnModal(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-8 max-w-7xl mx-auto min-h-screen"
    >
      <AnimatePresence>
        {showLogs && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setShowLogs(false)} 
                    className="absolute inset-0 bg-[#4a5a67]/90 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                    className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" 
                >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#4a5a67] text-white">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest">Equipment Logs</h2>
                            <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-widest mt-1">{selectedItem?.name}</p>
                        </div>
                        <button onClick={() => setShowLogs(false)} className="text-white/40 hover:text-white transition-colors">
                            <SafeIcon icon={FiX} className="text-2xl" />
                        </button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pl-8 py-2">
                            {logs.length > 0 ? logs.map((log, idx) => (
                                <div key={log.id} className="relative">
                                    <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${log.action === 'status_change' ? 'bg-[#ebc1b6]' : 'bg-[#4a5a67]'}`} />
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#ebc1b6] transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                {format(parseISO(log.created_at), 'MMM dd, yyyy • HH:mm')}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a67] bg-white px-2 py-1 rounded-full shadow-sm">
                                                {log.user_name || 'System'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-[#4a5a67] text-sm mb-1 uppercase tracking-wide">
                                            {log.action.replace('_', ' ')}
                                        </h3>
                                        {log.previous_status && (
                                            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                                                <span>{log.previous_status}</span>
                                                <span>→</span>
                                                <span className={log.new_status === 'available' ? 'text-green-500' : 'text-[#ebc1b6]'}>{log.new_status}</span>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                            {log.description}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-gray-400">
                                    <SafeIcon icon={FiClock} className="text-2xl mx-auto mb-2 opacity-30" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No history available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
        {showReturnModal && selectedItem && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => !isSubmitting && setShowReturnModal(false)} 
                    className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                    className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden" 
                >
                    <div className="p-6 border-b border-gray-100 bg-[#4a5a67] text-white">
                        <h2 className="text-lg font-black uppercase tracking-widest">Return Units</h2>
                        <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-widest mt-1">
                            {selectedItem.name}
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-gray-500 font-medium">
                            How many units are ready to return to active inventory?
                        </p>
                        <div className="relative">
                            <SafeIcon icon={FiBox} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                                type="number"
                                min={1}
                                max={returnMax}
                                value={returnQty}
                                onChange={(e) => setReturnQty(e.target.value)}
                                className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6] transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400">
                            Units in repair: {selectedItem.maintenanceQuantity || 0} • Max returnable: {returnMax}
                        </p>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setShowReturnModal(false)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 text-gray-500 bg-white transition-all ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleConfirmReturn}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4a5a67] text-[#ebc1b6] shadow-md transition-all ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#3d4b56] hover:shadow-lg'}`}
                        >
                            Confirm Return
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">Technical Support</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
        <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm">
          <SafeIcon icon={FiShield} className="text-[#ebc1b6]" />
          <span className="text-[10px] font-black text-[#4a5a67] uppercase tracking-widest">Maintenance Protocol Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Step 1: Asset Selection */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">1. Select Equipment</label>
            <span className="text-[9px] font-bold text-[#ebc1b6] bg-[#4a5a67] px-2 py-0.5 rounded-full">
              {equipment.length} Assets
            </span>
          </div>
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, S/N or category..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#ebc1b6] text-xs font-bold text-[#4a5a67] shadow-sm transition-all" 
            />
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.length > 0 ? filtered.map(item => (
              <button 
                key={item.id} 
                onClick={() => setSelectedItem(item)} 
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedItem?.id === item.id ? 'bg-[#4a5a67] border-[#4a5a67] text-white shadow-lg' : 'bg-white border-gray-100 hover:border-[#ebc1b6] text-[#4a5a67]'}`} 
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-white/20" alt="" />
                    {item.status === 'maintenance' && (
                      <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white">
                        <SafeIcon icon={FiTool} className="text-[8px] text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs truncate">{item.name}</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${selectedItem?.id === item.id ? 'text-white/60' : 'text-gray-400'}`}>
                        {item.serialNumber}
                      </span>
                      <span className={`w-1 h-1 rounded-full ${item.status === 'available' ? 'bg-green-400' : 'bg-[#ebc1b6]'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${selectedItem?.id === item.id ? 'text-white/60' : 'text-gray-400'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {selectedItem?.id === item.id && <SafeIcon icon={FiCheck} className="text-sm text-[#ebc1b6]" />}
                </div>
              </button>
            )) : (
              <div className="text-center py-10 opacity-30">
                <SafeIcon icon={FiInfo} className="text-2xl mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No matching gear found</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Problem Details */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div 
                key="form" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="bg-[#4a5a67] p-8 text-white flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <img src={selectedItem.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg" alt="" />
                    <div>
                      <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                      <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">{selectedItem.serialNumber}</p>
                      {selectedItem.totalQuantity >= 1 && (
                        <p className="text-[9px] font-bold text-white/70 mt-1">
                          {Math.max(0, (selectedItem.totalQuantity || 0) - (selectedItem.maintenanceQuantity || 0))}/{selectedItem.totalQuantity || 0} units available
                          {(selectedItem.maintenanceQuantity || 0) > 0 && (
                            <span className="ml-1">
                              • {selectedItem.maintenanceQuantity || 0} in repair
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-1">Current Status</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedItem.status === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-[#ebc1b6]/20 text-[#ebc1b6]'} mb-2`}>
                      {selectedItem.status.replace('_', ' ')}
                    </span>
                    <button 
                        onClick={handleShowLogs}
                        className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                    >
                        <SafeIcon icon={FiActivity} className="text-xs" />
                        <span>See Logs</span>
                    </button>
                  </div>
                </div>

                {(selectedItem.status === 'maintenance' || selectedItem.status === 'decommissioned') ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2">
                            <SafeIcon icon={FiCheck} className="text-3xl text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">Maintenance Complete?</h3>
                            <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                                This item is currently marked as <span className="font-bold text-[#ebc1b6] uppercase">{selectedItem.status}</span>. 
                                <br/>If repairs are finished, you can return it to the active inventory immediately.
                            </p>
                        </div>
                        {(user?.is_admin === 1 || user?.is_admin === 2) ? (
                            <button 
                                onClick={handleResolve}
                                disabled={isSubmitting}
                                className={`bg-[#4a5a67] text-[#ebc1b6] px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center space-x-3 mt-4 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#3d4b56] hover:shadow-xl'}`}
                            >
                                <span>Return to Inventory</span>
                                <SafeIcon icon={FiCheck} />
                            </button>
                        ) : (
                            <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider mt-4 border border-amber-100">
                                Equipment Under Maintenance
                            </div>
                        )}
                    </div>
                ) : (
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">2. Reporter Name</label>
                      <div className="relative">
                        <SafeIcon icon={FiUser} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input 
                          required 
                          placeholder="Your full name"
                          value={report.reportedBy}
                          onChange={(e) => setReport({ ...report, reportedBy: e.target.value })}
                          className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6] transition-all"
                        />
                      </div>
                    </section>
                    
                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">3. Severity Assessment</label>
                      <div className="flex space-x-2">
                        {['minor', 'major', 'critical'].map(sev => (
                          <button 
                            key={sev} 
                            type="button" 
                            onClick={() => setReport({ ...report, severity: sev })} 
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${report.severity === sev ? (sev === 'critical' ? 'bg-red-500 text-white shadow-lg' : 'bg-[#4a5a67] text-[#ebc1b6] shadow-lg') : 'bg-gray-50 text-gray-400'}`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                    <section className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">4. Update Equipment Status</label>
                      <div className="flex space-x-2">
                        {[
                            { value: 'available', label: 'Active', color: 'bg-green-500', text: 'text-white' },
                            { value: 'maintenance', label: 'Maintenance', color: 'bg-[#ebc1b6]', text: 'text-[#4a5a67]' },
                            { value: 'decommissioned', label: 'Decommissioned', color: 'bg-red-500', text: 'text-white' }
                        ].map(status => (
                          <button 
                            key={status.value} 
                            type="button" 
                            onClick={() => setReport({ ...report, status: status.value })} 
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${report.status === status.value ? `${status.color} ${status.text} shadow-lg` : 'bg-gray-50 text-gray-400'}`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    {selectedItem && selectedItem.totalQuantity > 1 && report.status === 'maintenance' && (
                      <section className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">5. Units To Move To Repair</label>
                        <div className="relative">
                          <SafeIcon icon={FiBox} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input
                            type="number"
                            min={1}
                            max={selectedItem.totalQuantity}
                            value={report.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 1;
                              setReport({ ...report, quantity: value });
                            }}
                            className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6] transition-all"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Total units: {selectedItem.totalQuantity}
                        </p>
                      </section>
                    )}

                    <section className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{selectedItem && selectedItem.totalQuantity > 1 ? '6. Select Issue Category' : '5. Select Issue Category'}</label>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                      {issueTypes.map(type => (
                        <button 
                          key={type.id} 
                          type="button" 
                          onClick={() => setReport({ ...report, issueType: type.id })} 
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${report.issueType === type.id ? 'bg-[#ebc1b6] border-[#ebc1b6] text-[#4a5a67] shadow-md' : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-400'}`} 
                        >
                          <SafeIcon name={type.icon} className="text-xl mb-2" />
                          <span className="text-[8px] font-black uppercase tracking-tight text-center">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">6. Technical Observations</label>
                    <div className="relative">
                      <SafeIcon icon={FiMessageSquare} className="absolute left-4 top-4 text-gray-300" />
                      <textarea 
                        required 
                        value={report.description} 
                        onChange={(e) => setReport({ ...report, description: e.target.value })} 
                        placeholder="Describe the malfunction, damage, or missing components in detail..." 
                        className="w-full bg-gray-50 pl-11 p-4 rounded-2xl text-xs font-bold text-[#4a5a67] outline-none border border-transparent focus:border-[#ebc1b6] h-32 resize-none" 
                      />
                    </div>
                    {report.severity === 'critical' && (
                      <div className="flex items-center space-x-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                        <SafeIcon icon={FiAlertTriangle} />
                        <p className="text-[9px] font-black uppercase tracking-widest">Immediate Decommission: Item will be locked for repair upon submission.</p>
                      </div>
                    )}
                  </section>

                  <div className="pt-6 border-t border-gray-50 flex justify-end space-x-3">
                    {(user?.is_admin === 1 || user?.is_admin === 2) && selectedItem && selectedItem.totalQuantity > 1 && (selectedItem.maintenanceQuantity || 0) > 0 && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleResolve}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-[#4a5a67] text-[#4a5a67] bg-white flex items-center space-x-2 transition-all ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                      >
                        <span>Return Units</span>
                        <SafeIcon icon={FiCheck} />
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`bg-[#4a5a67] text-[#ebc1b6] px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center space-x-3 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl'}`}
                    >
                      <span>File Repair Request</span>
                      <SafeIcon icon={FiSend} />
                    </button>
                  </div>
                </form>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="h-[60vh] bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-12 shadow-sm"
              >
                <div className="p-8 bg-gray-50 rounded-full mb-6 relative">
                  <SafeIcon icon={FiTool} className="text-5xl text-gray-200" />
                  <div className="absolute top-0 right-0 bg-[#ebc1b6] rounded-full p-2 translate-x-1/2 -translate-y-1/2 shadow-lg">
                    <SafeIcon icon={FiAlertTriangle} className="text-white text-xl" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-[#4a5a67] mb-2">Repair & Maintenance Log</h2>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  Select any asset from the inventory list to report a technical issue or maintenance requirement. 
                  All reports are logged for the tech team immediately.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default ReportProblem;
