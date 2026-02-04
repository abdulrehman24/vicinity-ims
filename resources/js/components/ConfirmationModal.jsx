import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiAlertTriangle, FiX } = FiIcons;

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-[#4a5a67]/90 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden" 
          >
            <div className={`p-8 text-center text-white relative ${isDangerous ? 'bg-red-500' : 'bg-[#4a5a67]'}`}>
              <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <SafeIcon icon={FiX} />
                </button>
              </div>
              <div className={`inline-flex p-4 rounded-2xl mb-4 shadow-lg ${isDangerous ? 'bg-white text-red-500' : 'bg-[#ebc1b6] text-[#4a5a67]'}`}>
                <SafeIcon icon={FiAlertTriangle} className="text-2xl" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
            </div>
            
            <div className="p-8">
              <p className="text-center text-gray-500 font-medium mb-8">
                {message}
              </p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95 ${isDangerous ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4a5a67] hover:bg-[#3d4b55]'}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmationModal;
