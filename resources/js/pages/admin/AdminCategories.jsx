import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiPlus, FiTrash2, FiEdit2 } = FiIcons;

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ id: null, name: '', description: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEditing = form.id !== null;

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/categories');
      setCategories(response.data.data || []);
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: true,
    };

    try {
      if (isEditing) {
        await axios.put(`/api/admin/categories/${form.id}`, payload);
        toast.success('Category updated');
      } else {
        await axios.post('/api/admin/categories', payload);
        toast.success('Category created');
      }
      setForm({ id: null, name: '', description: '' });
      loadCategories();
    } catch (e) {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setDeletingId(category.id);
    try {
      await axios.delete(`/api/admin/categories/${category.id}`);
      toast.success('Category deleted');
      loadCategories();
    } catch (e) {
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Categories</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ id: null, name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
        >
          <SafeIcon icon={FiPlus} />
          <span>Add Category</span>
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Existing Categories
          </p>
          {loading && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Loading…
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Name
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Description
                </th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-3 align-top">
                    <p className="text-sm font-bold text-[#4a5a67]">{category.name}</p>
                  </td>
                  <td className="py-3 px-3 align-top">
                    {category.description ? (
                      <p className="text-xs text-gray-400 max-w-md">{category.description}</p>
                    ) : (
                      <p className="text-[11px] text-gray-300 italic">No description</p>
                    )}
                  </td>
                  <td className="py-3 px-3 align-top">
                    <div className="flex justify-end items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(category)}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#4a5a67] hover:bg-gray-100 transition-colors"
                      >
                        <SafeIcon icon={FiEdit2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        disabled={deletingId === category.id}
                        className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        <SafeIcon icon={FiTrash2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-xs text-gray-400">
                    No categories yet. Use the Add Category button to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-sm"
            onClick={() => {
              if (!saving) {
                setIsModalOpen(false);
                setForm({ id: null, name: '', description: '' });
              }
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#4a5a67] px-6 py-4 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ebc1b6]">
                  {isEditing ? 'Edit Category' : 'New Category'}
                </p>
                <h2 className="text-lg font-bold">
                  {isEditing ? 'Update inventory category' : 'Create inventory category'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setIsModalOpen(false);
                    setForm({ id: null, name: '', description: '' });
                  }
                }}
                className="text-[#ebc1b6] hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Name (e.g. Camera Body)"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm font-bold text-[#4a5a67]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67] h-24 resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      setIsModalOpen(false);
                      setForm({ id: null, name: '', description: '' });
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving…' : isEditing ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCategories;
