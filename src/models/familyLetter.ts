/**
 * Fixed 5-section family continuity letter (demo-day version).
 *
 * Locked as of 2026-04-24. Do not add sections today.
 */

import { z } from 'zod';

export const SupportingMomentSchema = z.object({
  snippet: z.string(),
  context: z.string(),
});

export const FamilyLetterFixedSchema = z.object({
  patient_name: z.string(),
  date_range: z.string(),
  moments_of_connection: z.string(),
  what_seemed_grounding: z.string(),
  where_confusion_showed_up: z.string(),
  one_small_thing_to_try: z.string(),
  supporting_moments: z.array(SupportingMomentSchema).max(3),
});

export type FamilyLetterFixed = z.infer<typeof FamilyLetterFixedSchema>;
export type SupportingMoment = z.infer<typeof SupportingMomentSchema>;
