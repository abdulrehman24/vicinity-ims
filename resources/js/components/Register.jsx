import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Link } from 'react-router-dom';

const { FiCamera } = FiIcons;

function Register() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      }
    };

    loadBackground();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !passwordConfirmation) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/register', { 
        name, 
        email, 
        password, 
        password_confirmation: passwordConfirmation 
      });
      toast.success('Registration successful. Please wait for admin approval.');
      // Redirect to login after short delay
      setTimeout(() => {
          window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
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
            <SafeIcon icon={FiCamera} className="text-3xl text-[#4a5a67]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter mb-2">VICINITY IMS</h1>
          <p className="text-[#ebc1b6] text-xs font-bold uppercase tracking-[0.3em]">New Account</p>
        </div>

        <div className="p-8 text-center">
          <form onSubmit={handleRegister} className="space-y-4 mb-6">
            <div className="text-left space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg-white focus:border-[#ebc1b6]"
                placeholder="John Doe"
                disabled={loading}
              />
            </div>
            <div className="text-left space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg-white focus:border-[#ebc1b6]"
                placeholder="user@example.com"
                disabled={loading}
              />
            </div>
            <div className="text-left space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg:white focus:border-[#ebc1b6]"
                placeholder="••••••••"
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-[#4a5a67] focus:bg:white focus:border-[#ebc1b6]"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#4a5a67] text-[#ebc1b6] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-40 hover:shadow-xl transition-all"
            >
              Register
            </button>
          </form>

          <div className="text-center">
             <Link to="/login" className="text-xs font-bold text-gray-400 hover:text-[#4a5a67] uppercase tracking-wider">
               Already have an account? Sign in
             </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;