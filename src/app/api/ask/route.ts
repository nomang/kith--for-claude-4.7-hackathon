import { NextRequest, NextResponse } from 'next/server';
import { callClaudeAgentLoop } from '@/services/claudeAgent';
import { loadPrompt } from '@/services/promptLoader';
import { loadPersonhoodMapFixed } from '@/models/personhoodMap';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question } = await req.json() as { question: string };

  if (!question?.trim()) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 });
  }

  const map = loadPersonhoodMapFixed();
  const preferred_name = map?.patient_name ?? 'the patient';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Compact personhood summary for context (not the full JSON — saves tokens)
  const personhood_summary = map ? [
    `Patient: ${map.patient_name} (caregiver: ${map.caregiver_name})`,
    `Important people: ${map.important_people.map(p => `${p.name} (${p.relationship}${p.is_living === false ? ', in memory' : ''})`).join(', ')}`,
    `Familiar memories: ${map.familiar_memories.map(m => m.title).join(', ')}`,
    `Comfort topics: ${map.comfort_topics.map(c => c.topic).join(', ')}`,
    `Sensitive topics: ${map.sensitive_topics.map(s => s.topic).join(', ')}`,
  ].join('\n') : '(no personhood map available)';

  try {
    const systemPrompt = loadPrompt('care_investigator', {
      preferred_name,
      today,
      personhood_summary,
    });

    const result = await callClaudeAgentLoop({
      systemPrompt,
      question: question.trim(),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/ask]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
