import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, X, Check, Compass, ArrowRight, MapPin, Mic, MicOff, Users, User, Plus, Minus, Globe, Volume2 } from 'lucide-react';
import { WorldLandmarksPanorama } from './WorldLandmarksPanorama';
import { VintagePencilClouds } from './VintagePencilClouds';
import { VoiceTravelAgentCard } from './VoiceTravelAgentCard';

// Multilingual prompt presets with party sizes (English default)
const PROMPT_PRESETS: Array<{ label: string; prompt: string; travelers: number; lang?: string }> = [
  {
    label: "🏖️ 3 Days in Goa (Couple)",
    prompt: "A relaxing and peaceful 3-day trip to Goa for 2 people. Scenic beaches, quiet local cafes, sunset spots, and avoiding crowded tourist areas.",
    travelers: 2,
    lang: "English"
  },
  {
    label: "🇯🇵 7-Day Japan (Solo)",
    prompt: "I'm planning a 7-day solo trip to Japan in October. I love food, hidden cafés, scenic hikes, and want to avoid crowds.",
    travelers: 1,
    lang: "English"
  },
  {
    label: "🇮🇹 Slow Tuscany (Couple)",
    prompt: "Looking for a 10-day slow travel itinerary in Tuscany for 2 people, focusing on wine tasting, cooking classes, and small villages.",
    travelers: 2,
    lang: "English"
  },
  {
    label: "🇧🇩 ৩ জনের ৩ দিনের গোয়া",
    prompt: "৩ জনের জন্য ৩ দিনের আরামদায়ক ও শান্ত গোয়া ভ্রমণ পরিকল্পনা চাই। সুন্দর বিচ, লোকাল ক্যাফে ও কম ভিড়ের স্পট চাই।",
    travelers: 3,
    lang: "Bengali"
  },
  {
    label: "🇮🇳 मनाली 4 लोगों के लिए",
    prompt: "4 लोगों के लिए 3 दिन का मनाली ट्रिप प्लान करें। शांत वादियां, लोकल फूड, खूबसूरत व्यू और भीड़ से दूर के स्पॉट चाहिए।",
    travelers: 4,
    lang: "Hindi"
  },
  {
    label: "🇪🇸 Barcelona para 2",
    prompt: "Planifica un viaje de 5 días a Barcelona para 2 personas, enfocado en arte, cafés escondidos y paseos sin multitudes.",
    travelers: 2,
    lang: "Spanish"
  }
];

// Language mapping for Web Speech API and Gemini (English first)
const LANGUAGE_OPTIONS = [
  { code: 'English', label: '🇬🇧 English (Default)', speechLang: 'en-US' },
  { code: 'Auto', label: '🌐 Auto-detect Language', speechLang: 'en-US' },
  { code: 'Bengali', label: '🇧🇩 বাংলা (Bengali)', speechLang: 'bn-IN' },
  { code: 'Hindi', label: '🇮🇳 हिन्दी (Hindi)', speechLang: 'hi-IN' },
  { code: 'Urdu', label: '🇵🇰 اردو (Urdu)', speechLang: 'ur-PK' },
  { code: 'Spanish', label: '🇪🇸 Español (Spanish)', speechLang: 'es-ES' },
  { code: 'French', label: '🇫🇷 Français', speechLang: 'fr-FR' },
  { code: 'German', label: '🇩🇪 Deutsch', speechLang: 'de-DE' },
  { code: 'Italian', label: '🇮🇹 Italiano', speechLang: 'it-IT' },
  { code: 'Japanese', label: '🇯🇵 日本語 (Japanese)', speechLang: 'ja-JP' },
];

