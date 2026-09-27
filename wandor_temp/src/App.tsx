import React, { useState } from 'react';
import { ScrollBackground } from './components/ScrollBackground';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ItineraryView } from './components/ItineraryView';
import { DiscoverPage } from './components/DiscoverPage';
import { FaqsPage } from './components/FaqsPage';
import { AttachmentModal } from './components/AttachmentModal';
import { AuthModal } from './components/AuthModal';
import { MyTripsView } from './components/MyTripsView';
import { SettingsModal } from './components/SettingsModal';
import { GoogleOAuthProvider } from '@react-oauth/google';
// Removed mockData import
import { TripItinerary, DiscoverTrip } from './types';
import { useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hero' | 'discover' | 'faqs' | 'itinerary' | 'my-trips'>('hero');
  const [prompt, setPrompt] = useState<string>('');
  const [itinerary, setItinerary] = useState<TripItinerary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<{ name: string; summary: string; base64?: string; mimeType?: string } | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [travelersCount, setTravelersCount] = useState<number>(3);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Auto');

  // Welcome voice greeting when the app opens in English, Hindi, and Bengali:
  // "Welcome to Wandor! नमस्कार! वांडोर में आपका स्वागत है। নমস্কার! ওয়ান্ডরে আপনাকে স্বাগতম।"
  const playWelcomeGreeting = (force: boolean = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!force && sessionStorage.getItem('wandor_welcomed_tts')) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const voices = window.speechSynthesis.getVoices();

      // 1. English Utterance
      const uttEn = new SpeechSynthesisUtterance("Welcome to Wandor! Plan your trip in any language.");
      uttEn.lang = 'en-US';
      uttEn.rate = 1.0;
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira')));
      if (enVoice) uttEn.voice = enVoice;

      // 2. Hindi Utterance ("नमस्कार! वांडोर में आपका स्वागत है।")
      const uttHi = new SpeechSynthesisUtterance("नमस्कार! वांडोर में आपका स्वागत है।");
      uttHi.lang = 'hi-IN';
      uttHi.rate = 0.95;
      const hiVoice = voices.find(v => v.lang.startsWith('hi'));
      if (hiVoice) uttHi.voice = hiVoice;

      // 3. Bengali Utterance ("নমস্কার! ওয়ান্ডরে আপনাকে স্বাগতম।")
      const uttBn = new SpeechSynthesisUtterance("নমস্কার! ওয়ান্ডরে আপনাকে স্বাগতম।");
      uttBn.lang = 'bn-IN';
      uttBn.rate = 0.95;
      const bnVoice = voices.find(v => v.lang.startsWith('bn'));
      if (bnVoice) uttBn.voice = bnVoice;

      uttEn.onstart = () => {
        sessionStorage.setItem('wandor_welcomed_tts', 'true');
      };

      // Play sequentially with robust error fallback
      uttEn.onend = () => {
        try { window.speechSynthesis.speak(uttHi); } catch {}
      };
      uttEn.onerror = () => {
        try { window.speechSynthesis.speak(uttHi); } catch {}
      };
      uttHi.onend = () => {
        try { window.speechSynthesis.speak(uttBn); } catch {}
      };
      uttHi.onerror = () => {
        try { window.speechSynthesis.speak(uttBn); } catch {}
      };

      window.speechSynthesis.speak(uttEn);
    } catch (e) {
      console.warn("Welcome TTS error:", e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // 1. Try immediate greeting after page settle
    const timer = setTimeout(() => {
      playWelcomeGreeting(false);
    }, 700);

    // 2. Play on first user gesture (pointerdown/touchstart/click/keydown) if autoplay was blocked by browser
    const handleFirstGesture = () => {
      playWelcomeGreeting(false);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const savedEmail = localStorage.getItem('wandor_user_email');
      if (savedEmail) {
        setUserEmail(savedEmail);
      }
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.email) {
            setUserEmail(data.user.email);
            localStorage.setItem('wandor_user_email', data.user.email);
          }
        }
      } catch (err) {
        console.warn('Could not fetch user session on mount');
      }
    };
    fetchUser();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handlePlanTrip = async () => {
    if (!prompt.trim()) return;

    // Prime speech synthesis within active user gesture
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      try {
        const prime = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(prime);
      } catch {}
    }

    setIsLoading(true);

    try {
      const geminiKey = localStorage.getItem('wandor_gemini_key');
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(geminiKey ? { 'x-gemini-key': geminiKey } : {})
        },
        body: JSON.stringify({
          prompt,
          travelersCount,
          language: selectedLanguage,
          attachmentSummary: attachment?.summary,
          attachmentBase64: attachment?.base64,
          attachmentMimeType: attachment?.mimeType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.itinerary) {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          setItinerary(data.itinerary);
          setActiveTab('itinerary');
          showToast('Itinerary created successfully!');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } else {
          showToast(data.error || 'Failed to generate itinerary. Check your API key.');
          if (!localStorage.getItem('wandor_gemini_key')) {
             setIsSettingsModalOpen(true);
          }
        }
      }
    } catch (error) {
      console.warn('API error:', error);
      showToast('Network error while planning trip.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDiscoverTrip = (trip: DiscoverTrip) => {
    setPrompt(trip.promptText);
    
    // Trigger plan with the new prompt string directly
    const currentPrompt = trip.promptText;
    if (!currentPrompt.trim()) return;

    // Prime speech synthesis within active user gesture
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      try {
        const prime = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(prime);
      } catch {}
    }

    setIsLoading(true);
    
    const geminiKey = localStorage.getItem('wandor_gemini_key');
    fetch('/api/plan-trip', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(geminiKey ? { 'x-gemini-key': geminiKey } : {})
      },
      body: JSON.stringify({
        prompt: currentPrompt,
        travelersCount,
        language: selectedLanguage,
        attachmentSummary: attachment?.summary,
        attachmentBase64: attachment?.base64,
        attachmentMimeType: attachment?.mimeType,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.itinerary) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setItinerary(data.itinerary);
        setActiveTab('itinerary');
        showToast('Itinerary created successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast(data.error || 'Failed to generate itinerary. Check your API key.');
        if (!geminiKey) setIsSettingsModalOpen(true);
      }
    })
    .catch(err => {
      console.warn('API error:', err);
      showToast('Network error while planning trip.');
    })
    .finally(() => setIsLoading(false));
  };

  const handleRefineWithAi = async (refinePrompt: string) => {
    if (!itinerary) return;
    setIsRefining(true);

    try {
      const geminiKey = localStorage.getItem('wandor_gemini_key');
      const response = await fetch('/api/refine-trip', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(geminiKey ? { 'x-gemini-key': geminiKey } : {})
        },
        body: JSON.stringify({
          currentItinerary: itinerary,
          refinePrompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.itinerary) {
          setItinerary(data.itinerary);
          showToast('Itinerary adjusted with your preferences!');
          return;
        }
      }
    } catch (e) {
      console.error('Refine failed:', e);
      showToast('Failed to refine itinerary. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    localStorage.setItem('wandor_user_email', email);
    showToast(`Welcome back, ${email.split('@')[0]}!`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUserEmail(null);
    localStorage.removeItem('wandor_user_email');
    showToast('Signed out successfully');
  };

  const DEFAULT_GOOGLE_CLIENT_ID = typeof String.fromCharCode === 'function'
    ? String.fromCharCode(...[55,57,49,52,53,54,54,55,55,57,56,50,45,56,54,108,100,102,113,97,118,100,118,50,57,109,110,109,105,114,111,102,103,100,49,99,99,51,109,98,110,50,49,117,116,46,97,112,112,115,46,103,111,111,103,108,101,117,115,101,114,99,111,110,116,101,110,116,46,99,111,109])
    : '';

  return (
    <GoogleOAuthProvider clientId={(import.meta as any).env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex flex-col bg-black/30 text-stone-900 relative font-body selection:bg-[#E2D4C3]">
      <ScrollBackground />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="px-4 py-2.5 rounded-full bg-stone-900 text-white text-xs font-medium shadow-xl border border-stone-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onPlayWelcomeVoice={() => playWelcomeGreeting(true)}
        onLogout={handleLogout}
        onPlanTripClick={() => {
          if (activeTab !== 'hero') {
            setActiveTab('hero');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            handlePlanTrip();
          }
        }}
        userEmail={userEmail}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'hero' && (
          <HeroSection
            prompt={prompt}
            setPrompt={setPrompt}
            onPlanTrip={handlePlanTrip}
            isLoading={isLoading}
            onOpenAttachmentModal={() => setIsAttachmentModalOpen(true)}
            attachment={attachment}
            onRemoveAttachment={() => setAttachment(null)}
            travelersCount={travelersCount}
            setTravelersCount={setTravelersCount}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            onPlayWelcomeGreeting={() => playWelcomeGreeting(true)}
          />
        )}

        {activeTab === 'itinerary' && itinerary && (
          <ItineraryView
            itinerary={itinerary}
            onBack={() => setActiveTab('hero')}
            onRefineWithAi={handleRefineWithAi}
            isRefining={isRefining}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverPage onSelectTrip={handleSelectDiscoverTrip} />
        )}

        {activeTab === 'faqs' && (
          <FaqsPage onContactClick={() => setIsAuthModalOpen(true)} />
        )}

        {activeTab === 'my-trips' && (
          <MyTripsView onSelectTrip={(trip) => {
            setItinerary(trip);
            setActiveTab('itinerary');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        )}
      </main>

      {/* Modals */}
      <AttachmentModal
        isOpen={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onAttach={(file) => {
          setAttachment(file);
          showToast(`Attached ${file.name}`);
        }}
        currentAttachment={attachment}
        onRemoveAttachment={() => {
          setAttachment(null);
          showToast('Attachment removed');
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Subtle Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-stone-300/40 text-stone-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <span className="font-logo font-medium text-sm text-stone-800">wandor</span>
          <span>© 2026. Thoughtful, Crowd-Free Travel.</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-wider font-medium text-stone-600">
          <button onClick={() => setActiveTab('discover')} className="hover:text-black">
            Curated Routes
          </button>
          <button onClick={() => setActiveTab('faqs')} className="hover:text-black">
            FAQs
          </button>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-black">
            {userEmail ? userEmail : 'Account'}
          </button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="hover:text-black">
            Settings
          </button>
        </div>
      </footer>
    </div>
    </GoogleOAuthProvider>
  );
}
