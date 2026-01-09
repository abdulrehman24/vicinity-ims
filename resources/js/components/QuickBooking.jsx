import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { parseBookingString } from '../utils/bookingParser';
import * as FiIcons from 'react-icons/fi';

const { 
  FiZap, FiCheck, FiAlertCircle, FiCornerDownLeft, 
  FiCalendar, FiHash, FiBox, FiFolder, FiPlus, FiX, FiInfo 
} = FiIcons;

function QuickBooking({ equipment, fuse, onConfirm }) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const [manualProject, setManualProject] = useState('');
  const [manualQuote, setManualQuote] = useState('');
  const [manualDates, setManualDates] = useState([]);
  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    const result = parseBookingString(input, equipment, fuse);
    setParsed(result);
    
    if (!input) {
      setManualProject('');
      setManualQuote('');
      setManualDates([]);
    }
  }, [input, equipment, fuse]);

  const allDates = [...new Set([...(parsed?.dates || []), ...manualDates])].sort();

  const canConfirm = 
    parsed?.equipments.length > 0 && 
    (parsed?.projectTitle || manualProject) && 
    (parsed?.quotationNumber || manualQuote) && 
    (allDates.length > 0);

  const handleAddDate = () => {
    if (dateInput) {
      const [y, m, d] = dateInput.split('-');
      const formatted = `${d}/${m}/${y}`;
      if (!manualDates.includes(formatted)) {
        setManualDates([...manualDates, formatted]);
        setDateInput('');
      }
    }
  };

  const removeManualDate = (date) => {
    setManualDates(manualDates.filter(d => d !== date));
  };

  const handleConfirm = () => {
    if (canConfirm) {
      const finalProject = parsed.projectTitle || manualProject;
      const finalQuote = parsed.quotationNumber || manualQuote;
      
      parsed.equipments.forEach(item => {
        onConfirm({
          equipmentId: item.id,
          equipmentName: item.name,
          shootName: finalProject,
          quotationNumber: finalQuote,
          user: window.user?.name || 'Command User',
          dates: allDates,
          startDate: allDates[0],
          endDate: allDates[allDates.length - 1],
          notes: `Quick Booked [Quote: ${finalQuote}] for ${allDates.length} days`
        });
      });

      setInput('');
      setParsed(null);
      setManualProject('');
      setManualQuote('');
      setManualDates([]);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
      <div className="bg-[#4a5a67] px-6 py-5 flex items-center justify-between text-white">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-[#ebc1b6] rounded-lg shadow-inner">
            <SafeIcon icon={FiZap} className="text-[#4a5a67] text-lg" />
          </div>
          <div>
            <span className="font-bold text-sm uppercase tracking-widest text-white">Command Console</span>
            <p className="text-[10px] text-[#ebc1b6] font-medium leading-relaxed">
              You can type shortcut commands to tag things faster. The format required would be #items #quote #project #dates
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <SafeIcon icon={FiInfo} className="text-[10px] text-[#ebc1b6]" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-white/50">
            Quick book cannot invite a collaborator
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="relative">
          <input 
            type="text" 
            autoFocus
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="#items FX6 #quote QT-102 #project Pepsi #dates tomorrow" 
            className="w-full text-2xl py-6 pl-0 pr-12 border-b-2 border-gray-100 focus:border-[#ebc1b6] outline-none transition-all font-light text-[#4a5a67] placeholder-gray-200" 
          />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <SafeIcon icon={FiCornerDownLeft} className="text-[#ebc1b6] text-xl" />
          </div>
        </div>

        <AnimatePresence>
          {input.length > 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 10 }}
              className="mt-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[#4a5a67]">
                <div className={`p-4 rounded-xl border ${parsed?.equipments.length > 0 ? 'bg-[#ebc1b611] border-[#ebc1b6]' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <SafeIcon icon={FiBox} className={parsed?.equipments.length > 0 ? 'text-[#ebc1b6]' : 'text-gray-300'} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items ({parsed?.equipments.length || 0})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parsed?.equipments.length > 0 ? (
                      parsed.equipments.map(e => (
                        <span key={e.id} className="text-[10px] font-bold bg-[#4a5a67] text-[#ebc1b6] px-2 py-0.5 rounded">{e.name}</span>
                      ))
                    ) : (
                      <span className="text-xs italic text-gray-300">No items detected...</span>
                    )}
                  </div>
                </div>

                <ManualField label="Quote #" parsedValue={parsed?.quotationNumber} manualValue={manualQuote} setManualValue={setManualQuote} icon={FiHash} placeholder="QT-000" />
                <ManualField label="Project" parsedValue={parsed?.projectTitle} manualValue={manualProject} setManualValue={setManualProject} icon={FiFolder} placeholder="Client Name" />

                <div className={`p-4 rounded-xl border transition-all duration-500 ${allDates.length > 0 ? 'bg-[#ebc1b611] border-[#ebc1b6]' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <SafeIcon icon={FiCalendar} className={allDates.length > 0 ? 'text-[#ebc1b6]' : 'text-gray-300'} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2 max-h-20 overflow-y-auto">
                    {allDates.map(date => (
                      <span key={date} className="flex items-center space-x-1 text-[9px] font-bold bg-white border border-[#ebc1b6] text-[#4a5a67] px-1.5 py-0.5 rounded-md">
                        <span>{date}</span>
                        {manualDates.includes(date) && <button onClick={() => removeManualDate(date)} className="hover:text-red-500"><SafeIcon icon={FiX} /></button>}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-1">
                    <input 
                      type="date" 
                      value={dateInput} 
                      onChange={(e) => setDateInput(e.target.value)} 
                      className="flex-1 bg-transparent text-[10px] font-bold text-[#4a5a67] outline-none border-b border-gray-200 focus:border-[#ebc1b6]" 
                    />
                    <button onClick={handleAddDate} disabled={!dateInput} className="p-1 text-[#ebc1b6] hover:text-[#4a5a67] transition-colors disabled:opacity-30">
                      <SafeIcon icon={FiPlus} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-gray-50 gap-4">
                <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase text-gray-400 tracking-widest md:max-w-md">
                  * Quick book creates a primary record only. For complex shoots with team members, use the manual check-out form.
                </div>
                <button 
                  disabled={!canConfirm} 
                  onClick={handleConfirm}
                  className={`w-full md:w-auto px-12 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 ${canConfirm ? 'bg-[#4a5a67] text-[#ebc1b6] hover:bg-[#3d4b55]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ManualField({ label, parsedValue, manualValue, setManualValue, icon, placeholder, type = "text" }) {
  const isActive = !!(parsedValue || manualValue);
  return (
    <div className={`p-4 rounded-xl border transition-all duration-500 ${isActive ? 'bg-[#ebc1b611] border-[#ebc1b6]' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center space-x-2 mb-2">
        <SafeIcon icon={icon} className={isActive ? 'text-[#ebc1b6]' : 'text-gray-300'} />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      {parsedValue ? (
        <p className="text-sm font-bold truncate text-[#4a5a67]">{parsedValue}</p>
      ) : (
        <input 
          type={type} 
          value={manualValue} 
          onChange={(e) => setManualValue(e.target.value)} 
          placeholder={placeholder} 
          className="w-full bg-transparent text-sm font-bold text-[#4a5a67] placeholder-gray-300 outline-none border-b border-transparent focus:border-[#ebc1b6]" 
        />
      )}
    </div>
  );
}

export default QuickBooking;