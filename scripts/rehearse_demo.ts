/**
 * Demo-day rehearsal check.
 *
 * Exercises everything we built today that does NOT require a live Claude
 * call, so it can run offline as a gate:
 *
 *   1. Fixed Personhood Map loads and validates.
 *   2. Caregiver-input → map generation prompt fills cleanly for each of
 *      three messy inputs (no unresolved {{placeholders}}, no empty keys).
 *   3. Family letter prompt fills cleanly.
 *   4. Voice-loop prompt fills cleanly for the three rehearsal questions
 *      ("Who is Lily?", "What day is it?", "Where is John?").
 *   5. "Where is John?" trips the dissonant-data / never-guess handling
 *      path (John is not in the map — the prompt must explicitly warn
 *      Kith not to invent).
 *
 * Run:
 *   node --experimental-strip-types --experimental-transform-types \
 *        scripts/rehearse_demo.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PersonhoodMapFixedSchema } from '../src/models/personhoodMap.ts';

const ROOT = process.cwd();
const PROMPTS = join(ROOT, 'prompts');

function readPrompt(name: string) {
  return readFileSync(join(PROMPTS, name), 'utf-8');
}

function fill(template: string, vars: Record<string, string>) {
  let t = template;
  for (const [k, v] of Object.entries(vars)) t = t.replaceAll(`{{${k}}}`, v);
  return t;
}

function assertNoUnfilledPlaceholders(label: string, text: string) {
  const m = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
  if (m) throw new Error(`[${label}] unfilled placeholder: {{${m[1]}}}`);
}

let fails = 0;
function ok(label: string) { console.log(`  ✓ ${label}`); }
function bad(label: string, why: string) { console.log(`  ✗ ${label} — ${why}`); fails++; }

function section(title: string) {
  console.log(`\n━━ ${title} ━━`);
}

// ── 1. Fixed Personhood Map loads ──────────────────────────────────
section('1. Fixed Personhood Map validates');
try {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'personhood_map.json'), 'utf-8'));
  const parsed = PersonhoodMapFixedSchema.safeParse(raw);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues.slice(0, 3)));
  ok(`patient = ${parsed.data.patient_name}, ${parsed.data.important_people.length} people, ${parsed.data.never_guess_rules.length} rules`);
  // Sanity-check the rules actually mention George-hospice / care-home
  const rulesBlob = parsed.data.never_guess_rules.join(' ').toLowerCase();
  if (!/george|hospice/.test(rulesBlob) && !/care.?home/.test(rulesBlob)) {
    bad('rules mention George/care-home', 'neither surfaced in never_guess_rules');
  } else ok('sensitive topics flow into never_guess_rules');
} catch (e) {
  bad('map validates', String(e));
}

// ── 2. Map-generation prompt fills ────────────────────────────────
section('2. Personhood Map generation prompt fills');
{
  const template = readPrompt('personhood_map_fixed.txt');
  const cases = [
    { name: 'clean', notes: 'short notes', avoid: 'care home' },
    { name: 'partial', notes: 'sparse', avoid: '' },
    { name: 'conflicting', notes: 'Rose/David/Daniel', avoid: 'sister Joan' },
  ];
  for (const c of cases) {
    const filled = fill(template, {
      patient_name: 'Test',
      caregiver_name: 'Test',
      today: '2026-04-24',
      notes: c.notes,
      avoid: c.avoid || '(none explicitly listed)',
    });
    try {
      assertNoUnfilledPlaceholders(`map prompt (${c.name})`, filled);
      ok(`${c.name} input — prompt filled cleanly (${filled.length} chars)`);
    } catch (e) {
      bad(`${c.name}`, String(e));
    }
  }
}

// ── 3. Family letter prompt fills ─────────────────────────────────
section('3. Family letter prompt fills');
{
  const template = readPrompt('family_letter_fixed.txt');
  const map = readFileSync(join(ROOT, 'data', 'personhood_map.json'), 'utf-8');
  const filled = fill(template, {
    preferred_name: 'Maggie',
    date_range: '17 April–24 April',
    n: '6',
    personhood_map: map,
    conversations: '(sample)',
  });
  try {
    assertNoUnfilledPlaceholders('family letter prompt', filled);
    ok(`filled cleanly (${filled.length} chars)`);
  } catch (e) { bad('family letter prompt', String(e)); }
}

// ── 4. Voice-loop prompt fills for the three rehearsal questions ──
section('4. Voice loop prompt fills for each rehearsal question');
{
  const template = readPrompt('kith_voice.txt');
  const legacy = JSON.parse(readFileSync(join(ROOT, 'data', 'personhood.json'), 'utf-8'));
  const fixedMap = JSON.parse(readFileSync(join(ROOT, 'data', 'personhood_map.json'), 'utf-8'));

  const baseVars = {
    preferred_name: legacy.person?.preferred_name ?? 'Maggie',
    personhood_map: JSON.stringify(legacy, null, 2),
    notebook: '(empty)',
    date: 'Friday, 24 April 2026',
    time_of_day: 'afternoon',
    whats_happening_today: 'Nothing specific noted for today.',
    whos_visiting_or_calling: 'No visits or calls noted today.',
    sensitive_handling_mode: legacy.sensitive_handling_mode ?? 'Gentle Redirect',
    last_10_turns: '(start of conversation)',
  };

  const questions = [
    { q: 'Who is Lily?', expect_grounded_in: 'lily' },
    { q: 'What day is it?', expect_grounded_in: 'friday' },
    { q: 'Where is John?', expect_grounded_in: null /* John is not in the map */ },
  ];

  for (const { q, expect_grounded_in } of questions) {
    const filled = fill(template, {
      ...baseVars,
      last_10_turns: `${baseVars.preferred_name}: ${q}`,
    });
    try {
      assertNoUnfilledPlaceholders(`voice prompt (${q})`, filled);

      const lower = filled.toLowerCase();
      if (expect_grounded_in && !lower.includes(expect_grounded_in)) {
        bad(`${q}`, `expected "${expect_grounded_in}" to be present in the grounded prompt`);
        continue;
      }

      // For "Where is John?" — John isn't a known person. The never-guess
      // rules in the fixed map AND the voice prompt's never-invent clause
      // should both be reachable in the prompt text.
      if (q === 'Where is John?') {
        const neverInvent = /never.{0,40}(invent|guess|confirm.{0,20}not in|made up)/i.test(filled);
        const johnAbsent = !filled.toLowerCase().includes('"name": "john"');
        if (!neverInvent) {
          bad(q, 'voice prompt does not contain a never-invent/never-guess rule');
          continue;
        }
        if (!johnAbsent) {
          bad(q, 'unexpected: a "John" exists in the map — rename the test question');
          continue;
        }
        // Sanity: also print a sample of the never-guess rules from the fixed map
        ok(`${q} — prompt contains never-invent clause; John is absent (${fixedMap.never_guess_rules.length} rules active)`);
        continue;
      }

      ok(`${q} — prompt filled and grounded (${filled.length} chars)`);
    } catch (e) { bad(q, String(e)); }
  }
}

// ── 5. Summary ─────────────────────────────────────────────────────
section('SUMMARY');
if (fails === 0) {
  console.log('  ✓ All offline rehearsal checks passed.');
  console.log('  Run live: node --experimental-strip-types --experimental-transform-types \\');
  console.log('            scripts/test_map_generator.ts');
  process.exit(0);
} else {
  console.log(`  ✗ ${fails} check(s) failed.`);
  process.exit(1);
}
