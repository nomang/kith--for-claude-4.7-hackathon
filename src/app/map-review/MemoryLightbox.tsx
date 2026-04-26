'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { ShoeboxPhoto } from './page';

type Stage =
  | 'idle'        // photo shown, play button visible
  | 'narrating'   // Kith speaking the memory
  | 'questioning' // Kith asking the follow-up question
  | 'listening'   // mic open, waiting for user
  | 'processing'  // sending to Claude
  | 'responding'  // Kith acknowledging
  | 'done';       // observation saved

type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void; abort: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'en-GB'; r.continuous = false; r.interimResults = false;
  return r;
}

export default function MemoryLightbox({
  photo,
  onClose,
}: {
  photo: ShoeboxPhoto;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [question, setQuestion] = useState('');
  const [acknowledgment, setAcknowledgment] = useState('');
  const [observation, setObservation] = useState('');
  const [transcript, setTranscript] = useState('');

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  const stopAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* ended */ }
    window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback(async (text: string, onEnd: () => void) => {
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('tts');
      const ab = await res.arrayBuffer();
      if (ctx.state === 'suspended') await ctx.resume();
      const decoded = await ctx.decodeAudioData(ab);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = onEnd;
      source.start(0);
    } catch {
      // browser fallback
      window.speechSynthesis?.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.88; utter.lang = 'en-GB';
      utter.onend = onEnd;
      utter.onerror = onEnd;
      window.speechSynthesis?.speak(utter);
    }
  }, []);

  // Step 1 — narrate the memory
  const startNarration = useCallback(async () => {
    setStage('narrating');
    const narrationText = `${photo.family_caption}. ${photo.vision_extraction.scene_description ?? ''}`;
    await speak(narrationText, () => {
      setStage('questioning');
      fetchQuestion();
    });
  }, [photo, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2 — fetch and speak the question
  const fetchQuestion = useCallback(async () => {
    try {
      const res = await fetch('/api/memory-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_title: photo.family_caption,
          memory_description: photo.vision_extraction.scene_description ?? '',
          vision_text: (photo.vision_extraction.raw_text_found as string[]).slice(0, 2).join(' '),
        }),
      });
      const data = await res.json();
      const q = data.question ?? '';
      setQuestion(q);
      await speak(q, () => {
        setStage('listening');
        startListening();
      });
    } catch {
      setQuestion('What comes to mind when you look at this moment?');
      setStage('listening');
      startListening();
    }
  }, [photo, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3 — open the mic
  const startListening = useCallback(() => {
    const recog = getSpeechRecognition();
    if (!recog) {
      setStage('done');
      return;
    }
    recogRef.current = recog;
    recog.onresult = (e) => {
      const text = e.results[0][0].transcript;
      recog.abort();
      setTranscript(text);
      setStage('processing');
      sendResponse(text);
    };
    recog.onerror = () => setStage('done');
    recog.onend = () => {
      setStage(s => s === 'listening' ? 'done' : s);
    };
    recog.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 4 — send response to Claude, get acknowledgment
  const sendResponse = useCallback(async (userText: string) => {
    try {
      const res = await fetch('/api/memory-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_title: photo.family_caption,
          memory_description: photo.vision_extraction.scene_description ?? '',
          vision_text: '',
          user_response: userText,
        }),
      });
      const data = await res.json();
      setAcknowledgment(data.acknowledgment ?? '');
      setObservation(data.observation ?? '');
      setStage('responding');
      await speak(data.acknowledgment ?? '', () => setStage('done'));
    } catch {
      setStage('done');
    }
  }, [photo, speak]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopAudio(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, stopAudio]);

  const handleClose = () => { stopAudio(); recogRef.current?.abort(); onClose(); };

  return (
    <div className="ml-overlay" onClick={handleClose}>
      <div className="ml-modal" onClick={e => e.stopPropagation()}>

        {/* ── Full-bleed photo backdrop ── */}
        <div className="ml-photo-backdrop">
          <Image
            src={photo.url}
            alt={photo.family_caption}
            fill
            className="ml-photo-bg"
            unoptimized
            priority
          />
          <div className="ml-photo-gradient" />

          {/* Decade badge */}
          <span className="ml-decade">{photo.decade}</span>

          {/* Close */}
          <button className="ml-close" onClick={handleClose} aria-label="Close">×</button>
        </div>

        {/* ── Interaction panel ── */}
        <div className="ml-panel">
          <p className="ml-caption">"{photo.family_caption}"</p>

          {/* State-driven content */}
          <div className="ml-stage-area">
            {stage === 'idle' && (
              <button className="ml-play-btn" onClick={startNarration}>
                <span className="ml-play-icon">▶</span>
                <span>Hear Kith tell this story</span>
              </button>
            )}

            {stage === 'narrating' && (
              <div className="ml-speaking">
                <div className="ml-wave">{[...Array(6)].map((_, i) => (
                  <span key={i} className="ml-wave-bar" style={{ animationDelay: `${i * 0.09}s` }} />
                ))}</div>
                <p className="ml-stage-label">Kith is speaking…</p>
              </div>
            )}

            {stage === 'questioning' && (
              <div className="ml-speaking">
                <div className="ml-wave">{[...Array(6)].map((_, i) => (
                  <span key={i} className="ml-wave-bar" style={{ animationDelay: `${i * 0.09}s` }} />
                ))}</div>
                <p className="ml-stage-label">Kith is asking…</p>
              </div>
            )}

            {stage === 'listening' && (
              <div className="ml-listening-stage">
                <p className="ml-question-text">"{question}"</p>
                <div className="ml-mic-ring">
                  <div className="ml-mic-pulse" />
                  <span className="ml-mic-icon">🎤</span>
                </div>
                <p className="ml-stage-label">Listening — speak naturally</p>
              </div>
            )}

            {stage === 'processing' && (
              <div className="ml-processing">
                {transcript && <p className="ml-transcript">You said: "{transcript}"</p>}
                <div className="ml-dots">
                  <span /><span /><span />
                </div>
                <p className="ml-stage-label">Kith is reflecting…</p>
              </div>
            )}

            {stage === 'responding' && (
              <div className="ml-responding">
                <div className="ml-wave">{[...Array(6)].map((_, i) => (
                  <span key={i} className="ml-wave-bar ml-wave-bar--warm" style={{ animationDelay: `${i * 0.09}s` }} />
                ))}</div>
                {acknowledgment && <p className="ml-acknowledgment">"{acknowledgment}"</p>}
              </div>
            )}

            {stage === 'done' && (
              <div className="ml-done">
                {acknowledgment && <p className="ml-acknowledgment">"{acknowledgment}"</p>}
                {observation && (
                  <div className="ml-observation">
                    <span className="ml-obs-label">📋 Observation saved</span>
                    <p className="ml-obs-text">{observation}</p>
                  </div>
                )}
                <button className="ml-again-btn" onClick={() => {
                  setStage('idle');
                  setQuestion(''); setAcknowledgment('');
                  setObservation(''); setTranscript('');
                }}>
                  Revisit this memory
                </button>
              </div>
            )}
          </div>

          {/* Vision details — collapsed at bottom */}
          {(photo.vision_extraction.raw_text_found as string[]).length > 0 && (
            <details className="ml-details">
              <summary className="ml-details-summary">What Kith read in this photo</summary>
              <ul className="ml-details-list">
                {(photo.vision_extraction.raw_text_found as string[]).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
              {(photo.vision_extraction.personhood_map_additions as string[]).length > 0 && (
                <>
                  <p className="ml-details-added-label">Added to Personhood Map</p>
                  <ul className="ml-details-list">
                    {(photo.vision_extraction.personhood_map_additions as string[]).map((a, i) => (
                      <li key={i}>✓ {a}</li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
