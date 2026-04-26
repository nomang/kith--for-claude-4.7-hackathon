'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const TOUR_KEY = 'kith_theater_step';
const TOUR_ACTIVE = 'kith_theater_active';

type BadgeColor = 'coral' | 'gold' | 'blue' | 'green';

type Step = {
  page: string;
  element: string;
  badge: string;
  badgeColor: BadgeColor;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    page: '/map-review',
    element: '#tour-map-timeline',
    badge: 'Opus 4.7 · High-res vision',
    badgeColor: 'gold',
    title: 'The Shoebox',
    description: `<p>Claude Opus 4.7's <strong>high-resolution vision (2576px)</strong> reads the handwriting on the back of every family photo — dates, names, captions in faded ink.</p><p>Click any photo. The lightbox shows the exact text extracted. Every fact tagged <em>known</em> or <em>inferred</em>. Nothing invented. Ever.</p><p class="voice-tip">🎤 Say <strong>"Hey Kith, tell me about the foliage drives"</strong></p>`,
  },
  {
    page: '/talk',
    element: '#tour-mic-btn',
    badge: 'Opus 4.7 · Dissonant-data resistance',
    badgeColor: 'coral',
    title: 'The Companion',
    description: `<p>Tap the coral mic and say <strong>"Where is George?"</strong></p><p>No correction. No false confirmation. Warm redirection to what she loves. This is <strong>dissonant-data resistance</strong> — an architectural constraint baked into every response, not a prompt trick.</p><p class="voice-tip">🎤 Or say <strong>"Hey Kith, where is George?"</strong></p>`,
  },
  {
    page: '/map-review',
    element: '#tour-map-people',
    badge: 'Opus 4.7 · 1M token context',
    badgeColor: 'blue',
    title: 'The Personhood Map',
    description: `<p>Each person card carries a <em>known / inferred</em> confidence tag. Kith never adds an unsourced fact.</p><p>The full map — every person, every story — loads into <strong>every conversation turn</strong>. Claude Opus 4.7's <strong>one-million token context</strong> means nothing is ever rationed or summarised away.</p><p class="voice-tip">🎤 Say <strong>"Hey Kith, who is Ruth?"</strong></p>`,
  },
  {
    page: '/ask',
    element: '#tour-ask-input',
    badge: 'Opus 4.7 · Tool use · Agentic loop',
    badgeColor: 'blue',
    title: 'The Investigator',
    description: `<p>Type <em>"Has she been mentioning George more this week?"</em> and hit Investigate.</p><p>An <strong>agentic tool loop</strong> runs — calling <code>read_notebook_file</code>, <code>search_conversations</code>, <code>check_recurrence</code>. Every claim is cited before answering. Not a chatbot. An investigator.</p>`,
  },
  {
    page: '/family-letter',
    element: '#tour-letter-btn',
    badge: 'Opus 4.7 · Parallel subagents',
    badgeColor: 'green',
    title: 'Five Parallel Agents',
    description: `<p>Click <strong>"Write this week's letter"</strong>.</p><p>Five Claude Opus 4.7 agents run <em>simultaneously</em> — Mood, Memory, Changes, Routines, Joy. A sixth synthesises. The result: ~400 words of warm, specific, cited prose. Something a family would actually keep.</p>`,
  },
  {
    page: '/letter',
    element: '#tour-reflect-btn',
    badge: 'Opus 4.7 · File-system memory',
    badgeColor: 'green',
    title: 'Daily Intelligence',
    description: `<p>Click <strong>"Run analysis"</strong>.</p><p>Kith reads today's conversations and writes: a behavioural summary, a caregiver alert with specific moments, and a <strong>doctor's note</strong> for the next GP visit. Saved to the notebook. <strong>File-system memory</strong> — Day 7 still knows what happened on Day 1.</p>`,
  },
  {
    page: '/talk',
    element: '#tour-hk-orb',
    badge: 'Opus 4.7 · Always-on companion',
    badgeColor: 'coral',
    title: '"Hey Kith"',
    description: `<p><strong>Say "Hey Kith"</strong> — right now, out loud.</p><p>The coral orb activates. Kith greets her by name, listens, and responds with the full Personhood Map, rolling notebook, and everything it knows. Every page. Always on.</p><p class="voice-tip">🎤 <strong>"Hey Kith, what's happening today?"</strong></p>`,
  },
  {
    page: '/',
    element: '#tour-caps-grid',
    badge: 'Claude Opus 4.7',
    badgeColor: 'coral',
    title: 'Nine capabilities. One purpose.',
    description: `<p>Every Claude Opus 4.7 capability — used. Every one necessary.</p><p><strong>Vision · File-system memory · Self-verification · Dissonant-data resistance · Adaptive thinking · Task budgets · Parallel subagents · 1M context · Tool use</strong></p><p>Kith is the first AI companion where every word can be traced back to her life.</p>`,
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export default function DemoTheater() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [spotRect, setSpotRect] = useState<Rect | null>(null);
  const [cardAtTop, setCardAtTop] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const updateRect = useCallback((s: number) => {
    const el = document.querySelector(STEPS[s]?.element);
    if (!el) { setSpotRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      // If element is in lower 55% of screen, float card to top so it doesn't overlap
      setCardAtTop(r.top > window.innerHeight * 0.45);
    }, 320);
  }, []);

  // Resume tour after cross-page navigation
  useEffect(() => {
    const isActive = localStorage.getItem(TOUR_ACTIVE);
    if (!isActive) return;
    const savedStep = parseInt(localStorage.getItem(TOUR_KEY) ?? '0', 10);
    if (STEPS[savedStep]?.page !== pathname) return;
    setStep(savedStep);
    setActive(true);
    setNavigating(false);
    setSpotRect(null);
    setTimeout(() => updateRect(savedStep), 700);
  }, [pathname, updateRect]);

  // Refresh spotlight rect on window resize
  useEffect(() => {
    if (!active || navigating) return;
    const update = () => {
      const el = document.querySelector(STEPS[step]?.element);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [active, navigating, step]);

  const goToStep = useCallback((target: number) => {
    if (target >= STEPS.length) {
      localStorage.removeItem(TOUR_ACTIVE);
      localStorage.removeItem(TOUR_KEY);
      setActive(false);
      setSpotRect(null);
      return;
    }
    if (target < 0) return;

    const dest = STEPS[target];
    localStorage.setItem(TOUR_KEY, String(target));

    if (dest.page !== pathname) {
      setNavigating(true);
      setSpotRect(null);
      setTimeout(() => router.push(dest.page), 80);
    } else {
      setStep(target);
      setSpotRect(null);
      setTimeout(() => updateRect(target), 150);
    }
  }, [pathname, router, updateRect]);

  const exit = useCallback(() => {
    localStorage.removeItem(TOUR_ACTIVE);
    localStorage.removeItem(TOUR_KEY);
    setActive(false);
    setSpotRect(null);
    setNavigating(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__kithStartTour = () => {
      localStorage.setItem(TOUR_ACTIVE, '1');
      localStorage.setItem(TOUR_KEY, '0');
      setActive(true);
      setStep(0);
      setSpotRect(null);
      if (STEPS[0].page !== pathname) {
        setNavigating(true);
        router.push(STEPS[0].page);
      } else {
        setNavigating(false);
        setTimeout(() => updateRect(0), 400);
      }
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__kithStartTour;
    };
  }, [pathname, router, updateRect]);

  if (!active) return null;

  const currentStep = STEPS[step];
  const pad = 14;

  return (
    <>
      {/* Spotlight — box-shadow creates the dark vignette outward from this element */}
      {spotRect && !navigating ? (
        <div
          className="theater-spotlight"
          style={{
            top: spotRect.top - pad,
            left: spotRect.left - pad,
            width: spotRect.width + pad * 2,
            height: spotRect.height + pad * 2,
          }}
        />
      ) : (
        // Full dark cover while navigating or element not found yet
        <div className="theater-fullcover" />
      )}

      {/* Progress bar — top center */}
      <div className="theater-progress">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`theater-dot${i === step ? ' theater-dot--active' : i < step ? ' theater-dot--done' : ''}`}
          />
        ))}
      </div>

      {/* Exit button — top right */}
      <button className="theater-exit" onClick={exit}>✕ Exit demo</button>

      {/* Mission card — floats bottom unless spotlight is low, then floats top */}
      <div className={`theater-card${cardAtTop ? ' theater-card--top' : ''}`} key={`${step}-${navigating}`}>
        {navigating ? (
          <div className="theater-navigating">
            <span className="theater-spinner" />
            <span>Loading next scene…</span>
          </div>
        ) : (
          <>
            <div className="theater-card-top">
              <span className={`theater-badge theater-badge--${currentStep.badgeColor}`}>
                {currentStep.badge}
              </span>
              <span className="theater-step-counter">
                {step + 1} / {STEPS.length}
              </span>
            </div>

            <h2 className="theater-title">{currentStep.title}</h2>

            <div
              className="theater-desc"
              // Safe: content is authored inline above, not from user input
              dangerouslySetInnerHTML={{ __html: currentStep.description }}
            />

            <div className="theater-actions">
              {step > 0
                ? <button className="theater-btn-back" onClick={() => goToStep(step - 1)}>← Back</button>
                : <span />
              }
              <button className="theater-btn-next" onClick={() => goToStep(step + 1)}>
                {step === STEPS.length - 1 ? 'Finish tour ✓' : 'Next →'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function StartTourButton() {
  const start = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).__kithStartTour) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__kithStartTour();
    }
  };
  return (
    <button className="hp-cta-tour" onClick={start}>
      Explore the demo →
    </button>
  );
}
