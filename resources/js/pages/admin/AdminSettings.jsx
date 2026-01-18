import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function AdminSettings() {
  const [appTitle, setAppTitle] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundOpacity, setBackgroundOpacity] = useState(40);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get('/api/admin/login-settings');
        const data = response.data || {};
        if (data.app_title) {
          setAppTitle(data.app_title);
        }
        if (data.app_favicon_url) {
          setFaviconUrl(data.app_favicon_url);
        }
        if (data.background_url) {
          setBackgroundUrl(data.background_url);
        }
        if (typeof data.background_opacity === 'number') {
          setBackgroundOpacity(Math.round(data.background_opacity * 100));
        }
      } catch (e) {
        toast.error('Failed to load settings');
      } finally {
        //reload location
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      if (appTitle) {
        formData.append('app_title', appTitle);
      }
      if (backgroundFile) {
        formData.append('background_image', backgroundFile);
      } else if (backgroundUrl) {
        formData.append('background_url', backgroundUrl);
      }
      if (backgroundOpacity !== '') {
        formData.append('background_opacity', Number(backgroundOpacity) / 100);
      }
      if (faviconFile) {
        formData.append('favicon_image', faviconFile);
      }

      const response = await axios.post('/api/admin/login-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data || {};
      if (data.app_title) {
        setAppTitle(data.app_title);
      }
      if (data.app_favicon_url) {
        setFaviconUrl(data.app_favicon_url);
      }
      if (data.background_url) {
        setBackgroundUrl(data.background_url);
      }
      setBackgroundFile(null);
      setFaviconFile(null);
      toast.success('Login background updated');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#4a5a67] tracking-tight">Settings</h1>
          <div className="w-10 h-1 bg-[#ebc1b6] rounded-full mt-2" />
        </div>
      </div>
      <div className="grid gap-8">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Login Page
              </p>
              <h2 className="text-sm font-bold text-[#4a5a67]">
                Background image and overlay
              </h2>
            </div>
            {loading && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Loading…
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Application title
              </label>
              <input
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="Vicinity IMS - Equipment Dashboard"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Background image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    setBackgroundFile(file);
                    const url = URL.createObjectURL(file);
                    setBackgroundUrl(url);
                  } else {
                    setBackgroundFile(null);
                  }
                }}
                className="w-full text-sm text-[#4a5a67]"
              />
              <p className="mt-2 text-[11px] text-gray-400">
                Upload an image for the login background. The current image URL is stored
                and used by the login page.
              </p>
              {backgroundUrl && (
                <div className="mt-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Preview
                  </div>
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <div
                      className="w-full h-full bg-center bg-cover"
                      style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Favicon
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    setFaviconFile(file);
                    const url = URL.createObjectURL(file);
                    setFaviconUrl(url);
                  } else {
                    setFaviconFile(null);
                  }
                }}
                className="w-full text-sm text-[#4a5a67]"
              />
              <p className="mt-2 text-[11px] text-gray-400">
                Upload a small square icon. It will be used as the browser tab icon.
              </p>
              {faviconUrl && (
                <div className="mt-4 flex items-center space-x-3">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Preview
                  </div>
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    <div
                      className="w-full h-full bg-center bg-cover"
                      style={{ backgroundImage: `url(${faviconUrl})` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Background opacity
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs font-bold text-[#4a5a67] w-12 text-right">
                  {backgroundOpacity}%
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                0% means only solid color, 100% means fully showing the image.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AdminSettings;
