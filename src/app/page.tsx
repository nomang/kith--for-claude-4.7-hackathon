import Link from 'next/link';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { StartTourButton } from '@/components/DemoTour';
import KithFlow from '@/components/KithFlow';

export const dynamic = 'force-dynamic';

function getPatientName(): string | null {
  try {
    const p = join(process.cwd(), 'data', 'personhood_map.json');
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf-8')).patient_name ?? null;
  } catch { return null; }
}

const CAPS = [
  'High-res vision',
  'File-system memory',
  'Self-verification',
  'Dissonant-data resistance',
  'Adaptive thinking',
  'Task budgets',
  'Parallel subagents',
  '1M context',
  'Tool use · agents',
  'Routine analysis · Reminders',
];

const LOOP = [
  { label: 'Family memory in', sub: 'Shoebox photos · caregiver notes' },
  { label: 'Personhood Map', sub: 'Opus 4.7 vision · confidence tags' },
  { label: 'Safe companionship', sub: 'Opus 4.7 · adaptive thinking' },
  { label: 'Weekly letter', sub: '5 parallel subagents · synthesizer' },
  { label: 'Family', sub: 'Letter · Ask Kith · daily alerts' },
];

export default function Home() {
  const patient = getPatientName();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hp-hero">
        <nav className="hp-topbar">
          <span className="hp-wordmark">Kith</span>
          <span className="hp-topbar-hackathon">
            Cerebral Valley × Anthropic · Opus 4.7 Hackathon
          </span>
          <span className="hp-badge">Built with Claude Opus 4.7</span>
        </nav>

        <div className="hp-hero-center">
          <h1 className="hp-tagline">
            <span>Holding onto the person,</span>
            <span>not just the patient.</span>
          </h1>

          <p className="hp-tagline-sub">
            A voice-first AI companion for people living with Alzheimer's —
            and a weekly letter for the families who love them.
          </p>

          {/* Animated orb */}
          <div className="hp-orb-wrap">
            <div className="hp-orb">
              <div className="hp-orb-ring hp-orb-ring-1" />
              <div className="hp-orb-ring hp-orb-ring-2" />
              <div className="hp-orb-core" />
            </div>
          </div>

          <div className="hp-cta-group">
            <StartTourButton />
            {patient ? (
              <>
                <Link href="/talk" className="hp-cta-primary">
                  Talk with Kith →
                </Link>
                <span className="hp-cta-hint">
                  Personhood Map ready for <strong>{patient}</strong>
                </span>
              </>
            ) : (
              <>
                <Link href="/caregiver-input" className="hp-cta-primary">
                  Get started →
                </Link>
                <span className="hp-cta-hint">Takes about a minute to set up</span>
              </>
            )}
          </div>
        </div>

        <div className="hp-scroll-hint" aria-hidden>↓</div>
      </section>

      {/* ── Nav strip ────────────────────────────────────────────────── */}
      <nav className="hp-nav">
        {[
          { href: '/caregiver-input', icon: '📷', label: 'Setup' },
          { href: '/map-review',      icon: '🗺', label: 'Personhood Map' },
          { href: '/talk',            icon: '🎙', label: 'Talk' },
          { href: '/family-letter',   icon: '💌', label: 'Family letter' },
          { href: '/ask',             icon: '🔍', label: 'Ask Kith' },
          { href: '/#kf-flow',        icon: '⚡', label: 'Pipeline' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="hp-nav-link">
            <span className="hp-nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Product cards ─────────────────────────────────────────────── */}
      <section className="hp-section hp-cards-section">
        <p className="hp-section-eyebrow">Three surfaces. One loop.</p>
        <div className="hp-cards">

          <Link href="/talk" className="hp-card hp-card--companion">
            <div className="hp-card-icon">🎙</div>
            <h2 className="hp-card-title">The Companion</h2>
            <p className="hp-card-desc">
              Voice-first conversation that knows who she is — her stories, her
              routines, the people she loves. Kith never invents a memory.
            </p>
            <div className="hp-card-features">
              <span>Wake word · "Hey Kith"</span>
              <span>Adaptive thinking</span>
              <span>Memory-First mode</span>
            </div>
            <span className="hp-card-cta">Open Talk →</span>
          </Link>

          <Link href="/map-review" className="hp-card hp-card--memory">
            <div className="hp-card-icon">🗺</div>
            <h2 className="hp-card-title">The Memory</h2>
            <p className="hp-card-desc">
              Her life in photographs — Kith reads the handwriting on the back
              of old prints, builds a Personhood Map, and narrates each memory
              in her voice.
            </p>
            <div className="hp-card-features">
              <span>High-res vision</span>
              <span>Voice narration</span>
              <span>Interactive sessions</span>
            </div>
            <span className="hp-card-cta">Open Map →</span>
          </Link>

          <Link href="/family-letter" className="hp-card hp-card--family">
            <div className="hp-card-icon">💌</div>
            <h2 className="hp-card-title">The Family</h2>
            <p className="hp-card-desc">
              A weekly letter from five specialist agents — and an on-demand
              investigator that reads its own notes and cites every claim
              before answering.
            </p>
            <div className="hp-card-features">
              <span>5 parallel subagents</span>
              <span>Ask Kith agent</span>
              <span>Doctor's note</span>
            </div>
            <span className="hp-card-cta">Open Letter →</span>
          </Link>

        </div>
      </section>

      {/* ── Problem / Solution ───────────────────────────────────────── */}
      <section className="hp-section hp-ps-section">
        <p className="hp-section-eyebrow">Built on Claude Opus 4.7</p>
        <h2 className="hp-section-title">The problem. The solution.</h2>

        <div className="hp-ps-grid">

          <div className="hp-ps-card hp-ps-card--problem">
            <p className="hp-ps-label">The problem</p>
            <h3 className="hp-ps-heading">Generic AI fails Alzheimer's patients</h3>
            <ul className="hp-ps-list">
              <li>Confirms false memories — making confusion worse</li>
              <li>Invents facts with no source — undetectable to a patient who cannot challenge them</li>
              <li>Forgets everything after the conversation ends — no continuity across days</li>
              <li>Has no idea who the person is — every session starts from zero</li>
              <li>Cannot handle hard moments — a deceased loved one asked about, a distressing delusion — without causing harm</li>
            </ul>
          </div>

          <div className="hp-ps-card hp-ps-card--solution">
            <p className="hp-ps-label">How Claude Opus 4.7 solves it</p>
            <h3 className="hp-ps-heading">Every capability mapped to a real patient need</h3>
            <ul className="hp-ps-list">
              <li><strong>High-res vision</strong> — reads handwriting on 60-year-old photos to build a Personhood Map the patient trusts</li>
              <li><strong>Self-verification</strong> — every claim checked against the source before it is spoken. Nothing invented. Ever.</li>
              <li><strong>File-system memory</strong> — Kith's notebook grows across days. Day 7 still knows what happened on Day 1</li>
              <li><strong>Dissonant-data resistance</strong> — holds ground on false assertions without harsh correction. An architectural constraint, not a prompt trick</li>
              <li><strong>1M token context</strong> — the patient's entire life — map, notebook, history — loaded into every single turn</li>
              <li><strong>Adaptive thinking</strong> — fast on simple greetings, deep on distress. Budget matched to the moment</li>
              <li><strong>Parallel subagents</strong> — five specialist agents read the patient's week simultaneously to write the family letter</li>
              <li><strong>Tool use · Agentic loop</strong> — Ask Kith investigates, reads its own notes, cites every claim before answering</li>
              <li><strong>Task budgets</strong> — deliberate token limits per operation so nothing is wasted and nothing is cut short</li>
              <li><strong>Routine analysis</strong> — Opus 4.7 reads the patient's daily schedule and generates warm, time-aware grounding reminders</li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────── */}
      <section className="hp-section hp-caps-section">
        <h2 className="hp-section-title">Ten capabilities. Every one used.</h2>
        <div id="tour-caps-grid" className="hp-caps">
          {CAPS.map(c => (
            <span key={c} className="hp-cap-chip">
              <span className="hp-cap-dot" />
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* ── The loop ──────────────────────────────────────────────────── */}
      <section className="hp-section hp-loop-section">
        <p className="hp-section-eyebrow">How it works</p>
        <h2 className="hp-section-title">One honest loop.</h2>
        <div className="hp-loop">
          {LOOP.map((step, i) => (
            <div key={i} className="hp-loop-step">
              <div className="hp-loop-label">{step.label}</div>
              <div className="hp-loop-sub">{step.sub}</div>
              {i < LOOP.length - 1 && <div className="hp-loop-arrow">↓</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Animated feature flow diagram ─────────────────────────────── */}
      <KithFlow />

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="hp-footer">
        <span className="hp-footer-kith">Kith · 2026</span>
        <span className="hp-footer-hackathon">
          Built for the Cerebral Valley × Anthropic Opus 4.7 Hackathon
        </span>
        <span className="hp-footer-builder">
          Muhammad Noman — Founder, BTL Software
        </span>
      </footer>
    </>
  );
}
