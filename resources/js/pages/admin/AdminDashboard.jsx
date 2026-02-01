import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiUsers, FiPackage, FiCalendar, FiAlertCircle, FiActivity, FiArrowUp, FiArrowDown } = FiIcons;

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ebc1b6] border-t-transparent"></div>
      </div>
    );
  }

  if (!stats) return null;

  // Chart Configurations
  const inventoryOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center' },
    series: [
      {
        name: 'Inventory Status',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '18', fontWeight: 'bold' } },
        data: [
          { value: stats.inventory.available, name: 'Available', itemStyle: { color: '#10b981' } },
          { value: stats.inventory.on_loan, name: 'On Loan', itemStyle: { color: '#f59e0b' } },
          { value: stats.inventory.maintenance, name: 'Maintenance', itemStyle: { color: '#ef4444' } },
          { value: stats.inventory.missing, name: 'Missing', itemStyle: { color: '#6b7280' } },
        ]
      }
    ]
  };

  const bookingsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: [
      {
        type: 'category',
        data: ['Pending', 'Approved', 'Picked Up', 'Returned', 'Overdue'],
        axisTick: { alignWithLabel: true }
      }
    ],
    yAxis: [{ type: 'value' }],
    series: [
      {
        name: 'Bookings',
        type: 'bar',
        barWidth: '60%',
        data: [
          { value: stats.bookings.pending, itemStyle: { color: '#fbbf24' } },
          { value: stats.bookings.approved, itemStyle: { color: '#3b82f6' } },
          { value: stats.bookings.picked_up, itemStyle: { color: '#8b5cf6' } },
          { value: stats.bookings.returned, itemStyle: { color: '#10b981' } },
          { value: stats.bookings.overdue, itemStyle: { color: '#ef4444' } },
        ]
      }
    ]
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Dashboard</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Overview of system analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={stats.users.total} 
          subtext={`${stats.users.active} Active • ${stats.users.pending} Pending`}
          icon={FiUsers} 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Total Inventory" 
          value={stats.inventory.total} 
          subtext={`${stats.inventory.available} Available`}
          icon={FiPackage} 
          color="bg-green-50 text-green-600" 
        />
        <StatCard 
          title="Total Bookings" 
          value={stats.bookings.total} 
          subtext={`${stats.bookings.picked_up} Active • ${stats.bookings.overdue} Overdue`}
          icon={FiCalendar} 
          color="bg-purple-50 text-purple-600" 
        />
        <StatCard 
          title="Support Tickets" 
          value={stats.tickets.total} 
          subtext={`${stats.tickets.open} Open`}
          icon={FiAlertCircle} 
          color="bg-red-50 text-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Inventory Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-[#4a5a67] mb-4">Inventory Status</h3>
          <ReactECharts option={inventoryOption} style={{ height: '300px' }} />
        </div>

        {/* Bookings Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-[#4a5a67] mb-4">Bookings Overview</h3>
          <ReactECharts option={bookingsOption} style={{ height: '300px' }} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#4a5a67]">Recent Bookings</h3>
          <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
            <SafeIcon icon={FiActivity} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent_bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#4a5a67]">{booking.user}</td>
                  <td className="px-6 py-4 text-gray-600">{booking.project}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      booking.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                      booking.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                      booking.status === 'picked_up' ? 'bg-purple-50 text-purple-600' :
                      booking.status === 'returned' ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{booking.date}</td>
                </tr>
              ))}
              {stats.recent_bookings.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No recent activity found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-[#4a5a67] tracking-tight">{value}</h3>
          <p className="text-xs font-medium text-gray-500 mt-2">{subtext}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <SafeIcon icon={icon} className="text-xl" />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
