/**
 * Hard test for the Personhood Map generator.
 *
 * Runs three messy caregiver inputs through the same prompt + schema
 * pipeline the API route uses (no HTTP layer — direct call). For each
 * case we check:
 *
 *   • JSON parses
 *   • Schema validates
 *   • No obviously-hallucinated specific claims (we scan for forbidden
 *     names/places/dates seeded per case)
 *   • Uncertainty surfaces when it should
 *   • All caregiver avoid-topics flow into sensitive_topics AND
 *     never_guess_rules
 *
 * Run: npx tsx scripts/test_map_generator.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';
import { PersonhoodMapFixedSchema, type PersonhoodMapFixed } from '../src/models/personhoodMap.ts';

loadEnv({ path: join(process.cwd(), '.env') });
loadEnv({ path: join(process.cwd(), '.env.local') });

const MODEL = 'claude-opus-4-7';
const PROMPT_PATH = join(process.cwd(), 'prompts', 'personhood_map_fixed.txt');

type Case = {
  name: string;
  patient_name: string;
  caregiver_name: string;
  notes: string;
  avoid: string;
  forbidden_strings: string[]; // should NOT appear anywhere in the map
  must_appear_somewhere: string[]; // any one of these must surface (e.g. in uncertainty_notes)
  expect_sensitive_topics_count_at_least?: number;
};

const CASES: Case[] = [
  {
    name: 'clean',
    patient_name: 'Margaret Hartley',
    caregiver_name: 'Sarah (daughter)',
    notes: [
      "Mum is Margaret Hartley, 78, lives alone in her own home in Bristol.",
      "Her husband George passed away in November 2023. They were married 43 years.",
      "Children: Mark (51, lives in Edinburgh, calls every Sunday) and me, Sarah.",
      "Granddaughter Lily, 8, mad about animals. Maggie's favourite person.",
      "She loves Willie Nelson, detective novels, tea in her blue mug.",
      "Walks to the post office most mornings, about 20 minutes each way.",
      "Sundowns around 4:30-5:30pm — gets anxious. Music helps.",
      "Comforting things: the green blanket, hearing about Lily.",
    ].join('\n'),
    avoid:
      "Don't bring up George's final weeks in hospice. Don't mention moving to a care home.",
    forbidden_strings: [
      // Things NOT in the notes — if the model invents them we'll see.
      'Liverpool', 'Bristol Royal', 'dementia diagnosis', 'Helvellyn', 'Biscuit',
    ],
    must_appear_somewhere: ['Willie Nelson', 'Lily', 'Mark', 'George'],
    expect_sensitive_topics_count_at_least: 2,
  },
  {
    name: 'partial',
    patient_name: 'John',
    caregiver_name: 'Maria',
    notes: [
      "My dad John. He's in his late 70s I think. Used to be a teacher.",
      "Loves classical music. Walks a lot. Has a cat.",
      "Wife passed a few years ago, I don't remember exactly when.",
      "He has a brother somewhere but they haven't spoken in years.",
    ].join('\n'),
    avoid: '',
    // If the model invents specifics (exact age, wife's name, cat's name), flag it.
    forbidden_strings: ['1945', '1946', '1947', '1948', 'Eleanor', 'Margaret', 'Whiskers', 'Tom '],
    must_appear_somewhere: ['uncertain', 'not sure', 'unclear', "don't", 'roughly', 'approximate', 'about'],
    expect_sensitive_topics_count_at_least: 0,
  },
  {
    name: 'conflicting',
    patient_name: 'Rose',
    caregiver_name: 'Pat',
    notes: [
      "Rose is my aunt. She's 82. No wait she turned 83 last month.",
      "She lives in Manchester. Actually she moved to Leeds last year to be near her son David.",
      "Her son David. Or is it Daniel? I always mix them up. He visits on Saturdays.",
      "She loves gardening and also hates gardening since her hip gave out. Mostly watches it on TV now.",
      "Don't talk about her sister Joan — they had a falling out in 2019.",
    ].join('\n'),
    avoid: "Sister Joan. The falling out in 2019.",
    forbidden_strings: [
      // If Claude picks one name with certainty it's hallucinating resolution.
      // We'll check separately that if David appears it's marked inferred OR uncertainty_notes mentions the name confusion.
    ],
    must_appear_somewhere: ['David', 'Daniel', 'name', 'confus', 'unclear', 'uncertain'],
    expect_sensitive_topics_count_at_least: 1,
  },
];

const systemTemplate = readFileSync(PROMPT_PATH, 'utf-8');

function fillPrompt(c: Case): string {
  return systemTemplate
    .replaceAll('{{patient_name}}', c.patient_name)
    .replaceAll('{{caregiver_name}}', c.caregiver_name)
    .replaceAll('{{today}}', new Date().toISOString().slice(0, 10))
    .replaceAll('{{notes}}', c.notes)
    .replaceAll('{{avoid}}', c.avoid || '(none explicitly listed)');
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) return brace[0].trim();
  return null;
}

async function runCase(c: Case) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ CASE: ${c.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { 'anthropic-beta': 'task-budgets-2026-03-13' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: fillPrompt(c),
    messages: [
      {
        role: 'user',
        content:
          'Produce the Personhood Map JSON for this person using only the notes ' +
          'above. Follow every rule in the system prompt. Return JSON and nothing else.',
      },
    ],
  });

  const text = (response.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');

  const issues: string[] = [];
  const raw = extractJson(text);
  if (!raw) { issues.push('NO_JSON_FOUND'); console.log(text); }

  let parsed: PersonhoodMapFixed | null = null;
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      const result = PersonhoodMapFixedSchema.safeParse(obj);
      if (!result.success) {
        issues.push('SCHEMA_INVALID: ' + JSON.stringify(result.error.issues.slice(0, 3)));
      } else {
        parsed = result.data;
      }
    } catch (e) {
      issues.push('JSON_PARSE_FAILED: ' + String(e));
    }
  }

  if (parsed) {
    const flat = JSON.stringify(parsed).toLowerCase();

    for (const bad of c.forbidden_strings) {
      if (flat.includes(bad.toLowerCase())) {
        issues.push(`HALLUCINATION: "${bad}" appears but was not in input`);
      }
    }

    const anyPresent = c.must_appear_somewhere.some(s => flat.includes(s.toLowerCase()));
    if (!anyPresent) {
      issues.push(`MISSING: none of [${c.must_appear_somewhere.join(', ')}] surfaced`);
    }

    if (
      c.expect_sensitive_topics_count_at_least != null &&
      parsed.sensitive_topics.length < c.expect_sensitive_topics_count_at_least
    ) {
      issues.push(
        `TOO FEW SENSITIVE TOPICS: got ${parsed.sensitive_topics.length}, expected >= ${c.expect_sensitive_topics_count_at_least}`
      );
    }

    // Cross-check: caregiver avoid text must flow into at least one sensitive_topic AND one never_guess_rule
    if (c.avoid.trim()) {
      const avoidTokens = c.avoid
        .toLowerCase()
        .split(/[.\n,]/)
        .map(s => s.trim())
        .filter(s => s.length > 4);
      const inSensitive = avoidTokens.some(t =>
        parsed!.sensitive_topics.some(st =>
          (st.topic + ' ' + st.handling).toLowerCase().includes(t) ||
          t.split(' ').some(w => w.length > 3 && (st.topic + ' ' + st.handling).toLowerCase().includes(w))
        )
      );
      const inRules = avoidTokens.some(t =>
        parsed!.never_guess_rules.some(r =>
          r.toLowerCase().includes(t) ||
          t.split(' ').some(w => w.length > 3 && r.toLowerCase().includes(w))
        )
      );
      if (!inSensitive) issues.push('avoid-topic not surfaced in sensitive_topics');
      if (!inRules) issues.push('avoid-topic not surfaced in never_guess_rules');
    }

    // Special check for "conflicting" case: David vs Daniel should be flagged as uncertain
    if (c.name === 'conflicting') {
      const mentionsBothOrNotes =
        (flat.includes('david') && flat.includes('daniel')) ||
        (parsed.uncertainty_notes ?? '').toLowerCase().match(/(name|david|daniel)/);
      if (!mentionsBothOrNotes) {
        issues.push('conflicting names not surfaced as uncertainty');
      }
    }

    console.log(`  patient_name       : ${parsed.patient_name}`);
    console.log(`  important_people   : ${parsed.important_people.length}`);
    console.log(`  familiar_memories  : ${parsed.familiar_memories.length}`);
    console.log(`  routines           : ${parsed.routines.length}`);
    console.log(`  comfort_topics     : ${parsed.comfort_topics.length}`);
    console.log(`  sensitive_topics   : ${parsed.sensitive_topics.length}`);
    console.log(`  never_guess_rules  : ${parsed.never_guess_rules.length}`);
    console.log(`  uncertainty_notes  : ${parsed.uncertainty_notes ? `"${parsed.uncertainty_notes.slice(0, 120)}${parsed.uncertainty_notes.length > 120 ? '…' : ''}"` : '(empty)'}`);
    const inferredCount =
      parsed.important_people.filter(p => p.known_or_inferred === 'inferred').length +
      parsed.familiar_memories.filter(p => p.known_or_inferred === 'inferred').length +
      parsed.routines.filter(p => p.known_or_inferred === 'inferred').length +
      parsed.comfort_topics.filter(p => p.known_or_inferred === 'inferred').length +
      parsed.sensitive_topics.filter(p => p.known_or_inferred === 'inferred').length;
    console.log(`  inferred-total     : ${inferredCount}`);
  }

  if (issues.length === 0) {
    console.log(`\n  ✓ PASS — no issues found`);
  } else {
    console.log(`\n  ✗ ISSUES:`);
    for (const i of issues) console.log(`      - ${i}`);
  }
  return { case: c.name, issues };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in environment.');
    process.exit(1);
  }
  const results = [];
  for (const c of CASES) {
    try {
      results.push(await runCase(c));
    } catch (e) {
      console.error(`Case ${c.name} threw:`, e);
      results.push({ case: c.name, issues: ['THREW: ' + String(e)] });
    }
  }
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('SUMMARY');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  for (const r of results) {
    console.log(`  ${r.case.padEnd(14)} ${r.issues.length === 0 ? '✓' : '✗ (' + r.issues.length + ')'}`);
  }
  const anyFailed = results.some(r => r.issues.length > 0);
  process.exit(anyFailed ? 1 : 0);
}

main();
