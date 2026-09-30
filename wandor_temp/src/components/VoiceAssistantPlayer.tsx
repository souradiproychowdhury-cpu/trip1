import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, Globe, Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'English', name: 'English', nativeName: 'English', speechLang: 'en-US' },
  { code: 'Bengali', name: 'Bengali', nativeName: 'বাংলা', speechLang: 'bn-IN' },
  { code: 'Hindi', name: 'Hindi', nativeName: 'हिंदी', speechLang: 'hi-IN' },
  { code: 'Spanish', name: 'Spanish', nativeName: 'Español', speechLang: 'es-ES' },
  { code: 'French', name: 'French', nativeName: 'Français', speechLang: 'fr-FR' },
  { code: 'German', name: 'German', nativeName: 'Deutsch', speechLang: 'de-DE' },
  { code: 'Japanese', name: 'Japanese', nativeName: '日本語', speechLang: 'ja-JP' },
  { code: 'Italian', name: 'Italian', nativeName: 'Italiano', speechLang: 'it-IT' },
  { code: 'Urdu', name: 'Urdu', nativeName: 'اردو', speechLang: 'ur-PK' },
];

export function detectLanguageOption(text: string = '', preferredLang?: string): LanguageOption {
  // 1. If explicitly specified and valid, prioritize it directly
  if (preferredLang && preferredLang !== 'Auto') {
    const found = SUPPORTED_LANGUAGES.find(
      l => l.name.toLowerCase() === preferredLang.toLowerCase() ||
           l.code.toLowerCase() === preferredLang.toLowerCase()
    );
    if (found) {
      return found;
    }
  }

  // 2. Bengali Unicode range: 0980-09FF
  if (/[\u0980-\u09FF]/.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Bengali') || SUPPORTED_LANGUAGES[1];
  }
  // Devanagari / Hindi Unicode range: 0900-097F
  if (/[\u0900-\u097F]/.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Hindi') || SUPPORTED_LANGUAGES[2];
  }
  // Arabic / Urdu Unicode range: 0600-06FF
  if (/[\u0600-\u06FF]/.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Urdu') || SUPPORTED_LANGUAGES[8];
  }
  // Japanese Kana / Kanji
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Japanese') || SUPPORTED_LANGUAGES[6];
  }
  if (/[áéíóúñ¿¡]/i.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Spanish') || SUPPORTED_LANGUAGES[3];
  }
  if (/[àâçèêëîïôûùüÿœæ]/i.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'French') || SUPPORTED_LANGUAGES[4];
  }
  if (/[äöüß]/i.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'German') || SUPPORTED_LANGUAGES[5];
  }
  if (/[àèéìíîòóùú]/i.test(text)) {
    return SUPPORTED_LANGUAGES.find(l => l.code === 'Italian') || SUPPORTED_LANGUAGES[7];
  }

  return SUPPORTED_LANGUAGES[0]; // English
}

export interface VoiceGuideProps {
  placeName: string;
  destination: string;
  defaultText?: string;
  className?: string;
  compact?: boolean;
  autoPlay?: boolean;
  title?: string;
  initialLanguage?: string;
  showTextInline?: boolean;
}

