import { NextResponse } from 'next/server';
import { callClaude, TASK_BUDGETS } from '@/services/claude';
import { loadPersonhoodMap } from '@/models/personhood';
import { readNotebookAsText, writeNotebookFile } from '@/services/notebook';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SYSTEM_PROMPT = `You are Kith performing your nightly reflection on today's conversations with {{preferred_name}}.

Your job is to analyse the full conversation log and produce three structured outputs:

## 1. Behavioural summary (for Kith's own notebook)
What happened today? What patterns emerged? What was {{preferred_name}} thinking about most?
One paragraph, honest, specific.

## 2. Caregiver alert (immediate family)
Flag anything the caregiver needs to know before tomorrow. Include:
- Emotional distress moments (with time)
- Confusion or disorientation episodes (with time)
- Physical complaints mentioned
- Any risk signals
- Mood shifts
If nothing needs flagging, say so explicitly.

## 3. Doctor's note (for next medical visit)
Clinically relevant observations from today's conversations:
- Cognitive patterns (recall, orientation, repetition)
- Behavioural changes from the baseline in the Personhood Map
- Any complaints about physical symptoms
- Anything worth monitoring or raising with a GP or specialist
Write in plain language, not jargon. The family will bring this to the appointment.

---

## Context

### Personhood Map (baseline)
{{personhood_document}}

### Notebook (what Kith already knows across days)
{{notebook}}

### Today's conversations
{{conversations}}

---

## Output format

Return JSON exactly like this:

{
  "date": "YYYY-MM-DD",
  "behavioural_summary": "...",
  "caregiver_alert": {
    "needs_attention": true | false,
    "items": ["...", "..."]
  },
  "doctors_note": {
    "cognitive_observations": ["..."],
    "behavioural_changes": ["..."],
    "physical_complaints": ["..."],
    "monitoring_suggestions": ["..."]
  }
}
`;

export async function POST() {
  const map = loadPersonhoodMap();
  const preferred_name = map.person.preferred_name;

  const convPath = join(process.cwd(), 'data', 'conversations.jsonl');
  const conversations = existsSync(convPath)
    ? readFileSync(convPath, 'utf-8').trim()
    : '(no conversations today)';

  const notebook = readNotebookAsText();
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = SYSTEM_PROMPT
    .replace(/{{preferred_name}}/g, preferred_name)
    .replace('{{personhood_document}}', JSON.stringify(map, null, 2))
    .replace('{{notebook}}', notebook)
    .replace('{{conversations}}', conversations);

  try {
    const raw = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: 'Perform the nightly reflection for today.' }],
      effort: 'high',
      taskBudget: TASK_BUDGETS.nightlyReflection,
    });

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const result = JSON.parse(jsonMatch ? jsonMatch[1] : raw);

    // Write summary to today.md notebook file
    const notebookEntry = `## Nightly reflection — ${today}

**Behavioural summary:** ${result.behavioural_summary}

**Caregiver alert:** ${result.caregiver_alert.needs_attention ? '⚠ Needs attention' : 'Nothing urgent'}
${result.caregiver_alert.items.map((i: string) => `- ${i}`).join('\n')}

**Doctor's note topics:**
${result.doctors_note.cognitive_observations.map((i: string) => `- [Cognitive] ${i}`).join('\n')}
${result.doctors_note.behavioural_changes.map((i: string) => `- [Behaviour] ${i}`).join('\n')}
${result.doctors_note.physical_complaints.map((i: string) => `- [Physical] ${i}`).join('\n')}
${result.doctors_note.monitoring_suggestions.map((i: string) => `- [Watch] ${i}`).join('\n')}
`;

    writeNotebookFile('today.md', notebookEntry);

    // Also append urgent items to concerns.md
    if (result.caregiver_alert.needs_attention && result.caregiver_alert.items.length) {
      const { appendToNotebook } = await import('@/services/notebook');
      appendToNotebook(
        'concerns.md',
        `[${today}] ${result.caregiver_alert.items.join(' | ')}`
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/reflect]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