interface HeroSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onPlanTrip: () => void;
  isLoading: boolean;
  onOpenAttachmentModal: () => void;
  attachment: { name: string; summary: string } | null;
  onRemoveAttachment: () => void;
  travelersCount?: number;
  setTravelersCount?: (count: number) => void;
  selectedLanguage?: string;
  setSelectedLanguage?: (lang: string) => void;
  onPlayWelcomeGreeting?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  prompt,
  setPrompt,
  onPlanTrip,
  isLoading,
  onOpenAttachmentModal,
  attachment,
  onRemoveAttachment,
  travelersCount = 3,
  setTravelersCount,
  selectedLanguage = 'English',
  setSelectedLanguage,
  onPlayWelcomeGreeting
}) => {
  const [activePresetIndex, setActivePresetIndex] = useState<number>(-1);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  // Determine current speech recognition language tag
  const currentSpeechLang = LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.speechLang || 'en-US';

  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentSpeechLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setPrompt(transcript);
          // Check if speech mentioned traveler count
          const match = transcript.match(/(\d+)\s*(?:people|persons|person|জন|লোক|যাত্রী|लोग|personas)/i);
          if (match && setTravelersCount) {
            setTravelersCount(parseInt(match[1], 10));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Voice command error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handlePresetClick = (presetItem: typeof PROMPT_PRESETS[0], index: number) => {
    setPrompt(presetItem.prompt);
    setActivePresetIndex(index);
    if (setTravelersCount) {
      setTravelersCount(presetItem.travelers);
    }
    if (presetItem.lang && setSelectedLanguage) {
      setSelectedLanguage(presetItem.lang);
    }
  };

  const handleLandmarkSelect = (landmarkName: string, promptSuggestion: string) => {
    setPrompt(promptSuggestion);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const updateTravelers = (newCount: number) => {
    const val = Math.max(1, Math.min(20, newCount));
    if (setTravelersCount) {
      setTravelersCount(val);
    }
  };

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* Background Vintage Pencil Sketch Clouds in upper corners */}
      <VintagePencilClouds />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 md:pt-12 text-center flex-1">
        {/* Welcome Voice Greeting Header Banner: English, Hindi, Bengali */}
        <div className="mb-4 inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/85 border border-stone-200/80 shadow-xs backdrop-blur-md">
          <span className="text-xs font-semibold text-stone-900 tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Welcome</span>
            <span className="text-stone-300">•</span>
            <span>नमस्कार</span>
            <span className="text-stone-300">•</span>
            <span>নমস্কার</span>
          </span>
          <button
            type="button"
            onClick={onPlayWelcomeGreeting}
            title="Listen to 3-language audio welcome: Welcome • नमस्कार • নমস্কার"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200/80 px-2.5 py-0.5 rounded-full transition-all cursor-pointer border border-amber-300/60 shadow-2xs active:scale-95"
          >
            <Volume2 className="w-3 h-3 text-amber-700" />
            <span>Audio Welcome</span>
          </button>
        </div>

        {/* Main Headline */}
        <h1 className="font-heading text-3xl sm:text-5xl md:text-[56px] lg:text-[62px] font-bold text-[#18181B] tracking-[-0.025em] leading-[1.15] sm:leading-[1.12]">
          Where will you go next?
        </h1>

        {/* Subtitle */}
        <p className="mt-2.5 sm:mt-4 text-stone-600 text-sm sm:text-lg md:text-[18px] max-w-2xl mx-auto leading-relaxed font-normal">
          Plan in your mother tongue: বাংলা, हिन्दी, Urdu, Spanish, English & more.<br className="hidden sm:inline" />
          Live AI budgeting calculated per-person & for your entire travel group.
        </p>

        {/* The Search & Voice Travel Consultant Side-by-Side Area */}
        <div className="mt-5 sm:mt-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* LEFT / MAIN: Central AI Search & Trip Planner Card (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div className={`wandor-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 text-left transition-all duration-300 flex-1 flex flex-col justify-between ${isListening ? 'ring-2 ring-amber-500 shadow-lg' : ''}`}>
            
            {/* Top Bar: Side-wise Section for Travelers & Language Selector */}
            <div className="mb-3.5 pb-3 border-b border-stone-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* SIDE-WISE SECTION 1: How many people (Travelers Stepper & Quick Selector) */}
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-stone-100/70 px-3 py-1.5 rounded-2xl border border-stone-200/60">
                <div className="flex items-center gap-1.5 text-stone-700">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-semibold text-stone-800">
                    Travelers:
                  </span>
                  <span className="text-[10px] text-stone-500 hidden md:inline">
                    (মানুষ / यात्री)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateTravelers(travelersCount - 1)}
                    disabled={travelersCount <= 1}
                    className="w-6 h-6 rounded-full bg-white hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 flex items-center justify-center border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                    aria-label="Decrease traveler count"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span className="min-w-[58px] text-center font-bold text-xs sm:text-sm text-stone-900 bg-white px-2 py-0.5 rounded-lg border border-stone-200 shadow-2xs">
                    {travelersCount} {travelersCount === 1 ? 'Person' : 'People'}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateTravelers(travelersCount + 1)}
                    disabled={travelersCount >= 20}
                    className="w-6 h-6 rounded-full bg-white hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 flex items-center justify-center border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                    aria-label="Increase traveler count"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Quick traveler shortcuts */}
                <div className="hidden xs:flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateTravelers(num)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        travelersCount === num 
                          ? 'bg-stone-900 text-white font-bold' 
                          : 'bg-white hover:bg-stone-200 text-stone-600'
                      }`}
                    >
                      {num === 1 ? 'Solo' : num === 2 ? 'Couple' : num === 3 ? '3' : '4+'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIDE-WISE SECTION 2: Language Selector (Any Mother Language) */}
              <div className="flex items-center gap-1.5 bg-stone-100/70 px-3 py-1.5 rounded-2xl border border-stone-200/60 justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 text-stone-700">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-stone-700">
                    Language:
                  </span>
                </div>

                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage && setSelectedLanguage(e.target.value)}
                  className="bg-white text-stone-800 text-xs font-semibold rounded-lg px-2 py-1 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer max-w-[170px] truncate"
                  title="Plan in any mother language — Gemini understands all languages"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Textarea Input */}
            <div className="relative min-h-[90px] sm:min-h-[110px]">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Auto-detect traveler count if user types e.g. "for 4 people", "৩ জনের জন্য", "3 लोगों के लिए"
                  const match = e.target.value.match(/(\d+)\s*(?:people|persons|person|জন|লোক|যাত্রী|लोग|personas)/i);
                  if (match && setTravelersCount) {
                    setTravelersCount(parseInt(match[1], 10));
                  }
                }}
                rows={3}
                placeholder={
                  selectedLanguage === 'Bengali'
                    ? "আপনার ভ্রমণের পরিকল্পনা লিখুন — যেমন: ৩ জনের জন্য ৩ দিনের গোয়া ভ্রমণ, সুন্দর বিচ ও কম ভিড়ের জায়গা..."
                    : selectedLanguage === 'Hindi'
                    ? "अपनी ट्रिप बताएं — जैसे: 3 लोगों के लिए 3 दिन का गोवा टूर, सुंदर बीच और शांत जगहें..."
                    : selectedLanguage === 'Spanish'
                    ? "Escribe tu viaje — ej: 3 días en Goa para 3 personas, playas tranquilas y cafés locales..."
                    : "Tell us where to go, how many days, and interests (e.g. 3 days in Goa for 2 people, quiet cafes & beaches)..."
                }
                className="w-full h-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-stone-800 placeholder:text-stone-400 text-sm sm:text-[16px] leading-[1.65] font-normal"
              />
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-950 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                <span>
                  Listening in {selectedLanguage === 'Auto' ? 'any language' : selectedLanguage}... Speak your destination, days &amp; {travelersCount} travelers
                </span>
              </div>
            )}

            {/* Attached file chip if uploaded */}
            {attachment && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/90 border border-stone-200 text-xs text-stone-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="truncate max-w-[180px] sm:max-w-[200px]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={onRemoveAttachment}
                  className="text-stone-400 hover:text-stone-700 ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Card Bottom Bar */}
            <div className="pt-2 sm:pt-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-stone-200/50">
              {/* Left Action Buttons: Upload & Voice Mic */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Upload Button */}
                <button
                  type="button"
                  onClick={onOpenAttachmentModal}
                  title="Upload flight tickets, hotel reservations or inspiration document"
                  className="p-2 sm:p-3 text-stone-700 hover:text-black hover:bg-stone-200/50 rounded-full transition-colors cursor-pointer focus:outline-none"
                  aria-label="Upload attachments"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
                </button>

                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title={isListening ? "Stop listening" : "Speak your trip plan by voice"}
                  className={`p-2 sm:p-3 rounded-full transition-all cursor-pointer focus:outline-none ${
                    isListening 
                      ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400 animate-pulse' 
                      : 'text-stone-700 hover:text-black hover:bg-stone-200/50'
                  }`}
                  aria-label="Voice command trip planner"
                >
                  {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />}
                </button>

                {attachment ? (
                  <span className="text-[11px] text-emerald-700 font-medium hidden xs:inline ml-1">
                    Ticket attached ✓
                  </span>
                ) : isListening ? (
                  <span className="text-[11px] text-amber-700 font-semibold hidden xs:inline ml-1">
                    Listening...
                  </span>
                ) : (
                  <span className="text-[11px] text-stone-500 hidden sm:inline ml-1">
                    Attach ticket or speak
                  </span>
                )}
              </div>

              {/* Right: Solid Black Pill Button "PLAN MY TRIP" */}
              <button
                type="button"
                onClick={onPlanTrip}
                disabled={isLoading || !prompt.trim()}
                className="w-full sm:w-auto bg-[#111111] hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] sm:text-[13px] font-semibold tracking-[0.12em] uppercase px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Plan...</span>
                  </>
                ) : (
                  <span>PLAN MY TRIP</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Prompt Ideas / Inspiration Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-left">
            <span className="text-[11px] font-medium tracking-wide uppercase text-stone-500 mr-1">
              Try:
            </span>
            {PROMPT_PRESETS.map((presetItem, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(presetItem, idx)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activePresetIndex === idx && prompt === presetItem.prompt
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white/60 hover:bg-white text-stone-700 border-stone-300/80 hover:border-stone-400'
                }`}
              >
                {presetItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Live ElevenLabs Conversational Voice Suggestion Agent (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col">
          <VoiceTravelAgentCard
            onApplySuggestion={(text) => {
              setPrompt(text);
              // Auto-detect traveler count if mentioned in speech suggestion
              const match = text.match(/(\d+)\s*(?:people|persons|person|জন|লোক|যাত্রী|लोग|personas)/i);
              if (match && setTravelersCount) {
                setTravelersCount(parseInt(match[1], 10));
              }
            }}
            currentPrompt={prompt}
            travelersCount={travelersCount}
            selectedLanguage={selectedLanguage}
          />
        </div>

      </div>
    </div>
  </div>

      {/* Panorama of World Wonders across the bottom matching reference image */}
      <div className="relative z-10 w-full mt-6 sm:mt-10 lg:mt-12">
        <WorldLandmarksPanorama onSelectLandmark={handleLandmarkSelect} />
      </div>
    </section>
  );
};
