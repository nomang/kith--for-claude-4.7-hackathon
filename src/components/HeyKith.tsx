'use client';

/**
 * Always-on floating Kith assistant.
 * Wake word: "Hey Kith" — detected via continuous SpeechRecognition.
 * Once activated: multi-turn hands-free voice conversation using
 * Opus 4.7 (full Ellie context) + Gemini TTS.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

type AssistantState =
  | 'dormant'     // orb in corner, wake word listening silently
  | 'waking'      // "Hey Kith" detected — brief activation glow
  | 'listening'   // mic open, waiting for user speech
  | 'thinking'    // sent to Opus 4.7
  | 'speaking'    // Kith responding via TTS
  | 'error';

type Message = { role: 'user' | 'assistant'; content: string };

// Shared recognition shim
type RecogLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((e: Event) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

function makeRecognition(continuous: boolean): RecogLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'en-GB';
  r.continuous = continuous;
  r.interimResults = false;
  return r;
}

export default function HeyKith() {
  const [state, setState] = useState<AssistantState>('dormant');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState<Message[]>([]);

  const wakeRecogRef = useRef<RecogLike | null>(null);
  const sessionRecogRef = useRef<RecogLike | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeRef = useRef(false); // prevent re-entry
  const stateRef = useRef<AssistantState>('dormant');
  stateRef.current = state;

  const historyRef = useRef<Message[]>([]);
  historyRef.current = history;

  // ── Audio helpers ─────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* ended */ }
    window.speechSynthesis?.cancel();
  }, []);

  // HeyKith always uses speechSynthesis — works from SpeechRecognition callbacks,
  // no AudioContext needed, no API key needed, guaranteed to play.
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis?.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-GB';
      utter.rate = 0.9;
      utter.pitch = 1.05;

      // Pick a warm female voice if available
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Moira') || v.name.includes('Fiona'))
      ) ?? voices.find(v => v.lang.startsWith('en-GB')) ?? null;
      if (preferred) utter.voice = preferred;

      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis?.speak(utter);
    });
  }, []);

  // ── Send utterance to Kith ────────────────────────────────────────────────
  const sendToKith = useCallback(async (utterance: string) => {
    if (!utterance.trim()) { listenForInput(); return; }

    setState('thinking');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance, history: historyRef.current }),
      });
      const data = await res.json();
      const spoken: string = data.spoken_response ?? '';

      setResponse(spoken);
      setHistory(h => [
        ...h,
        { role: 'user', content: utterance },
        { role: 'assistant', content: spoken },
      ]);

      setState('speaking');
      await speakText(spoken);

      // Auto-listen after Kith finishes, unless dismissed
      if (stateRef.current !== 'dormant') {
        listenForInput();
      }
    } catch {
      setState('error');
      setTimeout(() => deactivate(), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakText]);

  // ── Listen for one user turn ──────────────────────────────────────────────
  const listenForInput = useCallback(() => {
    if (stateRef.current === 'dormant') return;

    const recog = makeRecognition(false);
    if (!recog) { deactivate(); return; }
    sessionRecogRef.current = recog;
    setState('listening');

    recog.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      const text = e.results[e.resultIndex][0].transcript.trim();
      recog.abort();
      setTranscript(text);

      // Dismiss on "goodbye" / "bye kith" / "stop"
      const lower = text.toLowerCase();
      if (lower.includes('goodbye') || lower.includes('bye kith') || lower.includes('stop kith')) {
        deactivate();
        return;
      }
      sendToKith(text);
    };

    recog.onerror = () => setState('error');

    recog.onend = () => {
      // If still listening and no result, re-listen (brief silence)
      if (stateRef.current === 'listening') {
        setTimeout(() => {
          if (stateRef.current === 'listening') listenForInput();
        }, 500);
      }
    };

    recog.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToKith]);

  // ── Activate session ──────────────────────────────────────────────────────
  const activate = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;

    wakeRecogRef.current?.stop();
    setState('waking');

    // Prime speechSynthesis — first call may be silent on some browsers
    const primer = new SpeechSynthesisUtterance('');
    primer.volume = 0;
    window.speechSynthesis?.speak(primer);

    // Greeting
    await speakText('Hello. I\'m listening.');

    if (stateRef.current !== 'dormant') {
      listenForInput();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakText, listenForInput]);

  // ── Deactivate session ────────────────────────────────────────────────────
  const deactivate = useCallback(() => {
    stopAudio();
    sessionRecogRef.current?.abort();
    activeRef.current = false;
    setState('dormant');
    setTranscript('');
    setResponse('');
    setHistory([]);
    // Restart wake-word listener
    setTimeout(startWakeWord, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAudio]);

  // ── Wake-word listener (continuous, background) ───────────────────────────
  const startWakeWord = useCallback(() => {
    const recog = makeRecognition(true);
    if (!recog) return;
    wakeRecogRef.current = recog;

    recog.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.toLowerCase();
        if (text.includes('hey kith') || text.includes('hey keith') || text.includes('hi kith')) {
          recog.abort();
          activate();
          return;
        }
      }
    };

    recog.onerror = () => {
      // Silently restart
      setTimeout(startWakeWord, 2000);
    };

    recog.onend = () => {
      // Keep listening unless session is active
      if (stateRef.current === 'dormant') {
        setTimeout(startWakeWord, 500);
      }
    };

    try { recog.start(); } catch { /* browser blocked */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activate]);

  // Start wake-word listener on mount
  useEffect(() => {
    const t = setTimeout(startWakeWord, 1000);
    return () => {
      clearTimeout(t);
      wakeRecogRef.current?.abort();
      sessionRecogRef.current?.abort();
      stopAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDormant = state === 'dormant';

  return (
    <>
      {/* ── Floating orb (always visible) ── */}
      <button
        id="tour-hk-orb" className={`hk-orb hk-orb--${state}`}
        onClick={() => isDormant ? activate() : deactivate()}
        aria-label={isDormant ? 'Activate Kith voice assistant' : 'Dismiss Kith'}
        title={isDormant ? 'Say "Hey Kith" or tap to activate' : 'Tap to dismiss'}
      >
        <span className="hk-orb-ring hk-orb-ring-1" />
        <span className="hk-orb-ring hk-orb-ring-2" />
        <span className="hk-orb-core">
          {state === 'dormant'  && <KithIcon />}
          {state === 'waking'   && <KithIcon />}
          {state === 'listening' && <MicIcon />}
          {state === 'thinking' && <ThinkIcon />}
          {state === 'speaking' && <WaveIcon />}
          {state === 'error'    && <span style={{fontSize:16}}>!</span>}
        </span>
      </button>

      {/* ── Active session overlay ── */}
      {!isDormant && (
        <div className="hk-overlay" onClick={deactivate}>
          <div className="hk-panel" onClick={e => e.stopPropagation()}>

            {/* Status indicator */}
            <div className="hk-status">
              <div className={`hk-status-orb hk-status-orb--${state}`}>
                <span className="hk-status-ring" />
                <span className="hk-status-core">
                  {state === 'waking'    && <KithIcon size={28} />}
                  {state === 'listening' && <MicIcon size={28} />}
                  {state === 'thinking'  && <ThinkIcon size={28} />}
                  {state === 'speaking'  && <WaveIcon size={28} />}
                </span>
              </div>

              <p className="hk-status-label">
                {state === 'waking'    && 'Hello — I\'m listening…'}
                {state === 'listening' && 'Listening — speak naturally'}
                {state === 'thinking'  && 'Thinking…'}
                {state === 'speaking'  && 'Kith is speaking'}
                {state === 'error'     && 'Something went wrong'}
              </p>
            </div>

            {/* Transcript */}
            {transcript && state !== 'listening' && (
              <p className="hk-transcript">You: "{transcript}"</p>
            )}

            {/* Kith response */}
            {response && (
              <p className="hk-response">
                {state === 'speaking' && <span className="hk-speaking-dot" />}
                {response}
              </p>
            )}

            {/* Hint */}
            <p className="hk-hint">Say "goodbye" or tap outside to end</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function KithIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" />
    </svg>
  );
}

function ThinkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
    </svg>
  );
}

function WaveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 6v12M22 12h-2" strokeLinecap="round" />
    </svg>
  );
}
