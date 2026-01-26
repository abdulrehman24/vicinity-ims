import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useInventory } from '../../context/InventoryContext';

const { FiPlus, FiTrash2, FiEdit2, FiX } = FiIcons;

function AdminBundles() {
  const { equipment } = useInventory();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', description: '', items: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEditing = form.id !== null;

  const loadBundles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/bundles');
      setBundles(response.data);
    } catch (e) {
      toast.error('Failed to load bundles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBundles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.items.length === 0) {
        toast.error('Please add at least one item to the bundle');
        return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      items: form.items.map(item => ({
        equipment_id: item.equipment_id,
        quantity: parseInt(item.quantity)
      }))
    };

    try {
      if (isEditing) {
        await axios.put(`/api/admin/bundles/${form.id}`, payload);
        toast.success('Bundle updated');
      } else {
        await axios.post('/api/admin/bundles', payload);
        toast.success('Bundle created');
      }
      setForm({ id: null, name: '', description: '', items: [] });
      setIsModalOpen(false);
      loadBundles();
    } catch (e) {
      toast.error('Failed to save bundle');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (bundle) => {
    setForm({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description || '',
      items: bundle.items.map(i => ({
          equipment_id: i.equipment_id,
          quantity: i.quantity,
          tempId: Date.now() + Math.random() // for key
      }))
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (bundle) => {
    if (!window.confirm(`Delete bundle "${bundle.name}"?`)) return;
    try {
      await axios.delete(`/api/admin/bundles/${bundle.id}`);
      toast.success('Bundle deleted');
      loadBundles();
    } catch (e) {
      toast.error('Failed to delete bundle');
    }
  };
  
  const addItem = () => {
      setForm(prev => ({
          ...prev,
          items: [...prev.items, { equipment_id: '', quantity: 1, tempId: Date.now() }]
      }));
  };

  const updateItem = (index, field, value) => {
      setForm(prev => {
          const newItems = [...prev.items];
          newItems[index] = { ...newItems[index], [field]: value };
          return { ...prev, items: newItems };
      });
  };

  const removeItem = (index) => {
      setForm(prev => {
          const newItems = [...prev.items];
          newItems.splice(index, 1);
          return { ...prev, items: newItems };
      });
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#fcfaf9] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#4a5a67]">Bundles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage equipment bundles</p>
        </div>
        <button
          onClick={() => {
              setForm({ id: null, name: '', description: '', items: [] });
              setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-[#4a5a67] text-white rounded-xl hover:bg-[#3d4b56] transition-all shadow-sm"
        >
          <SafeIcon icon={FiPlus} />
          <span className="text-sm font-bold">New Bundle</span>
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map(bundle => (
            <div key={bundle.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 group">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-[#4a5a67] text-lg">{bundle.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{bundle.items?.length || 0} items</p>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(bundle)} className="p-2 text-gray-400 hover:text-[#4a5a67] hover:bg-gray-50 rounded-lg">
                            <SafeIcon icon={FiEdit2} />
                        </button>
                        <button onClick={() => handleDelete(bundle)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <SafeIcon icon={FiTrash2} />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{bundle.description}</p>
                <div className="space-y-2">
                    {bundle.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex justify-between">
                            <span>{item.equipment?.name || 'Unknown Item'}</span>
                            <span className="font-bold">x{item.quantity}</span>
                        </div>
                    ))}
                    {bundle.items?.length > 3 && (
                        <div className="text-xs text-gray-400 italic">+{bundle.items.length - 3} more...</div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-[#4a5a67]">{isEditing ? 'Edit Bundle' : 'New Bundle'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={FiX} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
                <form id="bundle-form" onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bundle Name</label>
                        <input 
                            type="text" 
                            required
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#ebc1b6] focus:ring-0 transition-all font-medium text-[#4a5a67]"
                            placeholder="e.g., Camera Kit A"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                        <textarea 
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#ebc1b6] focus:ring-0 transition-all font-medium text-[#4a5a67]"
                            placeholder="Bundle contents description..."
                            rows="3"
                        />
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Items</label>
                             <button type="button" onClick={addItem} className="text-xs font-bold text-[#ebc1b6] hover:text-[#d4a092]">
                                + Add Item
                             </button>
                        </div>
                        <div className="space-y-3">
                            {form.items.map((item, index) => (
                                <div key={item.tempId || index} className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <select 
                                            value={item.equipment_id}
                                            onChange={e => updateItem(index, 'equipment_id', e.target.value)}
                                            required
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#ebc1b6] focus:ring-0 transition-all text-sm"
                                        >
                                            <option value="">Select Equipment...</option>
                                            {equipment.map(eq => {
                                                const isDisabled = eq.status === 'maintenance' || eq.status === 'decommissioned';
                                                return (
                                                    <option 
                                                        key={eq.id} 
                                                        value={eq.id} 
                                                        disabled={isDisabled}
                                                        className={isDisabled ? 'text-gray-400 bg-gray-100' : ''}
                                                    >
                                                        {eq.name} {isDisabled ? `[${eq.status}]` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <input 
                                            type="number"
                                            min="1"
                                            required
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#ebc1b6] focus:ring-0 transition-all text-sm"
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-gray-400 hover:text-red-500">
                                        <SafeIcon icon={FiTrash2} />
                                    </button>
                                </div>
                            ))}
                            {form.items.length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                                    No items added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-200 transition-all"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    form="bundle-form"
                    disabled={saving}
                    className="px-6 py-2 rounded-xl bg-[#4a5a67] text-white font-bold hover:bg-[#3d4b56] transition-all disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Bundle'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBundles;
