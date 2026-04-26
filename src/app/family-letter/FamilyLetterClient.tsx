'use client';

/**
 * The family-facing weekly letter.
 *
 * Renders the fixed 5-section structure as a single long-form note with
 * 2-3 snippet pullquotes. No metrics, no analytics chrome.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { FamilyLetterFixed } from '@/models/familyLetter';

export default function FamilyLetterClient({ name }: { name: string }) {
  const [letter, setLetter] = useState<FamilyLetterFixed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/family-letter/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setLetter(data.letter);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fl-main">
      <header className="fl-header">
        <div className="fl-brand">Kith</div>
        {letter ? (
          <>
            <h1 className="fl-title">A letter about {letter.patient_name}</h1>
            <p className="fl-date">{letter.date_range}</p>
          </>
        ) : (
          <>
            <h1 className="fl-title">This week with {name}</h1>
            <p className="fl-date">Weekly continuity letter</p>
          </>
        )}
      </header>

      {!letter && !loading && (
        <div className="fl-empty">
          <p>
            Built from {name}'s conversations this past week. Only what Kith
            actually heard — nothing invented, nothing embellished.
          </p>
          <button id="tour-letter-btn" className="fl-generate-btn" onClick={generate}>
            Write this week's letter
          </button>
          {error && <p className="cg-error" style={{ marginTop: '1rem' }}>{error}</p>}
        </div>
      )}

      {loading && (
        <div className="fl-empty">
          <p>Kith is reading through the week…</p>
          <p style={{ fontSize: 13, marginTop: '0.5rem', opacity: 0.7 }}>
            This takes about 20–30 seconds.
          </p>
        </div>
      )}

      {letter && (
        <>
          <LetterSection
            title="Moments of connection"
            body={letter.moments_of_connection}
          />
          <LetterSection
            title="What seemed grounding"
            body={letter.what_seemed_grounding}
          />
          <LetterSection
            title="Where confusion showed up"
            body={letter.where_confusion_showed_up}
          />
          <LetterSection
            title="One small thing to try this week"
            body={letter.one_small_thing_to_try}
          />

          {letter.supporting_moments.length > 0 && (
            <section className="fl-section">
              <h2 className="fl-section-title">Moments from the week</h2>
              <div>
                {letter.supporting_moments.map((m, i) => (
                  <div className="fl-snippet" key={i}>
                    <div className="fl-snippet-quote">"{m.snippet}"</div>
                    <span className="fl-snippet-context">— {m.context}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="fl-signoff">With care, from Kith</p>

          <div className="fl-actions">
            <button
              className="fl-regenerate"
              onClick={generate}
              disabled={loading}
            >
              Regenerate
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link href="/" className="mr-secondary">← Home</Link>
      </div>
    </main>
  );
}

function LetterSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="fl-section">
      <h2 className="fl-section-title">{title}</h2>
      <div className="fl-section-body">
        {body.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para.trim()}</p>
        ))}
      </div>
    </section>
  );
}
