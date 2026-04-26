'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { KithMessage } from '@/services/claude';

type MicState = 'resting' | 'listening' | 'processing' | 'speaking';

type SpeechRecognitionInstance = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechRecognitionEvent = { results: { 0: { 0: { transcript: string } } } };

function createRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = false;
  r.lang = 'en-GB';
  return r;
}

/* ── Reliable audio playback ─────────────────────────────────────────────── */
async function playAudio(
  arrayBuffer: ArrayBuffer,
  ctx: AudioContext,
  sourceRef: { current: AudioBufferSourceNode | null },
  onEnd: () => void
): Promise<boolean> {
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0)); // slice ensures ownership
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    sourceRef.current = source;
    source.onended = onEnd;
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

function speakFallback(text: string, onEnd: () => void) {
  window.speechSynthesis?.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9; utter.lang = 'en-GB';
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const v = voices.find(v => v.lang.startsWith('en-GB') && !v.name.includes('Google'))
         ?? voices.find(v => v.lang.startsWith('en'));
  if (v) utter.voice = v;
  utter.onend = onEnd; utter.onerror = onEnd;
  window.speechSynthesis?.speak(utter);
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function TalkScreen({ name, anchors }: { name: string; anchors: string[] }) {
  const [micState, setMicState] = useState<MicState>('resting');
  const [kithText, setKithText] = useState('');
  const [statusHint, setStatusHint] = useState('');   // sub-label under the mic
  const [hasUsedMic, setHasUsedMic] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState('');
  const [dayDisplay, setDayDisplay] = useState('');
  const [history, setHistory] = useState<KithMessage[]>([]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const historyRef = useRef<KithMessage[]>([]);
  const retryRef = useRef(0);  // counts no-speech retries
  historyRef.current = history;

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes().toString().padStart(2, '0');
      const ampm = hour < 12 ? 'am' : 'pm';
      const h12 = hour % 12 || 12;
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      setTimeDisplay(`${h12}:${min} ${ampm}`);
      setDayDisplay(`${now.toLocaleDateString('en-GB', { weekday: 'long' })} ${period}`);
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Send to Kith with parallel TTS fetch ─────────────────────────────────
  const sendToKith = useCallback(async (text: string) => {
    setMicState('processing');
    setStatusHint('');
    retryRef.current = 0;

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utterance: text, history: historyRef.current }),
      });
      if (!chatRes.ok) throw new Error(`Chat ${chatRes.status}`);
      const data = await chatRes.json();
      const spoken: string = data.spoken_response ?? '';

      // Show text immediately — user sees the answer before audio starts
      setKithText(spoken);
      setHistory(h => [...h, { role: 'user', content: text }, { role: 'assistant', content: spoken }]);
      setMicState('speaking');

      // Fetch TTS in background — start playing as soon as it arrives
      const ctx = audioCtxRef.current;
      let played = false;

      if (ctx && ctx.state !== 'closed') {
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: spoken }),
          });
          if (ttsRes.ok) {
            const ab = await ttsRes.arrayBuffer();
            played = await playAudio(ab, ctx, sourceRef, () => setMicState('resting'));
          }
        } catch { /* fall through */ }
      }

      if (!played) {
        speakFallback(spoken, () => setMicState('resting'));
      }

    } catch (err) {
      console.error('[Kith]', err);
      setKithText("I'm gathering my thoughts — give me a moment.");
      setMicState('resting');
    }
  }, []);

  // ── Start recognition with auto-retry on no-speech ───────────────────────
  const startListening = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) { setMicState('resting'); return; }
    recognitionRef.current = recognition;

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      recognition.abort();
      if (text) sendToKith(text);
      else startListening(); // empty result — try again
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' && retryRef.current < 2) {
        // Silently retry up to 2 times
        retryRef.current += 1;
        setStatusHint('Still listening…');
        startListening();
      } else if (e.error === 'not-allowed') {
        setStatusHint('Microphone permission denied');
        setMicState('resting');
      } else {
        setMicState('resting');
        setStatusHint('');
      }
    };

    recognition.onend = () => {
      setMicState(s => s === 'listening' ? 'resting' : s);
    };

    try {
      recognition.start();
    } catch {
      setMicState('resting');
    }
  }, [sendToKith]);

  // ── Mic button tap ────────────────────────────────────────────────────────
  const handleMicTap = useCallback(() => {
    if (micState === 'speaking') {
      try { sourceRef.current?.stop(); } catch { /* ended */ }
      window.speechSynthesis?.cancel();
      setMicState('resting');
      return;
    }

    if (micState === 'listening') {
      recognitionRef.current?.stop();
      return;
    }

    if (micState === 'processing') return;

    // Unlock AudioContext on first tap (must happen synchronously in click handler)
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    audioCtxRef.current.resume().catch(() => {});

    setMicState('listening');
    setHasUsedMic(true);
    setStatusHint('');
    retryRef.current = 0;
    startListening();
  }, [micState, startListening]);

  // Spacebar shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleMicTap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMicTap]);

  const micLabel =
    micState === 'resting'    ? 'Tap to talk to Kith' :
    micState === 'listening'  ? 'Listening…' :
    micState === 'processing' ? 'Kith is thinking…' :
                                'Kith is speaking — tap to stop';

  return (
    <main className="talk-main">
      {/* Clock */}
      <div className="talk-clock">
        <div className="talk-clock-time">{timeDisplay}</div>
        <div className="talk-clock-day">{dayDisplay}</div>
      </div>

      {/* Kith response */}
      <div className="talk-response" aria-live="polite" aria-atomic="true">
        {kithText || `Hello, ${name}.`}
      </div>

      {/* Mic button */}
      <div className="mic-wrapper">
        <button
          id="tour-mic-btn"
          onClick={handleMicTap}
          aria-label={micLabel}
          aria-pressed={micState === 'listening'}
          className={`mic-btn mic-${micState}`}
        >
          <span className="mic-ring mic-ring-1" />
          <span className="mic-ring mic-ring-2" />
          <span className="mic-core" />
        </button>
        {!hasUsedMic && micState === 'resting' && (
          <p className="talk-helper">tap to talk to Kith</p>
        )}
        {statusHint && (
          <p className="talk-helper" style={{ color: 'var(--coral)' }}>{statusHint}</p>
        )}
      </div>

      {/* Anchors */}
      {anchors.length > 0 && (
        <div className="talk-anchors">
          {anchors.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}

      <RemindersWidget />
    </main>
  );
}

/* ── Reminders Widget ────────────────────────────────────────────────────── */
interface Reminder { time: string; activity: string; message: string; urgency: string; comfort_cue?: string; }

function RemindersWidget() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reminders');
      const data = await res.json();
      setReminders(data.reminders ?? []);
      setShown(true);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  if (!shown) {
    return (
      <button className="reminders-trigger" onClick={load} disabled={loading}>
        {loading ? '…' : '🔔'} {loading ? 'Loading' : "What's on today?"}
      </button>
    );
  }

  return (
    <div className="reminders-panel">
      <div className="reminders-header">
        <span className="reminders-title">Today's reminders</span>
        <button className="reminders-close" onClick={() => setShown(false)}>×</button>
      </div>
      {reminders.length === 0
        ? <p className="reminders-empty">Nothing specific right now — carry on.</p>
        : reminders.map((r, i) => (
          <div key={i} className={`reminder-item reminder-item--${r.urgency}`}>
            <span className="reminder-dot" />
            <div>
              <p className="reminder-message">{r.message}</p>
              {r.comfort_cue && <p className="reminder-cue">{r.comfort_cue}</p>}
            </div>
          </div>
        ))
      }
    </div>
  );
}
