import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const currentUserId =
    typeof window !== 'undefined' && window.user && window.user.id ? window.user.id : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.user-actions-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/users', {
        params: {
          page,
          length: pageSize,
          search: search || undefined,
        },
      });
      const payload = response.data || {};
      const rows = payload.data || [];
      setUsers(rows);
      const totalRecords = payload.total ?? rows.length;
      setTotal(totalRecords);
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const roleLabel = (value) => {
    if (value >= 2) {
      return 'Super admin';
    }
    if (value === 1) {
      return 'Admin';
    }
    return 'User';
  };

  const roleClass = (value) => {
    if (value >= 2) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (value === 1) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const handleRoleChange = async (user, isAdmin) => {
    const target = isAdmin ? 1 : 0;
    if (user.is_admin === target) {
      return;
    }
    if (user.is_admin >= 2 || user.id === currentUserId) {
      return;
    }
    setUpdatingId(user.id);
    try {
      const response = await axios.patch(`/api/admin/users/${user.id}/role`, {
        is_admin: target,
      });
      const updated = response.data || {};
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, is_admin: updated.is_admin } : u)),
      );
      toast.success(
        `User ${user.email} is now ${target === 1 ? 'an admin' : 'a regular user'}`,
      );
    } catch (e) {
      toast.error('Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (user, newStatus) => {
    if (user.is_approved === newStatus) return;
    setUpdatingId(user.id);
    try {
      const response = await axios.patch(`/api/admin/users/${user.id}/approve`, {
        is_approved: newStatus,
      });
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, is_approved: newStatus } : u)),
      );
      toast.success(`User ${user.email} ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast.error('Failed to update user status');
    } finally {
      setUpdatingId(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Users</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            User accounts
          </p>
          <div className="flex items-center space-x-3">
            {loading && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Loading…
              </p>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by name or email…"
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-[#4a5a67] bg-gray-50 focus:bg-white focus:border-[#ebc1b6] outline-none"
            />
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
                  Name
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Email
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Role
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isProtected = user.is_admin >= 2 || user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 align-top"
                  >
                    <td className="py-3 px-3">
                      <p className="text-sm font-bold text-[#4a5a67]">
                        {user.name || '(no name)'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">#{user.id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-sm text-[#4a5a67]">{user.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={
                          'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ' +
                          roleClass(user.is_admin)
                        }
                      >
                        {roleLabel(user.is_admin)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                         {user.is_approved ? (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-green-100 text-green-800 border-green-200">
                                 Active
                             </span>
                         ) : (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-100 text-red-800 border-red-200">
                                 Pending
                             </span>
                         )}
                    </td>
                    <td className="py-3 px-3 text-right relative user-actions-menu">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-three-dots-vertical" viewBox="0 0 16 16">
                          <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                        </svg>
                      </button>

                      {openMenuId === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-left">
                          {!user.is_approved ? (
                            <button
                              onClick={() => handleStatusChange(user, true)}
                              disabled={updatingId === user.id}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-green-700 hover:bg-green-50 uppercase tracking-wider flex items-center space-x-2"
                            >
                                <span>Activate User</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(user, false)}
                              disabled={updatingId === user.id}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 uppercase tracking-wider flex items-center space-x-2"
                            >
                                <span>Deactivate User</span>
                            </button>
                          )}
                          
                          {user.is_admin === 0 && !isProtected && (
                             <button
                               onClick={() => {
                                 handleRoleChange(user, true);
                                 setOpenMenuId(null);
                               }}
                               disabled={updatingId === user.id}
                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#4a5a67] hover:bg-gray-50 uppercase tracking-wider"
                             >
                               Make Admin
                             </button>
                          )}

                          {user.is_admin === 1 && !isProtected && (
                             <button
                               onClick={() => {
                                 handleRoleChange(user, false);
                                 setOpenMenuId(null);
                               }}
                               disabled={updatingId === user.id}
                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 uppercase tracking-wider"
                             >
                               Remove Admin
                             </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-gray-400">
                    No users found.
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
                {Math.min(page * pageSize, total)} of {total} users
              </span>
            ) : (
              <span>Showing 0 of 0 users</span>
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

export default AdminUsers;

