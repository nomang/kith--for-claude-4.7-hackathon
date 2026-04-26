/**
 * POST /api/map/generate
 *
 * multipart/form-data:
 *   - patient_name: string
 *   - caregiver_name: string
 *   - notes: string               (free-text)
 *   - avoid: string               (optional; one per line or prose)
 *   - photos: file[]              (0–3)
 *
 * Runs one Claude call with the fixed-schema Personhood Map prompt.
 * Validates against PersonhoodMapFixedSchema. Saves to
 * data/personhood_map.json. Returns the parsed map.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { loadPrompt } from '@/services/promptLoader';
import {
  MAP_PATH,
  PersonhoodMapFixedSchema,
  type PersonhoodMapFixed,
} from '@/models/personhoodMap';

const MODEL = 'claude-opus-4-7';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const patient_name = String(form.get('patient_name') ?? '').trim() || 'the patient';
  const caregiver_name = String(form.get('caregiver_name') ?? '').trim() || 'the caregiver';
  const notes = String(form.get('notes') ?? '').trim();
  const avoid = String(form.get('avoid') ?? '').trim() || '(none explicitly listed)';
  const today = new Date().toISOString().slice(0, 10);

  if (!notes && !(form.getAll('photos') as File[]).length) {
    return NextResponse.json(
      { error: 'Please provide notes or at least one photo.' },
      { status: 400 }
    );
  }

  const systemPrompt = loadPrompt('personhood_map_fixed', {
    patient_name,
    caregiver_name,
    today,
    notes: notes || '(none)',
    avoid,
  });

  const photos = form.getAll('photos').filter(p => p instanceof File) as File[];
  const imageBlocks: Anthropic.ImageBlockParam[] = await Promise.all(
    photos.slice(0, 3).map(async (photo) => {
      const bytes = await photo.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mediaType = (photo.type || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';
      return {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      };
    })
  );

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { 'anthropic-beta': 'task-budgets-2026-03-13' },
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text:
                'Produce the Personhood Map JSON for this person using only ' +
                'the notes and photos above. Follow every rule in the system ' +
                'prompt. Return JSON and nothing else.',
            },
          ],
        },
      ],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    const raw = extractJson(text);
    if (!raw) {
      return NextResponse.json(
        { error: 'Model did not return parseable JSON.', text },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return NextResponse.json(
        { error: 'JSON parse failed: ' + String(e), raw },
        { status: 502 }
      );
    }

    const result = PersonhoodMapFixedSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Schema validation failed', issues: result.error.issues, raw: parsed },
        { status: 502 }
      );
    }

    writeFileSync(MAP_PATH, JSON.stringify(result.data, null, 2));

    // Bridge to the legacy personhood.json so the existing /talk voice loop
    // (which reads the older schema) uses the same person. Best-effort mapping.
    try {
      const legacy = toLegacyPersonhood(result.data);
      writeFileSync(
        join(process.cwd(), 'data', 'personhood.json'),
        JSON.stringify(legacy, null, 2)
      );
    } catch (e) {
      console.warn('[/api/map/generate] legacy sync failed (non-fatal):', e);
    }

    return NextResponse.json({ ok: true, map: result.data });
  } catch (err) {
    console.error('[/api/map/generate]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) return brace[0].trim();
  return null;
}

/**
 * Best-effort projection from the fixed 6-section map to the legacy
 * personhood.json schema that the voice loop reads. Missing fields default
 * to empty strings / arrays rather than fabricating. `age` is not captured
 * in the fixed map, so it defaults to 0 — the voice prompt tolerates that.
 */
function toLegacyPersonhood(m: PersonhoodMapFixed) {
  const preferredName = m.patient_name.split(/\s+/)[0] || m.patient_name;
  return {
    person: {
      full_name: m.patient_name,
      preferred_name: preferredName,
      age: 0,
      current_location: '',
      hometown: '',
      personality: '',
    },
    people_in_their_life: m.important_people.map(p => ({
      name: p.name,
      relationship: p.relationship,
      is_living: p.is_living !== false,
      what_makes_them_special: p.details,
    })),
    daily_life: {
      typical_day: m.routines.map(r => `${r.when}: ${r.activity}`).join(' '),
      favorite_music: [],
      favorite_shows: [],
      favorite_foods: [],
      foods_they_dislike: [],
      hobbies: [],
    },
    stories_they_love: m.familiar_memories.map(mem => ({
      title: mem.title,
      story: mem.description,
    })),
    comfort_and_avoid: {
      things_that_comfort_them: m.comfort_topics.map(c => `${c.topic} — ${c.why_it_comforts}`),
      topics_to_avoid: m.sensitive_topics.map(s => s.topic),
      difficult_times_of_day: '',
    },
    routines: m.routines.map(r => ({ time: r.when, activity: r.activity })),
    sensitive_handling_mode: 'Gentle Redirect' as const,
    this_week: {
      today_is: m.date_generated,
      whats_happening_today: '',
      whos_visiting_or_calling: '',
      special_notes: '',
    },
  };
}
