/**
 * Fixed 6-section Personhood Map schema (demo-day version).
 *
 * Locked as of 2026-04-24. Do not add/rename fields today.
 *
 * Every fact-bearing item carries a `known_or_inferred` tag so the review UI
 * can visibly separate facts the caregiver actually provided from facts
 * Kith read between the lines. This is the cornerstone of the
 * "never invent memories" rule.
 */

import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const Confidence = z.enum(['known', 'inferred']);
export type Confidence = z.infer<typeof Confidence>;

const ImportantPersonSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  details: z.string(),
  is_living: z.boolean().optional(),
  known_or_inferred: Confidence,
});

const FamiliarMemorySchema = z.object({
  title: z.string(),
  description: z.string(),
  known_or_inferred: Confidence,
});

const RoutineSchema = z.object({
  when: z.string(),
  activity: z.string(),
  known_or_inferred: Confidence,
});

const ComfortTopicSchema = z.object({
  topic: z.string(),
  why_it_comforts: z.string(),
  known_or_inferred: Confidence,
});

const SensitiveTopicSchema = z.object({
  topic: z.string(),
  handling: z.string(),
  known_or_inferred: Confidence,
});

export const PersonhoodMapFixedSchema = z.object({
  patient_name: z.string(),
  caregiver_name: z.string(),
  date_generated: z.string(),

  important_people: z.array(ImportantPersonSchema),
  familiar_memories: z.array(FamiliarMemorySchema),
  routines: z.array(RoutineSchema),
  comfort_topics: z.array(ComfortTopicSchema),
  sensitive_topics: z.array(SensitiveTopicSchema),
  never_guess_rules: z.array(z.string()),

  uncertainty_notes: z.string().optional(),
});

export type PersonhoodMapFixed = z.infer<typeof PersonhoodMapFixedSchema>;

export const MAP_PATH = join(process.cwd(), 'data', 'personhood_map.json');

export function loadPersonhoodMapFixed(): PersonhoodMapFixed | null {
  if (!existsSync(MAP_PATH)) return null;
  try {
    const raw = readFileSync(MAP_PATH, 'utf-8');
    return PersonhoodMapFixedSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
