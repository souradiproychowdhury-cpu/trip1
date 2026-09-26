import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, Globe, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export interface VoiceGuideProps {
  placeName: string;
  destination: string;
  defaultText?: string;
  className?: string;
  compact?: boolean;
  autoPlay?: boolean;
  title?: string;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechLang: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'English', name: 'English', nativeName: 'English', speechLang: 'en-US' },
  { code: 'Bengali', name: 'Bengali', nativeName: 'বাংলা', speechLang: 'bn-IN' },
  { code: 'Hindi', name: 'Hindi', nativeName: 'हिंदी', speechLang: 'hi-IN' },
  { code: 'Spanish', name: 'Spanish', nativeName: 'Español', speechLang: 'es-ES' },
  { code: 'French', name: 'French', nativeName: 'Français', speechLang: 'fr-FR' },
  { code: 'German', name: 'German', nativeName: 'Deutsch', speechLang: 'de-DE' },
  { code: 'Japanese', name: 'Japanese', nativeName: '日本語', speechLang: 'ja-JP' },
  { code: 'Italian', name: 'Italian', nativeName: 'Italiano', speechLang: 'it-IT' },
];

export const VoiceAssistantPlayer: React.FC<VoiceGuideProps> = ({
  placeName,
  destination,
  defaultText = '',
  className = '',
  compact = false,
  autoPlay = false,
  title
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const [narrativeText, setNarrativeText] = useState<string>(defaultText);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Warm up voices and speech synthesis on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.resume();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Auto-play instantly when result is generated (zero-delay, no network latency)
  useEffect(() => {
    if (autoPlay && defaultText && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      playSpeech(defaultText, selectedLang.speechLang);
    }
  }, [autoPlay, defaultText]);

  // Stop speech when component unmounts or place changes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [placeName]);

  // Fetch or generate narrative for the selected language
  const fetchNarrativeAndSpeak = async (lang: LanguageOption) => {
    if (!window.speechSynthesis) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    // If already playing, stop
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsLoadingNarrative(true);

    try {
      const res = await fetch('/api/voice-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName,
          destination,
          language: lang.code,
          context: defaultText
        })
      });

      const data = await res.json();
      const textToSpeak = data.success && data.narrative ? data.narrative : defaultText;
      setNarrativeText(textToSpeak);

      // Start speech
      playSpeech(textToSpeak, lang.speechLang);
    } catch (err) {
      console.warn('Voice narrative fetch failed, falling back to default text:', err);
      playSpeech(defaultText || `${placeName} in ${destination}`, lang.speechLang);
    } finally {
      setIsLoadingNarrative(false);
    }
  };

  const playSpeech = (text: string, langCode: string) => {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = playbackRate;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === langCode || v.lang.startsWith(langCode.slice(0, 2)));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={() => fetchNarrativeAndSpeak(selectedLang)}
          disabled={isLoadingNarrative}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
            isPlaying
              ? 'bg-amber-500 text-stone-950 font-bold animate-pulse'
              : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-300'
          }`}
          title={`Listen to AI Voice Guide (${selectedLang.nativeName})`}
        >
          {isLoadingNarrative ? (
            <span className="w-3.5 h-3.5 border-2 border-stone-800/40 border-t-stone-800 rounded-full animate-spin" />
          ) : isPlaying ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-amber-700" />
          )}
          <span>{isPlaying ? 'Stop Guide' : `Listen (${selectedLang.nativeName})`}</span>
        </button>

        {/* Quick Language Dropdown */}
        <select
          value={selectedLang.code}
          onChange={(e) => {
            const found = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
            if (found) {
              setSelectedLang(found);
              if (isPlaying) {
                handleStop();
                fetchNarrativeAndSpeak(found);
              }
            }
          }}
          aria-label="Audio guide language"
          className="text-[11px] px-2 py-1 rounded-full bg-white border border-stone-300 text-stone-700 font-medium focus:outline-none cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 to-[#FAF6F0] border border-amber-200/90 shadow-2xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Status */}
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl transition-all ${
            isPlaying ? 'bg-amber-500 text-stone-950 animate-bounce' : 'bg-amber-200/70 text-amber-900'
          }`}>
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                AI Voice Tour Guide
              </span>
              <span className="text-[10px] uppercase font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.2 rounded-full">
                Multilingual
              </span>
            </div>
            <p className="text-[11px] text-stone-600">
              Listen to Gemini narrate the beauty and atmosphere of <strong>{placeName}</strong>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white/90 border border-stone-300 rounded-full px-2.5 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={selectedLang.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                if (found) {
                  setSelectedLang(found);
                  if (isPlaying) {
                    handleStop();
                    fetchNarrativeAndSpeak(found);
                  }
                }
              }}
              aria-label="Voice guide language"
              className="bg-transparent border-0 text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {/* Speed Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/90 border border-stone-300 rounded-full px-2 py-1 text-[11px] font-mono text-stone-700">
            <button
              type="button"
              onClick={() => setPlaybackRate(0.85)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 0.85 ? 'bg-stone-900 text-white' : ''}`}
            >
              0.8x
            </button>
            <button
              type="button"
              onClick={() => setPlaybackRate(1.0)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 1.0 ? 'bg-stone-900 text-white' : ''}`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => setPlaybackRate(1.2)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 1.2 ? 'bg-stone-900 text-white' : ''}`}
            >
              1.2x
            </button>
          </div>

          {/* Play/Stop Button */}
          <button
            type="button"
            onClick={() => fetchNarrativeAndSpeak(selectedLang)}
            disabled={isLoadingNarrative}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {isLoadingNarrative ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Translating...</span>
              </>
            ) : isPlaying ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Listen ({selectedLang.nativeName})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Wave Visualizer Animation when speaking */}
      {isPlaying && (
        <div className="mt-3.5 pt-3 border-t border-amber-200/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 h-5">
            {[4, 12, 18, 9, 15, 6, 20, 10, 16, 7, 14, 8].map((height, i) => (
              <span
                key={i}
                className="w-1 bg-amber-600 rounded-full animate-pulse"
                style={{
                  height: `${height}px`,
                  animationDuration: `${0.4 + (i % 5) * 0.15}s`
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-amber-900 italic">
            Speaking in {selectedLang.name} ({selectedLang.nativeName})...
          </span>
        </div>
      )}

      {/* Expandable Transcript */}
      {narrativeText && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
          >
            {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{showTranscript ? 'Hide audio transcript' : 'View audio transcript'}</span>
          </button>

          {showTranscript && (
            <p className="mt-2 text-xs sm:text-sm text-stone-800 bg-white/80 p-3.5 rounded-xl border border-stone-200 leading-relaxed font-normal">
              {narrativeText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
