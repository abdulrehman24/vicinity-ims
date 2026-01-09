import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const { FiShield, FiLock, FiSmartphone, FiX, FiCheck, FiArrowRight } = FiIcons;

function SecurityModal({ isOpen, onClose, onVerified }) {
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setStep(1);
        setPin('');
        setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;
    
    setLoading(true);
    try {
        await axios.post('/security/validate-pin', { pin });
        toast.success("PIN Verified. Sending OTP...");
        setStep(2);
    } catch (error) {
        toast.error(error.response?.data?.message || "Invalid PIN");
    } finally {
        setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleVerifyOtp = async () => {
    const finalOtp = otp.join('');
    if (finalOtp.length !== 6) {
        toast.error("Please enter complete verification code");
        return;
    }

    setLoading(true);
    try {
        const response = await axios.post('/security/verify-otp', { otp: finalOtp });
        toast.success("Admin access granted");
        onVerified(response.data.admin_level); // Pass back admin level if needed
        onClose();
    } catch (error) {
        toast.error(error.response?.data?.message || "Verification failed");
    } finally {
        setLoading(false);
    }
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
              <h2 className="text-xl font-black uppercase tracking-widest">Security Check</h2>
              <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">
                {step === 1 ? 'Enter Security PIN' : 'Verify Email OTP'}
              </p>
            </div>
            <div className="p-8">
              {step === 1 ? (
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your PIN</label>
                    <div className="relative">
                      <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="password" 
                        autoFocus 
                        value={pin} 
                        onChange={(e) => setPin(e.target.value)} 
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-2xl outline-none transition-all font-bold text-[#4a5a67]" 
                        placeholder="••••" 
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#4a5a67] text-[#ebc1b6] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-all hover:bg-[#3d4b56]" >
                    {loading ? <div className="w-4 h-4 border-2 border-[#ebc1b6] border-t-transparent animate-spin rounded-full" /> : (
                      <>
                        <span>Verify PIN</span>
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
                      <span className="text-xs font-bold">Code sent to your email</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Please check your inbox for the verification code.</p>
                  </div>

                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-12 h-14 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl text-center font-bold text-xl text-[#4a5a67] outline-none transition-all"
                      />
                    ))}
                  </div>

                  <button 
                    onClick={handleVerifyOtp} 
                    disabled={loading}
                    className="w-full bg-[#ebc1b6] text-[#4a5a67] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-all hover:bg-[#e6b2a5]" 
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-[#4a5a67] border-t-transparent animate-spin rounded-full" /> : (
                      <>
                        <span>Verify & Enable Admin</span>
                        <SafeIcon icon={FiCheck} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default SecurityModal;
