import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/services/claude';
import { loadPersonhoodMap } from '@/models/personhood';
import { appendToNotebook } from '@/services/notebook';

export async function POST(req: NextRequest) {
  const { memory_title, memory_description, vision_text, user_response } = await req.json();

  const map = loadPersonhoodMap();
  const name = map.person.preferred_name;

  if (!user_response) {
    // Phase 1 — generate a warm follow-up question
    const text = await callClaude({
      systemPrompt: `You are Kith, a gentle AI companion for ${name}, who is living with Alzheimer's.
You have just narrated a memory about: "${memory_title}".

Generate ONE warm, open-ended question to invite ${name} to share more about this memory.

Rules (non-negotiable):
- NEVER say "do you remember" — never test their memory
- Ask about feelings, sensations, or details: what it felt like, smelled like, sounded like
- One sentence only. Warm, curious, never clinical
- Be specific to this exact memory — not generic

Examples of the tone:
"What did the air smell like up on that Stowe road in October?"
"What do you think George was really feeling when he pulled over for that eleventh tree?"
"Was the kitchen dusty or did you two keep it tidy while you worked?"

Return only the question. Nothing else.`,
      messages: [{ role: 'user', content: `Memory: ${memory_description}\nPhoto detail: ${vision_text ?? ''}` }],
      effort: 'medium',
    });

    return NextResponse.json({ question: text.trim().replace(/^["']|["']$/g, '') });
  }

  // Phase 2 — acknowledge the response + save observation
  const raw = await callClaude({
    systemPrompt: `You are Kith, a gentle AI companion for ${name}, who is living with Alzheimer's.

You were discussing this memory: "${memory_title}" — ${memory_description}

${name} just responded to your question. Produce a JSON response:
{
  "acknowledgment": "1-2 sentences, warm and specific to what they said. Reference what they actually shared. Never clinical.",
  "observation": "1 sentence for the family/care team: what ${name} recalled, how engaged they seemed, any notable detail."
}

Rules:
- Acknowledgment: warm, human, references their actual words
- Never correct, never test, never say "that's incorrect"
- Observation: specific and honest — useful for the care team`,
    messages: [{
      role: 'user',
      content: `${name} said: "${user_response}"`,
    }],
    effort: 'medium',
  });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const { acknowledgment, observation } = parsed;

    // Save to notebook
    const today = new Date().toISOString().split('T')[0];
    appendToNotebook('today.md', `[Memory session — ${today}] ${memory_title}: ${observation}`);

    return NextResponse.json({ acknowledgment, observation });
  } catch {
    return NextResponse.json({
      acknowledgment: raw.trim(),
      observation: `Engaged with the memory of "${memory_title}".`,
    });
  }
}
