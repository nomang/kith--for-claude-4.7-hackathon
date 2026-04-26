import { NextResponse } from 'next/server';
import { callClaude } from '@/services/claude';
import { loadPersonhoodMap } from '@/models/personhood';

export interface Reminder {
  time: string;
  activity: string;
  message: string;
  urgency: 'now' | 'soon' | 'today';
  comfort_cue?: string;
}

export async function GET() {
  const map = loadPersonhoodMap();
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`;
  const name = map.person.preferred_name;

  const routinesText = map.routines
    .map(r => `- ${r.time}: ${r.activity}`)
    .join('\n');

  const comforts = map.comfort_and_avoid.things_that_comfort_them.slice(0, 4).join(', ');

  const raw = await callClaude({
    systemPrompt: `You are Kith's reminder engine for ${name}, who is living with Alzheimer's.

Current time: ${timeStr} on ${dayName}
Known routines:
${routinesText}

Things that comfort ${name}: ${comforts}

Generate 1-3 gentle, time-aware reminders for RIGHT NOW and the next few hours.
Each reminder should be grounding — it tells ${name} what is normal and expected, not what they have missed.

Rules:
- Never phrase as "you should" or "don't forget"
- Phrase as warm facts: "It's nearly time for..." or "This is usually when..."
- If a routine is happening NOW (within 30 min), mark urgency "now"
- If within 2 hours, mark "soon"
- Otherwise "today"
- Include a comfort_cue from the known list when it fits naturally
- Be specific to ${name}'s actual routines — not generic

Return JSON array:
[
  {
    "time": "the routine time label",
    "activity": "brief activity label",
    "message": "warm 1-sentence reminder",
    "urgency": "now|soon|today",
    "comfort_cue": "optional comfort item that relates"
  }
]

Return only the JSON array.`,
    messages: [{ role: 'user', content: `What should ${name} know about her day right now?` }],
    effort: 'medium',
  });

  try {
    const match = raw.match(/\[[\s\S]*\]/);
    const reminders: Reminder[] = JSON.parse(match ? match[0] : raw);
    return NextResponse.json({ reminders, generated_at: now.toISOString() });
  } catch {
    return NextResponse.json({ reminders: [], generated_at: now.toISOString() });
  }
}
