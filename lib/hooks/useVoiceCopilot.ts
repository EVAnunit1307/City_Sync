'use client';

import { useState, useCallback, useRef } from 'react';

export type CopilotPhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceCopilotResult {
  phase: CopilotPhase;
  transcript: string;
  response: string;
  error: string;
  startListening: () => void;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

/**
 * Hook for voice copilot on the map page.
 * Uses Web Speech API for STT and ElevenLabs /api/speak for TTS.
 */
export function useVoiceCopilot(): VoiceCopilotResult {
  const [phase, setPhase] = useState<CopilotPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase('idle');
  }, []);

  const speak = useCallback(async (text: string) => {
    setResponse(text);
    setPhase('speaking');
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.warn('TTS unavailable:', res.status);
        setPhase('idle');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPhase('idle');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPhase('idle');
      };
      await audio.play();
    } catch {
      console.warn('TTS playback failed');
      setPhase('idle');
    }
  }, []);

  const startListening = useCallback(() => {
    setError('');
    setTranscript('');
    setResponse('');

    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setPhase('error');
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setPhase('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (result?.isFinal) {
        const text = result[0].transcript.trim();
        if (!text || /^(um|uh|hmm|ah|er|like)$/i.test(text)) {
          setPhase('error');
          setError('I did not catch that. Try again.');
        } else {
          setTranscript(text);
          setPhase('processing');
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') {
        setPhase('idle');
        return;
      }
      setPhase('error');
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access denied.'
          : event.error === 'no-speech'
            ? 'No speech detected. Try again.'
            : `Speech error: ${event.error}`
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setPhase((p) => (p === 'listening' ? 'error' : p));
    };

    try {
      recognition.start();
    } catch {
      setPhase('error');
      setError('Failed to start speech recognition.');
    }
  }, []);

  return { phase, transcript, response, error, startListening, speak, stop };
}
