'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PersonhoodMapFixed, Confidence } from '@/models/personhoodMap';
import type { ShoeboxPhoto } from './page';
import MemoryLightbox from './MemoryLightbox';

/* ── AudioNarrator ──────────────────────────────────────────────────────── */
type PlayState = 'idle' | 'loading' | 'playing';

function AudioNarrator({ text, size = 'sm' }: { text: string; size?: 'sm' | 'lg' }) {
  const [state, setState] = useState<PlayState>('idle');
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* ended */ }
    window.speechSynthesis?.cancel();
    setState('idle');
  }, []);

  const play = useCallback(async () => {
    if (state === 'playing') { stop(); return; }
    if (state === 'loading') return;
    setState('loading');

    // Create AudioContext synchronously inside the click handler
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch { /* Safari may need interaction */ }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('tts-unavailable');

      const ab = await res.arrayBuffer();
      if (!ctx) throw new Error('no-ctx');
      if (ctx.state === 'suspended') await ctx.resume();

      const decoded = await ctx.decodeAudioData(ab);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => setState('idle');
      setState('playing');
      source.start(0);
    } catch {
      ctx?.close().catch(() => {});
      // Fallback: browser speech synthesis
      window.speechSynthesis?.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.88;
      utter.lang = 'en-GB';
      utterRef.current = utter;
      utter.onend = () => setState('idle');
      utter.onerror = () => setState('idle');
      setState('playing');
      window.speechSynthesis?.speak(utter);
    }
  }, [state, text, stop]);

  if (size === 'lg') {
    return (
      <div className="narrator-lg">
        <button
          className={`narrator-lg-btn narrator-btn--${state}`}
          onClick={play}
          aria-label={state === 'playing' ? 'Stop' : 'Hear Kith narrate this memory'}
        >
          {state === 'loading' && <span className="narrator-spinner" />}
          {state === 'playing' && <Waveform bars={5} />}
          {state === 'idle' && <PlayIcon size={16} />}
        </button>
        <span className="narrator-lg-label">
          {state === 'loading' ? 'Preparing…' :
           state === 'playing' ? 'Kith is speaking — tap to stop' :
           'Hear Kith narrate this moment'}
        </span>
      </div>
    );
  }

  return (
    <button
      className={`narrator-sm narrator-btn--${state}`}
      onClick={play}
      aria-label={state === 'playing' ? 'Stop' : 'Play narration'}
      title="Hear Kith narrate this"
    >
      {state === 'loading' && <span className="narrator-spinner-sm" />}
      {state === 'playing' && <Waveform bars={3} sm />}
      {state === 'idle' && <PlayIcon size={11} />}
    </button>
  );
}

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2.5l11 5.5-11 5.5V2.5z" />
    </svg>
  );
}

function Waveform({ bars, sm }: { bars: number; sm?: boolean }) {
  const cls = sm ? 'narrator-wave-bar-sm' : 'narrator-wave-bar';
  return (
    <span className={sm ? 'narrator-wave-sm' : 'narrator-wave'}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={cls} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </span>
  );
}

/* ── RoutineTimeline ────────────────────────────────────────────────────── */
type RoutineItem = { when: string; activity: string; known_or_inferred: string };

const TIME_META: Record<string, { icon: string; label: string; period: number; bg: string; accent: string }> = {
  'early morning': { icon: '🌅', label: 'Early morning', period: 6,  bg: '#FFF8F0', accent: '#F5A623' },
  'morning':       { icon: '☀️', label: 'Morning',       period: 9,  bg: '#FFFDF0', accent: '#F5C623' },
  'afternoon':     { icon: '🌤',  label: 'Afternoon',    period: 14, bg: '#F0F8FF', accent: '#5AACF5' },
  'sunday afternoon': { icon: '📖', label: 'Sunday afternoon', period: 14, bg: '#F5F0FF', accent: '#9B6DFF' },
  'late afternoon': { icon: '🌇', label: 'Late afternoon', period: 17, bg: '#FFF0F0', accent: '#F56060' },
  'evening':       { icon: '🌆', label: 'Evening',       period: 19, bg: '#F0F2FF', accent: '#6B7BF5' },
  'night':         { icon: '🌙', label: 'Night',         period: 22, bg: '#F0F0FF', accent: '#4B5BCC' },
};

