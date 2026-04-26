'use client';

import { useState } from 'react';

export default function LetterClient({
  riskFlags,
  name,
}: {
  riskFlags: string[];
  name: string;
}) {
  const [letter, setLetter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [n, setN] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flagsDismissed, setFlagsDismissed] = useState(false);

  // Nightly reflection state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reflection, setReflection] = useState<any>(null);
  const [reflectLoading, setReflectLoading] = useState(false);
  const [reflectError, setReflectError] = useState('');

  const runReflection = async () => {
    setReflectLoading(true);
    setReflectError('');
    try {
      const res = await fetch('/api/reflect', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      setReflection(await res.json());
    } catch (e) {
      setReflectError(String(e));
    } finally {
      setReflectLoading(false);
    }
  };

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/letter', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLetter(data.letter);
      setDateRange(data.date_range);
      setN(data.n);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const visibleFlags = flagsDismissed ? [] : riskFlags;

  return (
    <main className="letter-main">
      {/* Risk flags banner */}
      {visibleFlags.length > 0 && (
        <div className="letter-risk-banner">
          <span className="letter-risk-icon">⚠</span>
          <div className="letter-risk-body">
            <strong>Kith noticed something that needs your attention.</strong>
            <ul>
              {visibleFlags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <button className="letter-risk-dismiss" onClick={() => setFlagsDismissed(true)}>
            Acknowledge
          </button>
        </div>
      )}

      {/* Header */}
      <header className="letter-header">
        <div className="letter-brand">Kith</div>
        {letter ? (
          <p className="letter-meta-top">A letter about {name} · {dateRange}</p>
        ) : (
          <p className="letter-meta-top">Weekly letter for {name}</p>
        )}
      </header>

      {/* Letter body */}
      {!letter && !loading && (
        <div className="letter-empty">
          <p>
            The weekly letter is built from {name}'s conversations and notebook
            across the past seven days.
          </p>
          <button className="letter-generate-btn" onClick={generate}>
            Generate this week's letter
          </button>
          {error && <p className="letter-error">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="letter-loading">
          <p>Five specialists are reading {name}'s week…</p>
          <p className="letter-loading-sub">This takes about 30 seconds.</p>
        </div>
      )}

      {letter && (
        <>
          <article className="letter-body">
            {letter.split('\n\n').map((para, i) => {
              // Section headings (bold text on its own line)
              if (/^\*\*(.+)\*\*$/.test(para.trim())) {
                const heading = para.trim().replace(/\*\*/g, '');
                return <h2 key={i} className="letter-section-heading">{heading}</h2>;
              }
              // Sign-off italic
              if (para.trim().startsWith('*With care')) {
                return <p key={i} className="letter-signoff">{para.trim().replace(/\*/g, '')}</p>;
              }
              // Metadata line
              if (para.trim().startsWith('*This letter was')) {
                return <p key={i} className="letter-metadata">{para.trim().replace(/\*/g, '')}</p>;
              }
              return <p key={i} className="letter-para">{para.trim()}</p>;
            })}
          </article>

          <div className="letter-actions">
            <button className="letter-regenerate" onClick={generate} disabled={loading}>
              Regenerate
            </button>
          </div>
        </>
      )}

      {/* ── Daily Reflection panel ── */}
      <section className="reflect-section">
        <div className="reflect-header">
          <div>
            <h2 className="reflect-title">Daily analysis</h2>
            <p className="reflect-subtitle">
              Kith analyses today's conversations and writes a caregiver alert
              and a note for the next doctor's visit.
            </p>
          </div>
          <button id="tour-reflect-btn" className="reflect-run-btn" onClick={runReflection} disabled={reflectLoading}>
            {reflectLoading ? 'Analysing…' : 'Run analysis'}
          </button>
        </div>

        {reflectError && <p className="letter-error">{reflectError}</p>}

        {reflection && (
          <div className="reflect-results">
            <div className="reflect-card">
              <h3 className="reflect-card-title">Today's summary</h3>
              <p className="reflect-card-body">{reflection.behavioural_summary}</p>
            </div>

            <div className={`reflect-card ${reflection.caregiver_alert?.needs_attention ? 'reflect-card--urgent' : ''}`}>
              <h3 className="reflect-card-title">
                {reflection.caregiver_alert?.needs_attention ? '⚠ Caregiver alert' : 'Caregiver — nothing urgent today'}
              </h3>
              {reflection.caregiver_alert?.items?.length > 0 && (
                <ul className="reflect-list">
                  {reflection.caregiver_alert.items.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </div>

            <div className="reflect-card">
              <h3 className="reflect-card-title">For the next doctor's visit</h3>
              {reflection.doctors_note?.cognitive_observations?.length > 0 && (<>
                <p className="reflect-card-label">Cognitive</p>
                <ul className="reflect-list">{reflection.doctors_note.cognitive_observations.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
              </>)}
              {reflection.doctors_note?.behavioural_changes?.length > 0 && (<>
                <p className="reflect-card-label">Behavioural changes</p>
                <ul className="reflect-list">{reflection.doctors_note.behavioural_changes.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
              </>)}
              {reflection.doctors_note?.physical_complaints?.length > 0 && (<>
                <p className="reflect-card-label">Physical complaints</p>
                <ul className="reflect-list">{reflection.doctors_note.physical_complaints.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
              </>)}
              {reflection.doctors_note?.monitoring_suggestions?.length > 0 && (<>
                <p className="reflect-card-label">Worth monitoring</p>
                <ul className="reflect-list">{reflection.doctors_note.monitoring_suggestions.map((i: string, idx: number) => <li key={idx}>{i}</li>)}</ul>
              </>)}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
