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
  FiLogIn, FiLogOut, FiAlertTriangle, FiFilter, FiDownload 
} = FiIcons;

function Records() {
  const { bookings, equipment } = useInventory();
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const records = useMemo(() => {
    const events = [];
    bookings.forEach(b => {
        const eqName = equipment.find(e => e.id === b.equipmentId)?.name || 'Unknown Equipment';
        const baseId = b.bookingEquipmentId ? `be-${b.bookingEquipmentId}` : `${b.id}-${b.equipmentId || 'unknown'}`;
        // Checkout Event
        events.push({
            id: `out-${baseId}`,
            type: 'checkout',
            equipmentName: eqName,
            shootName: b.shootName,
            quotationNumber: b.quotationNumber,
            user: b.user?.name || 'Operations',
            timestamp: b.startDate, 
            details: `Qty: ${b.quantity}, Shift: ${b.shift}`
        });
        
        // Return Event
        if (b.status === 'returned') {
             events.push({
                id: `in-${baseId}`,
                type: 'checkin',
                equipmentName: eqName,
                shootName: b.shootName,
                user: b.user?.name || 'Operations',
                timestamp: b.returnedAt || b.endDate,
                details: 'Returned'
            });
        }
    });
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [bookings, equipment]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return records;

    return records.filter(r => {
      const equipmentName = (r.equipmentName || '').toLowerCase();
      const shootName = (r.shootName || '').toLowerCase();
      const quotationNumber = (r.quotationNumber || '').toLowerCase();
      const user = (r.user || '').toLowerCase();

      return (
        equipmentName.includes(term) ||
        shootName.includes(term) ||
        quotationNumber.includes(term) ||
        user.includes(term)
      );
    });
  }, [records, searchTerm]);

  const selectedDayRecords = useMemo(() => {
    return records.filter(record => 
      isSameDay(new Date(record.timestamp), selectedDate)
    );
  }, [records, selectedDate]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasActivity = records.some(r => isSameDay(new Date(r.timestamp), date));
      if (hasActivity) {
        return (
          <div className="flex justify-center mt-1">
            <div className="w-1 h-1 bg-[#ebc1b6] rounded-full" />
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
              {filteredRecords.map((record) => (
                <RecordItem key={record.id} record={record} />
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
                    selectedDayRecords.map(record => (
                      <div key={record.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`p-2 rounded-lg ${record.type === 'checkout' ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'bg-green-500/20 text-green-400'}`}>
                            <SafeIcon icon={record.type === 'checkout' ? FiLogOut : FiLogIn} className="text-xs" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                            {record.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold mb-1">{record.equipmentName}</h4>
                        <div className="flex items-center justify-between text-[9px] font-bold text-white/50">
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiCamera} />
                            <span>{record.shootName || 'N/A'}</span>
                          </div>
                          <span>{format(new Date(record.timestamp), 'HH:mm')}</span>
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

function RecordItem({ record }) {
  const isCheckout = record.type === 'checkout';
  const isProblem = record.type === 'problem_report';

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between hover:border-[#ebc1b6] transition-all group">
      <div className="flex items-center space-x-6 w-full md:w-auto">
        <div className={`p-4 rounded-xl shrink-0 ${isCheckout ? 'bg-[#ebc1b622] text-[#4a5a67]' : isProblem ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          <SafeIcon icon={isCheckout ? FiLogOut : isProblem ? FiAlertTriangle : FiLogIn} className="text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-1">
            <h3 className="text-lg font-bold text-[#4a5a67] truncate">{record.equipmentName}</h3>
            {record.quotationNumber && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">
                {record.quotationNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <div className="flex items-center space-x-1">
              <SafeIcon icon={FiCamera} />
              <span className="truncate max-w-[150px]">{record.shootName || 'General Maintenance'}</span>
            </div>
            {record.user && (
              <div className="flex items-center space-x-1">
                <SafeIcon icon={FiIcons.FiUser} />
                <span>{record.user}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-right mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 flex md:flex-col justify-between items-center md:items-end">
        <p className="text-xs font-bold text-[#4a5a67]">{format(new Date(record.timestamp), 'MMM d, yyyy')}</p>
        <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{format(new Date(record.timestamp), 'HH:mm')}</p>
      </div>
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
