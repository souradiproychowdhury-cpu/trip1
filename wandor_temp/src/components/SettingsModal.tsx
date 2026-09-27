import React, { useState, useEffect } from 'react';
import { X, Key, Check, MapPin, Plane, Cloud, ExternalLink, Copy, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'vercel'>('keys');
  const [geminiKey, setGeminiKey] = useState('');
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [transitKey, setTransitKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGeminiKey(localStorage.getItem('wandor_gemini_key') || '');
      setGoogleMapsKey(localStorage.getItem('wandor_google_maps_key') || '');
      setTransitKey(localStorage.getItem('wandor_transit_key') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wandor_gemini_key', geminiKey.trim());
      localStorage.setItem('wandor_google_maps_key', googleMapsKey.trim());
      localStorage.setItem('wandor_transit_key', transitKey.trim());
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF6F0] rounded-[28px] border border-white p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-500 hover:text-stone-900 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Key className="w-5 h-5 text-amber-700" />
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
              API Keys &amp; Deployment Settings
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600">
            Configure your AI &amp; map providers for real-time itinerary generation, live flight timings, and turn-by-turn routes.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-stone-200/70 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'keys'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Browser Keys
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vercel'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            Vercel Cloud Setup
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {activeTab === 'keys' ? (
            <>
              {/* Gemini Key */}
              <div className="bg-white/90 p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Gemini AI API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    Get Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900 font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Powers AI itinerary creation, multimodal ticket reading, smart translation &amp; audio trip storytelling.
                </p>
              </div>

              {/* Google Maps API Key */}
              <div className="bg-white/90 p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    Google Maps API Key
                  </label>
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                  >
                    Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={googleMapsKey}
                  onChange={e => setGoogleMapsKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900 font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Powers interactive Google Maps, numbered pins, turn-by-turn route polylines, and satellite imagery.
                </p>
              </div>

              {/* Flight & Transit Timings Key */}
              <div className="bg-white/90 p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-blue-600" />
                    Aviationstack / Flight Timing API Key
                  </label>
                  <a
                    href="https://aviationstack.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                  >
                    Aviationstack <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={transitKey}
                  onChange={e => setTransitKey(e.target.value)}
                  placeholder="Optional (Built-in verified timetable fallback active)"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900 font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Enables live commercial flight tracking. If left blank, Wandor uses verified global flight &amp; train schedules.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full bg-[#121212] hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {saved ? <><Check className="w-4 h-4 text-emerald-400" /> Saved Locally to Browser</> : 'Save Keys'}
              </button>
            </>
          ) : (
            /* Vercel Cloud Instructions */
            <div className="space-y-3.5 text-xs text-stone-700">
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 text-blue-950 flex items-start gap-2.5">
                <Cloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-blue-900">Where to add API Keys in Vercel</p>
                  <p className="mt-1 text-xs text-blue-800 leading-relaxed">
                    By adding environment variables to Vercel, the app works seamlessly for <strong>all visitors</strong> without anyone needing to enter their own keys!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  Step-by-Step Instructions:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-700 leading-relaxed">
                  <li>Open your project at <a href="https://vercel.com/souradiproychowdhury-cpu/trip1" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">vercel.com/souradiproychowdhury-cpu/trip1</a>.</li>
                  <li>Click on the <strong>Settings</strong> tab at the top.</li>
                  <li>In the left sidebar, click on <strong>Environment Variables</strong>.</li>
                  <li>Add each of the variable names below with your key value:</li>
                </ol>
              </div>

              {/* Key Cards for easy copying */}
              <div className="space-y-2 pt-1">
                {[
                  { name: 'GEMINI_API_KEY', desc: 'Google Gemini AI Studio API key (Required for itineraries)', example: 'AIzaSy...' },
                  { name: 'VITE_GOOGLE_MAPS_API_KEY', desc: 'Google Maps JavaScript API key (For interactive map & pins)', example: 'AIzaSy...' },
                  { name: 'AVIATIONSTACK_API_KEY', desc: 'Aviationstack Flight Schedule API key (Optional)', example: '146977...' },
                  { name: 'JWT_SECRET', desc: 'Secret for user auth cookies (e.g., WandorSecretKey2026)', example: 'WandorSecret2026' }
                ].map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                    <div>
                      <div className="font-mono font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-stone-500">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(item.name, item.name)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy variable name"
                    >
                      {copiedKey === item.name ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === item.name ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Important:</strong> After adding or updating variables in Vercel, go to <strong>Deployments</strong> and click <strong>Redeploy</strong> (or push a new commit) for the changes to take effect.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