export const VoiceAssistantPlayer: React.FC<VoiceGuideProps> = ({
  placeName,
  destination,
  defaultText = '',
  className = '',
  compact = false,
  autoPlay = false,
  title,
  initialLanguage,
  showTextInline = false
}) => {
  const initialDetected = detectLanguageOption(defaultText, initialLanguage);
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(initialDetected);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [narrativeText, setNarrativeText] = useState<string>(defaultText);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState<boolean>(showTextInline);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasAutoPlayedRef = useRef<boolean>(false);

  // Warm up voices and speech synthesis on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.resume();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Update language and narrative text whenever defaultText or initialLanguage changes
  useEffect(() => {
    if (defaultText) {
      const detected = detectLanguageOption(defaultText, initialLanguage);
      setSelectedLang(detected);
      setNarrativeText(defaultText);
    }
  }, [defaultText, initialLanguage]);

  // Auto-play immediately when itinerary view opens
  useEffect(() => {
    if (!autoPlay || !defaultText || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const detected = detectLanguageOption(defaultText, initialLanguage);
    setSelectedLang(detected);

    let hasTriggered = false;
    const triggerSpeech = () => {
      if (hasTriggered) return;
      hasTriggered = true;
      playSpeech(defaultText, detected.speechLang);
    };

    // 1. Try immediate auto-play after short delay
    const timer = setTimeout(triggerSpeech, 250);

    // 2. Unblock listeners: If browser autoplay policy held speech in pending, the slightest mouse move, scroll, or touch immediately activates it
    const cleanupListeners = () => {
      window.removeEventListener('pointermove', triggerSpeech);
      window.removeEventListener('pointerdown', triggerSpeech);
      window.removeEventListener('scroll', triggerSpeech);
      window.removeEventListener('touchstart', triggerSpeech);
    };

    window.addEventListener('pointermove', triggerSpeech, { once: true, passive: true });
    window.addEventListener('pointerdown', triggerSpeech, { once: true, passive: true });
    window.addEventListener('scroll', triggerSpeech, { once: true, passive: true });
    window.addEventListener('touchstart', triggerSpeech, { once: true, passive: true });

    return () => {
      clearTimeout(timer);
      cleanupListeners();
    };
  }, [autoPlay, defaultText, initialLanguage]);

  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [placeName]);

  const playSpeech = (text: string, langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = playbackRate;

      const executeSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const cleanLang = langCode.toLowerCase().replace('_', '-');
        const baseCode = cleanLang.split('-')[0];

        let matchedVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === cleanLang);
        if (!matchedVoice) {
          matchedVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(baseCode));
        }
        if (!matchedVoice) {
          const langOpt = SUPPORTED_LANGUAGES.find(l => l.speechLang === langCode);
          if (langOpt) {
            matchedVoice = voices.find(v =>
              v.name.toLowerCase().includes(langOpt.name.toLowerCase()) ||
              v.name.toLowerCase().includes(langOpt.nativeName.toLowerCase())
            );
          }
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
        };
        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setIsPlaying(false);
          setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        executeSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          executeSpeak();
        };
      }
    } catch (err) {
      console.warn('playSpeech failed:', err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleTogglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      playSpeech(narrativeText || defaultText, selectedLang.speechLang);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleReplay = () => {
    handleStop();
    playSpeech(narrativeText || defaultText, selectedLang.speechLang);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
            isPlaying
              ? 'bg-amber-500 text-stone-950 font-bold animate-pulse'
              : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-300'
          }`}
          title={`Audio Guide (${selectedLang.nativeName})`}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-amber-700" />
          )}
          <span>{isPlaying ? 'Pause Audio' : isPaused ? 'Resume' : `Voice (${selectedLang.nativeName})`}</span>
        </button>

        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            className="p-1.5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer"
            title="Stop Audio"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/95 via-stone-50/90 to-amber-100/60 border border-amber-300/80 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Status */}
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl transition-all ${
            isPlaying ? 'bg-amber-500 text-stone-950 shadow-md animate-bounce' : 'bg-amber-200/80 text-amber-950'
          }`}>
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                AI Voice Overview
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-200/90 text-amber-950 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" />
                {selectedLang.nativeName} ({selectedLang.name})
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">
                  Playing automatically
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Audio introduction for <strong>{destination || placeName}</strong>
            </p>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white/95 border border-stone-300 rounded-full px-2.5 py-1 text-xs shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={selectedLang.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                if (found) {
                  setSelectedLang(found);
                  handleStop();
                  playSpeech(narrativeText || defaultText, found.speechLang);
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
          <div className="flex items-center gap-1 bg-white/95 border border-stone-300 rounded-full px-2 py-1 text-[11px] font-mono text-stone-700 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setPlaybackRate(0.85);
                if (isPlaying) {
                  handleStop();
                  setTimeout(() => playSpeech(narrativeText || defaultText, selectedLang.speechLang), 100);
                }
              }}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 0.85 ? 'bg-stone-900 text-white font-bold' : ''}`}
            >
              0.8x
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaybackRate(1.0);
                if (isPlaying) {
                  handleStop();
                  setTimeout(() => playSpeech(narrativeText || defaultText, selectedLang.speechLang), 100);
                }
              }}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 1.0 ? 'bg-stone-900 text-white font-bold' : ''}`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaybackRate(1.2);
                if (isPlaying) {
                  handleStop();
                  setTimeout(() => playSpeech(narrativeText || defaultText, selectedLang.speechLang), 100);
                }
              }}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${playbackRate === 1.2 ? 'bg-stone-900 text-white font-bold' : ''}`}
            >
              1.2x
            </button>
          </div>

          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play ({selectedLang.nativeName})</span>
              </>
            )}
          </button>

          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            title="Replay from start"
            className="p-1.5 rounded-full bg-white/90 hover:bg-white text-stone-800 border border-stone-300 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Stop Button */}
          {isPlaying && (
            <button
              type="button"
              onClick={handleStop}
              title="Stop audio"
              className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Audio Wave Visualizer Animation when speaking */}
      {isPlaying && (
        <div className="mt-3.5 pt-3 border-t border-amber-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 h-5">
            {[6, 14, 22, 11, 18, 8, 24, 12, 19, 9, 16, 10, 20, 14, 7].map((height, i) => (
              <span
                key={i}
                className="w-1 bg-amber-600 rounded-full animate-pulse"
                style={{
                  height: `${height}px`,
                  animationDuration: `${0.35 + (i % 6) * 0.12}s`
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-amber-950">
            Speaking in {selectedLang.name} ({selectedLang.nativeName})...
          </span>
        </div>
      )}

      {/* 2-3 Line Description of the Destination */}
      {(narrativeText || defaultText) && (
        <div className="mt-3 pt-3 border-t border-amber-200/70">
          <p className="text-sm sm:text-base text-stone-900 font-medium leading-relaxed bg-white/80 p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
            {narrativeText || defaultText}
          </p>
        </div>
      )}
    </div>
  );
};
