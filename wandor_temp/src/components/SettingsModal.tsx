import React, { useState, useEffect } from 'react';
import { X, Key, Check } from 'lucide-react';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('wandor_gemini_key');
    if (savedKey) setApiKey(savedKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('wandor_gemini_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#FAF6F0] rounded-[28px] border border-white p-7 sm:p-8 shadow-2xl">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-stone-500 hover:text-black rounded-full hover:bg-stone-200/60 transition-colors"><X className="w-5 h-5" /></button>
        <div className="mb-5">
          <h3 className="font-heading text-xl font-bold text-stone-900 flex items-center gap-2"><Key className="w-5 h-5" /> Settings</h3>
          <p className="text-sm text-stone-600 mt-1">Configure your Gemini API key to generate real travel itineraries anywhere in the world.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">Gemini API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." className="w-full text-sm px-3.5 py-2.5 bg-white/95 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900 mb-4" />
        </div>
        <button onClick={handleSave} className="w-full bg-[#121212] hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
          {saved ? <><Check className="w-4 h-4"/> Saved</> : 'Save Key'}
        </button>
      </div>
    </div>
  );
};
