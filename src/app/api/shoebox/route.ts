import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { callClaude, TASK_BUDGETS } from '@/services/claude';
import { loadPrompt } from '@/services/promptLoader';

export const maxDuration = 60;

const MODEL = 'claude-opus-4-7';
const BATCH_SIZE = 10;

const MAP_REVIEW_PROMPT = `You are a careful reviewer checking a draft Personhood Map for internal consistency.

The map was assembled by reading family photographs in parallel batches. Your job is to find:
1. Date contradictions — e.g. a person listed as born in 1940 but described as a child in a 1930 photo
2. Duplicate persons — the same person listed twice under different name variants (e.g. "Margaret" and "Maggie" both appear as separate entries)
3. Unsourced claims — any specific fact (date, place, relationship, event) tagged as "known" that has no plausible image source

For each issue found, describe it briefly and mark it as needing family review.
If the map is internally consistent, say so.

Return JSON exactly:
{
  "verified": true | false,
  "issues": [
    { "type": "date_contradiction" | "duplicate_person" | "unsourced_claim", "description": "..." }
  ]
}

Return only JSON.`;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const photos = form.getAll('photos') as File[];

  if (!photos.length) {
    return NextResponse.json({ error: 'no photos' }, { status: 400 });
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { 'anthropic-beta': 'task-budgets-2026-03-13' },
  });
  const systemPrompt = loadPrompt('shoebox_onboarding');

  // ── Batch photos into groups of BATCH_SIZE ────────────────────────
  const batches: File[][] = [];
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    batches.push(photos.slice(i, i + BATCH_SIZE));
  }

  // ── Build image blocks for each batch ────────────────────────────
  async function buildImageBlocks(batch: File[]): Promise<Anthropic.ImageBlockParam[]> {
    return Promise.all(
      batch.map(async (photo) => {
        const bytes = await photo.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        const mediaType = (photo.type || 'image/jpeg') as
          | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } };
      })
    );
  }

  // ── Dispatch all batches in parallel at effort:high + task_budget ─
  async function processBatch(batch: File[], batchIndex: number): Promise<string> {
    const imageBlocks = await buildImageBlocks(batch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      task_budget: { tokens: TASK_BUDGETS.shoeboxPerBatch },
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Batch ${batchIndex + 1} of ${batches.length}: ${batch.length} photo(s). Extract all details and return a partial Personhood Map JSON.`,
          },
        ],
      }],
    });
    return (response.content as Array<{ type: string; text?: string }>)
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('');
  }

  try {
    // Run all batches in parallel
    const batchOutputs = await Promise.all(
      batches.map((batch, i) => processBatch(batch, i))
    );

    // ── Parse each batch output ───────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedBatches: any[] = batchOutputs.map((raw, i) => {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
      try {
        return JSON.parse(jsonMatch ? jsonMatch[1] : raw);
      } catch {
        console.warn(`[shoebox] batch ${i} parse failed, using raw`);
        return { _raw: raw };
      }
    });

    // ── Merge step: deduplicate people + stitch timeline ─────────
    const mergedDraft = mergeBatches(parsedBatches);

    // ── Review pass: semantic consistency check ────────────────────
    const reviewRaw = await callClaude({
      systemPrompt: MAP_REVIEW_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(mergedDraft, null, 2) }],
      effort: 'medium',
      taskBudget: 3000,
    });

    let verificationIssues: { type: string; description: string }[] = [];
    try {
      const reviewMatch = reviewRaw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? reviewRaw.match(/(\{[\s\S]*\})/);
      const reviewResult = JSON.parse(reviewMatch ? reviewMatch[1] : reviewRaw);
      verificationIssues = reviewResult.issues ?? [];
    } catch {
      // Non-fatal — return draft without issues
    }

    return NextResponse.json({
      draft: JSON.stringify(mergedDraft, null, 2),
      batches: batches.length,
      photos_processed: photos.length,
      verification_issues: verificationIssues,
    });

  } catch (err) {
    console.error('[/api/shoebox]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── Merge partial Personhood Maps from each batch ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeBatches(batches: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validBatches = batches.filter(b => b && !b._raw);
  if (validBatches.length === 0) return batches[0] ?? {};
  if (validBatches.length === 1) return validBatches[0];

  const base = JSON.parse(JSON.stringify(validBatches[0]));

  for (let i = 1; i < validBatches.length; i++) {
    const b = validBatches[i];

    // Merge people arrays — deduplicate by name similarity
    if (Array.isArray(b.people_in_their_life)) {
      for (const person of b.people_in_their_life) {
        const exists = (base.people_in_their_life ?? []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => nameSimilar(p.name, person.name)
        );
        if (!exists) {
          base.people_in_their_life = [...(base.people_in_their_life ?? []), person];
        }
      }
    }

    // Merge important_people (fixed schema variant)
    if (Array.isArray(b.important_people)) {
      for (const person of b.important_people) {
        const exists = (base.important_people ?? []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => nameSimilar(p.name, person.name)
        );
        if (!exists) {
          base.important_people = [...(base.important_people ?? []), person];
        }
      }
    }

    // Concatenate stories
    if (Array.isArray(b.stories_they_love)) {
      base.stories_they_love = [...(base.stories_they_love ?? []), ...b.stories_they_love];
    }
    if (Array.isArray(b.familiar_memories)) {
      base.familiar_memories = [...(base.familiar_memories ?? []), ...b.familiar_memories];
    }

    // Merge timeline events
    if (Array.isArray(b.timeline)) {
      base.timeline = [...(base.timeline ?? []), ...b.timeline];
    }
  }

  return base;
}

// Simple name similarity: same first 4 chars after lowercasing
function nameSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.toLowerCase().trim();
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.startsWith(nb.slice(0, 4)) || nb.startsWith(na.slice(0, 4));
}
