import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import SafeIcon from '../common/SafeIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useInventory } from '../context/InventoryContext';
import { format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import * as FiIcons from 'react-icons/fi';

const { 
  FiSearch, FiCalendar, FiList, FiClock, FiCamera, 
  FiLogIn, FiLogOut, FiAlertTriangle, FiFilter, FiDownload, FiChevronDown, FiChevronUp,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiEdit2, FiXCircle, FiFileText, FiTrash2
} = FiIcons;

function DraftRecord({ draft, onDelete, categoryOrder }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleEditDraft = () => {
    // Navigate to CheckInOut with the draft data to load it
    navigate('/', { state: { loadDraftId: draft.id } });
  };

  const totalItems = useMemo(() => 
    (draft.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0)
  , [draft.items]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden hover:border-[#ebc1b6] dark:hover:border-[#ebc1b6] transition-all group-card">
       <div 
         className="p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer"
         onClick={() => setExpanded(!expanded)}
       >
        <div className="flex items-center space-x-6 w-full md:w-auto">
          <div className="p-4 rounded-xl shrink-0 bg-[#ebc1b622] text-[#4a5a67] dark:text-[#ebc1b6]">
            <SafeIcon icon={FiFileText} className="text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-bold text-[#4a5a67] dark:text-slate-200 truncate">{draft.project_title || 'Untitled Draft'}</h3>
              {draft.quotation_number && (
                <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">
                  {draft.quotation_number}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              <div className="flex items-center space-x-1">
                <SafeIcon icon={FiClock} />
                <span>Last Updated: {draft.updated_at ? format(new Date(draft.updated_at), 'MMM d, HH:mm') : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-1 text-[#4a5a67] dark:text-[#ebc1b6]">
                <div className="w-1.5 h-1.5 bg-[#4a5a67] dark:bg-[#ebc1b6] rounded-full" />
                <span>{totalItems} Items</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 dark:border-slate-700 justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs font-bold text-[#4a5a67] dark:text-slate-200">
                {draft.start_date && format(new Date(draft.start_date), 'MMM d')}
                {draft.end_date && draft.end_date !== draft.start_date && ` - ${format(new Date(draft.end_date), 'MMM d, yyyy')}`}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-tighter">
                {draft.shift || 'Full Day'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
             <button 
                 onClick={handleEditDraft}
                 className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300 transition-colors"
                 title="Edit Draft"
             >
                 <SafeIcon icon={FiEdit2} />
             </button>
             <button 
                 onClick={onDelete}
                 className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                 title="Delete Draft"
             >
                 <SafeIcon icon={FiTrash2} />
             </button>
             <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''} ml-2`}>
                <SafeIcon icon={FiChevronDown} className="text-gray-400 dark:text-slate-500" />
             </div>
          </div>
        </div>
       </div>

       <AnimatePresence>
         {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700"
            >
               <div className="p-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Collaborators</div>
                     <div className="text-xs font-black text-[#4a5a67] dark:text-slate-200 mt-1">
                       {Array.isArray(draft.collaborators) && draft.collaborators.length > 0
                         ? draft.collaborators
                             .map((c) => (typeof c === 'string' ? c : c.email))
                             .filter(Boolean)
                             .join(', ')
                         : 'None'}
                     </div>
                   </div>
                   <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Shoot Type</div>
                     <div className="text-xs font-black text-[#4a5a67] dark:text-slate-200 mt-1">{draft.shoot_type || 'N/A'}</div>
                   </div>
                 </div>

                 {draft.remarks && (
                   <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
                       Remarks
                     </div>
                     <div className="text-xs text-[#4a5a67] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                       {draft.remarks}
                     </div>
                   </div>
                 )}

                 <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                   <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-6">
                     Draft Equipment
                   </div>
                   <div className="space-y-4">
                     {Object.entries(
                       (draft.items || []).reduce((acc, item) => {
                         const cat = item.equipment?.category || 'Uncategorized';
                         if (!acc[cat]) acc[cat] = [];
                         acc[cat].push(item);
                         return acc;
                       }, {})
                     )
                       .sort(([catA], [catB]) => (categoryOrder[catA] ?? 999) - (categoryOrder[catB] ?? 999))
                       .map(([category, items]) => (
                         <div key={category} className="space-y-2">
                           <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1 border-b border-gray-50 dark:border-slate-700 pb-1">
                             {category}
                           </div>
                           <ul className="space-y-2">
                             {items
                               .sort((a, b) => (a.equipment?.name || '').localeCompare(b.equipment?.name || ''))
                               .map((item, idx) => (
                                 <li key={`${category}-${idx}`} className="flex items-center space-x-3">
                                   <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 shrink-0 w-6">
                                     {item.quantity || 1}x
                                   </span>
                                   <span className="text-xs font-bold text-[#4a5a67] dark:text-slate-200 uppercase tracking-wide">
                                     {item.equipment?.name || 'Unknown Equipment'}
                                   </span>
                                 </li>
                               ))}
                           </ul>
                         </div>
                       ))}
                   </div>
                 </div>
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}

function Records() {
  const { bookings, equipment, drafts, deleteDraft, cancelBooking, batchCancel, user, categories: orderedCategories } = useInventory();
  
  const categoryOrder = useMemo(() => 
    (orderedCategories || []).reduce((acc, cat, idx) => ({ ...acc, [cat]: idx }), {}), 
    [orderedCategories]
  );

  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [activeTab, setActiveTab] = useState('my_bookings'); // 'my_bookings' or 'my_collaborations' or 'drafts'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const navigate = useNavigate();

  const handleCancelRequest = (group) => {
    setModalConfig({
        isOpen: true,
        title: 'Cancel Booking',
        message: `Are you sure you want to cancel the booking for "${group.shootName}"? This action cannot be undone.`,
        isDangerous: true,
        confirmText: 'Yes, Cancel',
        onConfirm: async () => {
            await batchCancel(group.bookingIds);
        }
    });
  };

  const handleDeleteDraft = (draft) => {
    setModalConfig({
        isOpen: true,
        title: 'Delete Draft',
        message: `Are you sure you want to delete the draft for "${draft.project_title || 'Untitled'}"? This action cannot be undone.`,
        isDangerous: true,
        confirmText: 'Yes, Delete',
        onConfirm: async () => {
            await deleteDraft(draft.id);
        }
    });
  };

  const visibleBookings = useMemo(() => {
    if (!user) return bookings;

    const currentId = user.id;
    const currentEmail = user.email ? user.email.toLowerCase() : null;

    if (activeTab === 'drafts') return [];

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

  const visibleDrafts = useMemo(() => {
    if (activeTab !== 'drafts') return [];
    return drafts || [];
  }, [drafts, activeTab]);

  const stockByCategory = useMemo(() => {
    const stock = {};
    equipment.forEach(item => {
      if (!stock[item.category]) {
        stock[item.category] = 0;
      }
      stock[item.category] += (item.totalQuantity || 1);
    });
    return stock;
  }, [equipment]);

  const usageByDate = useMemo(() => {
    const usage = {}; // dateStr -> { category: qty }

    visibleBookings.forEach(bItem => {
      // For records, we probably want to see historical usage too
      // if (bItem.status === 'cancelled') return;

      const item = equipment.find(e => e.id == bItem.equipmentId);
      if (!item || !item.category) return;

      const qty = bItem.quantity || 1;
      const cat = item.category;

      const addUsage = (dateStr) => {
          if (!usage[dateStr]) usage[dateStr] = {};
          if (!usage[dateStr][cat]) usage[dateStr][cat] = 0;
          usage[dateStr][cat] += qty;
      };

      // Check dates array first, fallback to range
      if (bItem.dates && Array.isArray(bItem.dates) && bItem.dates.length > 0) {
          bItem.dates.forEach(d => {
             // Handle if dates are objects or strings
             const dateVal = typeof d === 'object' ? d.date : d;
             addUsage(format(parseISO(dateVal), 'yyyy-MM-dd'));
          });
      } else if (bItem.startDate) {
           try {
               addUsage(format(parseISO(bItem.startDate), 'yyyy-MM-dd'));
           } catch (e) {}
      }
    });
    
    return usage;
  }, [visibleBookings, equipment]);

  const records = useMemo(() => {
    const events = [];
    visibleBookings.forEach(b => {
        const eqName = equipment.find(e => e.id === b.equipmentId)?.name || 'Unknown Equipment';
        const baseId = b.bookingEquipmentId ? `be-${b.bookingEquipmentId}` : `${b.id}-${b.equipmentId || 'unknown'}`;
        
        // Helper to add checkout event
        const addCheckoutEvent = (dateStr, suffix = '') => {
             events.push({
                id: `out-${baseId}-${dateStr}${suffix}`,
                type: 'checkout',
                equipmentName: eqName,
                shootName: b.shootName,
                quotationNumber: b.quotationNumber,
                user: b.user?.name || 'Operations',
                timestamp: dateStr, // Use the specific date
                createdAt: b.created_at || b.createdAt, 
                details: `Qty: ${b.quantity}, Shift: ${b.shift}`
            });
        };

        // Checkout Events: Iterate over all dates
        if (b.dates && Array.isArray(b.dates) && b.dates.length > 0) {
            b.dates.forEach((d, idx) => {
                 const dateVal = typeof d === 'object' ? d.date : d;
                 addCheckoutEvent(dateVal, `-${idx}`);
            });
        } else if (b.startDate) {
             addCheckoutEvent(b.startDate);
        }
        
        // Return Event
        if (b.status === 'returned') {
             events.push({
                id: `in-${baseId}`,
                type: 'checkin',
                equipmentName: eqName,
                shootName: b.shootName,
                user: b.user?.name || 'Operations',
                timestamp: b.returnedAt || b.endDate,
                createdAt: b.created_at || b.createdAt, // Add creation timestamp
                details: 'Returned'
            });
        }
    });
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [visibleBookings, equipment]);

  const groupedRecords = useMemo(() => {
    const groups = {};
    
    const getDateObj = (d) => typeof d === 'object' ? d.date : d;

    visibleBookings.forEach(b => {
      if (b.status === 'cancelled') return;

      const start = b.startDate || 'NoStart';
      const end = b.endDate || 'NoEnd';
      const key = `${b.shootName}|${b.quotationNumber || 'NoQuote'}|${start}|${end}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          shootName: b.shootName,
          quotationNumber: b.quotationNumber,
          dates: [],
          bookingIds: new Set(),
          items: [],
          status: b.status,
          user: b.user?.name || b.user || 'Operations',
          createdAt: b.createdAt || b.created_at,
          shift: b.shift,
          collaborators: b.collaborators || [],
          shootType: b.shoot_type || b.shootType || null,
          remarks: b.remarks || '',
        };
      }
      
      groups[key].bookingIds.add(b.id);
      
      const eq = equipment.find(e => e.id === b.equipmentId);
      const eqName = eq?.name || 'Unknown Equipment';
      const eqCategory = eq?.category || '';
      groups[key].items.push({
          ...b,
          equipmentName: eqName,
          equipmentCategory: eqCategory
      });
      
      if (b.dates && Array.isArray(b.dates) && b.dates.length > 0) {
          b.dates.forEach(d => groups[key].dates.push(getDateObj(d)));
      } else if (b.startDate) {
          groups[key].dates.push(b.startDate);
          if (b.endDate) groups[key].dates.push(b.endDate);
      }
    });

    return Object.values(groups).map(g => {
        const uniqueDates = [...new Set(g.dates)].sort();
        const startDate = uniqueDates.length > 0 ? uniqueDates[0] : null;
        const endDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : null;
        
        return {
            ...g,
            bookingIds: Array.from(g.bookingIds),
            dates: uniqueDates,
            startDate,
            endDate,
            date: startDate || g.createdAt
        };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleBookings, equipment]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groupedRecords;

    return groupedRecords.filter(g => {
      const shootName = (g.shootName || '').toLowerCase();
      const quotationNumber = (g.quotationNumber || '').toLowerCase();
      const user = (g.user || '').toLowerCase();
      const hasMatchingItem = g.items.some(i => i.equipmentName.toLowerCase().includes(term));

      return (
        shootName.includes(term) ||
        quotationNumber.includes(term) ||
        user.includes(term) ||
        hasMatchingItem
      );
    });
  }, [groupedRecords, searchTerm]);

  const filteredDrafts = useMemo(() => {
    if (activeTab !== 'drafts') return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return visibleDrafts;

    return visibleDrafts.filter(d => {
      const title = (d.project_title || '').toLowerCase();
      const quote = (d.quotation_number || '').toLowerCase();
      const hasMatchingItem = (d.items || []).some(i => 
        (i.equipment?.name || '').toLowerCase().includes(term)
      );

      return title.includes(term) || quote.includes(term) || hasMatchingItem;
    });
  }, [visibleDrafts, searchTerm, activeTab]);

  const selectedDayRecords = useMemo(() => {
    return groupedRecords
      .filter(group => {
        if (group.dates && group.dates.length > 0) {
          return group.dates.some(d => {
            const dateVal = typeof d === 'object' ? d.date : d;
            try {
              return isSameDay(new Date(dateVal), selectedDate);
            } catch {
              return false;
            }
          });
        }

        if (group.startDate && group.endDate) {
          try {
            const start = new Date(group.startDate);
            const end = new Date(group.endDate);
            return isWithinInterval(selectedDate, { start, end });
          } catch {
            return false;
          }
        }

        if (group.startDate) {
          try {
            return isSameDay(new Date(group.startDate), selectedDate);
          } catch {
            return false;
          }
        }

        if (group.date) {
          try {
            return isSameDay(new Date(group.date), selectedDate);
          } catch {
            return false;
          }
        }

        return false;
      })
      .map(group => ({
        ...group,
        type: group.status === 'returned' ? 'returned' : 'checkout',
      }));
  }, [groupedRecords, selectedDate]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasActivity = records.some(r => isSameDay(new Date(r.timestamp), date));
      const dailyUsage = usageByDate[dateStr];

      if (hasActivity || dailyUsage) {
        return (
          <div className="flex justify-center mt-1">
            <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${hasActivity ? 'bg-[#ebc1b6]' : 'bg-gray-300'}`} />

             {/* Tooltip */}
             {dailyUsage && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-[#4a5a67] text-white p-3 rounded-xl shadow-xl z-50 hidden group-hover:block pointer-events-none">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#ebc1b6] mb-2 border-b border-white/10 pb-1">
                        Inventory Usage
                    </div>
                    <div className="space-y-1">
                        {Object.entries(dailyUsage).map(([cat, qty]) => {
                            const total = stockByCategory[cat] || 0;
                            const pct = Math.min(100, Math.round((qty / total) * 100));
                            const isHigh = pct > 80;
                            return (
                                <div key={cat} className="flex justify-between items-center text-[9px] font-bold">
                                    <span className="truncate max-w-[60%]">{cat}</span>
                                    <span className={isHigh ? 'text-red-300' : 'text-white/60'}>
                                        {qty} / {total}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#4a5a67] rotate-45"></div>
                </div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] dark:text-slate-200 uppercase tracking-tight mb-2">Archives</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full mb-6" />
          
          <div className="flex items-center space-x-2 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('my_bookings')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_bookings' ? 'bg-white dark:bg-slate-700 text-[#4a5a67] dark:text-slate-200 shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300'}`}
            >
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('my_collaborations')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_collaborations' ? 'bg-white dark:bg-slate-700 text-[#4a5a67] dark:text-slate-200 shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300'}`}
            >
              Collaborations
            </button>
            <button 
              onClick={() => setActiveTab('drafts')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'drafts' ? 'bg-white dark:bg-slate-700 text-[#4a5a67] dark:text-slate-200 shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300'}`}
            >
              Draft Bookings
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
          <button 
            onClick={() => setView('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] shadow-md' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300'}`}
          >
            <SafeIcon icon={FiList} />
            <span>List View</span>
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] shadow-md' : 'text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300'}`}
          >
            <SafeIcon icon={FiCalendar} />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="relative max-w-md">
              <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by gear, project or quote..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:border-[#ebc1b6] dark:focus:border-[#ebc1b6] transition-all text-xs font-bold shadow-sm text-[#4a5a67] dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeTab === 'drafts' ? (
                filteredDrafts.map((draft) => (
                  <DraftRecord key={draft.id} draft={draft} onDelete={() => handleDeleteDraft(draft)} categoryOrder={categoryOrder} />
                ))
              ) : (
                filteredRecords.map((group) => (
                  <RecordGroup 
                    key={group.id} 
                    group={group} 
                    currentUser={user}
                    onEdit={(editProject) => navigate('/', { state: { editProject } })}
                    onCancel={() => handleCancelRequest(group)}
                    categoryOrder={categoryOrder}
                  />
                ))
              )}
              {((activeTab === 'drafts' && filteredDrafts.length === 0) || (activeTab !== 'drafts' && filteredRecords.length === 0)) && <EmptyState />}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                <Calendar 
                  onChange={setSelectedDate} 
                  value={selectedDate} 
                  tileContent={tileContent}
                  className="archive-calendar"
                  tileClassName={({ date }) => {
                    const classes = ['group', 'relative']; 
                    if (isSameDay(date, selectedDate)) classes.push('react-calendar__tile--active');
                    return classes.join(' ');
                  }}
                  prevLabel={<SafeIcon icon={FiChevronLeft} />}
                  nextLabel={<SafeIcon icon={FiChevronRight} />}
                  prev2Label={<SafeIcon icon={FiChevronsLeft} />}
                  next2Label={<SafeIcon icon={FiChevronsRight} />}
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#4a5a67] dark:bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-5 rounded-full -mr-16 -mt-16" />
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6]">Archive Day</h3>
                    <p className="text-lg font-bold text-white">{format(selectedDate, 'MMMM do, yyyy')}</p>
                  </div>
                  <div className="bg-[#ebc1b6] text-[#4a5a67] px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {selectedDayRecords.length} Actions
                  </div>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedDayRecords.length > 0 ? (
                    selectedDayRecords.map(group => (
                      <div key={group.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`p-2 rounded-lg ${group.type === 'checkout' ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'bg-green-500/20 text-green-400'}`}>
                            <SafeIcon icon={group.type === 'checkout' ? FiLogOut : FiLogIn} className="text-xs" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                            {(group.type || 'checkout').replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold mb-1 text-white">{group.shootName}</h4>
                        {group.quotationNumber && <p className="text-[10px] font-medium text-white/60 mb-2">{group.quotationNumber}</p>}
                        
                        <div className="flex flex-col space-y-1 mb-3">
                          <div className="flex items-center space-x-2 text-[9px] font-bold text-white/50">
                            <SafeIcon icon={FiIcons.FiUser} />
                            <span>{group.user || 'N/A'}</span>
                          </div>
                          {group.createdAt && (
                            <div className="flex items-center space-x-2 text-[9px] text-white/40">
                              <SafeIcon icon={FiClock} />
                              <span>Booked: {format(new Date(group.createdAt), 'MMM d, HH:mm')}</span>
                            </div>
                          )}
                        </div>

                      <div className="border-t border-white/10 pt-3">
                          {(() => {
                            const counts = {};
                            const meta = {};
                            const getDateValue = (d) => (typeof d === 'object' ? d.date : d);

                            group.items.forEach(i => {
                              const name = i.equipmentName;
                              const category = i.equipmentCategory || '';
                              const qty = i.quantity || 1;

                              let isActiveOnSelectedDate = false;

                              if (i.dates && Array.isArray(i.dates) && i.dates.length > 0) {
                                isActiveOnSelectedDate = i.dates.some(d => {
                                  const dateVal = getDateValue(d);
                                  try {
                                    return isSameDay(parseISO(dateVal), selectedDate);
                                  } catch {
                                    return false;
                                  }
                                });
                              } else if (i.startDate && i.endDate) {
                                try {
                                  const start = parseISO(i.startDate);
                                  const end = parseISO(i.endDate);
                                  isActiveOnSelectedDate = isWithinInterval(selectedDate, { start, end });
                                } catch {
                                  isActiveOnSelectedDate = false;
                                }
                              } else if (i.startDate) {
                                try {
                                  isActiveOnSelectedDate = isSameDay(parseISO(i.startDate), selectedDate);
                                } catch {
                                  isActiveOnSelectedDate = false;
                                }
                              }

                              if (!isActiveOnSelectedDate) return;

                              counts[name] = Math.max(counts[name] || 0, qty);
                              if (!meta[name]) meta[name] = category;
                            });
                            const totalUnits = Object.values(counts).reduce((sum, v) => sum + v, 0);
                            return (
                              <>
                                <p className="text-[9px] font-bold text-white/60 mb-2">{totalUnits} Items</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                  {Object.entries(
                                      Object.entries(counts).reduce((acc, [name, count]) => {
                                        const category = meta[name] || '';
                                        const key = category || 'Uncategorized';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push({ name, count });
                                        return acc;
                                      }, {})
                                    )
                                    .sort(([catA], [catB]) => (categoryOrder[catA] ?? 999) - (categoryOrder[catB] ?? 999))
                                    .map(([category, items]) => (
                                      <div key={category} className="space-y-0.5">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/40">
                                          {category}
                                        </div>
                                        {items
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map((row, idx) => (
                                            <div key={category + '-' + idx} className="text-[9px] text-white/40 truncate flex items-center space-x-2 pl-2">
                                              <div className="w-1 h-1 bg-white/20 rounded-full" />
                                              <span>
                                                {row.name}{row.count > 1 ? ` x${row.count}` : ''}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 opacity-30">
                      <SafeIcon icon={FiClock} className="text-4xl mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No activity recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .archive-calendar,
        .archive-calendar *,
        :global(.react-calendar),
        :global(.react-calendar *) {
          background: transparent !important;
          background-color: transparent !important;
        }
        :global(.dark) .archive-calendar,
        :global(.dark) .archive-calendar *,
        :global(.dark .react-calendar),
        :global(.dark .react-calendar *) {
          background: transparent !important;
          background-color: transparent !important;
          border-color: #334155 !important;
        }
        .archive-calendar {
          width: 100% !important;
          border: none !important;
          font-family: inherit !important;
        }
        .archive-calendar .react-calendar__navigation button {
          font-size: 1.1rem !important;
          font-weight: 800 !important;
          color: #4a5a67 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          border-radius: 0.75rem !important;
        }
        :global(.dark) .archive-calendar .react-calendar__navigation button {
          color: #f1f5f9 !important;
        }
        :global(.dark) .archive-calendar .react-calendar__navigation button:enabled:hover,
        :global(.dark) .archive-calendar .react-calendar__navigation button:enabled:focus {
          background-color: #334155 !important;
        }
        .archive-calendar .react-calendar__tile {
          padding: 1.5rem 0.5rem !important;
          font-weight: 700 !important;
          color: #4a5a67 !important;
          border-radius: 1rem !important;
          transition: all 0.2s !important;
          position: relative !important;
          overflow: visible !important;
        }
        :global(.dark) .archive-calendar .react-calendar__tile {
          color: #cbd5e1 !important;
        }
        .archive-calendar .react-calendar__tile:enabled:hover {
          background-color: #f1f5f9 !important;
          color: #ebc1b6 !important;
        }
        :global(.dark) .archive-calendar .react-calendar__tile:enabled:hover {
          background-color: #1e293b !important;
          color: #ebc1b6 !important;
        }
        .archive-calendar .react-calendar__tile--active {
          background: #4a5a67 !important;
          color: #ebc1b6 !important;
          box-shadow: 0 10px 15px -3px rgba(74,90,103,0.2) !important;
        }
        :global(.dark) .archive-calendar .react-calendar__tile--active {
          background: #ebc1b6 !important;
          color: #1e293b !important;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3) !important;
        }
        .archive-calendar .react-calendar__tile--now {
          background: #ebc1b622 !important;
          color: #4a5a67 !important;
        }
        :global(.dark) .archive-calendar .react-calendar__tile--now {
          background: #ebc1b622 !important;
          color: #f1f5f9 !important;
        }
        :global(.dark) .react-calendar__month-view__days__day--neighboringMonth {
          color: #334155 !important;
        }
        :global(.dark) .archive-calendar .react-calendar__month-view__weekdays__weekday {
          color: #475569 !important;
        }
      `}</style>
      
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDangerous={modalConfig.isDangerous}
      />
    </div>
  );
}

function RecordGroup({ group, onEdit, onCancel, currentUser, categoryOrder }) {
  const [expanded, setExpanded] = useState(false);
  
  // Aggregate items by name and sum quantities to prevent duplicates
  const aggregatedItems = useMemo(() => {
    const counts = {};
    const firstItems = {};
    
    group.items.forEach(item => {
       const name = item.equipmentName;
       const qty = item.quantity || 1;
       if (!counts[name]) {
           counts[name] = qty;
           firstItems[name] = item;
       } else {
           counts[name] = Math.max(counts[name], qty);
       }
    });
    
    return Object.values(firstItems).map(item => ({
        ...item,
        displayQuantity: counts[item.equipmentName]
    }));
  }, [group.items]);
  
  // Determine display status/color
  const isReturned = group.items.every(i => i.status === 'returned');
  const isCancelled = group.items.every(i => i.status === 'cancelled');
  const isPartial = !isReturned && !isCancelled; // Simplified

  const canEdit = useMemo(() => {
    if (!currentUser) return false;

    // Only allow editing for active bookings
    const isActive = group.items.some(i => i.status === 'active');
    if (!isActive) return false;

    const isAdmin = currentUser.is_admin >= 1;
    if (isAdmin) return true;

    const ownerIds = new Set();
    const collaboratorEmails = new Set();

    group.items.forEach(i => {
      if (i.user && i.user.id) {
        ownerIds.add(i.user.id);
      }
      if (Array.isArray(i.collaborators)) {
        i.collaborators.forEach(c => {
          if (typeof c === 'string') {
            collaboratorEmails.add(c.toLowerCase());
          } else if (c && c.email) {
            collaboratorEmails.add(c.email.toLowerCase());
          }
        });
      }
    });

    const currentId = currentUser.id;
    const currentEmail = currentUser.email ? currentUser.email.toLowerCase() : null;

    if (currentId && ownerIds.has(currentId)) return true;
    if (currentEmail && collaboratorEmails.has(currentEmail)) return true;

    return false;
  }, [currentUser, group.items]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden hover:border-[#ebc1b6] dark:hover:border-[#ebc1b6] transition-all group-card">
       <div 
         className="p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer"
         onClick={() => setExpanded(!expanded)}
       >
        <div className="flex items-center space-x-6 w-full md:w-auto">
          <div className={`p-4 rounded-xl shrink-0 ${isReturned ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' : isCancelled ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-[#ebc1b622] text-[#4a5a67] dark:text-[#ebc1b6]'}`}>
            <SafeIcon icon={isReturned ? FiLogIn : isCancelled ? FiXCircle : FiLogOut} className="text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-bold text-[#4a5a67] dark:text-slate-200 truncate">{group.shootName}</h3>
              {group.quotationNumber && (
                <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">
                  {group.quotationNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              <div className="flex items-center space-x-1">
                <SafeIcon icon={FiCamera} />
                <span className="truncate max-w-[150px]">
                    {isReturned ? 'Returned' : isCancelled ? 'Cancelled' : 'Deployed'}
                </span>
              </div>
              {group.user && (
                <div className="flex items-center space-x-1">
                  <SafeIcon icon={FiIcons.FiUser} />
                  <span>{group.user}</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-[#4a5a67] dark:text-[#ebc1b6]">
                <div className="w-1.5 h-1.5 bg-[#4a5a67] dark:bg-[#ebc1b6] rounded-full" />
                <span>
                  {aggregatedItems.reduce((sum, item) => sum + (item.displayQuantity || 1), 0)} Items
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 dark:border-slate-700 justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs font-bold text-[#4a5a67] dark:text-slate-200">
                {group.startDate && format(new Date(group.startDate), 'MMM d')}
                {group.endDate && group.endDate !== group.startDate && ` - ${format(new Date(group.endDate), 'MMM d, yyyy')}`}
                {!group.endDate && group.startDate && `, ${format(new Date(group.startDate), 'yyyy')}`}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-tighter">
                {group.createdAt && (
                    <span className="block text-[9px] text-gray-300 dark:text-slate-600 mt-0.5">
                        Booked: {format(new Date(group.createdAt), 'MMM d, HH:mm')}
                    </span>
                )}
            </p>
          </div>
          
          <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
             {!isCancelled && !isReturned && (
                <>
                    {canEdit && (
                      <button 
                          onClick={() => {
                            const editProject = {
                              id: group.id,
                              shootName: group.shootName,
                              quotationNumber: group.quotationNumber,
                              dates: group.dates,
                              startDate: group.startDate,
                              endDate: group.endDate,
                              bookingIds: group.bookingIds,
                              status: group.status,
                              user: group.user,
                              createdAt: group.createdAt,
                              shift: group.shift,
                              collaborators: group.collaborators,
                              shootType: group.shootType,
                              remarks: group.remarks,
                              items: aggregatedItems.map(item => ({
                                equipmentId: item.equipmentId || item.id,
                                quantity: item.displayQuantity || item.quantity || 1,
                                equipmentName: item.equipmentName,
                              })),
                            };
                            onEdit(editProject);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-400 dark:text-slate-500 hover:text-[#4a5a67] dark:hover:text-slate-300 transition-colors"
                          title="Edit Booking"
                      >
                          <SafeIcon icon={FiEdit2} />
                      </button>
                    )}
                    <button 
                        onClick={onCancel}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Cancel Booking"
                    >
                        <SafeIcon icon={FiXCircle} />
                    </button>
                </>
             )}
             <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''} ml-2`}>
                <SafeIcon icon={FiChevronDown} className="text-gray-400 dark:text-slate-500" />
             </div>
          </div>
        </div>
       </div>

       <AnimatePresence>
         {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700"
            >
               <div className="p-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">User</div>
                     <div className="text-xs font-black text-[#4a5a67] dark:text-slate-200 mt-1">{group.user || 'Operations Team'}</div>
                   </div>
                   <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Collaborators</div>
                     <div className="text-xs font-black text-[#4a5a67] dark:text-slate-200 mt-1">
                       {Array.isArray(group.collaborators) && group.collaborators.length > 0
                         ? group.collaborators
                             .map((c) => (typeof c === 'string' ? c : c.email))
                             .filter(Boolean)
                             .join(', ')
                         : 'None'}
                     </div>
                   </div>
                 </div>

                 {group.remarks && (
                   <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                     <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
                       Remarks
                     </div>
                     <div className="text-xs text-[#4a5a67] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                       {group.remarks}
                     </div>
                   </div>
                 )}

                 <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                   <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-6">
                     Equipment List
                   </div>
                   <div className="space-y-8">
                     {Object.entries(
                       aggregatedItems.reduce((acc, item) => {
                         const cat = item.equipmentCategory || 'Uncategorized';
                         if (!acc[cat]) acc[cat] = [];
                         acc[cat].push(item);
                         return acc;
                       }, {})
                     )
                       .sort(([catA], [catB]) => (categoryOrder[catA] ?? 999) - (categoryOrder[catB] ?? 999))
                       .map(([category, items]) => (
                         <div key={category} className="space-y-4">
                           <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1 border-b border-gray-50 dark:border-slate-700 pb-1">
                             {category}
                           </div>
                           <ul className="space-y-3">
                             {items
                               .slice()
                               .sort((a, b) => a.equipmentName.localeCompare(b.equipmentName))
                               .map((item, idx) => (
                                 <li key={`${category}-${item.equipmentName}-${idx}`} className="flex items-center space-x-3">
                                   <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 shrink-0 w-6">
                                     {item.displayQuantity || 1}x
                                   </span>
                                   <span className="text-xs font-bold text-[#4a5a67] dark:text-slate-200 uppercase tracking-wide">
                                     {item.equipmentName}
                                   </span>
                                 </li>
                               ))}
                           </ul>
                         </div>
                       ))}
                   </div>
                 </div>
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 transition-colors">
      <SafeIcon icon={FiClock} className="text-4xl text-gray-200 dark:text-slate-700 mx-auto mb-4" />
      <p className="text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">No matching records found</p>
    </div>
  );
}

export default Records;
