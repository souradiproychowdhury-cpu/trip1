import React, { useState, useRef, useEffect } from 'react';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Compass,
  ArrowRight,
  RotateCcw,
  Bot,
  Copy,
  Check,
  Headphones,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle
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

const AGENT_ID = 'agent_6201m3s9th5te47btvj2xp97ssjy';

const SUGGESTION_STARTERS = [
  'Where should I go for a relaxing weekend?',
  'Suggest a hidden mountain destination',
  'Best romantic getaway for a couple',
  'Family-friendly adventure with kids'
];

const VoiceTravelAgentInner: React.FC<VoiceTravelAgentCardProps> = ({
  onApplySuggestion,
  currentPrompt,
  travelersCount = 2,
  selectedLanguage = 'Auto'
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<'webrtc' | 'websocket'>('webrtc');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs Voice Agent');
      setErrorMessage(null);
      setIsStarting(false);
      // Add welcome message if empty
      setMessages(prev => {
        if (prev.length === 0) {
          return [
            {
              id: 'welcome-' + Date.now(),
              sender: 'agent',
              text: "Hello! I'm your Travel Agency AI. Ask me for recommendations or where you'd like to travel!",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        }
        return prev;
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs Voice Agent');
      setIsStarting(false);
    },
    onMessage: (payload: any) => {
      console.log('ElevenLabs message payload:', payload);
      const text = payload?.message || payload?.text || payload?.agent_response || payload?.user_transcript;
      if (!text || typeof text !== 'string') return;

      const isAgent = payload.source === 'ai' || payload.role === 'agent' || payload.agent_response;
      const isUser = payload.source === 'user' || payload.role === 'user' || payload.user_transcript;

      setMessages(prev => [
        ...prev,
        {
          id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          sender: isUser ? 'user' : 'agent',
          text: text.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    },
    onError: (err: any) => {
      console.error('ElevenLabs Voice Agent Error:', err);
      setIsStarting(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Voice connection issue. Please check mic permissions.';
      setErrorMessage(msg);
    },
    onModeChange: (mode: any) => {
      console.log('ElevenLabs mode change:', mode);
    },
    clientTools: {
      fillTripSearch: async (args: any) => {
        console.log('Agent called client tool fillTripSearch:', args);
        const query = typeof args === 'string' ? args : args?.destination || args?.query || JSON.stringify(args);
        if (query && onApplySuggestion) {
          onApplySuggestion(query);
          return `Applied "${query}" to trip search box!`;
        }
        return 'Ready';
      }
    }
  });

  // Auto-scroll transcript container to bottom without affecting page scroll
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;
  const isListening = conversation.isListening || (isConnected && !isSpeaking);

  const handleStart = async () => {
    setErrorMessage(null);
    setIsStarting(true);
    try {
      // 1. Request microphone access explicitly to guide browser prompt
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // 2. Start session with ElevenLabs agent
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: connectionType
      });
    } catch (err: any) {
      console.error('Failed to start voice conversation:', err);
      setIsStarting(false);
      setErrorMessage(err?.message || 'Microphone access is required to talk with the travel agent.');
    }
  };

  const handleStop = async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.warn('Error ending session:', err);
    }
    setIsStarting(false);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (typeof conversation.setMuted === 'function') {
      conversation.setMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolumeState(newVol);
    if (typeof conversation.setVolume === 'function') {
      conversation.setVolume({ volume: newVol });
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
    if (isConnected && typeof conversation.sendUserMessage === 'function') {
      conversation.sendUserMessage(starterText);
    } else {
      handleStart().then(() => {
        setTimeout(() => {
          if (typeof conversation.sendUserMessage === 'function') {
            conversation.sendUserMessage(starterText);
          }
        }, 1200);
      });
    }
  };

  return (
    <div className="wandor-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 text-left flex flex-col h-full border border-stone-200/90 shadow-md relative overflow-hidden transition-all duration-300">
      {/* Decorative Warm Ambient Glow when connected */}
      {isConnected && (
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
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
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-900 rounded-md border border-amber-200/70">
                Voice Agent
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
                    Listening to you...
                  </span>
                )
              ) : isStarting ? (
                <span className="text-stone-600 font-medium">Connecting audio...</span>
              ) : (
                <span>Ask where to go &amp; get live suggestions</span>
              )}
            </p>
          </div>
        </div>

        {/* Settings / Connection options toggle */}
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
        <div className="mt-2.5 p-2.5 bg-stone-100/90 rounded-xl border border-stone-200/80 text-xs text-stone-700 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone-600">Connection Mode:</span>
            <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setConnectionType('webrtc')}
                disabled={isConnected}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  connectionType === 'webrtc'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                WebRTC
              </button>
              <button
                type="button"
                onClick={() => setConnectionType('websocket')}
                disabled={isConnected}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  connectionType === 'websocket'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                WebSocket
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-stone-600">Agent Volume:</span>
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-stone-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
              <span className="text-[10px] font-mono text-stone-500 w-7">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Sound Wave & State Visualizer */}
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
                      : isListening
                      ? 'bg-emerald-500'
                      : 'bg-stone-300'
                  }`}
                  style={{
                    height: isSpeaking ? `${Math.max(8, h * 0.28)}px` : isListening ? `${10 + (i % 3) * 4}px` : '6px',
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

      {/* Error Message Notice if any */}
      {errorMessage && (
        <div className="mb-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Real-time Conversation Transcript Stream */}
      <div ref={transcriptContainerRef} className="flex-1 min-h-[160px] max-h-[220px] sm:max-h-[250px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-stone-300">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-3 text-stone-500 space-y-2">
            <Sparkles className="w-6 h-6 text-amber-600/80 animate-pulse" />
            <p className="text-xs font-medium text-stone-700">
              Talk to your AI travel consultant
            </p>
            <p className="text-[11px] text-stone-500 max-w-[240px] leading-relaxed">
              Ask for beach ideas, weekend escapes, or budget getaways. Then click <span className="font-semibold text-stone-800">"Plan This Trip"</span> to fill your search box!
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

export const VoiceTravelAgentCard: React.FC<VoiceTravelAgentCardProps> = (props) => {
  return (
    <ConversationProvider>
      <VoiceTravelAgentInner {...props} />
    </ConversationProvider>
  );
};
