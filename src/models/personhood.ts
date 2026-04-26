import { z } from 'zod';

const PersonSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  is_living: z.boolean(),
  what_makes_them_special: z.string(),
  favorite_shared_memory: z.string().optional(),
});

const RoutineSchema = z.object({
  time: z.string(),
  activity: z.string(),
});

const StorySchema = z.object({
  title: z.string(),
  story: z.string(),
});

const ThisWeekSchema = z.object({
  today_is: z.string(),
  whats_happening_today: z.string(),
  whos_visiting_or_calling: z.string(),
  special_notes: z.string().optional(),
});

export const PersonhoodMapSchema = z.object({
  person: z.object({
    full_name: z.string(),
    preferred_name: z.string(),
    age: z.number(),
    current_location: z.string(),
    hometown: z.string(),
    personality: z.string(),
  }),
  people_in_their_life: z.array(PersonSchema),
  daily_life: z.object({
    typical_day: z.string(),
    favorite_music: z.array(z.string()),
    favorite_shows: z.array(z.string()),
    favorite_foods: z.array(z.string()),
    foods_they_dislike: z.array(z.string()),
    hobbies: z.array(z.string()),
  }),
  stories_they_love: z.array(StorySchema),
  comfort_and_avoid: z.object({
    things_that_comfort_them: z.array(z.string()),
    topics_to_avoid: z.array(z.string()),
    difficult_times_of_day: z.string().optional(),
  }),
  routines: z.array(RoutineSchema),
  sensitive_handling_mode: z.enum(['Gentle Redirect', 'Gentle Truth', 'Memory-First']),
  this_week: ThisWeekSchema.optional(),
});

export type PersonhoodMap = z.infer<typeof PersonhoodMapSchema>;

import { readFileSync } from 'fs';
import { join } from 'path';

export function loadPersonhoodMap(): PersonhoodMap {
  const raw = readFileSync(join(process.cwd(), 'data', 'personhood.json'), 'utf-8');
  return PersonhoodMapSchema.parse(JSON.parse(raw));
}
