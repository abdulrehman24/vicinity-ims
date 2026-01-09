import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import SafeIcon from '../common/SafeIcon';
import { useInventory } from '../context/InventoryContext';
import * as FiIcons from 'react-icons/fi';
import { format, addDays, subDays, isWithinInterval, parseISO, isSameDay } from 'date-fns';

const { 
  FiTool, FiClock, FiAlertCircle, FiCalendar, FiBox, FiUser, 
  FiActivity, FiClipboard, FiTrendingUp, FiChevronRight, FiMaximize2, FiInfo 
} = FiIcons;

function Dashboard() {
  const { equipment, bookings } = useInventory();
  const [timeRange, setTimeRange] = useState('1W');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const itemsRepair = equipment.filter(item => item.status === 'maintenance');
  const currentReadiness = Math.round((equipment.filter(e => e.status === 'available').length / equipment.length) * 100);

  const statusOnDate = useMemo(() => {
    const targetDate = selectedDate;
    const targetDateStr = format(targetDate, 'dd/MM/yyyy');
    
    const bookedOnDate = bookings.filter(booking => {
      try {
        // Fix: Check both the interval AND the explicit dates array
        const startDate = parseISO(booking.startDate);
        const endDate = parseISO(booking.endDate);
        
        const inInterval = isWithinInterval(targetDate, { start: startDate, end: endDate });
        const inDatesArray = booking.dates.includes(targetDateStr) || booking.dates.includes(format(targetDate, 'yyyy-MM-dd'));
        
        return inInterval || inDatesArray;
      } catch (e) {
        return false;
      }
    });

    const isToday = isSameDay(targetDate, new Date());
    const repairingOnDate = isToday ? itemsRepair : [];

    return { bookedOnDate, repairingOnDate, isToday };
  }, [selectedDate, bookings, itemsRepair]);

  const analyticsData = useMemo(() => {
    const ranges = { '1W': 7, '1M': 30, '6M': 180, '1Y': 365, '2Y': 730 };
    const daysCount = ranges[timeRange];
    const dates = [];
    const usageData = [];
    const readinessTrend = [];

    for (let i = daysCount; i >= 0; i--) {
      const date = subDays(new Date(), i);
      dates.push(format(date, daysCount > 31 ? 'MMM d, yy' : 'MMM d'));
      
      // Calculate actual usage instead of random
      const count = bookings.filter(b => {
        const dStr = format(date, 'dd/MM/yyyy');
        return b.dates.includes(dStr);
      }).length;
      
      usageData.push(count);
      readinessTrend.push(Math.floor(Math.random() * 10) + 85); 
    }

    const commonAxis = {
      axisLabel: { color: '#ebc1b6', fontSize: 10, fontFamily: 'Century Gothic' },
      axisLine: { lineStyle: { color: '#ebc1b633' } },
      splitLine: { lineStyle: { color: '#ebc1b611' } }
    };

    const usageOption = {
      xAxis: { type: 'category', data: dates, ...commonAxis },
      yAxis: { type: 'value', ...commonAxis },
      tooltip: { 
        trigger: 'axis', 
        backgroundColor: '#4a5a67', 
        borderColor: '#ebc1b6', 
        textStyle: { color: '#ebc1b6' }
      },
      series: [{
        name: 'Active Deployments',
        data: usageData,
        type: 'line',
        smooth: true,
        color: '#ebc1b6',
        areaStyle: { color: '#ebc1b6', opacity: 0.1 },
        lineStyle: { width: 3 }
      }],
      grid: { top: 20, bottom: 45, left: 35, right: 15 }
    };

    return { usageOption };
  }, [timeRange, bookings]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-[#4a5a67] tracking-tight">Dashboard</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white shadow-sm border border-gray-100 rounded-2xl px-4 py-2">
            <SafeIcon icon={FiCalendar} className="text-[#ebc1b6] mr-3" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Snapshot Date</span>
              <input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={(e) => setSelectedDate(new Date(e.target.value))} className="text-xs font-bold text-[#4a5a67] bg-transparent outline-none" />
            </div>
          </div>
          <div className="flex bg-[#4a5a67] p-1 rounded-xl shadow-inner">
            {['1W', '1M', '6M', '1Y'].map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${timeRange === range ? 'bg-[#ebc1b6] text-[#4a5a67]' : 'text-[#ebc1b6]/50 hover:text-[#ebc1b6]'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#4a5a67] rounded-3xl p-8 shadow-xl border border-[#5a6a77]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-[#ebc1b6] rounded-lg"><SafeIcon icon={FiActivity} className="text-[#4a5a67]" /></div>
            <div>
              <h2 className="text-lg font-bold text-[#ebc1b6]">Deployment Activity</h2>
              <p className="text-[10px] text-[#ebc1b6]/60 font-bold uppercase">Active Gear Across Timeline</p>
            </div>
          </div>
          <div className="h-64">
            <ReactECharts option={analyticsData.usageOption} style={{ height: '100%' }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-lg"><SafeIcon icon={FiTrendingUp} className="text-[#4a5a67]" /></div>
              <h2 className="text-lg font-bold text-[#4a5a67]">Fleet Readiness</h2>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Assets</span>
                  <span className="text-xl font-bold text-[#4a5a67]">{currentReadiness}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${currentReadiness}%` }} className="h-full bg-[#ebc1b6]" />
                </div>
              </div>
            </div>
          </div>
          <Link to="/inventory" className="w-full py-4 bg-[#4a5a67] text-[#ebc1b6] rounded-2xl font-black text-[10px] uppercase tracking-widest text-center shadow-lg hover:shadow-xl transition-all">
            View Full Inventory
          </Link>
        </div>
      </div>

      {/* Daily Operations Explorer */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#ebc1b6] p-2 rounded-xl"><SafeIcon icon={FiClock} className="text-[#4a5a67]" /></div>
            <div>
              <h2 className="text-2xl font-bold text-[#4a5a67]">Log for {format(selectedDate, 'MMMM do')}</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Viewing all active records including multi-day bookings</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
            <h3 className="text-sm font-black text-[#4a5a67] uppercase tracking-widest mb-6">Active Deployments ({statusOnDate.bookedOnDate.length})</h3>
            <div className="space-y-4">
              {statusOnDate.bookedOnDate.length > 0 ? (
                statusOnDate.bookedOnDate.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#ebc1b6] transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[#4a5a67] rounded-xl flex items-center justify-center text-[#ebc1b6]"><SafeIcon icon={FiBox} /></div>
                      <div>
                        <p className="font-bold text-[#4a5a67] text-sm">{booking.equipmentName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{booking.shootName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#4a5a67]">{booking.user}</p>
                      <p className="text-[9px] text-gray-400 font-medium">Quote: {booking.quotationNumber}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={FiBox} message="No deployments active on this date" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
            <h3 className="text-sm font-black text-[#4a5a67] uppercase tracking-widest mb-6">Service Bay</h3>
            <div className="space-y-4">
              {statusOnDate.repairingOnDate.length > 0 ? (
                statusOnDate.repairingOnDate.map((item) => (
                  <div key={item.id} className="flex flex-col p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <img src={item.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                        <div>
                          <p className="font-bold text-[#4a5a67] text-sm">{item.name}</p>
                          <p className="text-[10px] text-red-500 font-bold uppercase">In Repair</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 italic leading-relaxed pt-2 border-t border-gray-100">{item.remarks}</p>
                  </div>
                ))
              ) : (
                <EmptyState icon={FiTool} message="No equipment in repair" />
              )}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full mb-4 bg-gray-50"><SafeIcon icon={icon} className="text-3xl text-gray-200" /></div>
      <p className="text-xs font-medium text-gray-300 max-w-[150px] mx-auto">{message}</p>
    </div>
  );
}

export default Dashboard;