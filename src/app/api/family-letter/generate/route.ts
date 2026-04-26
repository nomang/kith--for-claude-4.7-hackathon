/**
 * POST /api/family-letter/generate
 *
 * Reads:
 *   • data/personhood_map.json        (the fixed-schema Personhood Map)
 *   • data/conversations.jsonl        (append-only conversation log)
 *
 * Runs one Claude call with the fixed 5-section letter prompt, validates
 * the output against FamilyLetterFixedSchema, and returns the parsed letter.
 * (The screen holds it in memory — we don't persist letters to disk today.)
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { callClaude, TASK_BUDGETS } from '@/services/claude';
import { loadPrompt } from '@/services/promptLoader';
import { loadPersonhoodMapFixed } from '@/models/personhoodMap';
import { FamilyLetterFixedSchema } from '@/models/familyLetter';

function fmt(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export async function POST() {
  const map = loadPersonhoodMapFixed();
  if (!map) {
    return NextResponse.json(
      { error: 'No Personhood Map yet. Start at /caregiver-input.' },
      { status: 400 }
    );
  }

  const convPath = join(process.cwd(), 'data', 'conversations.jsonl');
  const conversations = existsSync(convPath)
    ? readFileSync(convPath, 'utf-8').trim()
    : '';

  const n = conversations ? conversations.split('\n').filter(Boolean).length : 0;
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const date_range = `${fmt(weekAgo)}–${fmt(today)}`;

  const systemPrompt = loadPrompt('family_letter_fixed', {
    preferred_name: map.patient_name,
    date_range,
    n: String(n),
    personhood_map: JSON.stringify(map, null, 2),
    conversations: conversations || '(no conversations recorded this week)',
  });

  try {
    const text = await callClaude({
      systemPrompt,
      messages: [
        {
          role: 'user',
          content:
            'Write the weekly family letter in the fixed 5-section JSON format. ' +
            'Use only the Personhood Map and the conversation log. Return JSON only.',
        },
      ],
      effort: 'xhigh',
      taskBudget: TASK_BUDGETS.letterSynthesizer,
      maxTokens: 12000,
    });

    const raw = extractJson(text);
    if (!raw) {
      return NextResponse.json(
        { error: 'Model did not return parseable JSON.', text },
        { status: 502 }
      );
    }
    const obj = JSON.parse(raw);
    const result = FamilyLetterFixedSchema.safeParse(obj);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Schema validation failed', issues: result.error.issues, raw: obj },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, letter: result.data, n });
  } catch (err) {
    console.error('[/api/family-letter/generate]', err);
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
