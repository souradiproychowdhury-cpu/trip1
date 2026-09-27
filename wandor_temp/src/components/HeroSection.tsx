import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, X, Check, Compass, ArrowRight, MapPin, Mic, MicOff } from 'lucide-react';
import { WorldLandmarksPanorama } from './WorldLandmarksPanorama';
import { VintagePencilClouds } from './VintagePencilClouds';

// Prompt presets — these trigger real AI calls, not mock data
const PROMPT_PRESETS: string[] = [
  "I'm planning a 7-day trip to Japan in October. I love food, hidden cafés, scenic hikes, and want to avoid crowds.",
  "Looking for a 10-day slow travel itinerary in Tuscany, Italy, focusing on wine tasting, cooking classes, and small villages.",
  "I have 5 days in Iceland. I want to see the main sights but also relax in lesser-known thermal hot pots.",
  "Plan a 2-week coastal road trip in Portugal for two. We love surfing, seafood, and boutique hotels."
];

interface HeroSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onPlanTrip: () => void;
  isLoading: boolean;
  onOpenAttachmentModal: () => void;
  attachment: { name: string; summary: string } | null;
  onRemoveAttachment: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  prompt,
  setPrompt,
  onPlanTrip,
  isLoading,
  onOpenAttachmentModal,
  attachment,
  onRemoveAttachment
}) => {
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

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
      recognition.lang = 'en-US';
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

  const handlePresetClick = (preset: string, index: number) => {
    setPrompt(preset);
    setActivePresetIndex(index);
  };

  const handleLandmarkSelect = (landmarkName: string, promptSuggestion: string) => {
    setPrompt(promptSuggestion);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* Background Vintage Pencil Sketch Clouds in upper corners */}
      <VintagePencilClouds />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 md:pt-16 lg:pt-20 text-center flex-1">
        {/* Main Headline: "Where will you go next?" */}
        <h1 className="font-heading text-3xl sm:text-5xl md:text-[56px] lg:text-[62px] font-bold text-[#18181B] tracking-[-0.025em] leading-[1.15] sm:leading-[1.12]">
          Where will you go next?
        </h1>

        {/* Subtitle matching reference */}
        <p className="mt-3 sm:mt-5 text-stone-600 text-sm sm:text-lg md:text-[18px] max-w-xl mx-auto leading-relaxed font-normal">
          Tell our AI where you're going and what you love.<br className="hidden sm:inline" />
          We'll create a personalized itinerary for you.
        </p>

        {/* The Central AI Prompt Box Card matching reference image */}
        <div className="mt-6 sm:mt-10 max-w-2xl mx-auto">
          <div className={`wandor-card rounded-[24px] sm:rounded-[34px] p-4 sm:p-7 text-left transition-all duration-300 ${isListening ? 'ring-2 ring-amber-500 shadow-lg' : ''}`}>
            {/* Textarea Input */}
            <div className="relative min-h-[85px] sm:min-h-[105px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Please tell me where to go, how many days, and what you love to do..."
                className="w-full h-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-stone-800 placeholder:text-stone-400 text-sm sm:text-[16px] leading-[1.65] font-normal"
              />
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>Listening... Speak your trip destination, days &amp; interests</span>
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-left">
            <span className="text-[11px] font-medium tracking-wide uppercase text-stone-500 mr-1">
              Try:
            </span>
            {PROMPT_PRESETS.map((preset, idx) => {
              const label = idx === 0 
                ? '🇯🇵 Autumn Japan' 
                : idx === 1 
                ? '🇮🇹 Slow Tuscany' 
                : idx === 2 
                ? '🇮🇸 Iceland Thermal Hot Pots' 
                : '🇵🇹 Coastal Portugal';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetClick(preset, idx)}
                  className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    activePresetIndex === idx && prompt === preset
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white/60 hover:bg-white text-stone-700 border-stone-300/80 hover:border-stone-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
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
