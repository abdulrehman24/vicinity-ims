import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/support-tickets', {
        params: {
          page,
          length: pageSize,
          status: status || undefined,
        },
      });
      const payload = response.data || {};
      const rows = payload.data || [];
      setTickets(rows);
      const totalRecords = payload.total ?? rows.length;
      setTotal(totalRecords);
    } catch (e) {
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [page, pageSize, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const badgeClass = (value) => {
    if (value === 'open') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (value === 'in_progress') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (value === 'resolved') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const severityClass = (value) => {
    if (value === 'High' || value === 'high') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (value === 'Medium' || value === 'medium') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (value === 'Low' || value === 'low') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const handleStatusChange = async (ticket, nextStatus) => {
    if (!nextStatus || ticket.status === nextStatus) {
      return;
    }
    setUpdatingId(ticket.id);
    try {
      const response = await axios.patch(`/api/admin/support-tickets/${ticket.id}/status`, {
        status: nextStatus,
      });
      const updated = response.data || {};
      setTickets((current) =>
        current.map((t) => (t.id === ticket.id ? { ...t, status: updated.status } : t)),
      );
      toast.success(`Ticket ${ticket.ticket_code} set to ${nextStatus.replace('_', ' ')}`);
    } catch (e) {
      toast.error('Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Support tickets</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Recent tickets
          </p>
          <div className="flex items-center space-x-3">
            {loading && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Loading…
              </p>
            )}
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] uppercase tracking-widest bg-gray-50 text-gray-500 focus:bg-white focus:border-[#ebc1b6] outline-none"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-[10px] uppercase tracking-widest bg-gray-50 text-gray-500 focus:bg-white focus:border-[#ebc1b6] outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Ticket
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Equipment
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Severity
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Reported by
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Created
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                  <td className="py-3 px-3">
                    <p className="text-xs font-black tracking-[0.2em] uppercase text-[#4a5a67]">
                      {ticket.ticket_code}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs line-clamp-2">
                      {ticket.description}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    {ticket.equipment ? (
                      <div>
                        <p className="text-sm font-bold text-[#4a5a67]">
                          {ticket.equipment.name || `Equipment #${ticket.equipment.id}`}
                        </p>
                        {ticket.equipment.asset_tag && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {ticket.equipment.asset_tag}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Unknown equipment</p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ' +
                        severityClass(ticket.severity)
                      }
                    >
                      {ticket.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ' +
                        badgeClass(ticket.status)
                      }
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-sm font-bold text-[#4a5a67]">{ticket.reported_by}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{ticket.issue_type}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(ticket, 'open')}
                        disabled={updatingId === ticket.id || ticket.status === 'open'}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(ticket, 'in_progress')}
                        disabled={updatingId === ticket.id || ticket.status === 'in_progress'}
                        className="px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        In progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(ticket, 'resolved')}
                        disabled={updatingId === ticket.id || ticket.status === 'resolved'}
                        className="px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Resolved
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-400">
                    No support tickets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            {total > 0 ? (
              <span>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total} tickets
              </span>
            ) : (
              <span>Showing 0 of 0 tickets</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminTickets;
