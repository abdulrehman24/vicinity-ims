import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useInventory } from '../../context/InventoryContext';
import Pagination from '../../components/Pagination';
import ConfirmationModal from '../../components/ConfirmationModal';

const { FiTrash2, FiSearch, FiX, FiCalendar, FiUser, FiPackage, FiInfo, FiAlertCircle, FiCheck, FiFilter, FiChevronLeft, FiChevronRight } = FiIcons;

function AdminBookings() {
  const { bookings, fetchBookings, isAdmin } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDeleting, setIsDeleting] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bookingId: null, isBatch: false });
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const uniqueBookings = useMemo(() => {
    const grouped = {};
    bookings.forEach(b => {
      if (!grouped[b.id]) {
        grouped[b.id] = {
          ...b,
          equipmentItems: []
        };
      }
      if (b.equipmentId) {
        grouped[b.id].equipmentItems.push({
          id: b.equipmentId,
          name: b.equipmentName,
          quantity: b.quantity
        });
      }
    });
    return Object.values(grouped);
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return uniqueBookings.filter(b => {
      const matchesSearch = 
        (b.shootName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.quotationNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [uniqueBookings, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const handleDelete = async (id) => {
    setIsDeleting(id);
    try {
      await axios.delete(`/bookings/${id}`);
      toast.success('Booking deleted successfully');
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      fetchBookings();
    } catch (error) {
      console.error('Failed to delete booking', error);
      toast.error(error.response?.data?.message || 'Failed to delete booking');
    } finally {
      setIsDeleting(null);
      setDeleteModal({ isOpen: false, bookingId: null, isBatch: false });
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting('bulk');
    try {
      await axios.post('/bookings/batch-delete', { ids: selectedIds });
      toast.success(`${selectedIds.length} bookings deleted successfully`);
      setSelectedIds([]);
      fetchBookings();
    } catch (error) {
      console.error('Failed to delete bookings', error);
      toast.error(error.response?.data?.message || 'Failed to delete bookings');
    } finally {
      setIsDeleting(null);
      setDeleteModal({ isOpen: false, bookingId: null, isBatch: false });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedBookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedBookings.map(b => b.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#4a5a67] uppercase tracking-tight mb-2">ALL BOOKINGS</h1>
          <div className="w-12 h-1 bg-[#ebc1b6] rounded-full" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects, users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#4a5a67] focus:ring-2 focus:ring-[#ebc1b6] outline-none transition-all shadow-sm w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <SafeIcon icon={FiFilter} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-11 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#4a5a67] focus:ring-2 focus:ring-[#ebc1b6] outline-none transition-all shadow-sm appearance-none w-full sm:w-48"
            >
              <option value="all">ALL STATUSES</option>
              <option value="active">ACTIVE</option>
              <option value="returned">RETURNED</option>
              <option value="cancelled">CANCELLED</option>
            </select>
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setDeleteModal({ isOpen: true, bookingId: null, isBatch: true })}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all animate-in fade-in slide-in-from-right-4"
            >
              <SafeIcon icon={FiTrash2} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 w-10">
                  <div 
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                      selectedIds.length === paginatedBookings.length && paginatedBookings.length > 0
                        ? 'bg-[#4a5a67] border-[#4a5a67]' 
                        : 'border-gray-200 hover:border-[#ebc1b6]'
                    }`}
                  >
                    {selectedIds.length === paginatedBookings.length && paginatedBookings.length > 0 && (
                      <SafeIcon icon={FiCheck} className="text-white text-[10px]" />
                    )}
                  </div>
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Project & Owner</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipment</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6 w-10">
                    <div 
                      onClick={() => toggleSelect(booking.id)}
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                        selectedIds.includes(booking.id)
                          ? 'bg-[#ebc1b6] border-[#ebc1b6]' 
                          : 'border-gray-100 hover:border-[#ebc1b6] bg-white'
                      }`}
                    >
                      {selectedIds.includes(booking.id) && (
                        <SafeIcon icon={FiCheck} className="text-white text-[10px]" />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[#4a5a67] uppercase tracking-tight mb-1">
                        {booking.shootName}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <SafeIcon icon={FiUser} className="text-[#ebc1b6]" />
                        {booking.user?.name || 'Unknown User'}
                        {booking.quotationNumber && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="text-gray-300">#{booking.quotationNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#4a5a67]">
                        <SafeIcon icon={FiCalendar} className="text-[#ebc1b6]" />
                        {format(parseISO(booking.startDate), 'MMM d, yyyy')}
                      </div>
                      {booking.startDate !== booking.endDate && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <SafeIcon icon={FiCalendar} className="opacity-0" />
                          {format(parseISO(booking.endDate), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[#4a5a67] border border-gray-100">
                        <SafeIcon icon={FiPackage} className="text-xs" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {booking.equipmentItems?.length || 0} Items
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] ${
                      booking.status === 'active' ? 'bg-green-100 text-green-600' :
                      booking.status === 'returned' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, bookingId: booking.id })}
                        disabled={isDeleting === booking.id}
                        className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete Booking"
                      >
                        {isDeleting === booking.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <SafeIcon icon={FiTrash2} className="text-sm" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <SafeIcon icon={FiInfo} className="text-4xl mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">No bookings found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={filteredBookings.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, bookingId: null, isBatch: false })}
        onConfirm={() => deleteModal.isBatch ? handleBulkDelete() : handleDelete(deleteModal.bookingId)}
        title={deleteModal.isBatch ? "Bulk Delete Bookings" : "Delete Booking"}
        message={deleteModal.isBatch 
          ? `Are you sure you want to PERMANENTLY delete ${selectedIds.length} selected bookings? This action cannot be undone.`
          : "Are you sure you want to PERMANENTLY delete this booking? This action cannot be undone and will not return equipment automatically."
        }
        confirmText={deleteModal.isBatch ? `Delete ${selectedIds.length} Records` : "Delete Record"}
        isDangerous={true}
      />
    </div>
  );
}

export default AdminBookings;
