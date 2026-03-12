
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const RecommissionModal = ({ isOpen, onClose, onSubmit, equipment }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen]);

  if (!equipment) return null;

  const isMaintenance = equipment.status === 'maintenance';
  const maxQuantity = isMaintenance ? (equipment.maintenanceQuantity || 0) : (equipment.decommissionedQuantity || 0);
  const actionLabel = isMaintenance ? 'Unrepair' : 'Recommission';
  const themeColor = isMaintenance ? 'bg-blue-500' : 'bg-green-500';
  const subTitle = isMaintenance ? 'Return units from repair to active fleet' : 'Re-activate decommissioned units';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(quantity);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#4a5a67]/90 dark:bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${themeColor} p-8 text-center text-white relative`}>
              <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <SafeIcon icon={FiX} />
                </button>
              </div>
              <div className="inline-flex p-4 bg-white/20 rounded-2xl mb-4 shadow-lg">
                <SafeIcon icon={FiCheck} className="text-2xl text-white" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest">{actionLabel} Equipment</h2>
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mt-1">{subTitle}</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                {equipment.image && (
                  <img src={equipment.image} className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-800" alt="" />
                )}
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Asset Details</p>
                  <h4 className="text-sm font-bold text-[#4a5a67] dark:text-[#ebc1b6]">{equipment.name}</h4>
                  <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400">{equipment.serialNumber}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label htmlFor="quantity" className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    Quantity to {actionLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value, 10) || 1)))}
                      min="1"
                      max={maxQuantity}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6]"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 ml-1">
                    You can {isMaintenance ? 'restore' : 'recommission'} up to {maxQuantity} items.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all ${themeColor} shadow-blue-200 dark:shadow-none hover:brightness-110`}
                  >
                    {actionLabel}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RecommissionModal;
