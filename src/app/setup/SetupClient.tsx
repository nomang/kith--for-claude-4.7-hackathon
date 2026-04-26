'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'choose' | 'shoebox' | 'wizard';
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  'About them',
  'People in their life',
  'Daily life',
  'Stories they love',
  'Comfort & avoid',
  "This week's anchors",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SetupClient({ existing }: { existing: any }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(existing ? 'wizard' : 'choose');
  const [step, setStep] = useState<WizardStep>(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Shoebox state
  const [shoeboxLoading, setShoeboxLoading] = useState(false);
  const [shoeboxDraft, setShoeboxDraft] = useState('');
  const [shoeboxError, setShoeboxError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Wizard form state — pre-fill from existing data
  const [form, setForm] = useState({
    full_name: existing?.person?.full_name ?? '',
    preferred_name: existing?.person?.preferred_name ?? '',
    age: existing?.person?.age?.toString() ?? '',
    current_location: existing?.person?.current_location ?? '',
    hometown: existing?.person?.hometown ?? '',
    personality: existing?.person?.personality ?? '',

    people: JSON.stringify(existing?.people_in_their_life ?? [], null, 2),
    typical_day: existing?.daily_life?.typical_day ?? '',
    favorite_music: (existing?.daily_life?.favorite_music ?? []).join('\n'),
    favorite_foods: (existing?.daily_life?.favorite_foods ?? []).join('\n'),
    hobbies: (existing?.daily_life?.hobbies ?? []).join('\n'),

    stories: JSON.stringify(existing?.stories_they_love ?? [], null, 2),

    things_that_comfort: (existing?.comfort_and_avoid?.things_that_comfort_them ?? []).join('\n'),
    topics_to_avoid: (existing?.comfort_and_avoid?.topics_to_avoid ?? []).join('\n'),
    difficult_times: existing?.comfort_and_avoid?.difficult_times_of_day ?? '',
    handling_mode: existing?.sensitive_handling_mode ?? 'Gentle Redirect',

    today_is: existing?.this_week?.today_is ?? new Date().toISOString().split('T')[0],
    whats_happening: existing?.this_week?.whats_happening_today ?? '',
    whos_visiting: existing?.this_week?.whos_visiting_or_calling ?? '',
    special_notes: existing?.this_week?.special_notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Upload photos to Shoebox API
  const handleShoeboxUpload = async () => {
    const files = fileRef.current?.files;
    if (!files?.length) return;
    setShoeboxLoading(true);
    setShoeboxError('');
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    try {
      const res = await fetch('/api/shoebox', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShoeboxDraft(data.draft);
      // Pre-fill wizard from draft if possible
      try {
        const parsed = JSON.parse(data.draft);
        if (parsed.person) {
          setForm(f => ({
            ...f,
            full_name: parsed.person.full_name ?? f.full_name,
            preferred_name: parsed.person.preferred_name ?? f.preferred_name,
            age: parsed.person.age?.toString() ?? f.age,
            current_location: parsed.person.current_location ?? f.current_location,
            hometown: parsed.person.hometown ?? f.hometown,
            personality: parsed.person.personality ?? f.personality,
            people: JSON.stringify(parsed.people_in_their_life ?? [], null, 2),
            stories: JSON.stringify(parsed.stories_they_love ?? [], null, 2),
          }));
        }
      } catch { /* draft may not be clean JSON yet */ }
      setMode('wizard');
    } catch (e) {
      setShoeboxError(String(e));
    } finally {
      setShoeboxLoading(false);
    }
  };

  // Build PersonhoodMap and save
  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const map = {
      person: {
        full_name: form.full_name,
        preferred_name: form.preferred_name,
        age: parseInt(form.age) || 0,
        current_location: form.current_location,
        hometown: form.hometown,
        personality: form.personality,
      },
      people_in_their_life: safeParseArray(form.people),
      daily_life: {
        typical_day: form.typical_day,
        favorite_music: form.favorite_music.split('\n').filter(Boolean),
        favorite_shows: [],
        favorite_foods: form.favorite_foods.split('\n').filter(Boolean),
        foods_they_dislike: [],
        hobbies: form.hobbies.split('\n').filter(Boolean),
      },
      stories_they_love: safeParseArray(form.stories),
      comfort_and_avoid: {
        things_that_comfort_them: form.things_that_comfort.split('\n').filter(Boolean),
        topics_to_avoid: form.topics_to_avoid.split('\n').filter(Boolean),
        difficult_times_of_day: form.difficult_times,
      },
      routines: existing?.routines ?? [],
      sensitive_handling_mode: form.handling_mode as 'Gentle Redirect' | 'Gentle Truth' | 'Memory-First',
      this_week: {
        today_is: form.today_is,
        whats_happening_today: form.whats_happening,
        whos_visiting_or_calling: form.whos_visiting,
        special_notes: form.special_notes,
      },
    };

    try {
      const res = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(map),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/talk');
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, placeholder = '', multiline = false) => (
    <div className="setup-field">
      <label className="setup-label">{label}</label>
      {multiline ? (
        <textarea
          className="setup-input setup-textarea"
          value={(form as Record<string, string>)[key]}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <input
          className="setup-input"
          value={(form as Record<string, string>)[key]}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  // ── CHOOSE mode ──────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <main className="setup-main">
        <h1 className="setup-title">Tell Kith about them</h1>
        <p className="setup-subtitle">Choose how you'd like to start.</p>
        <div className="setup-cards">
          <button className="setup-card" onClick={() => setMode('shoebox')}>
            <span className="setup-card-icon">📷</span>
            <strong>The Shoebox</strong>
            <span>Upload old photos. Kith reads them and drafts everything for you.</span>
            <em>Recommended</em>
          </button>
          <button className="setup-card" onClick={() => setMode('wizard')}>
            <span className="setup-card-icon">✏️</span>
            <strong>The Wizard</strong>
            <span>Fill in six gentle sections about the person you love.</span>
          </button>
        </div>
      </main>
    );
  }

  // ── SHOEBOX mode ─────────────────────────────────────────────────
  if (mode === 'shoebox') {
    return (
      <main className="setup-main">
        <button className="setup-back" onClick={() => setMode('choose')}>← Back</button>
        <h1 className="setup-title">The Shoebox</h1>
        <p className="setup-subtitle">
          Upload scanned photos, handwritten captions, letters — anything from the
          family archive. Kith will read them and draft the Personhood Map.
        </p>
        <div className="setup-drop-zone">
          <input ref={fileRef} type="file" accept="image/*" multiple className="setup-file-input" id="photos" />
          <label htmlFor="photos" className="setup-drop-label">
            {fileRef.current?.files?.length
              ? `${fileRef.current.files.length} photo(s) selected`
              : 'Click to choose photos or drop them here'}
          </label>
        </div>
        {shoeboxError && <p className="setup-error">{shoeboxError}</p>}
        <button
          className="setup-btn-primary"
          onClick={handleShoeboxUpload}
          disabled={shoeboxLoading}
        >
          {shoeboxLoading ? 'Kith is reading the photos…' : 'Read photos and draft'}
        </button>
        {shoeboxDraft && (
          <div className="setup-draft-preview">
            <p className="setup-label">Draft generated — continuing to wizard to review…</p>
          </div>
        )}
      </main>
    );
  }

  // ── WIZARD mode ──────────────────────────────────────────────────
  return (
    <main className="setup-main">
      <div className="setup-progress">
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={`setup-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => setStep(i as WizardStep)}
            title={s}
          />
        ))}
      </div>
      <h2 className="setup-step-title">{STEPS[step]}</h2>

      {step === 0 && (
        <div className="setup-section">
          {field('Full name', 'full_name', 'Margaret Eileen Hartley')}
          {field('Name Kith uses', 'preferred_name', 'Maggie')}
          {field('Age', 'age', '78')}
          {field('Where they live now', 'current_location', 'Their own home in Bristol…', true)}
          {field('Hometown & early life', 'hometown', 'Born in Liverpool, 1948…', true)}
          {field('Who they are', 'personality', 'Warm, stubborn, loves detective novels…', true)}
        </div>
      )}

      {step === 1 && (
        <div className="setup-section">
          <p className="setup-hint">
            Add the people who matter — spouse, children, grandchildren, old friends, pets.
            Edit the JSON below or clear it and type freely.
          </p>
          <textarea
            className="setup-input setup-textarea setup-code"
            value={form.people}
            onChange={e => set('people', e.target.value)}
            rows={16}
            spellCheck={false}
          />
        </div>
      )}

      {step === 2 && (
        <div className="setup-section">
          {field('A typical day', 'typical_day', 'Wakes at 7, tea by the window…', true)}
          {field('Music they love (one per line)', 'favorite_music', 'Willie Nelson\nElla Fitzgerald', true)}
          {field('Foods they love (one per line)', 'favorite_foods', "Shepherd's pie\nWelsh cakes", true)}
          {field('Hobbies (one per line)', 'hobbies', 'Reading detective novels\nCrosswords', true)}
        </div>
      )}

      {step === 3 && (
        <div className="setup-section">
          <p className="setup-hint">Stories they love to tell — the ones they tell again and again.</p>
          <textarea
            className="setup-input setup-textarea setup-code"
            value={form.stories}
            onChange={e => set('stories', e.target.value)}
            rows={14}
            spellCheck={false}
          />
        </div>
      )}

      {step === 4 && (
        <div className="setup-section">
          {field('Things that comfort them (one per line)', 'things_that_comfort', 'Willie Nelson on the radio\nThe green blanket', true)}
          {field('Topics to gently avoid (one per line)', 'topics_to_avoid', "George's final weeks in hospice\nMoving to a care home", true)}
          {field('Difficult times of day', 'difficult_times', 'Sundowning around 4:30–5:30pm')}
          <div className="setup-field">
            <label className="setup-label">How Kith handles sensitive topics</label>
            <select
              className="setup-input"
              value={form.handling_mode}
              onChange={e => set('handling_mode', e.target.value)}
            >
              <option value="Gentle Redirect">Gentle Redirect — change the subject kindly</option>
              <option value="Gentle Truth">Gentle Truth — acknowledge reality, gently</option>
              <option value="Memory-First">Memory-First — stay in the positive memory</option>
            </select>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="setup-section">
          {field("Today's date", 'today_is', new Date().toISOString().split('T')[0])}
          {field("What's happening today", 'whats_happening', 'Mark calls at 4pm. Sarah visits at 3:30.', true)}
          {field("Who's visiting or calling", 'whos_visiting', 'Mark (Sunday call), Sarah and Lily')}
          {field('Special notes this week', 'special_notes', 'Maggie has been sleeping badly…', true)}
        </div>
      )}

      {saveError && <p className="setup-error">{saveError}</p>}

      <div className="setup-nav">
        {step > 0 && (
          <button className="setup-btn-secondary" onClick={() => setStep((step - 1) as WizardStep)}>
            ← Back
          </button>
        )}
        {step < 5 ? (
          <button className="setup-btn-primary" onClick={() => setStep((step + 1) as WizardStep)}>
            Continue →
          </button>
        ) : (
          <button className="setup-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save and meet Kith →'}
          </button>
        )}
      </div>
    </main>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseArray(str: string): any[] {
  try { return JSON.parse(str) ?? []; } catch { return []; }
}
