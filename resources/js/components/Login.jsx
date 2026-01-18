import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const { FiCamera, FiZap, FiShieldOff } = FiIcons;

function Login() {
  const [loading, setLoading] = useState(false);
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

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = '/auth/google';
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
        <div className="bg-[#4a5a67] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ebc1b6] opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#ebc1b6] opacity-10 rounded-full -ml-12 -mb-12" />
          
          <div className="inline-flex p-4 bg-[#ebc1b6] rounded-2xl mb-6 shadow-lg">
            <SafeIcon icon={FiCamera} className="text-3xl text-[#4a5a67]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">VICINITY IMS</h1>
          <p className="text-[#ebc1b6] text-xs font-bold uppercase tracking-[0.3em]">Inventory Control</p>
        </div>

        <div className="p-10 text-center">
          <h2 className="text-[#4a5a67] text-xl font-bold mb-8">System Authentication</h2>
          
          <div className="space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-100 py-4 rounded-2xl hover:border-[#ebc1b6] hover:bg-gray-50 transition-all group shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-bold text-gray-600 group-hover:text-[#4a5a67]">Sign in with Google</span>
            </button>
          </div>

          <p className="mt-8 text-[10px] text-gray-400 uppercase font-black tracking-widest">
            Restricted Access • Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