function getTimeMeta(when: string) {
  const w = when.toLowerCase();
  for (const [key, val] of Object.entries(TIME_META)) {
    if (w.includes(key)) return val;
  }
  return { icon: '🕐', label: when, period: 12, bg: '#F8F8F8', accent: '#8A8A8A' };
}

function isCurrentlyActive(period: number): boolean {
  if (typeof window === 'undefined') return false;
  const h = new Date().getHours();
  return Math.abs(h - period) <= 1;
}

function RoutineTimeline({ routines }: { routines: RoutineItem[] }) {
  const now = new Date().getHours();
  const sorted = [...routines].sort((a, b) =>
    getTimeMeta(a.when).period - getTimeMeta(b.when).period
  );

  // Day progress arc — 0% = 6am, 100% = 10pm
  const dayPct = Math.min(100, Math.max(0, ((now - 6) / 16) * 100));

  return (
    <section className="rt-section">
      <div className="mr-section-head">
        <h2 className="mr-section-title">Daily routines</h2>
        <span className="mr-section-count">{routines.length}</span>
      </div>

      {/* Day arc bar */}
      <div className="rt-arc-wrap">
        <div className="rt-arc-labels">
          <span>6 am</span><span>noon</span><span>6 pm</span><span>10 pm</span>
        </div>
        <div className="rt-arc-track">
          <div className="rt-arc-fill" style={{ width: `${dayPct}%` }} />
          {/* Routine markers on the arc */}
          {sorted.map((r, i) => {
            const meta = getTimeMeta(r.when);
            const pct = Math.min(98, Math.max(1, ((meta.period - 6) / 16) * 100));
            return (
              <div key={i} className="rt-arc-marker" style={{ left: `${pct}%` }}>
                <span className="rt-arc-dot" style={{ background: meta.accent }} />
                <span className="rt-arc-pip-icon">{meta.icon}</span>
              </div>
            );
          })}
          {/* Sun cursor = now */}
          <div className="rt-sun" style={{ left: `${Math.min(98, dayPct)}%` }}>☀</div>
        </div>
      </div>

      {/* Routine cards */}
      <div className="rt-cards">
        {sorted.map((r, i) => {
          const meta = getTimeMeta(r.when);
          const active = isCurrentlyActive(meta.period);
          return (
            <div
              key={i}
              className={`rt-card ${active ? 'rt-card--active' : ''}`}
              style={{ '--rt-accent': meta.accent, '--rt-bg': meta.bg } as React.CSSProperties}
            >
              <div className="rt-card-icon">{meta.icon}</div>
              <div className="rt-card-body">
                <div className="rt-card-when">
                  {meta.label}
                  {active && <span className="rt-now-badge">now</span>}
                  {r.known_or_inferred === 'inferred' && (
                    <span className="mr-chip mr-chip--inferred" style={{ marginLeft: 6 }}>inferred</span>
                  )}
                </div>
                <p className="rt-card-activity">{r.activity}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── TimelineEntry ──────────────────────────────────────────────────────── */
function TimelineEntry({
  photo, index, onOpen,
}: {
  photo: ShoeboxPhoto; index: number; onOpen: () => void;
}) {
  const isEven = index % 2 === 0;
  const additions = (photo.vision_extraction.personhood_map_additions ?? []) as string[];
  const textsFound = (photo.vision_extraction.raw_text_found ?? []) as string[];

  return (
    <div className={`tl-entry ${isEven ? 'tl-entry--left' : 'tl-entry--right'}`}>
      <div className="tl-dot"><span className="tl-dot-inner" /></div>
      <div className="tl-year">{photo.date_approximate?.slice(0, 4) ?? photo.decade}</div>

      <div className="tl-card">
        <button className="tl-photo-btn" onClick={onOpen} aria-label="View photo">
          <Image
            src={photo.thumbnail_url}
            alt={photo.family_caption}
            width={480} height={320}
            className="tl-photo"
            unoptimized
            priority={index === 0}
          />
          <span className="tl-photo-overlay"><span className="tl-photo-zoom">⊕</span></span>
          <span className="tl-decade-badge">{photo.decade}</span>
        </button>

        <div className="tl-card-body">
          <p className="tl-caption">"{photo.family_caption}"</p>

          {textsFound.length > 0 && (
            <div className="tl-reads">
              <span className="tl-reads-label">Kith read</span>
              <ul>
                {textsFound.slice(0, 2).map((t, i) => (
                  <li key={i}>{t.replace(/^Handwritten [^:]+:\s*/i, '').replace(/^Visible [^:]+:\s*/i, '')}</li>
                ))}
              </ul>
            </div>
          )}

          {additions.length > 0 && (
            <div className="tl-added">
              {additions.slice(0, 2).map((a, i) => (
                <span key={i} className="tl-added-tag">✓ {a}</span>
              ))}
            </div>
          )}

          <div className="tl-actions">
            <button className="tl-open-btn" onClick={onOpen}>View &amp; read →</button>
            <AudioNarrator
              text={`${photo.family_caption}. ${photo.vision_extraction.scene_description ?? ''}`}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Chip + Section helpers ─────────────────────────────────────────────── */
function Chip({ kind }: { kind: Confidence }) {
  return <span className={`mr-chip mr-chip--${kind}`}>{kind}</span>;
}

function Section({
  title, count, empty, tone = 'default', children,
}: {
  title: string; count: number; empty: string;
  tone?: 'default' | 'warn' | 'rule'; children: React.ReactNode;
}) {
  return (
    <section className={`mr-section mr-section--${tone}`}>
      <div className="mr-section-head">
        <h2 className="mr-section-title">{title}</h2>
        <span className="mr-section-count">{count}</span>
      </div>
      {count === 0 ? <p className="mr-empty">{empty}</p> : <div className="mr-cards">{children}</div>}
    </section>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function MapReviewClient({
  map, photos,
}: {
  map: PersonhoodMapFixed; photos: ShoeboxPhoto[];
}) {
  const [lightbox, setLightbox] = useState<ShoeboxPhoto | null>(null);

  return (
    <main className="mr-main">
      <header className="mr-header">
        <p className="mr-eyebrow">Personhood Map · {map.date_generated}</p>
        <h1 className="mr-title">Here's what Kith understands</h1>
        <p className="mr-subtitle">
          About <strong>{map.patient_name}</strong>, from {map.caregiver_name}.
          Kith draws only on what's here. Anything marked{' '}
          <Chip kind="inferred" /> was read between the lines — worth a second look.
        </p>
      </header>

      {/* ── Life Timeline ── */}
      {photos.length > 0 && (
        <section className="tl-section">
          <div className="mr-section-head">
            <h2 className="mr-section-title">A life in photographs</h2>
            <span className="mr-section-count">{photos.length} moments</span>
          </div>
          <p className="tl-intro">
            Kith read every image using Opus 4.7 high-resolution vision —
            handwriting on the backs of prints, plant markers, recipe cards, gift tags.
            Click any photo to see exactly what was read.
          </p>
          <div id="tour-map-timeline" className="tl-track">
            {[...photos]
              .sort((a, b) => (a.date_approximate ?? '').localeCompare(b.date_approximate ?? ''))
              .map((photo, i) => (
                <TimelineEntry key={photo.id} photo={photo} index={i} onOpen={() => setLightbox(photo)} />
              ))}
            <div className="tl-end-dot" />
          </div>
        </section>
      )}

      {/* ── People ── */}
      <div id="tour-map-people">
      <Section title="Important people" count={map.important_people.length} empty="No people recorded yet.">
        {map.important_people.map((p, i) => {
          // Distinct palette per person — cycles through 6 accent pairs
          const PALETTES = [
            ['#E8927C', '#F5C07A'], // coral → amber
            ['#5AACF5', '#7BC4F8'], // blue
            ['#9B6DFF', '#C4A0FF'], // violet
            ['#4CAF82', '#7DD4A8'], // green
            ['#F56060', '#F89898'], // red
            ['#1F2A44', '#4A5A7A'], // navy
          ];
          const [from, to] = PALETTES[i % PALETTES.length];
          return (
            <div className="mr-card mr-person-card" key={i}>
              <div className="mr-person-avatar">
                <span
                  className="mr-person-initial"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                {p.is_living === false && (
                  <span className="mr-person-memory-badge" title="In memory">♡</span>
                )}
              </div>
              <div className="mr-person-info">
                <div className="mr-card-head">
                  <strong className="mr-card-name">{p.name}</strong>
                  <span className="mr-card-role">{p.relationship}</span>
                  <Chip kind={p.known_or_inferred} />
                </div>
                <p className="mr-card-body">{p.details}</p>
              </div>
            </div>
          );
        })}
      </Section>
      </div>

      {/* ── Memories + matching photos ── */}
      <Section title="Familiar memories" count={map.familiar_memories.length} empty="No memories recorded yet.">
        {map.familiar_memories.map((m, i) => {
          const keyword = m.title.split(' ')[0].toLowerCase();
          const matchedPhoto = photos.find(p =>
            (p.vision_extraction.personhood_map_additions as string[] ?? []).some(a =>
              a.toLowerCase().includes(keyword)
            ) || p.family_caption.toLowerCase().includes(keyword)
          );
          return (
            <div className="mr-card mr-card--memory" key={i}>
              {matchedPhoto && (
                <button className="mr-card-photo" onClick={() => setLightbox(matchedPhoto)} title={matchedPhoto.family_caption}>
                  <Image src={matchedPhoto.thumbnail_url} alt={matchedPhoto.family_caption} width={80} height={60} className="mr-card-photo-img" unoptimized />
                </button>
              )}
              <div className="mr-card-memory-body">
                <div className="mr-card-head">
                  <strong className="mr-card-name">{m.title}</strong>
                  <Chip kind={m.known_or_inferred} />
                  <AudioNarrator text={`${m.title}. ${m.description}`} size="sm" />
                </div>
                <p className="mr-card-body">{m.description}</p>
              </div>
            </div>
          );
        })}
      </Section>

      {/* ── Routines ── */}
      <RoutineTimeline routines={map.routines} />

      {/* ── Comfort topics ── */}
      <Section title="Comfort topics" count={map.comfort_topics.length} empty="Nothing noted yet.">
        {map.comfort_topics.map((c, i) => (
          <div className="mr-card" key={i}>
            <div className="mr-card-head">
              <strong className="mr-card-name">{c.topic}</strong>
              <Chip kind={c.known_or_inferred} />
            </div>
            <p className="mr-card-body">{c.why_it_comforts}</p>
          </div>
        ))}
      </Section>

      {/* ── Sensitive topics ── */}
      <Section title="Sensitive topics & handling" count={map.sensitive_topics.length} empty="No sensitive topics flagged." tone="warn">
        {map.sensitive_topics.map((s, i) => (
          <div className="mr-card mr-card--warn" key={i}>
            <div className="mr-card-head">
              <strong className="mr-card-name">{s.topic}</strong>
              <Chip kind={s.known_or_inferred} />
            </div>
            <p className="mr-card-body"><em>If raised:</em> {s.handling}</p>
          </div>
        ))}
      </Section>

      {/* ── Never-guess rules ── */}
      <Section title="Never-guess rules" count={map.never_guess_rules.length} empty="Default never-invent rule applies." tone="rule">
        <ul className="mr-rules">{map.never_guess_rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </Section>

      {map.uncertainty_notes?.trim() && (
        <section className="mr-section mr-uncertainty">
          <h2 className="mr-section-title">Where Kith is uncertain</h2>
          <p className="mr-uncertainty-body">{map.uncertainty_notes}</p>
        </section>
      )}

      <footer className="mr-footer">
        <Link href="/caregiver-input" className="mr-secondary">← Edit caregiver input</Link>
        <Link href="/talk" className="mr-primary">Meet Kith →</Link>
      </footer>

      {/* ── Memory Lightbox ── */}
      {lightbox && (
        <MemoryLightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
    </main>
  );
}
