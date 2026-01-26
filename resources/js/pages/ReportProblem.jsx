import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import Fuse from 'fuse.js';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { 
  FiSearch, FiAlertTriangle, FiCheck, FiInfo, FiCamera, 
  FiBox, FiMessageSquare, FiSend, FiZap, FiTool, FiEye, 
  FiPackage, FiActivity, FiShield, FiUser 
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
  const { equipment, reportProblem, updateEquipment } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [report, setReport] = useState({
    issueType: 'mechanical',
    severity: 'minor',
    description: '',
    reportedBy: ''
  });

  const fuse = useMemo(() => new Fuse(equipment, {
    keys: ['name', 'serialNumber', 'category', 'currentBooking.shootName'],
    threshold: 0.3
  }), [equipment]);

  const filtered = useMemo(() => {
    if (!searchTerm) return equipment;
    return fuse.search(searchTerm).map(r => r.item);
  }, [searchTerm, equipment, fuse]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem || !report.description || !report.reportedBy) {
      toast.error("Please provide your name and issue details");
      return;
    }

    reportProblem({
      equipmentId: selectedItem.id,
      equipmentName: selectedItem.name,
      ...report
    });

    // Reset workflow
    setSelectedItem(null);
    setReport({
      issueType: 'mechanical',
      severity: 'minor',
      description: '',
      reportedBy: ''
    });
    setSearchTerm('');
  };

  const handleResolve = async () => {
    if (!selectedItem) return;
    
    await updateEquipment({
      ...selectedItem,
      status: 'available'
    });
    
    setSelectedItem(null);
    setSearchTerm('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-8 max-w-7xl mx-auto min-h-screen"
    >
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
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-1">Current Status</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedItem.status === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-[#ebc1b6]/20 text-[#ebc1b6]'}`}>
                      {selectedItem.status.replace('_', ' ')}
                    </span>
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
                        <button 
                            onClick={handleResolve}
                            className="bg-[#4a5a67] text-[#ebc1b6] px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#3d4b56] hover:shadow-xl transition-all flex items-center space-x-3 mt-4"
                        >
                            <span>Return to Inventory</span>
                            <SafeIcon icon={FiCheck} />
                        </button>
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">4. Select Issue Category</label>
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">5. Technical Observations</label>
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

                  <div className="pt-6 border-t border-gray-50 flex justify-end">
                    <button 
                      type="submit" 
                      className="bg-[#4a5a67] text-[#ebc1b6] px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-3"
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