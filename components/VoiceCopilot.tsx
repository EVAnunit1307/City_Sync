'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceCopilot, CopilotPhase } from '@/lib/hooks/useVoiceCopilot';
import { Mic, MicOff, Volume2, Loader2, X, ChevronUp } from 'lucide-react';

interface VoiceCopilotProps {
  /** Called when user gives a voice command (the transcript text) */
  onCommand?: (transcript: string) => void;
  /** Called to get AI response for the transcript (returns text to speak back) */
  onProcess?: (transcript: string) => Promise<string>;
  /** Optional context string shown in the UI */
  context?: string;
}

export default function VoiceCopilot({ onCommand, onProcess, context }: VoiceCopilotProps) {
  const copilot = useVoiceCopilot();
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [expanded, setExpanded] = useState(false);
  const processingRef = useRef(false);

  // When transcript arrives and phase is 'processing', handle the command
  useEffect(() => {
    if (copilot.phase !== 'processing' || !copilot.transcript || processingRef.current) return;
    processingRef.current = true;

    const transcript = copilot.transcript;
    setHistory(prev => [...prev, { role: 'user', text: transcript }]);

    onCommand?.(transcript);

    if (onProcess) {
      onProcess(transcript).then((response) => {
        setHistory(prev => [...prev, { role: 'assistant', text: response }]);
        copilot.speak(response);
        processingRef.current = false;
      }).catch(() => {
        const fallback = 'I understood your request. Processing now.';
        setHistory(prev => [...prev, { role: 'assistant', text: fallback }]);
        copilot.speak(fallback);
        processingRef.current = false;
      });
    } else {
      const ack = `Got it: "${transcript}". Processing your request.`;
      setHistory(prev => [...prev, { role: 'assistant', text: ack }]);
      copilot.speak(ack);
      processingRef.current = false;
    }
  }, [copilot.phase, copilot.transcript, onCommand, onProcess, copilot]);

  const handleMicClick = useCallback(() => {
    if (copilot.phase === 'idle' || copilot.phase === 'error') {
      copilot.startListening();
    } else {
      copilot.stop();
    }
  }, [copilot]);

  const phaseLabel = (() => {
    switch (copilot.phase) {
      case 'idle': return 'Click to speak';
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return copilot.error || 'Error';
    }
  })();

  const micBg = (() => {
    switch (copilot.phase) {
      case 'listening': return 'bg-blue-500 text-white';
      case 'processing': return 'bg-amber-500 text-white';
      case 'speaking': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-100 text-red-500';
      default: return 'bg-white text-slate-600 hover:bg-violet-500 hover:text-white';
    }
  })();

  const ringClass = (() => {
    switch (copilot.phase) {
      case 'listening': return 'ring-4 ring-blue-400/50 animate-pulse';
      case 'processing': return 'ring-4 ring-amber-400/50 animate-pulse';
      case 'speaking': return 'ring-4 ring-green-400/50';
      default: return '';
    }
  })();

  const isActive = copilot.phase !== 'idle' && copilot.phase !== 'error';

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
      {/* Chat History Panel */}
      {expanded && history.length > 0 && (
        <div className="w-80 max-h-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Voice History
            </span>
            <button
              onClick={() => { setHistory([]); setExpanded(false); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
            {history.map((entry, i) => (
              <div
                key={i}
                className={`text-[11px] px-3 py-2 rounded-lg ${
                  entry.role === 'user'
                    ? 'bg-blue-50 text-blue-800 ml-8'
                    : 'bg-slate-50 text-slate-700 mr-8'
                }`}
              >
                <span className="font-bold text-[9px] uppercase tracking-wide block mb-0.5 opacity-60">
                  {entry.role === 'user' ? 'You' : 'GrowthSync'}
                </span>
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Control Island */}
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 pl-4 pr-1.5 py-1.5">
        {/* Status text */}
        <span className={`text-xs select-none min-w-[130px] ${
          copilot.phase === 'error' ? 'text-red-500' : 'text-slate-400'
        }`}>
          {phaseLabel}
        </span>

        {/* Expand history button */}
        {history.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              expanded
                ? 'bg-violet-100 text-violet-600'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            <ChevronUp size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Phase indicator icon */}
        {copilot.phase === 'processing' && (
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Loader2 size={14} className="text-amber-600 animate-spin" />
          </div>
        )}
        {copilot.phase === 'speaking' && (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Volume2 size={14} className="text-green-600" />
          </div>
        )}

        {/* Mic Button */}
        <button
          onClick={handleMicClick}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${micBg} ${ringClass} shadow-sm`}
          title={isActive ? 'Stop' : 'Start voice command'}
        >
          {isActive && copilot.phase !== 'error' ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
