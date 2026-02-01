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

  const [auditInterval, setAuditInterval] = useState(6);
  const [auditNextDate, setAuditNextDate] = useState('');
  const [auditSaving, setAuditSaving] = useState(false);

  const [stockTakeEnabled, setStockTakeEnabled] = useState(false);
  const [stockTakeDaysBefore, setStockTakeDaysBefore] = useState(30);
  const [stockTakeDaysOverdue, setStockTakeDaysOverdue] = useState(3);
  const [stockTakeFrequency, setStockTakeFrequency] = useState('weekly');
  const [stockTakeEmails, setStockTakeEmails] = useState('');
  const [stockTakeSaving, setStockTakeSaving] = useState(false);

  const [notifyCreator, setNotifyCreator] = useState(true);
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [notifyEmails, setNotifyEmails] = useState('');
  const [notifySaving, setNotifySaving] = useState(false);

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

        const auditRes = await axios.get('/api/admin/audit-settings');
        if (auditRes.data) {
          setAuditInterval(auditRes.data.audit_interval_months || 6);
          setAuditNextDate(auditRes.data.audit_next_date || '');
        }

        const stockTakeRes = await axios.get('/api/admin/stock-take-settings');
        if (stockTakeRes.data) {
          setStockTakeEnabled(stockTakeRes.data.stock_take_reminder_enabled);
          setStockTakeDaysBefore(stockTakeRes.data.stock_take_reminder_days_before);
          setStockTakeDaysOverdue(stockTakeRes.data.stock_take_reminder_days_overdue);
          setStockTakeFrequency(stockTakeRes.data.stock_take_reminder_frequency);
          setStockTakeEmails(stockTakeRes.data.stock_take_notify_emails);
        }

        const notifyRes = await axios.get('/api/admin/notification-settings');
        if (notifyRes.data) {
          setNotifyCreator(notifyRes.data.booking_notify_creator);
          setNotifyAdmins(notifyRes.data.booking_notify_admins);
          setNotifyEmails(notifyRes.data.booking_notify_emails || '');
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

  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    setAuditSaving(true);
    try {
      await axios.post('/api/admin/audit-settings', {
        audit_interval_months: auditInterval,
        audit_next_date: auditNextDate || null
      });
      toast.success('Audit settings updated');
    } catch (e) {
      toast.error('Failed to update audit settings');
    } finally {
      setAuditSaving(false);
    }
  };

  const handleStockTakeReminderSubmit = async (e) => {
    e.preventDefault();
    setStockTakeSaving(true);
    try {
      await axios.post('/api/admin/stock-take-settings', {
        stock_take_reminder_enabled: stockTakeEnabled,
        stock_take_reminder_days_before: stockTakeDaysBefore,
        stock_take_reminder_days_overdue: stockTakeDaysOverdue,
        stock_take_reminder_frequency: stockTakeFrequency,
        stock_take_notify_emails: stockTakeEmails
      });
      toast.success('Stock take reminder settings updated');
    } catch (e) {
      toast.error('Failed to update stock take reminder settings');
    } finally {
      setStockTakeSaving(false);
    }
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    setNotifySaving(true);
    try {
      await axios.post('/api/admin/notification-settings', {
        booking_notify_creator: notifyCreator,
        booking_notify_admins: notifyAdmins,
        booking_notify_emails: notifyEmails
      });
      toast.success('Notification settings updated');
    } catch (e) {
      toast.error('Failed to update notification settings');
    } finally {
      setNotifySaving(false);
    }
  };

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

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Notifications
              </p>
              <h2 className="text-sm font-bold text-[#4a5a67]">
                Booking Confirmation Recipients
              </h2>
            </div>
          </div>
          <form onSubmit={handleNotifySubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCreator}
                  onChange={(e) => setNotifyCreator(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#ebc1b6] focus:ring-[#ebc1b6]"
                />
                <span className="text-sm font-bold text-[#4a5a67]">Send to Booking Creator</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyAdmins}
                  onChange={(e) => setNotifyAdmins(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#ebc1b6] focus:ring-[#ebc1b6]"
                />
                <span className="text-sm font-bold text-[#4a5a67]">Send to All Admins</span>
              </label>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Additional Email Recipients
              </label>
              <textarea
                value={notifyEmails}
                onChange={(e) => setNotifyEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67] min-h-[80px]"
              />
              <p className="mt-2 text-[11px] text-gray-400">
                Comma-separated list of additional email addresses to receive booking confirmations.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={notifySaving}
                className="px-6 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {notifySaving ? 'Saving…' : 'Save Notification Settings'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Stock Take
              </p>
              <h2 className="text-sm font-bold text-[#4a5a67]">
                Audit Schedule Configuration
              </h2>
            </div>
          </div>
          <form onSubmit={handleAuditSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Audit Interval (Months)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={auditInterval}
                onChange={(e) => setAuditInterval(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
              />
              <p className="mt-2 text-[11px] text-gray-400">
                Automatically schedule the next audit this many months after the last completed stock take.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Next Audit Date Override (Optional)
              </label>
              <input
                type="date"
                value={auditNextDate}
                onChange={(e) => setAuditNextDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
              />
              <p className="mt-2 text-[11px] text-gray-400">
                Set a specific date for the next audit. This overrides the interval calculation. Leave empty to use the interval.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={auditSaving}
                className="px-6 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {auditSaving ? 'Saving…' : 'Save Audit Settings'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Stock Take
              </p>
              <h2 className="text-sm font-bold text-[#4a5a67]">
                Reminder Notifications
              </h2>
            </div>
          </div>
          <form onSubmit={handleStockTakeReminderSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stockTakeEnabled}
                  onChange={(e) => setStockTakeEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#ebc1b6] focus:ring-[#ebc1b6]"
                />
                <span className="text-sm font-bold text-[#4a5a67]">Enable Reminders</span>
              </label>
            </div>

            {stockTakeEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Remind Before (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={stockTakeDaysBefore}
                    onChange={(e) => setStockTakeDaysBefore(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
                  />
                  <p className="mt-2 text-[11px] text-gray-400">
                    Send reminders this many days before the audit is due.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Remind After (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={stockTakeDaysOverdue}
                    onChange={(e) => setStockTakeDaysOverdue(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
                  />
                  <p className="mt-2 text-[11px] text-gray-400">
                    Send reminders this many days after the audit is overdue.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Reminder Frequency
                  </label>
                  <select
                    value={stockTakeFrequency}
                    onChange={(e) => setStockTakeFrequency(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                  <p className="mt-2 text-[11px] text-gray-400">
                    How often to repeat the reminder within the active window.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Additional Recipients
                  </label>
                  <input
                    type="text"
                    value={stockTakeEmails}
                    onChange={(e) => setStockTakeEmails(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-[#ebc1b6] rounded-xl outline-none text-sm text-[#4a5a67]"
                  />
                  <p className="mt-2 text-[11px] text-gray-400">
                    Comma-separated emails. Admins are included by default.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={stockTakeSaving}
                className="px-6 py-2 rounded-xl bg-[#4a5a67] text-[#ebc1b6] text-xs font-black uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {stockTakeSaving ? 'Saving…' : 'Save Reminder Settings'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AdminSettings;
