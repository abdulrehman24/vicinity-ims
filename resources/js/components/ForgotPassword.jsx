import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Link } from 'react-router-dom';

const { FiLock, FiMail, FiArrowLeft, FiKey, FiCheckCircle } = FiIcons;

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.4);

  useEffect(() => {
    const loadBackground = async () => {
      try {
        const response = await axios.get('/api/login-settings');
        const data = response.data || {};
        if (data.background_url) {
          setBackgroundUrl(data.background_url);
        }
        if (typeof data.background_opacity === 'number') {
          setBackgroundOpacity(data.background_opacity);
        }
      } catch (e) {
        // ignore
      }
    };

    loadBackground();
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/forgot-password/otp', { email });
      toast.success('OTP sent to your email');
      setStep(2);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !password || !passwordConfirmation) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/forgot-password/reset', {
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation
      });
      toast.success('Password reset successfully');
      window.location.href = '/login';
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4a5a67] flex items-center justify-center p-4 relative overflow-hidden">
      {backgroundUrl && (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            opacity: backgroundOpacity,
          }}
        />
      )}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-[#4a5a67] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#ebc1b6] opacity-10 rounded-full -ml-12 -mb-12" />
          
          <div className="inline-flex p-4 bg-[#ebc1b6] rounded-2xl mb-4 shadow-lg">
            <SafeIcon icon={FiLock} className="text-3xl text-[#4a5a67]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter mb-1">Recover Account</h1>
          <p className="text-[#ebc1b6] text-[10px] font-bold uppercase tracking-[0.3em]">
            {step === 1 ? 'Step 1: Verify Identity' : 'Step 2: Secure Account'}
          </p>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="text-left space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <div className="relative">
                    <SafeIcon icon={FiMail} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg-white focus:border-[#ebc1b6] transition-all"
                        placeholder="user@example.com"
                        disabled={loading}
                    />
                </div>
                <p className="text-xs text-gray-400 ml-1">We'll send a 6-digit OTP code to this email.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4a5a67] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#3d4b56] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                    <span>Sending...</span>
                ) : (
                    <>
                        <span>Send Verification Code</span>
                        <SafeIcon icon={FiKey} />
                    </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
               <div className="text-center mb-4">
                  <p className="text-sm text-[#4a5a67] font-bold">Code sent to <span className="text-[#ebc1b6]">{email}</span></p>
                  <button type="button" onClick={() => setStep(1)} className="text-[10px] uppercase tracking-wider text-gray-400 hover:text-[#4a5a67] underline">Change Email</button>
               </div>

              <div className="text-left space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  OTP Code
                </label>
                <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-center text-lg font-bold text-[#4a5a67] tracking-[0.5em] focus:bg-white focus:border-[#ebc1b6] transition-all"
                    placeholder="------"
                    maxLength={6}
                    disabled={loading}
                />
              </div>

              <div className="text-left space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg-white focus:border-[#ebc1b6] transition-all"
                    placeholder="Min 8 characters"
                    disabled={loading}
                />
              </div>

              <div className="text-left space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Confirm Password
                </label>
                <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg-white focus:border-[#ebc1b6] transition-all"
                    placeholder="Retype password"
                    disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4a5a67] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#3d4b56] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-4"
              >
                {loading ? (
                    <span>Reseting...</span>
                ) : (
                    <>
                        <span>Reset Password</span>
                        <SafeIcon icon={FiCheckCircle} />
                    </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <Link to="/login" className="flex items-center justify-center space-x-2 text-gray-400 hover:text-[#4a5a67] transition-colors group">
              <SafeIcon icon={FiArrowLeft} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest">Back to Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
