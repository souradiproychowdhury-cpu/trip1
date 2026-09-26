import React, { useState } from 'react';
import { ScrollBackground } from './components/ScrollBackground';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ItineraryView } from './components/ItineraryView';
import { DiscoverPage } from './components/DiscoverPage';
import { PricingPage } from './components/PricingPage';
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
  const [activeTab, setActiveTab] = useState<'hero' | 'discover' | 'pricing' | 'faqs' | 'itinerary' | 'my-trips'>('hero');
  const [prompt, setPrompt] = useState<string>(
    "I'm planning a 7-day trip to Japan in October. I love food, hidden cafés, scenic hikes, and want to avoid crowds...."
  );
  const [origin, setOrigin] = useState<string>('');
  const [itinerary, setItinerary] = useState<TripItinerary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<{ name: string; summary: string; base64?: string; mimeType?: string } | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUserEmail(data.user.email);
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
          origin,
          attachmentSummary: attachment?.summary,
          attachmentBase64: attachment?.base64,
          attachmentMimeType: attachment?.mimeType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.itinerary) {
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
        attachmentSummary: attachment?.summary,
        attachmentBase64: attachment?.base64,
        attachmentMimeType: attachment?.mimeType,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.itinerary) {
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
    showToast(`Welcome back, ${email.split('@')[0]}!`);
  };

  const handleSelectPlan = (planId: string) => {
    setIsAuthModalOpen(true);
    showToast(`Selected ${planId.toUpperCase()} plan. Please sign in to activate.`);
  };

  return (
    <GoogleOAuthProvider clientId={(import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "mock-client-id"}>
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
            origin={origin}
            setOrigin={setOrigin}
            onPlanTrip={handlePlanTrip}
            isLoading={isLoading}
            onOpenAttachmentModal={() => setIsAttachmentModalOpen(true)}
            attachment={attachment}
            onRemoveAttachment={() => setAttachment(null)}
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

        {activeTab === 'pricing' && (
          <PricingPage onSelectPlan={handleSelectPlan} />
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
          <button onClick={() => setActiveTab('pricing')} className="hover:text-black">
            Pricing
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
