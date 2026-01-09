import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiShield, FiLock, FiSmartphone, FiX, FiCheck, FiArrowRight, FiFastForward } = FiIcons;

function AdminAuthModal({ isOpen, onClose, onVerified }) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === '1234') {
      setLoading(true);
      setTimeout(() => {
        setStep(2);
        setLoading(false);
        toast.success("Verification code sent to your registered device");
      }, 800);
    } else {
      toast.error("Incorrect administrative password");
    }
  };

  const handleCodeChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`).focus();
    }
  };

  const handleVerify2FA = () => {
    const finalCode = code.join('');
    if (finalCode === '123456') {
      completeVerification();
    } else {
      toast.error("Invalid verification code");
    }
  };

  const completeVerification = () => {
    setLoading(true);
    setTimeout(() => {
      onVerified();
      toast.success("Admin privileges granted");
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#4a5a67]/90 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden" >
            <div className="bg-[#4a5a67] p-8 text-center text-white relative">
              <div className="absolute top-4 right-4">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <SafeIcon icon={FiX} />
                </button>
              </div>
              <div className="inline-flex p-4 bg-[#ebc1b6] rounded-2xl mb-4 shadow-lg">
                <SafeIcon icon={FiShield} className="text-2xl text-[#4a5a67]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest">Elevate Access</h2>
              <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">Admin Verification Required</p>
            </div>
            <div className="p-8">
              {step === 1 ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Password (1234)</label>
                    <div className="relative">
                      <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-2xl outline-none transition-all font-bold text-[#4a5a67]" placeholder="••••" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#4a5a67] text-[#ebc1b6] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2" >
                    {loading ? <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent animate-spin rounded-full" /> : (
                      <>
                        <span>Verify Identity</span>
                        <SafeIcon icon={FiArrowRight} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 text-[#4a5a67] mb-2">
                      <SafeIcon icon={FiSmartphone} />
                      <span className="text-xs font-bold">Code sent to +65 •••• 1234</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Please enter 123456 or bypass below</p>
                  </div>
                  <div className="flex justify-between gap-2">
                    {code.map((digit, idx) => (
                      <input key={idx} id={`code-${idx}`} type="text" maxLength={1} value={digit} onChange={(e) => handleCodeChange(idx, e.target.value)} className="w-12 h-14 bg-gray-50 border border-transparent focus:border-[#ebc1b6] focus:bg-white rounded-xl text-center text-xl font-black text-[#4a5a67] outline-none transition-all" />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <button onClick={handleVerify2FA} disabled={loading || code.some(d => !d)} className="w-full bg-[#4a5a67] text-[#ebc1b6] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-30" >
                      {loading ? <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent animate-spin rounded-full mx-auto" /> : "Complete 2FA Challenge"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AdminAuthModal;