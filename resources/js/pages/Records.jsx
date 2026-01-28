import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import 'react-calendar/dist/Calendar.css';

const { 
  FiSearch, FiCalendar, FiList, FiClock, FiCamera, 
  FiLogIn, FiLogOut, FiAlertTriangle, FiFilter, FiDownload, FiChevronDown, FiChevronUp 
} = FiIcons;

function Records() {
  const { bookings, equipment } = useInventory();
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

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

    bookings.forEach(bItem => {
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
  }, [bookings, equipment]);

  const records = useMemo(() => {
    const events = [];
    bookings.forEach(b => {
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
  }, [bookings, equipment]);

  const groupedRecords = useMemo(() => {
    const groups = {};
    records.forEach(r => {
      const dateStr = format(new Date(r.timestamp), 'yyyy-MM-dd');
      const key = `${r.shootName}|${r.quotationNumber}|${dateStr}|${r.type}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          shootName: r.shootName,
          quotationNumber: r.quotationNumber,
          date: r.timestamp,
          createdAt: r.createdAt,
          type: r.type,
          user: r.user,
          items: []
        };
      }
      groups[key].items.push(r);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [records]);

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

  const selectedDayRecords = useMemo(() => {
    return groupedRecords.filter(group => 
      isSameDay(new Date(group.date), selectedDate)
    );
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
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">Archives</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>

        <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setView('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-[#4a5a67] text-[#ebc1b6] shadow-md' : 'text-gray-400 hover:text-[#4a5a67]'}`}
          >
            <SafeIcon icon={FiList} />
            <span>List View</span>
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-[#4a5a67] text-[#ebc1b6] shadow-md' : 'text-gray-400 hover:text-[#4a5a67]'}`}
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
              <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by gear, project or quote..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-[#ebc1b6] transition-all text-xs font-bold shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRecords.map((group) => (
                <RecordGroup key={group.id} group={group} />
              ))}
              {filteredRecords.length === 0 && <EmptyState />}
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
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
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
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#4a5a67] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-5 rounded-full -mr-16 -mt-16" />
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6]">Archive Day</h3>
                    <p className="text-lg font-bold">{format(selectedDate, 'MMMM do, yyyy')}</p>
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
                            {group.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold mb-1">{group.shootName}</h4>
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
                          <p className="text-[9px] font-bold text-white/60 mb-2">{group.items.length} Items</p>
                          <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                             {group.items.map((item, idx) => (
                               <li key={idx} className="text-[9px] text-white/40 truncate flex items-center space-x-2">
                                 <div className="w-1 h-1 bg-white/20 rounded-full" />
                                 <span>{item.equipmentName}</span>
                               </li>
                             ))}
                          </ul>
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
        .archive-calendar .react-calendar__tile:enabled:hover {
          background-color: #f8fafc !important;
          color: #ebc1b6 !important;
        }
        .archive-calendar .react-calendar__tile--active {
          background: #4a5a67 !important;
          color: #ebc1b6 !important;
          box-shadow: 0 10px 15px -3px rgba(74,90,103,0.2) !important;
        }
        .archive-calendar .react-calendar__tile--now {
          background: #ebc1b622 !important;
          color: #4a5a67 !important;
        }
      `}</style>
    </div>
  );
}

function RecordGroup({ group }) {
  const [expanded, setExpanded] = useState(false);
  const isCheckout = group.type === 'checkout';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-[#ebc1b6] transition-all group-card">
       <div 
         className="p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer"
         onClick={() => setExpanded(!expanded)}
       >
        <div className="flex items-center space-x-6 w-full md:w-auto">
          <div className={`p-4 rounded-xl shrink-0 ${isCheckout ? 'bg-[#ebc1b622] text-[#4a5a67]' : 'bg-green-50 text-green-600'}`}>
            <SafeIcon icon={isCheckout ? FiLogOut : FiLogIn} className="text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-bold text-[#4a5a67] truncate">{group.shootName}</h3>
              {group.quotationNumber && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">
                  {group.quotationNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center space-x-1">
                <SafeIcon icon={FiCamera} />
                <span className="truncate max-w-[150px]">{group.type === 'checkout' ? 'Deployment' : 'Return'}</span>
              </div>
              {group.user && (
                <div className="flex items-center space-x-1">
                  <SafeIcon icon={FiIcons.FiUser} />
                  <span>{group.user}</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-[#4a5a67]">
                <div className="w-1.5 h-1.5 bg-[#4a5a67] rounded-full" />
                <span>{group.items.length} Items</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs font-bold text-[#4a5a67]">{format(new Date(group.date), 'MMM d, yyyy')}</p>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">
                {group.createdAt && (
                    <span className="block text-[9px] text-gray-300 mt-0.5">
                        Booked: {format(new Date(group.createdAt), 'MMM d, HH:mm')}
                    </span>
                )}
            </p>
          </div>
          <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
             <SafeIcon icon={FiChevronDown} className="text-gray-400" />
          </div>
        </div>
       </div>

       <AnimatePresence>
         {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 border-t border-gray-100"
            >
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {group.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-[#ebc1b6] rounded-full shrink-0" />
                        <span className="text-xs font-bold text-[#4a5a67] truncate">{item.equipmentName}</span>
                      </div>
                      {item.type === 'problem_report' && (
                         <SafeIcon icon={FiAlertTriangle} className="text-red-500 text-xs" />
                      )}
                    </div>
                 ))}
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
      <SafeIcon icon={FiClock} className="text-4xl text-gray-200 mx-auto mb-4" />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No matching records found</p>
    </div>
  );
}

export default Records;
