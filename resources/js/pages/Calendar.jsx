import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import { format, parseISO, isValid } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const { FiCalendar, FiClock, FiUser, FiShare2, FiDownload, FiExternalLink, FiInfo, FiX, FiCopy, FiCheck } = FiIcons;

function CalendarPage() {
  const { bookings, equipment } = useInventory();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Click event chip -> open full details (equipment list)
  const [selectedEvent, setSelectedEvent] = useState(null);

  // "+X more" modal (show all day bookings)
  const [moreModal, setMoreModal] = useState({ open: false, date: null, events: [] });

  const feedUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/feed` : '';
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/api/calendar/feed`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Calendar URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    window.location.href = feedUrl;
    toast.success('Downloading calendar feed...');
  };

  const activeBookingCount = useMemo(() => {
    const ids = new Set();
    bookings.forEach(b => {
      if (b.status !== 'returned') ids.add(b.id);
    });
    return ids.size;
  }, [bookings]);

  const currentMonthBookingCount = useMemo(() => {
    const ids = new Set();
    const monthPrefix = format(new Date(), 'yyyy-MM');
    bookings.forEach(b => {
      if (b.startDate && b.startDate.includes(monthPrefix)) ids.add(b.id);
    });
    return ids.size;
  }, [bookings]);

  // --- helpers ---
  const safeParse = (isoLike) => {
    if (!isoLike) return null;
    try {
      const d = parseISO(isoLike);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  };

  const dateOnlyStr = (d) => format(d, 'yyyy-MM-dd');

  // FullCalendar allDay "end" is EXCLUSIVE.
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const openMoreModal = (date, fcEventApiList) => {
    const items = (fcEventApiList || []).map(e => ({
      id: e.id,
      title: e.title,
      extendedProps: e.extendedProps,
    }));

    items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    setMoreModal({ open: true, date, events: items });
  };

  // Build one "Google Calendar bar" per booking (spanning start->end)
  // Also aggregate equipment items for the booking.
  const bookingBars = useMemo(() => {
    const map = new Map(); // bookingId -> aggregate

    bookings.forEach((b) => {
      if (b.status === 'cancelled') return;
      const bookingId = b.id ?? `${b.shootName || 'unknown'}|${b.startDate || ''}|${b.returnedAt || ''}`;

      const shootName = b.shootName || 'Untitled Project';
      const quotationNumber = b.quotationNumber || '';
      const userName = b.user?.name || 'Operations';
      const createdAt = b.created_at || b.createdAt;

      // Collect all involved dates:
      // - Prefer b.dates[] if present (these look like yyyy-MM-dd)
      // - Else fallback to startDate
      const dateList = [];

      if (Array.isArray(b.dates) && b.dates.length > 0) {
        b.dates.forEach((ds) => {
          const d = safeParse(ds);
          if (d) dateList.push(d);
        });
      } else {
        const sd = safeParse(b.startDate);
        if (sd) dateList.push(sd);
      }

      // Determine range start
      let rangeStart = null;
      if (dateList.length > 0) {
        rangeStart = new Date(Math.min(...dateList.map(d => d.getTime())));
      } else {
        rangeStart = safeParse(b.startDate);
      }

      // Determine range end (inclusive end date from returnedAt if exists; else last date in list; else start)
      let rangeEndInclusive = null;
      const returnedAt = safeParse(b.returnedAt);
      if (returnedAt) {
        rangeEndInclusive = returnedAt;
      } else if (dateList.length > 0) {
        rangeEndInclusive = new Date(Math.max(...dateList.map(d => d.getTime())));
      } else if (rangeStart) {
        rangeEndInclusive = rangeStart;
      }

      if (!rangeStart || !rangeEndInclusive) return;

      // Aggregate equipment items
      const eqName = b.equipmentName
        ? b.equipmentName
        : equipment.find(item => item.id === b.equipmentId)?.name || 'Unknown Equipment';

      const qty = b.quantity || 1;

      if (!map.has(bookingId)) {
        map.set(bookingId, {
          bookingId,
          shootName,
          quotationNumber,
          userName,
          createdAt,
          status: b.status,
          start: rangeStart,
          endInclusive: rangeEndInclusive,
          itemsMap: new Map(),
        });
      }

      const agg = map.get(bookingId);

      // Expand range if needed (in case multiple rows)
      if (rangeStart < agg.start) agg.start = rangeStart;
      if (rangeEndInclusive > agg.endInclusive) agg.endInclusive = rangeEndInclusive;

      agg.itemsMap.set(eqName, (agg.itemsMap.get(eqName) || 0) + qty);
    });

    // Convert to array with items[]
    return Array.from(map.values()).map((agg) => ({
      ...agg,
      items: Array.from(agg.itemsMap.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [bookings, equipment]);

  // FullCalendar event objects
  const fcEvents = useMemo(() => {
    return bookingBars.map((b) => {
      const startStr = dateOnlyStr(b.start);
      // end is exclusive: +1 day from inclusive end
      const endExclusiveStr = dateOnlyStr(addDays(b.endInclusive, 1));

      return {
        id: String(b.bookingId),
        title: b.shootName,
        start: startStr,
        end: endExclusiveStr,
        allDay: true,
        extendedProps: {
          bookingId: b.bookingId,
          shootName: b.shootName,
          quotationNumber: b.quotationNumber,
          userName: b.userName,
          createdAt: b.createdAt,
          items: b.items,
          start: startStr,
          endInclusive: dateOnlyStr(b.endInclusive),
        },
      };
    });
  }, [bookingBars]);

  // Sidebar: show bookings that overlap selectedDate
  const selectedDateBars = useMemo(() => {
    const day = new Date(selectedDate);
    day.setHours(0, 0, 0, 0);

    return bookingBars
      .filter((b) => {
        const s = new Date(b.start); s.setHours(0, 0, 0, 0);
        const e = new Date(b.endInclusive); e.setHours(0, 0, 0, 0);
        return s.getTime() <= day.getTime() && day.getTime() <= e.getTime();
      })
      .sort((a, b) => a.shootName.localeCompare(b.shootName));
  }, [bookingBars, selectedDate]);

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
        <div className="lg:col-span-9">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="fc-wrap">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                fixedWeekCount={false}
                expandRows={true}
                events={fcEvents}
                eventDisplay="block"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
                titleFormat={{ year: 'numeric', month: 'long' }}

                /* ✅ show "+X more" after 3 events */
                dayMaxEvents={3}

                dateClick={(info) => {
                  setSelectedDate(new Date(info.dateStr));
                }}

                eventClick={(info) => {
                  info.jsEvent.preventDefault();
                  const start = info.event.start ? new Date(info.event.start) : null;
                  if (start) setSelectedDate(start);
                  setSelectedEvent(info.event.extendedProps);
                }}

                /* ✅ click "+X more" -> open our modal with all day bookings */
                moreLinkClick={(arg) => {
                  arg.jsEvent.preventDefault();
                  arg.jsEvent.stopPropagation();

                  const calendarApi = arg.view?.calendar;

                  const startOfDay = new Date(arg.date);
                  startOfDay.setHours(0, 0, 0, 0);

                  const endOfDay = new Date(arg.date);
                  endOfDay.setHours(23, 59, 59, 999);

                  const todaysEvents = (calendarApi?.getEvents?.() || []).filter(e => {
                    const s = e.start ? new Date(e.start) : null;
                    const end = e.end ? new Date(e.end) : null;

                    // FullCalendar all-day end is exclusive, so make it inclusive for comparisons
                    const effectiveEnd = end ? new Date(end.getTime() - 1) : s;

                    return s && effectiveEnd && (s <= endOfDay && effectiveEnd >= startOfDay);
                  });

                  openMoreModal(arg.date, todaysEvents);
                  return 'none';
                }}

                eventMouseEnter={(info) => {
                  info.el.setAttribute('title', info.event.title);
                }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#4a5a67] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-5 rounded-full -mr-16 -mt-16" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6] mb-4">
              {format(selectedDate, 'EEEE, MMMM do')}
            </h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {selectedDateBars.length > 0 ? (
                selectedDateBars.map((b) => (
                  <button
                    key={String(b.bookingId)}
                    type="button"
                    className="w-full text-left bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
                    onClick={() => {
                      setSelectedEvent({
                        bookingId: b.bookingId,
                        shootName: b.shootName,
                        quotationNumber: b.quotationNumber,
                        userName: b.userName,
                        createdAt: b.createdAt,
                        items: b.items,
                        start: dateOnlyStr(b.start),
                        endInclusive: dateOnlyStr(b.endInclusive),
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-bold text-[#ebc1b6] mb-1">{b.shootName}</p>
                        {b.quotationNumber && <p className="text-[10px] font-medium text-white/60">{b.quotationNumber}</p>}
                      </div>
                      <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-[#ebc1b6] text-[#4a5a67]">
                        OUT
                      </span>
                    </div>

                    <div className="flex flex-col space-y-1 mb-3">
                      <div className="flex items-center space-x-2 text-[9px] text-white/40">
                        <SafeIcon icon={FiUser} />
                        <span>{b.userName}</span>
                      </div>
                      {b.createdAt && (
                        <div className="flex items-center space-x-2 text-[9px] text-white/40">
                          <SafeIcon icon={FiClock} />
                          <span>Booked: {format(new Date(b.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[9px] font-bold text-white/60 mb-2">
                        {b.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} Items
                      </p>
                      <ul className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {b.items.map((item, idx) => (
                          <li key={idx} className="text-[9px] text-white/40 truncate flex items-center space-x-2">
                            <div className="w-1 h-1 bg-white/20 rounded-full" />
                            <span>
                              {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
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
                <p className="text-2xl font-black text-[#4a5a67]">{currentMonthBookingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* "+X more" Modal (All day bookings) */}
      <AnimatePresence>
        {moreModal.open && (
          <div className="fixed inset-0 z-[205] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreModal({ open: false, date: null, events: [] })}
              className="absolute inset-0 bg-[#4a5a67]/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#4a5a67] p-6 text-white relative">
                <button
                  onClick={() => setMoreModal({ open: false, date: null, events: [] })}
                  className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
                >
                  <SafeIcon icon={FiX} />
                </button>

                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6]">
                  All bookings
                </div>
                <div className="text-xl font-black mt-1">
                  {moreModal.date ? format(new Date(moreModal.date), 'EEEE, MMMM do') : ''}
                </div>
                <div className="text-[10px] font-bold text-white/60 mt-1">
                  {moreModal.events.length} booking{moreModal.events.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="p-6 max-h-[65vh] overflow-y-auto space-y-2">
                {moreModal.events.map((ev) => (
                  <button
                    key={ev.id}
                    className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setMoreModal({ open: false, date: null, events: [] });
                      setSelectedDate(new Date(moreModal.date));
                      setSelectedEvent(ev.extendedProps);
                    }}
                  >
                    <div className="text-xs font-black text-[#4a5a67] truncate">
                      {ev.title}
                    </div>
                    {ev.extendedProps?.quotationNumber && (
                      <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                        {ev.extendedProps.quotationNumber}
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-gray-400 mt-1">
                      {ev.extendedProps?.start}
                      {ev.extendedProps?.endInclusive ? ` → ${ev.extendedProps.endInclusive}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details Modal (Full equipment list) */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-[#4a5a67]/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#4a5a67] p-6 text-white relative">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
                >
                  <SafeIcon icon={FiX} />
                </button>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ebc1b6]">
                  Booking Details
                </div>
                <div className="text-xl font-black mt-1">{selectedEvent.shootName}</div>
                <div className="text-[10px] font-bold text-white/60 mt-1">
                  {selectedEvent.start}
                  {selectedEvent.endInclusive ? ` → ${selectedEvent.endInclusive}` : ''}
                  {selectedEvent.quotationNumber ? ` • ${selectedEvent.quotationNumber}` : ''}
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">User</div>
                    <div className="text-xs font-black text-[#4a5a67] mt-1">{selectedEvent.userName}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Type</div>
                    <div className="text-xs font-black text-[#4a5a67] mt-1">OUT</div>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-gray-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                    Equipment List
                  </div>
                  <ul className="space-y-2">
                    {(selectedEvent.items || [])
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item, idx) => (
                        <li key={idx} className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold text-[#4a5a67] truncate">{item.name}</span>
                          <span className="text-[10px] font-black text-gray-400 shrink-0">
                            {item.quantity > 1 ? `x${item.quantity}` : 'x1'}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <style jsx global>{`
        /* --- FullCalendar: make it feel like Google Calendar --- */
        .fc-wrap .fc {
          font-family: inherit;
        }

        .fc-wrap .fc .fc-toolbar {
          margin-bottom: 1.5rem;
        }

        .fc-wrap .fc .fc-toolbar-title {
          font-size: 1.2rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4a5a67;
        }

        .fc-wrap .fc .fc-button {
          background: transparent;
          border: 0;
          color: #4a5a67;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          padding: 0.6rem 0.8rem;
          border-radius: 0.9rem;
        }

        .fc-wrap .fc .fc-button:hover {
          background: #f8fafc;
          color: #ebc1b6;
        }

        .fc-wrap .fc .fc-daygrid-day {
          border-color: #eef2f7;
        }

        .fc-wrap .fc .fc-col-header-cell-cushion {
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #cbd5e1;
          letter-spacing: 0.12em;
          padding: 0.8rem 0;
        }

        .fc-wrap .fc .fc-daygrid-day-frame {
          min-height: 8.5rem;
          padding: 0.35rem 0.45rem;
        }

        .fc-wrap .fc .fc-daygrid-day-number {
          font-weight: 900;
          color: #4a5a67;
          opacity: 0.9;
        }

        .fc-wrap .fc .fc-daygrid-event {
          border: 0;
          border-radius: 0.65rem;
          padding: 0.12rem 0.35rem;
          margin: 0.12rem 0;
          background: #ebc1b6;
          color: #4a5a67;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.02em;
          box-shadow: 0 8px 18px rgba(235, 193, 182, 0.25);
        }

        .fc-wrap .fc .fc-daygrid-event:hover {
          filter: brightness(0.98);
          transform: translateY(-1px);
          transition: 0.15s ease;
        }

        .fc-wrap .fc .fc-daygrid-more-link {
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .fc-wrap .fc .fc-daygrid-more-link:hover {
          color: #ebc1b6;
        }

        .fc-wrap .fc .fc-day-today {
          background: rgba(235, 193, 182, 0.12) !important;
        }
      `}</style>
    </motion.div>
  );
}

export default CalendarPage;