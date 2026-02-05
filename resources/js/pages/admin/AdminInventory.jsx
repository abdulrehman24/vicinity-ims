import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { equipmentTypes, businessUnits } from '../../data/inventoryData';
import { useInventory } from '../../context/InventoryContext';

const { FiPlus, FiTrash2, FiEdit2, FiSearch, FiImage, FiX, FiUpload, FiCamera, FiHash, FiMapPin, FiCheck, FiAlertTriangle, FiTool } = FiIcons;

function InputField({ label, icon, value, onChange, placeholder, required = false, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
      <div className="relative">
        <SafeIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        <input 
          type={type} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          required={required} 
          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]" 
        />
      </div>
    </div>
  );
}

function NewEntryModal({ onClose, onSubmit, initialData, categories = [] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    name: '',
    category: categories[0] || '',
    equipmentType: equipmentTypes[0] || '',
    serialNumber: '',
    status: 'available',
    businessUnit: businessUnits[0] || '',
    condition: 'excellent',
    location: '',
    image: '',
    imageFile: null,
    purchaseDate: new Date().toISOString().split('T')[0],
    remarks: '',
    totalQuantity: 1
  });

  const isEditing = !!initialData;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        initialQuality: 0.7,
      };

      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onload = () => setFormData(prev => ({ 
          ...prev, 
          image: reader.result,
          imageFile: compressedFile 
        }));
        reader.readAsDataURL(compressedFile);
        toast.success(`Image compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.error('Image compression failed:', error);
        toast.error('Image compression failed, using original file');
        const reader = new FileReader();
        reader.onload = () => setFormData(prev => ({ 
          ...prev, 
          image: reader.result,
          imageFile: file 
        }));
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-[#4a5a67] p-6 flex justify-between items-center text-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#ebc1b6] rounded-lg">
              <SafeIcon icon={isEditing ? FiEdit2 : FiPlus} className="text-[#4a5a67]" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight">{isEditing ? 'Edit Asset' : 'Register New Asset'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <SafeIcon icon={FiX} className="text-xl text-[#ebc1b6]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Visual</label>
              <div {...getRootProps()} className={`relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${isDragActive ? 'border-[#ebc1b6] bg-[#ebc1b611]' : 'border-gray-100 hover:border-[#ebc1b6] bg-gray-50'}`}>
                <input {...getInputProps()} />
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <SafeIcon icon={FiUpload} className="text-4xl text-[#ebc1b6] mb-4 mx-auto" />
                    <p className="text-sm font-bold text-[#4a5a67]">Drop asset photo here</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <InputField label="Equipment Name" icon={FiCamera} required value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Sony FX6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <InputField label="Serial Number" icon={FiHash} value={formData.serialNumber} onChange={(v) => setFormData({ ...formData, serialNumber: v })} placeholder="SN-XXXX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    value={formData.equipmentType}
                    onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Unit</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    value={formData.businessUnit}
                    onChange={(e) => setFormData({ ...formData, businessUnit: e.target.value })}
                  >
                    <option value="">Select Unit</option>
                    {businessUnits.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <InputField label="Quantity" icon={FiHash} value={formData.totalQuantity} onChange={(v) => setFormData({ ...formData, totalQuantity: parseInt(v) || 1 })} placeholder="1" type="number" />
                 <InputField label="Location" icon={FiMapPin} value={formData.location} onChange={(v) => setFormData({ ...formData, location: v })} placeholder="e.g. Studio A" />
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    >
                      <option value="available">Available</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="decommissioned">Decommissioned</option>
                      <option value="missing">Missing</option>
                    </select>
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condition</label>
                    <select
                      value={formData.condition}
                      onChange={e => setFormData({...formData, condition: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-[#ebc1b6] rounded-xl outline-none font-bold text-sm text-[#4a5a67]"
                    >
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="broken">Broken</option>
                    </select>
                  </div>
               </div>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`bg-[#4a5a67] text-[#ebc1b6] px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            > 
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Equipment' : 'Register Equipment'}</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AdminInventory() {
  const { categories } = useInventory();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Pagination & Filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/equipment');
      setInventory(response.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filter and Paginate
  const filteredData = useMemo(() => {
    if (!search) return inventory;
    const lowerSearch = search.toLowerCase();
    return inventory.filter(item => 
      item.name?.toLowerCase().includes(lowerSearch) ||
      item.serialNumber?.toLowerCase().includes(lowerSearch) ||
      item.category?.toLowerCase().includes(lowerSearch) ||
      item.businessUnit?.toLowerCase().includes(lowerSearch)
    );
  }, [inventory, search]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const handleSave = async (formDataObj) => {
    const isEditing = !!formDataObj.id;
    const formData = new FormData();
    
    // Explicitly append fields to FormData
    formData.append('name', formDataObj.name);
    formData.append('category', formDataObj.category);
    formData.append('equipmentType', formDataObj.equipmentType || '');
    formData.append('serialNumber', formDataObj.serialNumber || '');
    formData.append('status', formDataObj.status);
    formData.append('businessUnit', formDataObj.businessUnit);
    formData.append('condition', formDataObj.condition);
    formData.append('location', formDataObj.location || '');
    formData.append('purchaseDate', formDataObj.purchaseDate || '');
    formData.append('remarks', formDataObj.remarks || '');
    formData.append('totalQuantity', formDataObj.totalQuantity || 1);

    if (formDataObj.imageFile) {
      formData.append('image', formDataObj.imageFile);
    }

    if (isEditing) {
      formData.append('_method', 'PUT');
    }

    try {
      if (isEditing) {
        await axios.post(`/equipment/${formDataObj.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Item updated');
        setEditingItem(null);
      } else {
        await axios.post('/equipment', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Item created');
        setIsModalOpen(false);
      }
      loadInventory();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save item');
      throw e; // Propagate error to Modal to stop loading state
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await axios.delete(`/equipment/${item.id}`);
      toast.success('Item deleted');
      loadInventory();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete item');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Inventory Management</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
        >
          <SafeIcon icon={FiPlus} />
          <span>Add Item</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {filteredData.length} Items Found
          </p>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search..."
                className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-[#4a5a67] bg-gray-50 focus:bg-white focus:border-[#ebc1b6] outline-none w-64"
              />
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="px-2 py-2 rounded-lg border border-gray-200 text-xs uppercase tracking-widest bg-gray-50 text-gray-500 focus:bg-white focus:border-[#ebc1b6] outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name / Serial</th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Business Unit</th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="py-3 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : paginatedData.length === 0 ? (
                 <tr><td colSpan="6" className="text-center py-8 text-gray-400">No items found</td></tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-3 align-middle">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <SafeIcon icon={FiImage} className="text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <p className="font-bold text-[#4a5a67]">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.serialNumber || 'No Serial'}</p>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <span className="text-xs text-gray-500">{item.businessUnit}</span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                       <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                         item.status === 'available' ? 'bg-green-100 text-green-700' :
                         item.status === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                         item.status === 'decommissioned' ? 'bg-red-100 text-red-700' :
                         'bg-blue-100 text-blue-700'
                       }`}>
                         {item.status}
                       </span>
                    </td>
                    <td className="py-3 px-3 align-middle text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 rounded-lg text-gray-400 hover:text-[#4a5a67] hover:bg-gray-100 transition-colors"
                        >
                          <SafeIcon icon={FiEdit2} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <SafeIcon icon={FiTrash2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewEntryModal 
             onClose={() => setIsModalOpen(false)} 
             onSubmit={handleSave} 
             categories={categories}
          />
        )}
        {editingItem && (
          <NewEntryModal 
             initialData={editingItem}
             onClose={() => setEditingItem(null)} 
             onSubmit={handleSave} 
             categories={categories}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminInventory;
