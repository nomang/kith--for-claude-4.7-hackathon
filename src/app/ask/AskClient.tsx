'use client';

import { useState, useRef, useCallback } from 'react';
import type { AgentResult, TraceStep } from '@/services/claudeAgent';

/* ── Voice helpers ── */
type RecogLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; abort: () => void;
};

function makeSpeechRecognition(): RecogLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'en-GB'; r.continuous = false; r.interimResults = false;
  return r;
}

function speakText(text: string, onEnd?: () => void) {
  window.speechSynthesis?.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9; utter.lang = 'en-GB';
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const v = voices.find(v => v.lang.startsWith('en-GB')) ?? null;
  if (v) utter.voice = v;
  if (onEnd) { utter.onend = onEnd; utter.onerror = onEnd; }
  window.speechSynthesis?.speak(utter);
}

const EXAMPLE_QUESTIONS = [
  'Has she been mentioning George more this week?',
  'Is the afternoon confusion getting worse?',
  'What has been bringing her the most joy lately?',
  'Are there any new concerns I should know about?',
];

type State = 'idle' | 'investigating' | 'done' | 'error';

export default function AskClient({ name }: { name: string }) {
  const [state, setState] = useState<State>('idle');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [micActive, setMicActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recogRef = useRef<RecogLike | null>(null);

  const startVoiceInput = useCallback(() => {
    const recog = makeSpeechRecognition();
    if (!recog) return;
    recogRef.current = recog;
    setMicActive(true);

    recog.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      recog.abort();
      setMicActive(false);
      if (text) { setQuestion(text); submit(text); }
    };
    recog.onerror = () => { setMicActive(false); };
    recog.onend = () => setMicActive(false);
    recog.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (q?: string) => {
    const finalQ = (q ?? question).trim();
    if (!finalQ) return;
    setQuestion(finalQ);
    setState('investigating');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQ }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AgentResult = await res.json();
      setResult(data);
      setState('done');
      // Read the answer aloud automatically
      if (data.answer) speakText(data.answer);
    } catch (e) {
      setErrorMsg(String(e));
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setQuestion('');
    setResult(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <main className="ask-main">
      <header className="ask-header">
        <p className="ask-eyebrow">Kith · Investigator</p>
        <h1 className="ask-title">Ask about {name}</h1>
        <p className="ask-subtitle">
          Ask anything about how {name} has been. Kith reads her own notes and
          conversation history before answering — no claims without a source.
        </p>
      </header>

      {/* ── Idle: question input ── */}
      {state === 'idle' && (
        <div className="ask-input-wrap">
          <textarea
            ref={textareaRef}
            id="tour-ask-input" className="ask-textarea"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={`Has ${name} been mentioning anyone in particular? Is she more anxious in the evenings?`}
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            autoFocus
          />
          <div className="ask-input-actions">
            <button
              className={`ask-mic-btn ${micActive ? 'ask-mic-btn--active' : ''}`}
              onClick={startVoiceInput}
              title={micActive ? 'Listening…' : 'Ask by voice'}
              aria-label={micActive ? 'Listening…' : 'Ask by voice'}
            >
              {micActive ? '⏹' : '🎤'}
            </button>
            <span className="ask-hint">{micActive ? 'Listening…' : '⌘ Enter to submit'}</span>
            <button
              className="ask-submit-btn"
              onClick={() => submit()}
              disabled={!question.trim() || micActive}
            >
              Investigate →
            </button>
          </div>

          <div className="ask-examples">
            <p className="ask-examples-label">Examples</p>
            <div className="ask-example-chips">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} className="ask-chip" onClick={() => submit(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Investigating ── */}
      {state === 'investigating' && (
        <div className="ask-investigating">
          <div className="ask-spinner-wrap">
            <div className="ask-spinner" />
          </div>
          <p className="ask-inv-question">"{question}"</p>
          <div className="ask-inv-steps">
            <p className="ask-inv-step">· Checking which notebooks are relevant</p>
            <p className="ask-inv-step">· Reading conversation history</p>
            <p className="ask-inv-step">· Looking for patterns</p>
            <p className="ask-inv-step">· Drafting a cited answer</p>
          </div>
          <p className="ask-inv-note">This takes 20–40 seconds — Kith is reading carefully.</p>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="ask-error-wrap">
          <p className="ask-error">{errorMsg}</p>
          <button className="ask-reset-btn" onClick={reset}>Try again</button>
        </div>
      )}

      {/* ── Done: answer ── */}
      {state === 'done' && result && (
        <div className="ask-result">
          {/* Answer card */}
          <div className="ask-answer-card">
            <div className="ask-answer-header">
              <span className="ask-answer-label">Kith's answer</span>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            <div className="ask-answer-question">"{question}"</div>
            <div className="ask-answer-body">
              {result.answer.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {result.suggested_follow_up && (
              <div className="ask-follow-up">
                <span className="ask-follow-up-label">One thing to try</span>
                <p>{result.suggested_follow_up}</p>
              </div>
            )}
          </div>

          {/* Trace */}
          <details className="ask-trace-wrap">
            <summary className="ask-trace-summary">
              How Kith investigated this
              <span className="ask-trace-meta">
                {result.iterations_used} steps · ~{Math.round(result.tokens_used / 1000)}k tokens
              </span>
            </summary>
            <div className="ask-trace">
              {result.trace.map((step, i) => (
                <TraceRow key={i} step={step} />
              ))}
            </div>
          </details>

          {/* Evidence */}
          {result.evidence.length > 0 && (
            <details className="ask-evidence-wrap" open>
              <summary className="ask-evidence-summary">Sources ({result.evidence.length})</summary>
              <div className="ask-evidence">
                {result.evidence.map((e, i) => (
                  <div key={i} className="ask-evidence-item">
                    <p className="ask-evidence-claim">"{e.claim}"</p>
                    <p className="ask-evidence-source">→ {e.source}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          <button className="ask-reset-btn" onClick={reset}>Ask another question</button>
        </div>
      )}
    </main>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    high: 'ask-conf--high',
    medium: 'ask-conf--medium',
    low: 'ask-conf--low',
  };
  return (
    <span className={`ask-conf ${map[confidence] ?? ''}`}>
      {confidence} confidence
    </span>
  );
}

function TraceRow({ step }: { step: TraceStep }) {
  const icons: Record<string, string> = {
    list_notebook_files: '📂',
    read_notebook_file: '📖',
    search_conversations: '🔍',
    check_recurrence: '📊',
    read_personhood_section: '👤',
    finalize_answer: '✓',
  };
  return (
    <div className="ask-trace-row">
      <span className="ask-trace-icon">{icons[step.tool] ?? '·'}</span>
      <div className="ask-trace-content">
        <span className="ask-trace-tool">{step.tool.replace(/_/g, ' ')}</span>
        {step.input && Object.keys(step.input).length > 0 && step.tool !== 'finalize_answer' && (
          <span className="ask-trace-input">
            {JSON.stringify(step.input).slice(0, 80)}
          </span>
        )}
        <span className="ask-trace-result">{step.result_summary}</span>
      </div>
    </div>
  );
}
