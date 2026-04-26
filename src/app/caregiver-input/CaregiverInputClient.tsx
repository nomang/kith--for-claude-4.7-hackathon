'use client';

/**
 * Single-screen caregiver input form.
 *
 * Kept deliberately plain. One submit button calls /api/map/generate, which
 * runs Claude, validates the fixed schema, writes data/personhood_map.json,
 * and returns the parsed map. On success we route to /map-review.
 */

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CaregiverInputClient() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [notes, setNotes] = useState('');
  const [avoid, setAvoid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoCount, setPhotoCount] = useState(0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!notes.trim() && !(fileRef.current?.files?.length ?? 0)) {
      setError('Please write some notes, or attach at least one photo.');
      return;
    }
    setSubmitting(true);

    const fd = new FormData();
    fd.append('patient_name', patientName.trim());
    fd.append('caregiver_name', caregiverName.trim());
    fd.append('notes', notes.trim());
    fd.append('avoid', avoid.trim());
    const files = fileRef.current?.files;
    if (files) {
      Array.from(files).slice(0, 3).forEach(f => fd.append('photos', f));
    }

    try {
      const res = await fetch('/api/map/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      router.push('/map-review');
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setSubmitting(false);
    }
  };

  return (
    <main className="cg-main">
      <header className="cg-header">
        <h1 className="cg-title">Tell Kith about them</h1>
        <p className="cg-subtitle">
          Write whatever comes to mind. Stories, routines, the names of people
          who matter. Kith will read it carefully and only record what you tell
          it — nothing invented.
        </p>
      </header>

      <form className="cg-form" onSubmit={onSubmit}>
        <label className="cg-field">
          <span className="cg-label">Patient's name</span>
          <input
            className="cg-input"
            value={patientName}
            onChange={e => setPatientName(e.target.value)}
            placeholder="e.g. Margaret Hartley"
            required
          />
        </label>

        <label className="cg-field">
          <span className="cg-label">Your name</span>
          <input
            className="cg-input"
            value={caregiverName}
            onChange={e => setCaregiverName(e.target.value)}
            placeholder="e.g. Sarah (her daughter)"
            required
          />
        </label>

        <label className="cg-field">
          <span className="cg-label">
            Tell Kith about them — people, memories, routines, anything
          </span>
          <textarea
            className="cg-input cg-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
`She's Margaret, 78, lives in Bristol. Her husband George passed away in 2023.
Two kids: Mark (in Edinburgh, Sunday calls) and me, Sarah. Granddaughter Lily,
who's 8. She loves Willie Nelson, detective novels, a cup of tea in her blue
mug. Walks to the post office most mornings. Sundowns around 4:30pm…`
            }
            rows={14}
            required
          />
        </label>

        <label className="cg-field">
          <span className="cg-label">
            Photos from the family shoebox <span className="cg-hint">(optional, up to 3)</span>
          </span>
          <input
            ref={fileRef}
            type="file"
            className="cg-file"
            accept="image/*"
            multiple
            onChange={e => setPhotoCount(e.target.files?.length ?? 0)}
          />
          {photoCount > 0 && (
            <p className="cg-hint">{photoCount} photo{photoCount === 1 ? '' : 's'} attached</p>
          )}
        </label>

        <label className="cg-field">
          <span className="cg-label">
            Anything to avoid? <span className="cg-hint">(optional)</span>
          </span>
          <textarea
            className="cg-input cg-textarea-small"
            value={avoid}
            onChange={e => setAvoid(e.target.value)}
            placeholder="e.g. Don't mention the care home conversation. Don't confirm or deny anything about George's final weeks."
            rows={4}
          />
        </label>

        {error && <p className="cg-error">{error}</p>}

        <button type="submit" className="cg-submit" disabled={submitting}>
          {submitting ? 'Kith is reading your notes…' : 'Generate Personhood Map →'}
        </button>

        <p className="cg-foot">
          This takes about 20–40 seconds. Kith will show you exactly what it
          understood before any conversation begins.
        </p>
      </form>
    </main>
  );
}
