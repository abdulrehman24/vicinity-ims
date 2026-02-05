import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Calendar from 'react-calendar';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import * as FiIcons from 'react-icons/fi';
import { format, parseISO, eachDayOfInterval, isSameDay, isBefore, startOfDay, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import CollaboratorList from '../components/CollaboratorList';
import ConfirmationModal from '../components/ConfirmationModal';

const { 
  FiZap, FiLogIn, FiLogOut, FiPackage, FiBox, FiCalendar, FiClock,
  FiCheck, FiX, FiAlertTriangle, FiInfo, FiLayers, FiSearch, FiChevronRight,
  FiPlus, FiMinus, FiFileText, FiCheckSquare, FiSquare, FiTrash2, FiEdit2
} = FiIcons;

function CheckInOut() {
  const { equipment, bookings, bundles, categories, checkOutEquipment, batchCheckIn, isAdmin, replaceBooking } = useInventory();
  const [activeTab, setActiveTab] = useState('in');
  const [projectToEdit, setProjectToEdit] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.editProject) {
      handleEditRequest(location.state.editProject);
      // Clear state to avoid re-triggering on refresh/nav? 
      // Actually, standard behavior is fine, but maybe good to clear.
      // window.history.replaceState({}, document.title) // optional
    }
  }, [location.state]);

  const handleEditRequest = (project) => {
    setProjectToEdit(project);
    setActiveTab('in');
  };

  const handleManualOutConfirm = async (payloadOrPayloads) => {
    const payloads = Array.isArray(payloadOrPayloads) ? payloadOrPayloads : [payloadOrPayloads];

    if (projectToEdit) {
      // Editing mode
      const [first, ...rest] = payloads;
      
      // 1. Replace existing bookings with the first group
      // This will cancel the old 'ids' and create a new booking for 'first' payload
      await replaceBooking(projectToEdit.bookingIds, first);
      
      // 2. Create new bookings for any remaining groups (if user split a contiguous booking into disjoint ones)
      if (rest.length > 0) {
        for (const p of rest) {
            await checkOutEquipment(p);
        }
      }

      setProjectToEdit(null);
    } else {
      // Normal checkout
      for (const p of payloads) {
        await checkOutEquipment(p);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">OPERATIONS</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-10 w-fit">
        <TabButton 
          active={activeTab === 'in'} 
          onClick={() => {
            setActiveTab('in');
            setProjectToEdit(null); // Reset if manually switching
          }} 
          icon={FiLogIn} 
          label={projectToEdit ? "Edit Booking" : "Check Out"} 
        />
        <TabButton 
          active={activeTab === 'out'} 
          onClick={() => {
            setActiveTab('out');
            setProjectToEdit(null);
          }} 
          icon={FiLogOut} 
          label="Check In" 
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'in' ? (
          <ManualOutForm 
            key="in" 
            equipment={equipment} 
            bookings={bookings} 
            bundles={bundles} 
            categories={categories}
            onConfirm={handleManualOutConfirm}
            editingProject={projectToEdit}
            onCancelEdit={() => {
              setProjectToEdit(null);
              setActiveTab('out');
            }}
          />
        ) : (
          <GroupReturnView 
            key="out" 
            equipment={equipment} 
            bookings={bookings} 
            onConfirm={batchCheckIn}
            onEditRequest={handleEditRequest} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const groupDates = (dates) => {
  if (!dates || dates.length === 0) return [];
  
  const sorted = [...dates].sort();
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(currentGroup[currentGroup.length - 1]);
    const curr = parseISO(sorted[i]);
    const diff = differenceInDays(curr, prev);
    
    if (diff === 1) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);
  return groups;
};

function ManualOutForm({ equipment, bookings, bundles, categories, onConfirm, editingProject, onCancelEdit }) {
  const [selectedItems, setSelectedItems] = useState([]); // Array of {id, qty}
  const [selectedDates, setSelectedDates] = useState([]);
  const [shift, setShift] = useState('Full Day');
  const [formData, setFormData] = useState({ projTitle: '', quote: '', shootType: 'Commercial' });
  const [collaborators, setCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Pre-fill form if editing
  React.useEffect(() => {
    if (editingProject) {
        setFormData({
            projTitle: editingProject.shootName,
            quote: editingProject.quotationNumber,
            shootType: editingProject.shootType || 'Commercial'
        });
        setShift(editingProject.shift || 'Full Day');
        
        // Populate dates
        if (editingProject.dates && Array.isArray(editingProject.dates) && editingProject.dates.length > 0) {
            // Prefer explicit dates array if available (handles disjoint dates correctly)
            const dates = editingProject.dates.map(d => typeof d === 'string' ? parseISO(d) : d);
            setSelectedDates(dates);
        } else if (editingProject.startDate && editingProject.endDate) {
            const start = parseISO(editingProject.startDate);
            const end = parseISO(editingProject.endDate);
            const dates = eachDayOfInterval({ start, end });
            setSelectedDates(dates);
        }

        // Populate items
        const items = editingProject.items.map(i => {
            const eq = equipment.find(e => e.id === i.equipmentId || e.id === i.id);
            if (eq) {
                return {
                    id: eq.id,
                    qty: i.quantity || i.qty || 1,
                    name: eq.name,
                    image: eq.image
                };
            }
            return {
                id: i.equipmentId || i.id,
                qty: i.quantity || i.qty || 1,
                name: i.equipmentName || i.name || 'Unknown',
                image: i.image
            };
        });
        
        // Aggregate items by ID to set Qty correctly if multiple units of same item
        const aggregatedItems = items.reduce((acc, curr) => {
            const existing = acc.find(i => i.id === curr.id);
            if (existing) {
                existing.qty += 1;
            } else {
                acc.push({ ...curr, qty: 1 });
            }
            return acc;
        }, []);

        setSelectedItems(aggregatedItems);
        setCollaborators(editingProject.collaborators || []);
    }
  }, [editingProject]);


  // 1. Availability Logic for Multi-Unit & Shifts
  const requestedDates = useMemo(() => {
    return selectedDates
      .map(d => format(d, 'yyyy-MM-dd'))
      .sort();
  }, [selectedDates]);

  const getAvailableQty = (item, dates, requestedShift) => {
    const relevantBookings = bookings.filter(b => {
      if (b.status === 'returned') return false;
      return b.equipmentId === item.id;
    });

    if (!dates || dates.length === 0) {
      const totalBooked = relevantBookings.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      return Math.max(0, item.totalQuantity - totalBooked);
    }

    let bookedMax = 0;
    dates.forEach(date => {
      const bookedOnDate = relevantBookings.filter(b => {
        const isSameDay = b.dates.includes(date) || b.dates.includes(format(parseISO(date), 'dd/MM/yyyy'));
        if (!isSameDay) return false;

        if (requestedShift === 'Full Day') return true;
        if (b.shift === 'Full Day') return true;
        return b.shift === requestedShift;
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

  const handleAddBundle = (bundleId) => {
    if (!bundleId) return;
    const bundle = bundles?.find(b => b.id === parseInt(bundleId));
    if (!bundle) return;

    const newItems = [...selectedItems];
    let addedCount = 0;
    let unavailableCount = 0;

    bundle.items.forEach(bItem => {
        const item = equipment.find(e => e.id === bItem.equipment_id);
        if (!item) return;

        // Skip if maintenance or decommissioned
        if (item.status === 'maintenance' || item.status === 'decommissioned') {
            unavailableCount++;
            return;
        }

        const avail = getAvailableQty(item, requestedDates, shift);
        const existingItemIndex = newItems.findIndex(i => i.id === item.id);
        const currentQty = existingItemIndex >= 0 ? newItems[existingItemIndex].qty : 0;
        
        // Calculate how many we can add
        const needed = bItem.quantity;
        const canAdd = Math.min(needed, avail - currentQty);

        if (canAdd > 0) {
            if (existingItemIndex >= 0) {
                newItems[existingItemIndex].qty += canAdd;
            } else {
                newItems.push({ id: item.id, qty: canAdd, name: item.name, image: item.image });
            }
            addedCount++;
            if (canAdd < needed) unavailableCount++;
        } else {
            unavailableCount++;
        }
    });

    setSelectedItems(newItems);
    
    if (unavailableCount > 0) {
        toast((t) => (
            <span>
                Added partial bundle. <b>{unavailableCount} items</b> were unavailable or insufficient stock.
            </span>
        ), { icon: '⚠️' });
    } else if (addedCount > 0) {
        toast.success(`Bundle "${bundle.name}" added!`);
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

  const removeItem = (id) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleBooking = () => {
    const dateGroups = groupDates(requestedDates);

    const payloads = dateGroups.map(group => ({
      shootName: formData.projTitle,
      quotationNumber: formData.quote,
      shift,
      dates: group,
      startDate: group[0],
      endDate: group[group.length - 1],
      user: 'Operations Team',
      collaborators: collaborators.map(c => {
        if (typeof c === 'string') return { email: c, expiryDate: null };
        return c;
      }),
      items: selectedItems.map(item => ({
        equipmentId: item.id,
        quantity: item.qty,
      })),
    }));

    onConfirm(payloads);
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

  const handleDayClick = (value) => {
    // Check if already selected
    const isSelected = selectedDates.some(d => isSameDay(d, value));
    
    if (isSelected) {
      setSelectedDates(prev => prev.filter(d => !isSameDay(d, value)));
    } else {
      setSelectedDates(prev => [...prev, value]);
    }
  };

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
          <Calendar
            onClickDay={handleDayClick}
            value={null}
            className="mini-calendar"
            tileClassName={({ date }) => 
              selectedDates.some(d => isSameDay(d, date)) ? 'react-calendar__tile--active' : null
            }
          />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">2. Select Equipment</label>
          <div className="space-y-3">
             {/* Bundles Dropdown */}
            {bundles && bundles.length > 0 && (
                <div className="relative">
                    <SafeIcon icon={FiPackage} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <select
                        onChange={(e) => {
                            handleAddBundle(e.target.value);
                            e.target.value = ""; // Reset
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67]"
                    >
                        <option value="">Load Bundle...</option>
                        {bundles.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.items?.length || 0} items)</option>
                        ))}
                    </select>
                </div>
            )}
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
              if (requestedDates.length > 0 && avail <= 0) return null;
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
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                          <button onClick={() => updateQty(item.id, -1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67]"><SafeIcon icon={FiMinus} /></button>
                          <span className="text-sm font-black text-[#4a5a67] w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67]"><SafeIcon icon={FiPlus} /></button>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)} 
                          className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                          title="Remove Item"
                        >
                          <SafeIcon icon={FiTrash2} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <CollaboratorList
                collaborators={collaborators}
                onAdd={(collab) => {
                  const email = typeof collab === 'string' ? collab : collab.email;
                  const exists = collaborators.some(c => {
                    const existingEmail = typeof c === 'string' ? c : c.email;
                    return existingEmail === email;
                  });
                  
                  if (!exists) {
                     setCollaborators((prev) => [...prev, collab]);
                  }
                }}
                onRemove={(collab) => {
                  const emailToRemove = typeof collab === 'string' ? collab : collab.email;
                  setCollaborators((prev) => prev.filter((c) => {
                    const currentEmail = typeof c === 'string' ? c : c.email;
                    return currentEmail !== emailToRemove;
                  }));
                }}
              />
            </div>

            <button 
              onClick={handleBooking}
              disabled={selectedItems.length === 0 || !formData.projTitle || requestedDates.length === 0}
              className="w-full py-5 bg-[#4a5a67] text-[#ebc1b6] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-30 transition-all hover:scale-[1.01]"
            >
              {editingProject ? 'Update Booking' : 'Confirm Deployment'}
            </button>
            {editingProject && (
                 <button 
                   onClick={onCancelEdit}
                   className="w-full py-3 bg-transparent text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#4a5a67] mt-2"
                 >
                   Cancel Edit
                 </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupReturnView({ equipment, bookings, onConfirm, onEditRequest }) {
  const { cancelBooking } = useInventory();
  const [returnStates, setReturnStates] = useState({}); // { itemId: { isDamaged: bool, note: str } }
  const [selectedProjectKeys, setSelectedProjectKeys] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);

  const projectKey = (project) => `${project.shootName}|${project.quotationNumber || ''}|${project.startDate}|${project.endDate}`;

  const activeProjects = useMemo(() => {
    const projects = {};
    bookings.filter(b => b.status === 'active').forEach(b => {
      const key = `${b.shootName}|${b.quotationNumber || ''}|${b.startDate}|${b.endDate}`;
      if (!projects[key]) {
        projects[key] = { 
            shootName: b.shootName, 
            quotationNumber: b.quotationNumber,
            startDate: b.startDate,
            endDate: b.endDate,
            items: [],
            bookingIds: new Set(),
            shift: b.shift, // Capture these
            collaborators: b.collaborators,
            shootType: b.shoot_type || b.shootType
        };
      }
      projects[key].bookingIds.add(b.id);

      const eq = equipment.find(e => e.id === b.equipmentId);
      if (eq) {
          projects[key].items.push({
              ...eq,
              bookingEquipmentId: b.bookingEquipmentId
          });
      }
    });
    return Object.values(projects).map(p => ({ ...p, bookingIds: Array.from(p.bookingIds) }));
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

  const toggleProjectSelection = (project) => {
    const key = projectKey(project);
    setSelectedProjectKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleBatchReturn = () => {
    const projectsToReturn = activeProjects.filter(p => selectedProjectKeys.includes(projectKey(p)));
    if (projectsToReturn.length === 0) return;

    // Validation: Check if any selected project is not yet started
    const today = startOfDay(new Date());
    const invalidProjects = projectsToReturn.filter(p => {
        if (!p.startDate) return false;
        const start = startOfDay(parseISO(p.startDate));
        return isBefore(today, start);
    });

    if (invalidProjects.length > 0) {
        toast.error(`Cannot return "${invalidProjects[0].shootName}" before its start date (${format(parseISO(invalidProjects[0].startDate), 'MMM d')})`);
        return;
    }

    projectsToReturn.forEach(project => {
      const itemsToReturn = project.items.map(item => ({
        bookingEquipmentId: item.bookingEquipmentId,
        reportedProblem: returnStates[item.id]?.isDamaged || false,
        problemNote: returnStates[item.id]?.note || ''
      }));

      onConfirm({
        items: itemsToReturn,
        shootName: project.shootName,
        user: window.user?.name || 'Operations Team'
      });
    });

    setSelectedProjectKeys([]);
    setReturnStates({});
    toast.success('Selected projects returned successfully');
  };

  const handleCancelProject = (project, e) => {
    e.stopPropagation();
    setDeleteModal({ project });
  };

  const confirmCancelProject = async () => {
    if (!deleteModal) return;
    const { project } = deleteModal;
    
    const promises = project.bookingIds.map(id => cancelBooking(id));
    await Promise.all(promises);
    setSelectedProjectKeys(prev => prev.filter(k => k !== projectKey(project)));
  };

  const handleEditProject = (project, e) => {
    e.stopPropagation();
    onEditRequest(project);
  };

  // REMOVED handleSaveEdit

  return (
    <>
      <ConfirmationModal 
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmCancelProject}
        title="Cancel Booking"
        message={`Are you sure you want to cancel "${deleteModal?.project?.shootName}"? This will release all allocated equipment.`}
        confirmText="Yes, Cancel Booking"
        isDangerous={true}
      />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Active Projects</label>
        {activeProjects.map(p => {
          const isStarted = !p.startDate || !isBefore(startOfDay(new Date()), startOfDay(parseISO(p.startDate)));
          
          return (
          <div
            key={projectKey(p)}
            onClick={() => isStarted && toggleProjectSelection(p)}
            className={`w-full text-left p-6 rounded-3xl border transition-all cursor-pointer group relative ${
              selectedProjectKeys.includes(projectKey(p)) 
                ? 'bg-[#4a5a67] text-white shadow-xl' 
                : isStarted 
                    ? 'bg-white border-gray-100 hover:border-[#ebc1b6]' 
                    : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
              }`}
            >
            {!isStarted && (
                <div className="absolute top-2 right-6 z-10">
                    <span className="bg-gray-200 text-gray-500 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Future Booking</span>
                </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm mb-1 pr-16">{p.shootName}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{p.quotationNumber}</p>
              </div>
              <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => handleEditProject(p, e)}
                    className={`p-2 rounded-lg ${selectedProjectKeys.includes(projectKey(p)) ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Edit Booking"
                >
                    <SafeIcon icon={FiEdit2} />
                </button>
                <button 
                    onClick={(e) => handleCancelProject(p, e)}
                    className={`p-2 rounded-lg ${selectedProjectKeys.includes(projectKey(p)) ? 'hover:bg-red-500/20 text-red-300' : 'hover:bg-red-50 text-red-400'}`}
                    title="Cancel Booking"
                >
                    <SafeIcon icon={FiTrash2} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {p.items.slice(0, 3).map(i => (
                    <img
                      key={i.id}
                      src={i.image}
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <span className="text-[9px] font-bold opacity-60">+{p.items.length} items</span>
              </div>
              {p.startDate && p.endDate && (
                <div className="flex items-center space-x-1 text-[#ebc1b6]">
                  <SafeIcon icon={FiCalendar} className="text-[10px]" />
                  <p className="text-[10px] font-bold">
                    {format(parseISO(p.startDate), 'MMM d')} - {format(parseISO(p.endDate), 'MMM d')}
                  </p>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <div className="lg:col-span-8">
        {selectedProjectKeys.length > 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="bg-[#4a5a67] p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedProjectKeys.length === 1 
                    ? activeProjects.find(p => projectKey(p) === selectedProjectKeys[0])?.shootName 
                    : `Multiple Projects (${selectedProjectKeys.length})`}
                </h2>
                <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-widest mt-1">Return Inspection</p>
                {selectedProjectKeys.length === 1 && (() => {
                   const p = activeProjects.find(proj => projectKey(proj) === selectedProjectKeys[0]);
                   if (p && p.startDate && p.endDate) {
                     return (
                      <div className="flex items-center space-x-2 mt-2 text-white/80">
                        <SafeIcon icon={FiCalendar} className="text-xs" />
                        <p className="text-xs font-bold">
                          {format(parseISO(p.startDate), 'MMM d, yyyy')} - {format(parseISO(p.endDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                     );
                   }
                   return null;
                })()}
              </div>
              <button onClick={() => setSelectedProjectKeys([])} className="p-2 hover:bg-white/10 rounded-full"><SafeIcon icon={FiX} /></button>
            </div>

            <div className="p-8 flex-1 space-y-4">
              {activeProjects.filter(p => selectedProjectKeys.includes(projectKey(p))).flatMap(p => p.items).map(item => (
                <div key={`${item.id}-${item.bookingEquipmentId}`} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
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
                onClick={handleBatchReturn}
                className="w-full py-5 bg-[#4a5a67] text-[#ebc1b6] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all"
              >
                Complete Return ({activeProjects.filter(p => selectedProjectKeys.includes(projectKey(p))).reduce((acc, p) => acc + p.items.length, 0)} Items)
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[500px] border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 bg-white">
            <SafeIcon icon={FiLayers} className="text-5xl text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-[#4a5a67]">Batch Return Management</h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed mt-2">Select active projects from the list to begin the return inspection process.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default CheckInOut;
  
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
