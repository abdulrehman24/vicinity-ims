import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUserPlus, FiX, FiMail, FiUsers, FiCheck } = FiIcons;

function CollaboratorList({ collaborators = [], onAdd, onRemove, isEditable = true }) {
  const [email, setEmail] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!email) return;
    onAdd(email);
    setEmail('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiUsers} className="text-[#ebc1b6]" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Collaborators</h3>
        </div>
        <span className="text-[10px] font-bold text-[#4a5a67] bg-gray-100 px-2 py-0.5 rounded-full">
          {collaborators.length} Members
        </span>
      </div>

      {isEditable && (
        <form onSubmit={handleAdd} className="flex space-x-2">
          <div className="relative flex-1">
            <SafeIcon icon={FiMail} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kevin@vicinity.studio"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-[11px] font-bold text-[#4a5a67] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!email}
            className="p-2 bg-[#4a5a67] text-[#ebc1b6] rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
          >
            <SafeIcon icon={FiUserPlus} />
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {collaborators.map((collab) => (
            <motion.div
              key={collab}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm"
            >
              <div className="w-4 h-4 rounded-full bg-[#ebc1b6] flex items-center justify-center">
                <span className="text-[8px] font-black text-[#4a5a67] uppercase">{collab[0]}</span>
              </div>
              <span className="text-[10px] font-bold text-[#4a5a67] truncate max-w-[120px]">{collab}</span>
              {isEditable && (
                <button
                  onClick={() => onRemove(collab)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <SafeIcon icon={FiX} className="text-[10px]" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {collaborators.length === 0 && (
          <p className="text-[10px] text-gray-400 italic py-2">No collaborators invited yet</p>
        )}
      </div>
    </div>
  );
}

export default CollaboratorList;