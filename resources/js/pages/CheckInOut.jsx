import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import InviteCollabModal from '../components/InviteCollabModal';

const { 
  FiZap, FiLogIn, FiLogOut, FiPackage, FiBox, FiCalendar, FiClock,
  FiCheck, FiX, FiAlertTriangle, FiInfo, FiLayers, FiSearch, FiChevronRight, FiChevronLeft,
  FiChevronsRight, FiChevronsLeft,
  FiPlus, FiMinus, FiFileText, FiCheckSquare, FiSquare, FiTrash2, FiEdit2, FiUser, FiShare2
} = FiIcons;

function CheckInOut() {
  const { equipment, bookings, bundles, categories, checkOutEquipment, batchCheckIn, isAdmin, replaceBooking, user } = useInventory();
  const [activeTab, setActiveTab] = useState('in');
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Processing booking...");
  const [initialSelectedKeys, setInitialSelectedKeys] = useState([]);
  const [duplicateProjectData, setDuplicateProjectData] = useState(null);
  const [inviteModal, setInviteModal] = useState({ isOpen: false, bookingId: null, projectName: '' });
  const location = useLocation();

  const overdueBookings = useMemo(() => {
    if (!user) return [];
    const today = startOfDay(new Date());
    const currentId = user.id;
    const currentEmail = user.email ? user.email.toLowerCase() : null;

    return bookings.filter(b => {
      if (b.status !== 'active' || !b.endDate) return false;
      const end = parseISO(b.endDate);
      if (!isBefore(end, today)) return false;

      // Filter by user visibility (same logic as GroupReturnView)
      let isOwner = b.user?.id === currentId || (typeof b.user === 'string' && b.user === user.name);
      let isCollaborator = Array.isArray(b.collaborators) && currentEmail && b.collaborators.some(c => 
        (typeof c === 'string' ? c.toLowerCase() : c?.email?.toLowerCase()) === currentEmail
      );
      
      return isOwner || isCollaborator;
    });
  }, [bookings, user]);

  useEffect(() => {
    const lastDismissed = localStorage.getItem('overdue_toast_dismissed_at');
    if (lastDismissed) {
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - parseInt(lastDismissed) < tenMinutes) {
        return;
      }
    }

    if (overdueBookings.length > 0 && activeTab === 'in' && !projectToEdit) {
      const projects = {};
      overdueBookings.forEach(b => {
        const key = `${b.shootName}|${b.quotationNumber || ''}|${b.startDate}|${b.endDate}`;
        if (!projects[key]) projects[key] = { name: b.shootName, key };
      });

      const keys = Object.keys(projects);
      const names = Object.values(projects).map(p => p.name);

      toast.custom((t) => (
        <div className={`flex flex-col w-[340px] bg-[#4a5a67]/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden transform transition-all duration-500 ease-out ${t.visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'}`}>
          <div className="relative p-6 pb-0 flex flex-col items-center text-center">
             <div className="absolute top-4 right-6">
                <button onClick={() => toast.dismiss(t.id)} className="text-white/20 hover:text-white/60 transition-colors">
                  <SafeIcon icon={FiX} className="text-sm" />
                </button>
             </div>

             <div className="relative mb-4">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-40" />
                <div className="relative w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] transform -rotate-12">
                   <SafeIcon icon={FiAlertTriangle} className="text-xl text-white" />
                </div>
             </div>

             <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-[0.3em] mb-1">Critical Action Required</p>
             <h4 className="text-lg font-black text-white leading-tight">
                {names.length} Project{names.length > 1 ? 's' : ''} Overdue
             </h4>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap justify-center gap-2">
              {names.slice(0, 3).map((name, i) => (
                <div key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider truncate max-w-[120px]">
                    {name}
                  </p>
                </div>
              ))}
              {names.length > 3 && (
                <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-wider">
                    +{names.length - 3} more
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setInitialSelectedKeys(keys);
                  setActiveTab('out');
                  toast.dismiss(t.id);
                }}
                className="w-full py-4 bg-[#ebc1b6] text-[#4a5a67] rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-[0_10px_20px_-5px_rgba(235,193,182,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(235,193,182,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Process Returns Now
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('overdue_toast_dismissed_at', Date.now().toString());
                  toast.dismiss(t.id);
                }}
                className="w-full py-3 text-white/40 hover:text-white/80 text-[10px] font-black uppercase tracking-widest transition-colors duration-300"
              >
                Dismiss for later
              </button>
            </div>
          </div>
        </div>
      ), {
        duration: 15000,
        id: 'overdue-checkin-prompt',
        position: 'top-center'
      });
    }
  }, [overdueBookings, activeTab, projectToEdit]);

  const collaboratorSuggestions = useMemo(() => {
    const map = new Map();

    if (user && user.email) {
      map.set(user.email, user.name || '');
    }

    bookings.forEach((b) => {
      const u = b.user;
      if (u && u.email) {
        if (!map.has(u.email)) {
          map.set(u.email, u.name || '');
        }
      }

      if (Array.isArray(b.collaborators)) {
        b.collaborators.forEach((c) => {
          if (typeof c === 'string') {
            if (!map.has(c)) {
              map.set(c, '');
            }
          } else if (c && c.email) {
            if (!map.has(c.email)) {
              map.set(c.email, c.name || '');
            }
          }
        });
      }
    });

    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [bookings, user]);

  useEffect(() => {
    if (location.state?.editProject && user) {
      const project = location.state.editProject;
      const isAdmin = user.is_admin >= 1;

      const collaboratorEmails = new Set();
      if (Array.isArray(project.collaborators)) {
        project.collaborators.forEach(c => {
          if (typeof c === 'string') {
            collaboratorEmails.add(c.toLowerCase());
          } else if (c && c.email) {
            collaboratorEmails.add(c.email.toLowerCase());
          }
        });
      }

      const currentEmail = user.email ? user.email.toLowerCase() : null;
      const isOwnerByName = project.user && typeof project.user === 'string' && project.user === user.name;

      if (isAdmin || isOwnerByName || (currentEmail && collaboratorEmails.has(currentEmail))) {
        handleEditRequest(project);
      }
    } else if (location.state?.duplicateProject) {
      setDuplicateProjectData(location.state.duplicateProject);
      setActiveTab('in');
      // Clear location state safely
      window.history.replaceState({}, document.title);
    }
  }, [location.state, user]);

  const handleEditRequest = (project) => {
    setProjectToEdit(project);
    setActiveTab('in');
  };

  const handleManualOutConfirm = async (payloadOrPayloads) => {
    const payloads = Array.isArray(payloadOrPayloads) ? payloadOrPayloads : [payloadOrPayloads];

    setProcessingMessage("Processing booking...");
    setIsProcessing(true);
    try {
      if (projectToEdit) {
        const [first, ...rest] = payloads;
        
        await replaceBooking(projectToEdit.bookingIds, first, { showToast: true });
        
        if (rest.length > 0) {
          await Promise.all(
            rest.map(p => checkOutEquipment(p, { showToast: false }))
          );
        }

        setProjectToEdit(null);
      } else {
        if (payloads.length === 1) {
          await checkOutEquipment(payloads[0]);
        } else {
          await Promise.all(
            payloads.map(p => checkOutEquipment(p, { showToast: false }))
          );
          toast.success("Bookings created successfully");
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-7xl mx-auto relative transition-colors">
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl px-8 py-6 shadow-lg flex items-center space-x-3 transition-colors">
            <div className="w-5 h-5 border-2 border-[#ebc1b6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black tracking-widest text-[#4a5a67] dark:text-slate-200 uppercase">{processingMessage}</span>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight mb-2">OPERATIONS</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl mb-10 w-fit transition-colors">
        <TabButton 
          active={activeTab === 'in'} 
          onClick={() => {
            setActiveTab('in');
            setProjectToEdit(null); // Reset if manually switching
            setInitialSelectedKeys([]); // Reset pre-selection when switching to Check Out
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
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            setProcessingMessage={setProcessingMessage}
            editingProject={projectToEdit}
            duplicateProject={duplicateProjectData}
            onUsedDuplicate={() => setDuplicateProjectData(null)}
            onCancelEdit={() => {
              setProjectToEdit(null);
              setActiveTab('out');
            }}
            collaboratorSuggestions={collaboratorSuggestions}
          />
        ) : (
          <GroupReturnView 
            key="out" 
            equipment={equipment} 
            bookings={bookings} 
            categories={categories}
            onConfirm={(payload) => {
              batchCheckIn(payload);
              setInitialSelectedKeys([]); // Clear pre-selection after success
            }}
            onEditRequest={handleEditRequest} 
            onInviteRequest={(id, name) => setInviteModal({ isOpen: true, bookingId: id, projectName: name })}
            initialSelectedKeys={initialSelectedKeys}
          />
        )}
      </AnimatePresence>

      <InviteCollabModal 
        isOpen={inviteModal.isOpen}
        onClose={() => setInviteModal({ isOpen: false, bookingId: null, projectName: '' })}
        bookingId={inviteModal.bookingId}
        projectName={inviteModal.projectName}
      />

    </motion.div>
  );
}

const groupDates = (dates) => {
  if (!dates || dates.length === 0) return [];
  
  // Ensure dates are unique and sorted
  const sorted = Array.from(new Set(dates)).sort();
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(currentGroup[currentGroup.length - 1]);
    const curr = parseISO(sorted[i]);
    const diff = differenceInDays(curr, prev);
    
    if (diff === 1) {
      currentGroup.push(sorted[i]);
    } else if (diff > 1) {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
    // if diff === 0, skip (duplicate)
  }
  groups.push(currentGroup);
  return groups;
};

function ManualOutForm({ equipment, bookings, bundles, categories, onConfirm, isProcessing, setIsProcessing, setProcessingMessage, editingProject, duplicateProject, onUsedDuplicate, onCancelEdit, collaboratorSuggestions }) {
  const { personalBundles, fetchPersonalBundles, drafts, fetchDrafts, saveDraft, savePersonalBundle, deleteDraft } = useInventory();
  const [selectedItems, setSelectedItems] = useState([]); // Array of {id, qty}
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const location = useLocation();

  const categoryOrder = useMemo(() => 
    (categories || []).reduce((acc, cat, idx) => ({ ...acc, [cat]: idx }), {}), 
    [categories]
  );

  const [selectedDates, setSelectedDates] = useState([]);
  const [shift, setShift] = useState('Full Day');
  const [formData, setFormData] = useState({ projTitle: '', quote: '', shootType: 'Commercial', remarks: '' });
  const [collaborators, setCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const editingBookingIdSet = useMemo(
    () => new Set(editingProject?.bookingIds || []),
    [editingProject]
  );

  const lastLoadedDraftId = React.useRef(null);

  const handleLoadDraft = useCallback((draftId) => {
    if (!draftId || lastLoadedDraftId.current === draftId) return;
    const draft = drafts?.find(d => d.id === parseInt(draftId));
    if (!draft) return;

    lastLoadedDraftId.current = draftId;
    setSelectedDraftId(draft.id);
    setFormData({
      projTitle: draft.project_title || '',
      quote: draft.quotation_number || '',
      shoot_type: draft.shoot_type || 'Commercial',
      remarks: draft.remarks || ''
    });
    setShift(draft.shift || 'Full Day');
    setCollaborators(draft.collaborators || []);
    
    if (draft.start_date && draft.end_date) {
      const start = parseISO(draft.start_date);
      const end = parseISO(draft.end_date);
      // Ensure we don't have duplicates here either
      const uniqueDates = eachDayOfInterval({ start, end });
      setSelectedDates(uniqueDates);
    } else {
      setSelectedDates([]);
    }

    const items = draft.items.map(di => ({
      id: di.equipment_id,
      qty: di.quantity,
      name: di.equipment?.name || 'Unknown',
      image: di.equipment?.image || ''
    }));
    setSelectedItems(items);
    toast.success(`Draft "${draft.project_title || 'Untitled'}" loaded!`);
  }, [drafts]);

  // Pre-fill form if editing, duplicating, or loading a draft from navigation
  React.useEffect(() => {
    if (location.state?.loadDraftId && drafts.length > 0) {
      handleLoadDraft(location.state.loadDraftId);
      // Clear state after loading to prevent reload on every render
      window.history.replaceState({}, document.title);
    } else if (editingProject) {
        setFormData({
            projTitle: editingProject.shootName,
            quote: editingProject.quotationNumber,
            shootType: editingProject.shootType || 'Commercial',
            remarks: editingProject.remarks || ''
        });
        setShift(editingProject.shift || 'Full Day');
        
        // Populate dates
        if (editingProject.dates && Array.isArray(editingProject.dates) && editingProject.dates.length > 0) {
            // Prefer explicit dates array if available (handles disjoint dates correctly)
            // Ensure dates are unique
            const uniqueDateStrings = Array.from(new Set(editingProject.dates.map(d => typeof d === 'string' ? d : format(d, 'yyyy-MM-dd'))));
            const dates = uniqueDateStrings.map(d => parseISO(d));
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
            const baseQty = i.quantity || i.qty || 1;

            if (eq) {
                return {
                    id: eq.id,
                    qty: baseQty,
                    name: eq.name,
                    image: eq.image
                };
            }
            return {
                id: i.equipmentId || i.id,
                qty: baseQty,
                name: i.equipmentName || i.name || 'Unknown',
                image: i.image
            };
        });
        
        // Aggregate items by ID and sum their quantities
        const aggregatedItems = items.reduce((acc, curr) => {
            const existing = acc.find(i => i.id === curr.id);
            if (existing) {
                existing.qty += curr.qty;
            } else {
                acc.push({ ...curr });
            }
            return acc;
        }, []);

        setSelectedItems(aggregatedItems);
        setCollaborators(editingProject.collaborators || []);
    } else if (duplicateProject) {
        setFormData({
            projTitle: duplicateProject.projTitle || '',
            quote: duplicateProject.quote || '',
            shootType: duplicateProject.shootType || 'Commercial',
            remarks: duplicateProject.remarks || ''
        });
        setCollaborators(duplicateProject.collaborators || []);
        
        // Populate items for duplication
        const items = (duplicateProject.items || []).map(i => {
            const eq = equipment.find(e => e.id === i.id);
            if (eq) {
                return {
                    id: eq.id,
                    qty: i.qty,
                    name: eq.name,
                    image: eq.image
                };
            }
            return i;
        });
        setSelectedItems(items);
        
        // Reset dates for duplication
        setSelectedDates([]);
        setShift('Full Day');

        // Mark as used to prevent re-triggering
        if (onUsedDuplicate) onUsedDuplicate();
    }
  }, [editingProject, duplicateProject, location.state, drafts, handleLoadDraft]);


  // 1. Availability Logic for Multi-Unit & Shifts
  const requestedDates = useMemo(() => {
    const unique = Array.from(new Set(selectedDates.map(d => format(d, 'yyyy-MM-dd'))));
    return unique.sort();
  }, [selectedDates]);

  const getAvailableQty = (item, dates, requestedShift, ignoreBookingIds) => {
    const maintenance = item.maintenanceQuantity || 0;
    const total = item.totalQuantity || 0;
    const decommissioned = item.decommissionedQuantity || 0;
    const effectiveTotal = Math.max(0, total - maintenance - decommissioned);

    const relevantBookings = bookings.filter(b => {
      if (b.status === 'returned') return false;
      if (ignoreBookingIds && ignoreBookingIds.has && ignoreBookingIds.has(b.id)) return false;
      return b.equipmentId === item.id;
    });

    if (!dates || dates.length === 0) {
      const totalBooked = relevantBookings.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      return Math.max(0, effectiveTotal - totalBooked);
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

    return Math.max(0, effectiveTotal - bookedMax);
  };

  const toggleItem = (item) => {
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      const avail = getAvailableQty(item, requestedDates, shift, editingBookingIdSet);
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

        const avail = getAvailableQty(item, requestedDates, shift, editingBookingIdSet);
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

  const handleAddPersonalBundle = (bundleId) => {
    if (!bundleId) return;
    const bundle = personalBundles?.find(b => b.id === parseInt(bundleId));
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

        const avail = getAvailableQty(item, requestedDates, shift, editingBookingIdSet);
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
                Added partial personal bundle. <b>{unavailableCount} items</b> were unavailable or insufficient stock.
            </span>
        ), { icon: '⚠️' });
    } else if (addedCount > 0) {
        toast.success(`Personal bundle "${bundle.name}" added!`);
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

  const resetForm = () => {
    setSelectedItems([]);
    setSelectedDates([]);
    setShift('Full Day');
    setFormData({ projTitle: '', quote: '', shootType: 'Commercial', remarks: '' });
    setCollaborators([]);
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedDraftId(null);
    lastLoadedDraftId.current = null;
  };

  const handleSaveDraft = async () => {
    if (selectedItems.length === 0) {
      toast.error("Add some equipment first!");
      return;
    }

    setProcessingMessage("Saving draft...");
    setIsProcessing(true);
    try {
      const draftData = {
        id: selectedDraftId,
        project_title: formData.projTitle,
        quotation_number: formData.quote,
        shoot_type: formData.shootType,
        remarks: formData.remarks,
        shift,
        start_date: selectedDates.length > 0 ? format(selectedDates[0], 'yyyy-MM-dd') : null,
        end_date: selectedDates.length > 0 ? format(selectedDates[selectedDates.length - 1], 'yyyy-MM-dd') : null,
        collaborators: collaborators,
        items: selectedItems.map(i => ({ id: i.id, qty: i.qty }))
      };

      const success = await saveDraft(draftData);
      if (success) {
        if (!selectedDraftId) {
          // Refresh the dropdown and select the newly created draft
          const updatedDrafts = await fetchDrafts();
          if (updatedDrafts && updatedDrafts.length > 0) {
            setSelectedDraftId(updatedDrafts[0].id);
          }
        }
        resetForm();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavePersonalBundle = async () => {
    if (selectedItems.length === 0) {
      toast.error("Add some equipment first!");
      return;
    }

    const name = window.prompt("Enter a name for this personal bundle:");
    if (!name) return;

    setProcessingMessage("Saving bundle...");
    setIsProcessing(true);
    try {
      const bundleData = {
        name,
        items: selectedItems.map(i => ({ equipment_id: i.id, quantity: i.qty }))
      };

      const success = await savePersonalBundle(bundleData);
      if (success) {
        resetForm();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBooking = async () => {
    const dateGroups = groupDates(requestedDates);

    const payloads = dateGroups.map((group, index) => ({
      shootName: formData.projTitle,
      quotationNumber: formData.quote,
      shootType: formData.shootType,
      remarks: formData.remarks,
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
      allDates: requestedDates,
      sendNotifications: index === 0,
    }));

    await onConfirm(payloads);
    
    // If we were using a draft, delete it after successful booking
    if (selectedDraftId) {
      await deleteDraft(selectedDraftId);
    }

    resetForm();
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Sidebar: Selection */}
      <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 block">1. Set Schedule</label>
          <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl mb-4 overflow-x-auto no-scrollbar transition-colors">
            {['Full Day', 'AM', 'PM'].map(s => (
              <button key={s} onClick={() => setShift(s)} className={`flex-1 min-w-[60px] py-2 rounded-lg text-[9px] font-black uppercase transition-all ${shift === s ? 'bg-white dark:bg-slate-800 text-[#4a5a67] dark:text-[#ebc1b6] shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-200'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Calendar
              onClickDay={handleDayClick}
              value={null}
              className="mini-calendar mx-auto"
              tileClassName={({ date }) => 
                selectedDates.some(d => isSameDay(d, date)) ? 'react-calendar__tile--active' : null
              }
              prevLabel={<SafeIcon icon={FiChevronLeft} />}
              nextLabel={<SafeIcon icon={FiChevronRight} />}
              prev2Label={<SafeIcon icon={FiChevronsLeft} />}
              next2Label={<SafeIcon icon={FiChevronsRight} />}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 block">2. Select Equipment</label>
          <div className="space-y-3">
             {/* Drafts, Bundles Dropdowns */}
            {drafts && drafts.length > 0 && (
                <div className="relative">
                    <SafeIcon icon={FiFileText} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ebc1b6] text-xs" />
                    <select
                        onChange={(e) => {
                            handleLoadDraft(e.target.value);
                            e.target.value = ""; // Reset
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-[#ebc1b6]/10 dark:bg-[#ebc1b6]/5 border border-[#ebc1b6]/20 focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] dark:text-[#ebc1b6] transition-colors"
                    >
                        <option value="" className="dark:bg-slate-900">Load Draft...</option>
                        {drafts.map(d => (
                            <option key={d.id} value={d.id} className="dark:bg-slate-900">{d.project_title || 'Untitled'} ({d.items?.length || 0} items)</option>
                        ))}
                    </select>
                </div>
            )}

            {bundles && bundles.length > 0 && (
                <div className="relative">
                    <SafeIcon icon={FiPackage} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-xs" />
                    <select
                        onChange={(e) => {
                            handleAddBundle(e.target.value);
                            e.target.value = ""; // Reset
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] dark:text-slate-200 transition-colors"
                    >
                        <option value="" className="dark:bg-slate-900">Load Bundle...</option>
                        {bundles.map(b => (
                            <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name} ({b.items?.length || 0} items)</option>
                        ))}
                    </select>
                </div>
            )}

            {personalBundles?.length > 0 && (
                <div className="relative">
                    <SafeIcon icon={FiUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-xs" />
                    <select
                        onChange={(e) => {
                            handleAddPersonalBundle(e.target.value);
                            e.target.value = ""; // Reset
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] dark:text-slate-200 transition-colors"
                    >
                        <option value="" className="dark:bg-slate-900">Personal Bundles...</option>
                        {personalBundles.map(b => (
                            <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name} ({b.items?.length || 0} items)</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search gear..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] dark:text-slate-200 transition-colors"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] dark:text-slate-200 transition-colors"
              >
                <option value="all" className="dark:bg-slate-900">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="dark:bg-slate-900">
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
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${isSelected ? 'bg-[#ebc1b6] dark:bg-[#ebc1b6] border-[#ebc1b6] text-[#4a5a67]' : avail <= 0 && requestedDates.length > 0 ? 'opacity-30 grayscale cursor-not-allowed' : 'bg-gray-50 dark:bg-slate-900 border-transparent dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-500 text-[#4a5a67] dark:text-slate-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img src={item.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                      <div>
                        <p className="text-[11px] font-bold leading-tight">{item.name}</p>
                        <p className={`text-[8px] font-black uppercase mt-0.5 ${isSelected ? 'text-[#4a5a67]/60' : 'text-gray-400 dark:text-slate-500'}`}>{avail} Available</p>
                      </div>
                    </div>
                    <SafeIcon icon={isSelected ? FiCheckSquare : FiSquare} className="text-sm" />
                  </div>
                </button>
              );
            })}
            {filteredEquipment.length === 0 && (
              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic py-2 text-center">
                No matching equipment found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="bg-[#4a5a67] dark:bg-slate-900 p-6 lg:p-8 text-white transition-colors">
            <h2 className="text-lg lg:text-xl font-bold">Checkout Confirmation</h2>
            <p className="text-[10px] font-black text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">Allocation Details</p>
          </div>
          <div className="p-5 lg:p-8 space-y-6 lg:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <InputGroup label="Project Title">
                <input value={formData.projTitle} onChange={e => setFormData({...formData, projTitle: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-[#ebc1b6] outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-colors" placeholder="Pepsi Summer '24" />
              </InputGroup>
              <InputGroup label="Quotation #">
                <input value={formData.quote} onChange={e => setFormData({...formData, quote: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-[#ebc1b6] outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-colors" placeholder="QT-102" />
              </InputGroup>
              <div className="sm:col-span-2">
                <InputGroup label="Booking Dates">
                  <div className="w-full bg-gray-50 dark:bg-slate-900 p-3 rounded-2xl border border-transparent text-xs font-bold text-[#4a5a67] dark:text-[#ebc1b6] min-h-[48px] transition-colors">
                    {requestedDates.length === 0 ? (
                      <span className="text-gray-400">No dates selected</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {groupDates(requestedDates).map((group, idx) => {
                          const start = group[0];
                          const end = group[group.length - 1];
                          const label = start === end
                            ? format(parseISO(start), 'MMM d, yyyy')
                            : `${format(parseISO(start), 'MMM d, yyyy')} - ${format(parseISO(end), 'MMM d, yyyy')}`;
                          return (
                            <div
                              key={start + idx}
                              className="flex items-center space-x-2 bg-white/70 dark:bg-slate-800/70 px-3 py-1 rounded-full border border-white dark:border-slate-700 shadow-sm"
                            >
                              <SafeIcon icon={FiCalendar} className="text-[10px] text-[#4a5a67] dark:text-[#ebc1b6]" />
                              <span className="text-[10px]">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </InputGroup>
              </div>
            </div>

            <div>
              <InputGroup label="Remarks">
                <textarea
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  maxLength={500}
                  className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-[#ebc1b6] outline-none font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] min-h-[60px] transition-colors"
                  placeholder="Any special notes or additional information for this booking"
                />
              </InputGroup>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Selected Cart</label>
              <div className="space-y-4">
                {(() => {
                  const grouped = {};
                  selectedItems.forEach(item => {
                    const masterItem = equipment.find(e => e.id === item.id);
                    const category = masterItem && masterItem.category ? masterItem.category : 'Uncategorized';
                    if (!grouped[category]) grouped[category] = [];
                    grouped[category].push({ item, masterItem });
                  });

                  return Object.entries(grouped)
                    .sort(([a], [b]) => (categoryOrder[a] ?? 999) - (categoryOrder[b] ?? 999))
                    .map(([category, entries]) => (
                      <div key={category} className="space-y-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                            {category}
                          </div>
                          <div className="grid grid-cols-1 gap-3 lg:gap-4">
                            {entries.map(({ item, masterItem }) => {
                              const maxAvail = masterItem
                                ? getAvailableQty(masterItem, requestedDates, shift, editingBookingIdSet)
                                : item.qty;
                              return (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 gap-4 transition-colors">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 shrink-0">
                                      {item.qty}x
                                    </span>
                                    <img src={item.image} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-wide truncate">{item.name}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                                    <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                                      <button onClick={() => updateQty(item.id, -1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67] dark:hover:text-white p-1"><SafeIcon icon={FiMinus} /></button>
                                      <span className="text-sm font-black text-[#4a5a67] dark:text-[#ebc1b6] w-6 text-center">{item.qty}</span>
                                      <button onClick={() => updateQty(item.id, 1, maxAvail)} className="text-[#ebc1b6] hover:text-[#4a5a67] dark:hover:text-white p-1"><SafeIcon icon={FiPlus} /></button>
                                    </div>
                                    <button 
                                      onClick={() => removeItem(item.id)} 
                                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
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
                    ));
                })()}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <CollaboratorList
                collaborators={collaborators}
                suggestions={collaboratorSuggestions}
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

            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleBooking}
                disabled={isProcessing || selectedItems.length === 0 || !formData.projTitle || requestedDates.length === 0}
                className="w-full py-5 bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-30 transition-all hover:scale-[1.01]"
              >
                {isProcessing ? 'Processing...' : (editingProject ? 'Update Booking' : 'Confirm Deployment')}
              </button>

              {!editingProject && (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleSaveDraft}
                    disabled={selectedItems.length === 0}
                    className="flex items-center justify-center space-x-2 py-4 bg-gray-100 dark:bg-slate-900/50 text-[#4a5a67] dark:text-[#ebc1b6] rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-gray-200 dark:hover:bg-slate-800"
                  >
                    <SafeIcon icon={FiFileText} />
                    <span>Save Draft</span>
                  </button>
                  <button 
                    onClick={handleSavePersonalBundle}
                    disabled={selectedItems.length === 0}
                    className="flex items-center justify-center space-x-2 py-4 bg-gray-100 dark:bg-slate-900/50 text-[#4a5a67] dark:text-[#ebc1b6] rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-gray-200 dark:hover:bg-slate-800"
                  >
                    <SafeIcon icon={FiPackage} />
                    <span>Save Bundle</span>
                  </button>
                </div>
              )}
            </div>
            {editingProject && (
                 <button 
                   onClick={onCancelEdit}
                   className="w-full py-3 bg-transparent text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:text-[#4a5a67] dark:hover:text-white mt-2 transition-colors"
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

function GroupReturnView({ equipment, bookings, categories, onConfirm, onEditRequest, onInviteRequest, initialSelectedKeys = [] }) {
  const { cancelBooking, user } = useInventory();
  const [returnStates, setReturnStates] = useState({}); // { itemId: { isDamaged: bool, note: str } }
  const [selectedProjectKeys, setSelectedProjectKeys] = useState(initialSelectedKeys);
  const [deleteModal, setDeleteModal] = useState(null);
  const [activeTab, setActiveTab] = useState('my_bookings'); // 'my_bookings' or 'my_collaborations'

  const categoryOrder = useMemo(() => 
    (categories || []).reduce((acc, cat, idx) => ({ ...acc, [cat]: idx }), {}), 
    [categories]
  );

  // Update selection if parent changes it (e.g. clicking overdue toast)
  useEffect(() => {
    if (initialSelectedKeys && initialSelectedKeys.length > 0 && user) {
      setSelectedProjectKeys(initialSelectedKeys);
      
      // Auto-switch internal tab if pre-selected projects aren't in current tab
      const currentId = user.id;
      const currentEmail = user.email?.toLowerCase();
      
      const preSelectedBookings = bookings.filter(b => {
        const key = `${b.shootName}|${b.quotationNumber || ''}|${b.startDate}|${b.endDate}`;
        return initialSelectedKeys.includes(key);
      });

      const hasOwner = preSelectedBookings.some(b => 
        b.user?.id === currentId || (typeof b.user === 'string' && b.user === user.name)
      );
      const hasCollab = preSelectedBookings.some(b => 
        Array.isArray(b.collaborators) && currentEmail && b.collaborators.some(c => 
          (typeof c === 'string' ? c.toLowerCase() : c?.email?.toLowerCase()) === currentEmail
        )
      );

      if (!hasOwner && hasCollab) {
        setActiveTab('my_collaborations');
      } else if (hasOwner && !hasCollab) {
        setActiveTab('my_bookings');
      }
    }
  }, [initialSelectedKeys, user, bookings]);

  const projectKey = (project) => `${project.shootName}|${project.quotationNumber || ''}|${project.startDate}|${project.endDate}`;

  const visibleBookings = useMemo(() => {
    if (!user) return bookings;

    const currentId = user.id;
    const currentEmail = user.email ? user.email.toLowerCase() : null;

    return bookings.filter(b => {
      let isOwner = false;
      if (b.user && b.user.id) {
        isOwner = b.user.id === currentId;
      } else if (typeof b.user === 'string' && user.name) {
        isOwner = b.user === user.name;
      }

      let isCollaborator = false;
      if (Array.isArray(b.collaborators) && currentEmail) {
        b.collaborators.forEach(c => {
          if (typeof c === 'string') {
            if (c.toLowerCase() === currentEmail) {
              isCollaborator = true;
            }
          } else if (c && c.email && c.email.toLowerCase() === currentEmail) {
            isCollaborator = true;
          }
        });
      }

      if (activeTab === 'my_bookings') return isOwner;
      if (activeTab === 'my_collaborations') return isCollaborator;

      return isOwner || isCollaborator;
    });
  }, [bookings, user, activeTab]);

  const activeProjects = useMemo(() => {
    const projects = {};
    visibleBookings.filter(b => b.status === 'active').forEach(b => {
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
            shootType: b.shoot_type || b.shootType,
            remarks: b.remarks
        };
      }
      projects[key].bookingIds.add(b.id);

      const eq = equipment.find(e => e.id === b.equipmentId);
      if (eq) {
          projects[key].items.push({
              ...eq,
              bookingEquipmentId: b.bookingEquipmentId,
              quantity: b.quantity || 1
          });
      }
    });
    return Object.values(projects).map(p => ({ ...p, bookingIds: Array.from(p.bookingIds) }));
  }, [visibleBookings, equipment]);

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

    if (!user) return;

    const isAdmin = user.is_admin >= 1;

    const relatedBookings = bookings.filter(b => project.bookingIds.includes(b.id));

    const ownerIds = new Set();
    const collaboratorEmails = new Set();

    relatedBookings.forEach(b => {
      if (b.user && b.user.id) {
        ownerIds.add(b.user.id);
      }
      if (Array.isArray(b.collaborators)) {
        b.collaborators.forEach(c => {
          if (typeof c === 'string') {
            collaboratorEmails.add(c.toLowerCase());
          } else if (c && c.email) {
            collaboratorEmails.add(c.email.toLowerCase());
          }
        });
      }
    });

    const currentId = user.id;
    const currentEmail = user.email ? user.email.toLowerCase() : null;

    const isOwner = currentId && ownerIds.has(currentId);
    const isCollaborator = currentEmail && collaboratorEmails.has(currentEmail);

    if (isAdmin || isOwner || isCollaborator) {
      onEditRequest(project);
    } else {
      toast.error("You don't have permission to edit this booking");
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      <div className="lg:col-span-4 space-y-4">
        <div className="flex flex-col space-y-4 mb-2">
          <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Check In</label>
          <div className="flex items-center space-x-2 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-full overflow-x-auto no-scrollbar transition-colors">
            <button 
              onClick={() => setActiveTab('my_bookings')}
              className={`flex-1 min-w-[100px] px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_bookings' ? 'bg-white dark:bg-slate-800 text-[#4a5a67] dark:text-[#ebc1b6] shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-200'}`}
            >
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('my_collaborations')}
              className={`flex-1 min-w-[100px] px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_collaborations' ? 'bg-white dark:bg-slate-800 text-[#4a5a67] dark:text-[#ebc1b6] shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-200'}`}
            >
              Collabs
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 overflow-y-auto lg:max-h-[70vh] pr-1 custom-scrollbar">
          {activeProjects.map(p => {
            const isStarted = !p.startDate || !isBefore(startOfDay(new Date()), startOfDay(parseISO(p.startDate)));
            
            return (
            <div
              key={projectKey(p)}
              onClick={() => isStarted && toggleProjectSelection(p)}
              className={`relative p-5 lg:p-6 rounded-[2rem] lg:rounded-3xl border transition-all cursor-pointer group ${
                selectedProjectKeys.includes(projectKey(p)) 
                  ? 'bg-[#4a5a67] dark:bg-[#ebc1b6] text-white dark:text-[#4a5a67] shadow-xl' 
                  : isStarted 
                      ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-[#ebc1b6] text-[#4a5a67] dark:text-[#ebc1b6]' 
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-60 cursor-not-allowed text-gray-400 dark:text-slate-500'
                }`}
              >
              {!isStarted && (
                  <div className="absolute top-2 right-6 z-10">
                      <span className="bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Future Booking</span>
                  </div>
              )}
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-12">
                  <h3 className="font-bold text-sm mb-1 truncate">{p.shootName}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{p.quotationNumber}</p>
                </div>
                <div className="absolute top-6 right-6 flex space-x-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                      onClick={(e) => handleEditProject(p, e)}
                      className={`p-2 rounded-lg ${selectedProjectKeys.includes(projectKey(p)) ? 'hover:bg-white/20 dark:hover:bg-black/20 text-current' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400'}`}
                      title="Edit Booking"
                  >
                      <SafeIcon icon={FiEdit2} />
                  </button>
                  {activeTab === 'my_bookings' && (
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onInviteRequest(p.bookingIds[0], p.shootName);
                        }}
                        className={`p-2 rounded-lg ${selectedProjectKeys.includes(projectKey(p)) ? 'hover:bg-white/20 dark:hover:bg-black/20 text-current' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400'}`}
                        title="Invite External Collaborator"
                    >
                        <SafeIcon icon={FiShare2} />
                    </button>
                  )}
                  <button 
                      onClick={(e) => handleCancelProject(p, e)}
                      className={`p-2 rounded-lg ${selectedProjectKeys.includes(projectKey(p)) ? 'hover:bg-red-500/20 text-red-300' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400'}`}
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
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold opacity-60">+{p.items.length} items</span>
                </div>
                {p.startDate && p.endDate && (
                  <div className="flex items-center space-x-1 text-[#ebc1b6] dark:text-[#ebc1b6]">
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
      </div>

      <div className="lg:col-span-8">
        {selectedProjectKeys.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px] lg:min-h-[500px] flex flex-col transition-colors">
            <div className="bg-[#4a5a67] dark:bg-slate-900 p-6 lg:p-8 text-white flex justify-between items-center transition-colors">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold leading-tight pr-4">
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
              <button onClick={() => setSelectedProjectKeys([])} className="p-2 hover:bg-white/10 rounded-full shrink-0 self-start transition-colors"><SafeIcon icon={FiX} /></button>
            </div>

            <div className="p-5 lg:p-8 flex-1 space-y-6 lg:space-y-8">
              {(() => {
                const selectedProjects = activeProjects.filter(p => selectedProjectKeys.includes(projectKey(p)));
                
                // Show remarks if only one project is selected
                const firstProject = selectedProjects.length === 1 ? selectedProjects[0] : null;
                
                const allItems = selectedProjects.flatMap(p => p.items);
                
                // Group by category
                const grouped = {};
                allItems.forEach(item => {
                  const cat = item.category || 'Uncategorized';
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(item);
                });

                return (
                  <>
                    {firstProject && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-2">
                        <div className="p-4 lg:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">User</div>
                          <div className="text-xs font-black text-[#4a5a67] dark:text-[#ebc1b6] mt-1 truncate">{firstProject.user?.name || firstProject.user || 'Operations Team'}</div>
                        </div>
                        <div className="p-4 lg:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Collaborators</div>
                          <div className="text-xs font-black text-[#4a5a67] dark:text-[#ebc1b6] mt-1 truncate">
                            {Array.isArray(firstProject.collaborators) && firstProject.collaborators.length > 0
                              ? firstProject.collaborators
                                  .map((c) => (typeof c === 'string' ? c : c.email))
                                  .filter(Boolean)
                                  .join(', ')
                              : 'None'}
                          </div>
                        </div>
                      </div>
                    )}

                    {firstProject && firstProject.remarks && (
                      <div className="p-5 lg:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 mb-2 transition-colors">
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                          Remarks
                        </div>
                        <p className="text-xs text-[#4a5a67] dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {firstProject.remarks}
                        </p>
                      </div>
                    )}

                    <div className="p-5 lg:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
                        Equipment List
                      </div>
                      <div className="space-y-6 lg:space-y-8">
                        {Object.entries(grouped)
                          .sort(([a], [b]) => (categoryOrder[a] ?? 999) - (categoryOrder[b] ?? 999))
                          .map(([category, items]) => (
                            <div key={category} className="space-y-4">
                              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 border-b border-gray-50 dark:border-slate-800 pb-1">
                                {category}
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {items.map(item => (
                                  <div key={`${item.id}-${item.bookingEquipmentId}`} className="flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 shrink-0 w-6">
                                        {item.quantity || 1}x
                                      </span>
                                      <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-gray-100 dark:border-slate-700" alt="" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-[#4a5a67] dark:text-[#ebc1b6] uppercase tracking-wide truncate">{item.name}</p>
                                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 truncate">{item.serialNumber}</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => toggleDamage(item.id)}
                                      className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all sm:w-auto w-full ${returnStates[item.id]?.isDamaged ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-transparent hover:border-red-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700'}`}
                                    >
                                      <SafeIcon icon={FiAlertTriangle} />
                                      <span>{returnStates[item.id]?.isDamaged ? 'Issue Reported' : 'Report Issue'}</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-6 lg:p-8 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 transition-colors">
              <div className="flex items-center space-x-3 text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6 transition-colors">
                <SafeIcon icon={FiInfo} />
                <p className="text-[10px] font-bold leading-relaxed italic">
                  Completing return will reset item availability. All items flagged with issues will be automatically sent to the Service Bay.
                </p>
              </div>
              <button 
                onClick={handleBatchReturn}
                className="w-full py-5 bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] rounded-2xl lg:rounded-[1.5rem] font-black text-[11px] lg:text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all"
              >
                Complete Return ({activeProjects.filter(p => selectedProjectKeys.includes(projectKey(p))).reduce((acc, p) => acc + p.items.length, 0)} Items)
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[400px] lg:h-[500px] border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 lg:p-12 bg-white dark:bg-slate-800/50 transition-colors">
            <SafeIcon icon={FiLayers} className="text-5xl text-gray-200 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-[#4a5a67] dark:text-gray-400">Batch Return Management</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed mt-2">Select active projects from the list to begin the return inspection process.</p>
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
    <button onClick={onClick} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${active ? 'bg-[#4a5a67] dark:bg-[#ebc1b6] text-[#ebc1b6] dark:text-[#4a5a67] shadow-lg' : 'text-gray-500 hover:text-[#4a5a67] dark:hover:text-white'}`}>
      <SafeIcon icon={icon} />
      <span>{label}</span>
    </button>
  );
}
