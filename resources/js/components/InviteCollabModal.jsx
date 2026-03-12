
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMail, FiLink, FiCopy, FiCheck, FiShare2 } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import SafeIcon from '../common/SafeIcon';

const InviteCollabModal = ({ isOpen, onClose, bookingId, projectName }) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    try {
      const response = await axios.post(`/bookings/${bookingId}/invite`, { email });
      setGeneratedLink(response.data.link);
      toast.success("Invitation sent successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setEmail('');
    setGeneratedLink('');
    setCopied(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-[#4a5a67]/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#4a5a67] p-8 text-center text-white relative">
              <div className="absolute top-4 right-4">
                <button onClick={resetAndClose} className="text-white/40 hover:text-white transition-colors">
                  <SafeIcon icon={FiX} />
                </button>
              </div>
              <div className="inline-flex p-4 bg-[#ebc1b6] rounded-2xl mb-4 shadow-lg">
                <SafeIcon icon={FiShare2} className="text-2xl text-[#4a5a67]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest">External Collaboration</h2>
              <p className="text-[10px] font-bold text-[#ebc1b6] uppercase tracking-[0.2em] mt-1">Invite Guest Editor</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 transition-colors">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Project</p>
                <h4 className="text-sm font-bold text-[#4a5a67] dark:text-[#ebc1b6] mt-1 uppercase">{projectName}</h4>
              </div>

              {!generatedLink ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Collaborator Email</label>
                    <div className="relative">
                      <SafeIcon icon={FiMail} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-[#ebc1b6] rounded-2xl outline-none font-bold text-sm text-[#4a5a67] dark:text-[#ebc1b6] transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSending || !email}
                    className="w-full py-4 bg-[#4a5a67] dark:bg-slate-900 text-[#ebc1b6] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSending ? "Generating Secure Link..." : "Send Secure Invitation"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                      <SafeIcon icon={FiCheck} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Link Generated</span>
                    </div>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 font-medium">
                      Invite sent to <b>{email}</b>. You can also copy the link below.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      readOnly
                      value={generatedLink}
                      className="w-full pl-4 pr-12 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl font-bold text-xs text-[#4a5a67] dark:text-[#ebc1b6] outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-slate-800 text-[#4a5a67] dark:text-[#ebc1b6] rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                    >
                      <SafeIcon icon={copied ? FiCheck : FiCopy} />
                    </button>
                  </div>

                  <p className="text-[9px] text-gray-400 dark:text-slate-500 text-center uppercase tracking-widest font-bold">
                    Link expires 24h after shoot end date
                  </p>

                  <button
                    onClick={resetAndClose}
                    className="w-full py-4 bg-gray-100 dark:bg-slate-900 text-[#4a5a67] dark:text-[#ebc1b6] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InviteCollabModal;
