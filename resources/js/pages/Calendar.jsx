import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { format, isSameDay, parseISO } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiCalendar, FiClock, FiUser, FiCamera, FiShare2, FiDownload, FiExternalLink, FiInfo, FiX, FiCopy, FiCheck } = FiIcons;
import 'react-calendar/dist/Calendar.css';

function CalendarPage() {
  const { bookings, equipment } = useInventory();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/api/calendar/feed`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Calendar URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const feedUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed` : '';
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const activeBookingCount = useMemo(() => {
    const ids = new Set();
    bookings.forEach(b => {
      if (b.status !== 'returned') {
        ids.add(b.id);
      }
    });
    return ids.size;
  }, [bookings]);

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
      if (bItem.status === 'cancelled') return;

      const item = equipment.find(e => e.id == bItem.equipmentId);
      if (!item || !item.category) return;

      const qty = bItem.quantity || 1;
      const cat = item.category;

      const addUsage = (dateStr) => {
          if (!usage[dateStr]) usage[dateStr] = {};
          if (!usage[dateStr][cat]) usage[dateStr][cat] = 0;
          usage[dateStr][cat] += qty;
      };

      if (bItem.dates && Array.isArray(bItem.dates) && bItem.dates.length > 0) {
          bItem.dates.forEach(d => addUsage(d));
      } else if (bItem.startDate) {
           try {
               addUsage(format(parseISO(bItem.startDate), 'yyyy-MM-dd'));
           } catch (e) {}
      }
    });
    
    return usage;
  }, [bookings, equipment]);

  const currentMonthBookingCount = useMemo(() => {
    const ids = new Set();
    const monthPrefix = format(new Date(), 'yyyy-MM');
    bookings.forEach(b => {
      if (b.startDate && b.startDate.includes(monthPrefix)) {
        ids.add(b.id);
      }
    });
    return ids.size;
  }, [bookings]);

  const events = useMemo(() => {
    const projectMap = {};

    bookings.forEach(booking => {
      const eqName = booking.equipmentName
        ? booking.equipmentName
        : equipment.find(item => item.id === booking.equipmentId)?.name || 'Unknown Equipment';
      const userName = booking.user?.name || 'Operations';
      const shootName = booking.shootName || 'Untitled Project';
      const quotationNumber = booking.quotationNumber || '';

      const addToMap = (dateStr, type) => {
        const key = `${type}|${dateStr}|${shootName}|${quotationNumber}`;
        if (!projectMap[key]) {
          projectMap[key] = {
            id: key,
            type,
            date: parseISO(dateStr),
            shootName,
            quotationNumber,
            userName,
            createdAt: booking.created_at || booking.createdAt,
            items: []
          };
        }
        projectMap[key].items.push(eqName);
      };

      if (booking.dates && Array.isArray(booking.dates) && booking.dates.length > 0) {
        booking.dates.forEach(dateStr => {
           addToMap(dateStr, 'checkout');
        });
      } else if (booking.startDate) {
        try {
          // Fallback for legacy or malformed data
          const dateStr = format(parseISO(booking.startDate), 'yyyy-MM-dd');
          addToMap(dateStr, 'checkout');
        } catch (e) {
          console.error("Invalid start date", booking.startDate);
        }
      }

      if (booking.returnedAt) {
        try {
          const dateStr = format(parseISO(booking.returnedAt), 'yyyy-MM-dd');
          addToMap(dateStr, 'checkin');
        } catch (e) {
          console.error("Invalid return date", booking.returnedAt);
        }
      }
    });
    return Object.values(projectMap);
  }, [bookings, equipment]);

  const selectedDateBookings = useMemo(() => {
    return events.filter(ev => isSameDay(ev.date, selectedDate));
  }, [events, selectedDate]);

  const handleExport = () => {
    window.location.href = feedUrl;
    toast.success("Downloading calendar feed...");
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasEvent = events.some(ev => isSameDay(ev.date, date));
      const dailyUsage = usageByDate[dateStr];

      if (hasEvent || dailyUsage) {
        return (
          <div className="flex justify-center mt-1">
            <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${hasEvent ? 'bg-[#ebc1b6]' : 'bg-gray-300'}`}></div>
            
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">Schedule</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowSyncModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-[#4a5a67] text-[#ebc1b6] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <SafeIcon icon={FiShare2} />
            <span>Sync to External</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Main */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
            <div className="calendar-container">
              <Calendar 
                onChange={setSelectedDate} 
                value={selectedDate} 
                tileContent={tileContent}
                className="custom-calendar-vicinity"
                tileClassName={({ date }) => {
                  const classes = ['group', 'relative']; // Enable group-hover on the tile
                  if (isSameDay(date, selectedDate)) classes.push('react-calendar__tile--active');
                  return classes.join(' ');
                }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#4a5a67] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-5 rounded-full -mr-16 -mt-16" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6] mb-4">
                {format(selectedDate, 'EEEE, MMMM do')}
             </h3>
             
             <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {selectedDateBookings.length > 0 ? (
                  selectedDateBookings.map((event) => (
                    <div key={event.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                           <p className="text-xs font-bold text-[#ebc1b6] mb-1">{event.shootName}</p>
                           {event.quotationNumber && <p className="text-[10px] font-medium text-white/60">{event.quotationNumber}</p>}
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${event.type === 'checkout' ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'bg-green-500/20 text-green-300'}`}>
                           {event.type === 'checkout' ? 'OUT' : 'IN'}
                        </span>
                      </div>

                      <div className="flex flex-col space-y-1 mb-3">
                        <div className="flex items-center space-x-2 text-[9px] text-white/40">
                          <SafeIcon icon={FiUser} />
                          <span>{event.userName}</span>
                        </div>
                        {event.createdAt && (
                          <div className="flex items-center space-x-2 text-[9px] text-white/40">
                            <SafeIcon icon={FiClock} />
                            <span>Booked: {format(new Date(event.createdAt), 'MMM d, HH:mm')}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-white/10 pt-3">
                        <p className="text-[9px] font-bold text-white/60 mb-2">{event.items.length} Items</p>
                        <ul className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                           {event.items.map((item, idx) => (
                             <li key={idx} className="text-[9px] text-white/40 truncate flex items-center space-x-2">
                               <div className="w-1 h-1 bg-white/20 rounded-full" />
                               <span>{item}</span>
                             </li>
                           ))}
                        </ul>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-30">
                    <SafeIcon icon={FiCalendar} className="text-4xl mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No deployments</p>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Fleet Overview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[9px] font-black text-gray-400 uppercase">Active Bookings</p>
                <p className="text-2xl font-black text-[#4a5a67]">{activeBookingCount}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[9px] font-black text-gray-400 uppercase">Current Month</p>
                <p className="text-2xl font-black text-[#4a5a67]">
                  {currentMonthBookingCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSyncModal(false)} className="absolute inset-0 bg-[#4a5a67]/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden" >
              <div className="bg-[#4a5a67] p-8 text-center text-white relative">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowSyncModal(false)} className="text-white/40 hover:text-white transition-colors">
                    <SafeIcon icon={FiX} />
                  </button>
                </div>
                <div className="inline-flex p-4 bg-[#ebc1b6] rounded-2xl mb-4 shadow-lg">
                  <SafeIcon icon={FiShare2} className="text-2xl text-[#4a5a67]" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-widest">Calendar Sync</h2>
                <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">Universal Calendar Feed</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-start space-x-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <SafeIcon icon={FiInfo} className="text-[#4a5a67]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#4a5a67] mb-1">Live Subscription</h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                      Copy the URL below and subscribe in your calendar app (Google Calendar: "Add from URL"). This keeps your schedule automatically updated.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-xl border border-gray-200">
                      <input 
                          type="text" 
                          readOnly 
                          value={feedUrl}
                          className="flex-1 bg-transparent text-[10px] font-mono text-gray-600 focus:outline-none px-2"
                      />
                      <button 
                          onClick={handleCopyUrl}
                          className="p-2 bg-white rounded-lg shadow-sm text-[#4a5a67] hover:text-[#ebc1b6] transition-colors"
                          title="Copy URL"
                      >
                          <SafeIcon icon={copied ? FiCheck : FiCopy} />
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 py-3 bg-[#4285F4] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                    >
                      <SafeIcon icon={FiCalendar} />
                      <span>Google Cal</span>
                    </a>
                    <a 
                      href={webcalUrl}
                      className="flex items-center justify-center space-x-2 py-3 bg-[#4a5a67] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                    >
                      <SafeIcon icon={FiExternalLink} />
                      <span>App / Outlook</span>
                    </a>
                  </div>

                  <button 
                    onClick={handleExport}
                    className="w-full flex items-center justify-center space-x-3 py-3 border-2 border-[#4a5a67] text-[#4a5a67] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    <SafeIcon icon={FiDownload} />
                    <span>Download .ics File</span>
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                    Compatible with: Google • Outlook • Apple • Proton
                  </p>
                  <p className="text-[8px] text-gray-400">
                    Note: For Google Calendar, ensure your site is publicly accessible.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-calendar-vicinity {
          width: 100% !important;
          border: none !important;
          font-family: inherit !important;
        }
        .custom-calendar-vicinity .react-calendar__navigation {
          margin-bottom: 2rem !important;
        }
        .custom-calendar-vicinity .react-calendar__navigation button {
          font-size: 1.2rem !important;
          font-weight: 800 !important;
          color: #4a5a67 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
        }
        .custom-calendar-vicinity .react-calendar__month-view__weekdays__weekday {
          text-decoration: none !important;
          font-size: 0.7rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          color: #cbd5e1 !important;
          padding: 1rem 0 !important;
        }
        .custom-calendar-vicinity .react-calendar__tile {
          padding: 1.5rem 0.5rem !important;
          font-weight: 700 !important;
          color: #4a5a67 !important;
          border-radius: 1rem !important;
          transition: all 0.2s !important;
          position: relative !important;
          overflow: visible !important;
        }
        .custom-calendar-vicinity .react-calendar__tile:enabled:hover {
          background-color: #f8fafc !important;
          color: #ebc1b6 !important;
        }
        .custom-calendar-vicinity .react-calendar__tile--active {
          background: #4a5a67 !important;
          color: #ebc1b6 !important;
          box-shadow: 0 10px 15px -3px rgba(74, 90, 103, 0.2) !important;
        }
        .custom-calendar-vicinity .react-calendar__tile--now {
          background: #ebc1b622 !important;
          color: #4a5a67 !important;
        }
      `}</style>
    </motion.div>
  );
}

export default CalendarPage;
