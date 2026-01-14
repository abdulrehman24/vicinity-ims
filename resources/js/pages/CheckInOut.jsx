import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { shifts, categories } from '../data/inventoryData';
import * as FiIcons from 'react-icons/fi';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import CollaboratorList from '../components/CollaboratorList';

const { 
  FiZap, FiLogIn, FiLogOut, FiPackage, FiBox, FiCalendar, FiClock,
  FiCheck, FiX, FiAlertTriangle, FiInfo, FiLayers, FiSearch, FiChevronRight,
  FiPlus, FiMinus, FiFileText, FiCheckSquare, FiSquare
} = FiIcons;

function CheckInOut() {
  const { equipment, bookings, checkOutEquipment, batchCheckIn, isAdmin } = useInventory();
  const [activeTab, setActiveTab] = useState('in');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">OPERATIONS</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-10 w-fit">
        <TabButton active={activeTab === 'in'} onClick={() => setActiveTab('in')} icon={FiLogIn} label="Manual Out" />
        <TabButton active={activeTab === 'out'} onClick={() => setActiveTab('out')} icon={FiLogOut} label="Group Return" />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'in' ? (
          <ManualOutForm key="in" equipment={equipment} bookings={bookings} onConfirm={checkOutEquipment} />
        ) : (
          <GroupReturnView key="out" equipment={equipment} bookings={bookings} onConfirm={batchCheckIn} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ManualOutForm({ equipment, bookings, onConfirm }) {
  const [selectedItems, setSelectedItems] = useState([]); // Array of {id, qty}
  const [dateRange, setDateRange] = useState([null, null]);
  const [shift, setShift] = useState('Full Day');
  const [formData, setFormData] = useState({ projTitle: '', quote: '', shootType: 'Commercial' });
  const [collaborators, setCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 1. Availability Logic for Multi-Unit & Shifts
  const requestedDates = useMemo(() => {
    if (!dateRange[0] || !dateRange[1]) return [];
    return eachDayOfInterval({ start: dateRange[0], end: dateRange[1] }).map(d => format(d, 'yyyy-MM-dd'));
  }, [dateRange]);

  const getAvailableQty = (item, dates, requestedShift) => {
    let bookedMax = 0;
    dates.forEach(date => {
      const bookedOnDate = bookings.filter(b => {
        if (b.status === 'returned') return false;
        if (b.equipmentId !== item.id) return false;
        const isSameDay = b.dates.includes(date) || b.dates.includes(format(parseISO(date), 'dd/MM/yyyy'));
        if (!isSameDay) return false;

        // Shift Conflict Logic
        if (requestedShift === 'Full Day') return true; // Full Day conflicts with everything
        if (b.shift === 'Full Day') return true; // Existing Full Day conflicts with everything
        return b.shift === requestedShift; // AM conflicts with AM, PM with PM
      });
      
      const totalBooked = bookedOnDate.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      if (totalBooked > bookedMax) bookedMax = totalBooked;
    });
    return Math.max(0, item.totalQuantity - bookedMax);
  };

  const toggleItem = (item) => {
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      const avail = getAvailableQty(item, requestedDates, shift);
      if (avail <= 0) {
        toast.error("No units available for these dates/shift");
        return;
      }
      setSelectedItems([...selectedItems, { id: item.id, qty: 1, name: item.name, image: item.image }]);
    }
  };

  const updateQty = (id, delta, max) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.min(max, Math.max(1, i.qty + delta));
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const handleBooking = () => {
    const formattedDates = requestedDates.map(d => format(parseISO(d), 'dd/MM/yyyy'));
    selectedItems.forEach(item => {
      onConfirm({
        equipmentId: item.id,
        equipmentName: item.name,
        shootName: formData.projTitle,
        quotationNumber: formData.quote,
        quantity: item.qty,
        shift: shift,
        dates: formattedDates,
        startDate: requestedDates[0],
        endDate: requestedDates[requestedDates.length - 1],
        user: 'Operations Team'
      });
    });
    setSelectedItems([]);
    setFormData({ projTitle: '', quote: '', shootType: 'Commercial' });
  };

  const filteredEquipment = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return equipment
      .filter(item => item.status !== 'maintenance' && item.status !== 'decommissioned')
      .filter(item => {
        if (selectedCategory === 'all') return true;
        return item.category === selectedCategory;
      })
      .filter(item => {
        if (!term) return true;
        return (
          item.name.toLowerCase().includes(term) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) ||
          (item.category && item.category.toLowerCase().includes(term))
        );
      });
  }, [equipment, searchTerm, selectedCategory]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Selection */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">1. Set Schedule</label>
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            {['Full Day', 'AM', 'PM'].map(s => (
              <button key={s} onClick={() => setShift(s)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${shift === s ? 'bg-white text-[#4a5a67] shadow-sm' : 'text-gray-400'}`}>
                {s}
              </button>
            ))}
          </div>
          <Calendar selectRange onChange={setDateRange} className="mini-calendar" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">2. Select Equipment</label>
          <div className="space-y-3">
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search gear..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67]"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar mt-3">
            {filteredEquipment.map(item => {
              const avail = getAvailableQty(item, requestedDates, shift);
              const isSelected = selectedItems.find(i => i.id === item.id);
              return (
                <button 
                  key={item.id}
                  disabled={avail <= 0 && requestedDates.length > 0}
                  onClick={() => toggleItem(item)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${isSelected ? 'bg-[#ebc1b6] border-[#ebc1b6] text-[#4a5a67]' : avail <= 0 && requestedDates.length > 0 ? 'opacity-30 grayscale cursor-not-allowed' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img src={item.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                      <div>
                        <p className="text-[11px] font-bold truncate">{item.name}</p>
                        <p className="text-[8px] font-black uppercase opacity-50">{avail} Available</p>
                      </div>
                    </div>
                    <SafeIcon icon={isSelected ? FiCheckSquare : FiSquare} className="text-sm" />
                  </div>
                </button>
              );
            })}
            {filteredEquipment.length === 0 && (
              <p className="text-[10px] text-gray-400 italic py-2 text-center">
                No matching equipment found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-[#4a5a67] p-8 text-white">
            <h2 className="text-xl font-bold">Checkout Confirmation</h2>
            <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">Allocation Details</p>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <InputGroup label="Project Title">
                <input value={formData.projTitle} onChange={e => setFormData({...formData, projTitle: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl focus:bg-white border border-transparent focus:border-[#ebc1b6] outline-none font-bold text-sm" placeholder="Pepsi Summer '24" />
              </InputGroup>
              <InputGroup label="Quotation #">
                <input value={formData.quote} onChange={e => setFormData({...formData, quote: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl focus:bg-white border border-transparent focus:border-[#ebc1b6] outline-none font-bold text-sm" placeholder="QT-102" />
              </InputGroup>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Selected Cart</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedItems.map(item => {
                  const masterItem = equipment.find(e => e.id === item.id);
                  const maxAvail = getAvailableQty(masterItem, requestedDates, shift);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <img src={item.image} className="w-10 h-10 rounded-xl object-cover" alt="" />
                        <p className="text-xs font-bold text-[#4a5a67]">{item.name}</p>
                      </div>
                      <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <button onClick={() => updateQty(item.id, -1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67]"><SafeIcon icon={FiMinus} /></button>
                        <span className="text-sm font-black text-[#4a5a67] w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67]"><SafeIcon icon={FiPlus} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <CollaboratorList
                collaborators={collaborators}
                onAdd={(email) => {
                  setCollaborators((prev) =>
                    prev.includes(email) ? prev : [...prev, email]
                  );
                }}
                onRemove={(email) => {
                  setCollaborators((prev) => prev.filter((c) => c !== email));
                }}
              />
            </div>

            <button 
              onClick={handleBooking}
              disabled={selectedItems.length === 0 || !formData.projTitle || requestedDates.length === 0}
              className="w-full py-5 bg-[#4a5a67] text-[#ebc1b6] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-30 transition-all hover:scale-[1.01]"
            >
              Confirm Deployment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupReturnView({ equipment, bookings, onConfirm }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [returnStates, setReturnStates] = useState({}); // { itemId: { isDamaged: bool, note: str } }

  const activeProjects = useMemo(() => {
    const projects = {};
    bookings.filter(b => b.status === 'active').forEach(b => {
      const key = `${b.shootName}-${b.quotationNumber}`;
      if (!projects[key]) {
        projects[key] = { 
            shootName: b.shootName, 
            quotationNumber: b.quotationNumber, 
            items: [] 
        };
      }
      const eq = equipment.find(e => e.id === b.equipmentId);
      if (eq) {
          projects[key].items.push({
              ...eq,
              // We use booking ID or Equipment ID? Logic uses equipment ID for return
              bookingId: b.id
          });
      }
    });
    return Object.values(projects);
  }, [bookings, equipment]);

  const toggleDamage = (itemId) => {
    setReturnStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], isDamaged: !prev[itemId]?.isDamaged }
    }));
  };

  const updateNote = (itemId, note) => {
    setReturnStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], note }
    }));
  };

  const handleReturn = () => {
    const itemsToReturn = selectedProject.items.map(item => ({
      id: item.id,
      reportedProblem: returnStates[item.id]?.isDamaged || false,
      problemNote: returnStates[item.id]?.note || ''
    }));

    onConfirm({
      items: itemsToReturn,
      shootName: selectedProject.shootName,
      user: window.user?.name || 'Operations Team'
    });
    setSelectedProject(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Active Projects</label>
        {activeProjects.map(p => (
          <button key={p.shootName} onClick={() => setSelectedProject(p)} className={`w-full text-left p-6 rounded-3xl border transition-all ${selectedProject?.shootName === p.shootName ? 'bg-[#4a5a67] text-white shadow-xl' : 'bg-white border-gray-100 hover:border-[#ebc1b6]'}`}>
            <h3 className="font-bold text-sm mb-1">{p.shootName}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{p.quotationNumber}</p>
            <div className="flex items-center space-x-2 mt-4">
              <div className="flex -space-x-2">
                {p.items.slice(0, 3).map(i => <img key={i.id} src={i.image} className="w-6 h-6 rounded-full border-2 border-white object-cover" />)}
              </div>
              <span className="text-[9px] font-bold opacity-60">+{p.items.length} items</span>
            </div>
          </button>
        ))}
      </div>

      <div className="lg:col-span-8">
        {selectedProject ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="bg-[#4a5a67] p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.shootName}</h2>
                <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-widest mt-1">Return Inspection</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
            </div>

            <div className="p-8 flex-1 space-y-4">
              {selectedProject.items.map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img src={item.image} className="w-12 h-12 rounded-xl object-cover border border-white" alt="" />
                      <div>
                        <p className="text-sm font-bold text-[#4a5a67]">{item.name}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase">{item.serialNumber}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleDamage(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${returnStates[item.id]?.isDamaged ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:border-red-500 hover:text-red-500'}`}
                    >
                      <SafeIcon icon={FiAlertTriangle} />
                      <span>{returnStates[item.id]?.isDamaged ? 'Issue Reported' : 'Report Issue'}</span>
                    </button>
                  </div>
                  
                  {returnStates[item.id]?.isDamaged && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                      <textarea 
                        placeholder="Describe the malfunction or damage..."
                        value={returnStates[item.id]?.note || ''}
                        onChange={(e) => updateNote(item.id, e.target.value)}
                        className="w-full bg-white p-3 rounded-xl border border-red-100 text-xs font-bold outline-none h-20 resize-none"
                      />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center space-x-3 text-blue-500 bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                <SafeIcon icon={FiInfo} />
                <p className="text-[10px] font-bold leading-relaxed italic">
                  Completing return will reset item availability. All items flagged with issues will be automatically sent to the Service Bay.
                </p>
              </div>
              <button 
                onClick={handleReturn}
                className="w-full py-5 bg-[#4a5a67] text-[#ebc1b6] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all"
              >
                Complete Project Return
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[500px] border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 bg-white">
            <SafeIcon icon={FiLayers} className="text-5xl text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-[#4a5a67]">Batch Return Management</h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed mt-2">Select an active project from the list to begin the return inspection process.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InputGroup({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${active ? 'bg-[#4a5a67] text-[#ebc1b6] shadow-lg' : 'text-gray-500 hover:text-[#4a5a67]'}`}>
      <SafeIcon icon={icon} />
      <span>{label}</span>
    </button>
  );
}

export default CheckInOut;
