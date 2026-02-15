'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechToText } from '@/lib/editor/hooks/useSpeechToText';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { applyBuildingConfig } from '@/lib/editor/utils/voiceAdapter';
import type { BuildingConfig } from '@/lib/buildingConfig';

type VoicePhase = 'idle' | 'listening' | 'designing' | 'speaking' | 'error';

interface VoiceResult {
  transcript: string;
  config: BuildingConfig | null;
  confirmation: string;
}

export function VoiceDesign() {
  const { addBuilding, getSelectedBuilding, updateBuilding } = useBuildings();
  const speech = useSpeechToText();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const processingRef = useRef(false);

  const placeholderText = (() => {
    switch (phase) {
      case 'idle':
        return 'Describe a building...';
      case 'listening':
        return 'Listening...';
      case 'designing':
        return 'Designing...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return errorMessage || 'Error. Try again.';
    }
  })();

  const handleVoiceDesign = useCallback(() => {
    setErrorMessage('');
    setPhase('listening');
    speech.reset();
    processingRef.current = false;
    speech.startListening();
  }, [speech]);

  const processSpeechResult = useCallback(
    async (transcript: string) => {
      if (!transcript) {
        setPhase('error');
        setErrorMessage('I did not catch that. Try again.');
        return;
      }

      setPhase('designing');

      try {
        const selectedBuilding = getSelectedBuilding();
        let previousConfig: Partial<BuildingConfig> | undefined;
        if (selectedBuilding) {
          const spec = selectedBuilding.spec;

          // Reverse-map existing spec fields back to BuildingConfig so
          // Gemini knows every current value and only changes what the user asks for.
          const textureReverseMap: Record<string, string> = {
            stucco: 'smooth', concrete: 'concrete', brick: 'brick',
            wood: 'wood', glass: 'glass',
          };
          const roofReverseMap: Record<string, string> = {
            flat: 'flat', gabled: 'gable', hipped: 'hip',
          };
          const windowShapeReverseMap: Record<string, string> = {
            rectangular: 'basic', arched: 'arched',
            circular: 'circular', triangular: 'triangular',
          };

          previousConfig = {
            floors: spec.numberOfFloors,
            width: spec.width,
            length: spec.depth,
            heightPerFloor: spec.floorHeight,
            wallColor: spec.wallColor || 'gray',
            windowStyle: (spec.windowPattern === 'none'
              ? 'none'
              : windowShapeReverseMap[spec.windowShape] || 'basic') as BuildingConfig['windowStyle'],
            texture: (textureReverseMap[spec.wallTexture] || 'concrete') as BuildingConfig['texture'],
            roofStyle: (roofReverseMap[spec.roofType] || 'flat') as BuildingConfig['roofStyle'],
            style: 'modern',
          };
        }

        const designResponse = await fetch('/api/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, previousConfig }),
        });

        if (!designResponse.ok) {
          const errorData = await designResponse.json();
          throw new Error(errorData.error || `Design API returned ${designResponse.status}`);
        }

        const { config, confirmation } = (await designResponse.json()) as {
          config: BuildingConfig;
          confirmation: string;
        };

        setLastResult({ transcript, config, confirmation });

        const specUpdates = applyBuildingConfig(config);
        if (selectedBuilding) {
          updateBuilding(selectedBuilding.id, specUpdates);
        } else {
          addBuilding({ x: 0, y: 0, z: 0 }, specUpdates);
        }

        setPhase('speaking');
        try {
          const speakResponse = await fetch('/api/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: confirmation }),
          });

          if (speakResponse.ok) {
            const audioBlob = await speakResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              setPhase('idle');
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              setPhase('idle');
            };
            await audio.play();
          } else {
            console.warn('Voice unavailable: /api/speak returned', speakResponse.status);
            setPhase('idle');
          }
        } catch (speakError) {
          console.warn('Voice unavailable:', speakError);
          setPhase('idle');
        }
      } catch (designError) {
        setPhase('error');
        setErrorMessage(
          designError instanceof Error ? designError.message : 'Failed to design building.'
        );
      }
    },
    [getSelectedBuilding, updateBuilding, addBuilding]
  );

  useEffect(() => {
    if (phase !== 'listening') return;

    if (speech.status === 'done' && speech.transcript && !processingRef.current) {
      processingRef.current = true;
      processSpeechResult(speech.transcript);
    } else if (speech.status === 'error' && !processingRef.current) {
      processingRef.current = true;
      setPhase('error');
      setErrorMessage(speech.error || 'Speech recognition failed.');
    }
  }, [speech.status, speech.transcript, speech.error, phase, processSpeechResult]);

  const isActive = phase !== 'idle' && phase !== 'error';

  // Pulsing ring color for the mic button based on phase
  const micRingClass = (() => {
    switch (phase) {
      case 'listening':
        return 'ring-4 ring-blue-400/50 animate-pulse';
      case 'designing':
        return 'ring-4 ring-amber-400/50 animate-pulse';
      case 'speaking':
        return 'ring-4 ring-green-400/50';
      default:
        return '';
    }
  })();

  const micBgClass = (() => {
    switch (phase) {
      case 'listening':
        return 'bg-blue-500 text-white border border-blue-400/50';
      case 'designing':
        return 'bg-amber-500 text-white border border-amber-400/50';
      case 'speaking':
        return 'bg-green-500 text-white border border-green-400/50';
      case 'error':
        return 'bg-red-500 text-white border border-red-400/50';
      default:
        return 'bg-white/20 text-white/80 hover:bg-violet-500 hover:text-white border border-white/20 hover:border-violet-400/50';
    }
  })();

  return (
    <div className="voice-bar-animate fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center px-8 pb-8">
      {/* Popover: Last Voice Command details - minimal transparent theme */}
      {lastResult && showDetails && (
        <div className="mb-3 w-full max-w-2xl bg-black/30 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wide" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
              Last Voice Command
            </span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-white/80 mb-1" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Transcript</p>
              <p className="text-sm text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>&ldquo;{lastResult.transcript}&rdquo;</p>
            </div>
            {lastResult.config && (
              <div>
                <p className="text-xs font-medium text-white/80 mb-1" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Parsed Config</p>
                <pre className="text-[11px] bg-black/20 rounded-lg p-2.5 overflow-x-auto text-white leading-relaxed max-h-32 overflow-y-auto border border-white/10">
                  {JSON.stringify(lastResult.config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wide Voice Input Bar - minimal transparent theme */}
      <div className={`group relative w-full max-w-3xl flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-2xl shadow-xl border px-6 py-3 transition-all duration-300 ${
        phase === 'listening' ? 'border-blue-500/40 shadow-blue-500/10' :
        phase === 'designing' ? 'border-amber-500/40 shadow-amber-500/10' :
        phase === 'speaking' ? 'border-green-500/40 shadow-green-500/10' :
        phase === 'error' ? 'border-red-500/40 shadow-red-500/10' :
        isActive 
          ? 'border-emerald-500/40 shadow-emerald-500/10' 
          : 'border-white/10 hover:border-emerald-500/30'
      }`}>
        {/* Corner brackets on hover or active - subtle */}
        <div className={`absolute top-3 left-3 w-6 h-6 transition-opacity duration-300 ${
          isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
        }`}>
          <div className={`absolute top-0 left-0 w-4 h-0.5 ${
            phase === 'listening' ? 'bg-blue-400' :
            phase === 'designing' ? 'bg-amber-400' :
            phase === 'speaking' ? 'bg-green-400' :
            'bg-emerald-400'
          }`} />
          <div className={`absolute top-0 left-0 w-0.5 h-4 ${
            phase === 'listening' ? 'bg-blue-400' :
            phase === 'designing' ? 'bg-amber-400' :
            phase === 'speaking' ? 'bg-green-400' :
            'bg-emerald-400'
          }`} />
        </div>
        <div className={`absolute bottom-3 right-3 w-6 h-6 transition-opacity duration-300 ${
          isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
        }`}>
          <div className={`absolute bottom-0 right-0 w-4 h-0.5 ${
            phase === 'listening' ? 'bg-blue-400' :
            phase === 'designing' ? 'bg-amber-400' :
            phase === 'speaking' ? 'bg-green-400' :
            'bg-emerald-400'
          }`} />
          <div className={`absolute bottom-0 right-0 w-0.5 h-4 ${
            phase === 'listening' ? 'bg-blue-400' :
            phase === 'designing' ? 'bg-amber-400' :
            phase === 'speaking' ? 'bg-green-400' :
            'bg-emerald-400'
          }`} />
        </div>
        
        {/* Mic Button */}
        <button
          onClick={handleVoiceDesign}
          disabled={isActive}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 shadow-lg ${micBgClass} ${micRingClass} disabled:cursor-not-allowed`}
          title="Voice Design"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        {/* Text / Status area - expanded with label */}
        <div className="flex-1 flex flex-col">
          <span className={`text-xs font-medium mb-0.5 transition-colors duration-200 ${
            isActive ? 'voice-label-active' : ''
          } ${
            phase === 'listening' ? 'text-blue-400' :
            phase === 'designing' ? 'text-amber-400' :
            phase === 'speaking' ? 'text-green-400' :
            phase === 'error' ? 'text-red-400' :
            'text-emerald-400'
          }`} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
            {phase === 'listening' ? '🎤 Listening...' :
             phase === 'designing' ? '⚙️ Designing...' :
             phase === 'speaking' ? '🔊 Speaking...' :
             phase === 'error' ? '❌ Error' :
             'Voice Design'}
          </span>
          <span
            className={`text-sm select-none transition-colors duration-200 ${
              phase === 'error' ? 'text-red-400' : 'text-white/70'
            }`}
            style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}
          >
            {lastResult && phase === 'idle'
              ? `"${lastResult.transcript.length > 80 ? lastResult.transcript.slice(0, 80) + '...' : lastResult.transcript}"`
              : placeholderText}
          </span>
        </div>

        {/* Show details button (only when we have a result) */}
        {lastResult && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 shadow-lg ${
              showDetails
                ? 'bg-violet-500/40 text-violet-300 border border-violet-400/50'
                : 'bg-white/20 text-white/70 hover:bg-white/30 hover:text-white border border-white/20'
            }`}
            title="Show details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </button>
        )}

        {/* Send / Arrow button (acts as secondary trigger) */}
        <button
          onClick={handleVoiceDesign}
          disabled={isActive}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/50 shadow-lg shrink-0"
          title="Start voice design"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
