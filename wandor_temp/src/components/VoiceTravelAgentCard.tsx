import React, { useState, useRef, useEffect, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Bot,
  Check,
  Headphones,
  SlidersHorizontal,
  AlertCircle,
  KeyRound,
  Send,
  Loader2
} from 'lucide-react';

interface VoiceTravelAgentCardProps {
  onApplySuggestion?: (suggestionText: string) => void;
  currentPrompt?: string;
  travelersCount?: number;
  selectedLanguage?: string;
}

interface MessageItem {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
}

// User's active Vapi Assistant configuration
const DEFAULT_ASSISTANT_ID = 'e0f0e7a0-76c2-4c40-959c-9ac97d8fbef7';
const DEFAULT_PUBLIC_KEY = '2aad0218-c70f-42d5-859b-2690647a5db3';

const SUGGESTION_STARTERS = [
  'Where should I go for a relaxing weekend?',
  'Suggest a hidden mountain destination',
  'Best romantic getaway for a couple',
  'Family-friendly adventure with kids'
];

export const VoiceTravelAgentCard: React.FC<VoiceTravelAgentCardProps> = ({
  onApplySuggestion,
  selectedLanguage = 'English'
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.9);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');

  // Assistant ID & Public Key with localStorage persistence
  const [assistantId, setAssistantId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('wandor_vapi_assistant_id') ||
        (import.meta.env.VITE_VAPI_ASSISTANT_ID as string) ||
        DEFAULT_ASSISTANT_ID
      );
    }
    return DEFAULT_ASSISTANT_ID;
  });

  const [publicKey, setPublicKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('wandor_vapi_public_key') ||
        (import.meta.env.VITE_VAPI_PUBLIC_KEY as string) ||
        DEFAULT_PUBLIC_KEY
      );
    }
    return DEFAULT_PUBLIC_KEY;
  });

  const [inputAssistantId, setInputAssistantId] = useState<string>(assistantId);
  const [inputPublicKey, setInputPublicKey] = useState<string>(publicKey);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<Vapi | null>(null);

  // Auto-scroll transcript container to bottom
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [messages, isSpeaking]);

  // Clean up Vapi on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Initialize or get Vapi client instance
  const getVapiClient = useCallback(() => {
    if (!vapiRef.current) {
      const client = new Vapi(publicKey);

      client.on('call-start', () => {
        console.log('Vapi Call Started successfully with assistant:', assistantId);
        setIsConnected(true);
        setIsStarting(false);
        setErrorMessage(null);
        setMessages((prev) => {
          if (prev.length === 0) {
            return [
              {
                id: 'welcome-' + Date.now(),
                sender: 'agent',
                text: "Hi! Excited to help you plan your trip... where are you dreaming of going?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ];
          }
          return prev;
        });
      });

      client.on('call-end', () => {
        console.log('Vapi Call Ended');
        setIsConnected(false);
        setIsSpeaking(false);
        setIsStarting(false);
        setAudioLevel(0);
      });

      client.on('speech-start', () => {
        setIsSpeaking(true);
      });

      client.on('speech-end', () => {
        setIsSpeaking(false);
      });

      client.on('volume-level', (vol: number) => {
        setAudioLevel(vol);
      });

      client.on('message', (message: any) => {
        console.log('Vapi message received:', message);

        if (message.type === 'transcript') {
          const isUser = message.role === 'user';
          const text = message.transcript;

          if (message.transcriptType === 'final' && text?.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                sender: isUser ? 'user' : 'agent',
                text: text.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        }

        // Support automatic trip suggestion extraction from agent tool calls
        if (message.type === 'function-call' || message.type === 'tool-calls') {
          const call = message.functionCall || (message.toolCalls && message.toolCalls[0]?.function);
          if (call) {
            const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments || '{}') : call.arguments;
            const query = args?.destination || args?.query || args?.trip_name;
            if (query && onApplySuggestion) {
              onApplySuggestion(query);
            }
          }
        }
      });

      client.on('error', (err: any) => {
        console.error('Vapi Call Error:', err);
        setIsStarting(false);
        const msg = err?.message || (typeof err === 'string' ? err : 'Voice connection error');
        setErrorMessage(msg);
      });

      vapiRef.current = client;
    }
    return vapiRef.current;
  }, [assistantId, publicKey, onApplySuggestion]);

  // Start Voice Call Handler
  const handleStart = async () => {
    setErrorMessage(null);
    setIsStarting(true);

    try {
      // 1. Request microphone access
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // 2. Start Vapi Call
      const client = getVapiClient();
      await client.start(assistantId);
    } catch (err: any) {
      console.error('Failed to start Vapi voice agent:', err);
      setIsStarting(false);
      setErrorMessage(err?.message || 'Could not connect to voice agent. Please check mic permissions.');
    }
  };

  // Stop Voice Call Handler
  const handleStop = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (err) {
        console.warn('Error stopping Vapi call:', err);
      }
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsStarting(false);
    setAudioLevel(0);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (vapiRef.current) {
      try {
        vapiRef.current.setMuted(nextMuted);
      } catch {}
    }
  };

  const handleUseSuggestion = (text: string, id: string) => {
    if (onApplySuggestion) {
      onApplySuggestion(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleSendStarter = (starterText: string) => {
    if (isConnected && vapiRef.current) {
      vapiRef.current.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: starterText
        }
      });
      setMessages((prev) => [
        ...prev,
        {
          id: 'user-' + Date.now(),
          sender: 'user',
          text: starterText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      handleStart().then(() => {
        setTimeout(() => {
          if (vapiRef.current) {
            vapiRef.current.send({
              type: 'add-message',
              message: {
                role: 'user',
                content: starterText
              }
            });
            setMessages((prev) => [
              ...prev,
              {
                id: 'user-' + Date.now(),
                sender: 'user',
                text: starterText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        }, 1500);
      });
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const query = textInput.trim();
    setTextInput('');

    if (isConnected && vapiRef.current) {
      vapiRef.current.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: query
        }
      });
      setMessages((prev) => [
        ...prev,
        {
          id: 'user-' + Date.now(),
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      handleStart().then(() => {
        setTimeout(() => {
          if (vapiRef.current) {
            vapiRef.current.send({
              type: 'add-message',
              message: {
                role: 'user',
                content: query
              }
            });
            setMessages((prev) => [
              ...prev,
              {
                id: 'user-' + Date.now(),
                sender: 'user',
                text: query,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        }, 1500);
      });
    }
  };

  const handleSaveConfig = () => {
    const trimmedId = inputAssistantId.trim();
    const trimmedKey = inputPublicKey.trim();

    if (trimmedId) {
      setAssistantId(trimmedId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wandor_vapi_assistant_id', trimmedId);
      }
    }
    if (trimmedKey) {
      setPublicKey(trimmedKey);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wandor_vapi_public_key', trimmedKey);
      }
    }

    // Reset client to apply new keys
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {}
      vapiRef.current = null;
    }

    setErrorMessage(null);
    alert('Updated Voice AI Agent configuration!');
  };

  return (
    <div className="wandor-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 text-left flex flex-col h-full border border-stone-200/90 shadow-md relative overflow-hidden transition-all duration-300">
      {/* Warm Ambient Glow when connected */}
      {isConnected && (
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}

      {/* Card Header */}
      <div className="pb-3 border-b border-stone-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                isConnected
                  ? isSpeaking
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-stone-900 text-amber-300'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-none">
                Travel Agency AI
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-900 rounded-md border border-emerald-200/70">
                Voice Agent Active
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
              {isConnected ? (
                isSpeaking ? (
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    Agent Speaking...
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    Listening to you... Speak now!
                  </span>
                )
              ) : isStarting ? (
                <span className="text-stone-600 font-medium">Connecting agent...</span>
              ) : (
                <span>Ask where to go &amp; get live recommendations</span>
              )}
            </p>
          </div>
        </div>

        {/* Settings Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            title="Voice agent settings"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Settings Bar */}
      {showSettings && (
        <div className="mt-2.5 p-3 bg-stone-100/95 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2 animate-in fade-in duration-200">
          <div className="space-y-1">
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              Assistant ID:
            </span>
            <input
              type="text"
              value={inputAssistantId}
              onChange={(e) => setInputAssistantId(e.target.value)}
              placeholder="e0f0e7a0-76c2-4c40-..."
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-[11px] font-mono focus:outline-none focus:border-stone-500"
            />
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              Public Key:
            </span>
            <input
              type="text"
              value={inputPublicKey}
              onChange={(e) => setInputPublicKey(e.target.value)}
              placeholder="2aad0218-c70f-42d5-..."
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-[11px] font-mono focus:outline-none focus:border-stone-500"
            />
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Sound Wave & Microphone State Visualizer */}
      <div className="my-3 py-2 px-3 rounded-2xl bg-white/70 border border-stone-200/60 shadow-2xs flex items-center justify-between gap-2 min-h-[46px]">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1">
              {[40, 75, 55, 90, 60, 80, 45, 70].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isSpeaking
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500 animate-bounce'
                  }`}
                  style={{
                    height: isSpeaking ? `${Math.max(8, h * 0.28)}px` : `${Math.max(6, (audioLevel * 40) + ((i % 3) * 4))}px`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-400">
              <Headphones className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-600">Voice ready • Tap Start to talk</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isConnected && (
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                isMuted
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">{isMuted ? 'Muted' : 'Mic Active'}</span>
            </button>
          )}

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isStarting
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}
          >
            {isConnected ? 'Online' : isStarting ? 'Connecting...' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Notice Message if any */}
      {errorMessage && (
        <div className="mb-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-amber-600 hover:text-amber-900 font-bold ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-time Conversation Transcript Stream */}
      <div
        ref={transcriptContainerRef}
        className="flex-1 min-h-[160px] max-h-[220px] sm:max-h-[250px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-stone-300"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-3 text-stone-500 space-y-2">
            <Sparkles className="w-6 h-6 text-amber-600/80 animate-pulse" />
            <p className="text-xs font-medium text-stone-700">Talk to your AI travel consultant</p>
            <p className="text-[11px] text-stone-500 max-w-[240px] leading-relaxed">
              Ask for beach ideas, weekend escapes, or budget getaways. Then click{' '}
              <span className="font-semibold text-stone-800">"Plan This Trip"</span> to fill your search box!
            </p>

            {/* Quick Inspiration Starters */}
            <div className="pt-1 flex flex-wrap gap-1.5 justify-center">
              {SUGGESTION_STARTERS.slice(0, 2).map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendStarter(starter)}
                  className="text-[10px] text-stone-600 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200/90 rounded-full px-2.5 py-1 transition-all cursor-pointer shadow-2xs text-left"
                >
                  "{starter}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-stone-900 text-white rounded-br-xs'
                    : 'bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5 text-[9px] opacity-70">
                  <span className="font-semibold">
                    {msg.sender === 'user' ? 'You' : 'Travel Agency AI'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="text-[12px] whitespace-pre-wrap">{msg.text}</p>

                {/* 1-Click "Plan This Trip" button to bridge Agent suggestion directly to Search & Plan */}
                {msg.sender === 'agent' && onApplySuggestion && (
                  <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleUseSuggestion(msg.text, msg.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer border border-amber-300/60 shadow-2xs active:scale-95"
                      title="Copy recommendation into the search box beside and plan your trip"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied to Planner ✓</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3 text-amber-800" />
                          <span>Use in Trip Planner</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Text / Voice input bar */}
      {isConnected && (
        <form onSubmit={handleSendText} className="mt-2 pt-2 border-t border-stone-200/60 flex items-center gap-1.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Speak or type: 'Suggest 3 days in Bali'..."
            className="flex-1 bg-white border border-stone-300 rounded-full px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Main Call Action Footer */}
      <div className="pt-3 border-t border-stone-200/70 mt-2 flex items-center gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="flex-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-700 text-stone-950 font-bold text-xs sm:text-sm py-2.5 sm:py-3 px-4 rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/80"
          >
            {isStarting ? (
              <>
                <span className="w-4 h-4 border-2 border-stone-950/40 border-t-stone-950 rounded-full animate-spin" />
                <span>Connecting Agent...</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4 stroke-[2.5]" />
                <span>START VOICE CHAT</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 px-4 rounded-full shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-500"
          >
            <PhoneOff className="w-4 h-4 stroke-[2.5]" />
            <span>END CALL</span>
          </button>
        )}

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            title="Clear transcript history"
            className="p-2 sm:p-2.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
