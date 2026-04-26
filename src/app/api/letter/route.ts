import { NextResponse } from 'next/server';
import { callClaude, callClaudeParallel, TASK_BUDGETS } from '@/services/claude';
import { loadPrompt } from '@/services/promptLoader';
import { loadPersonhoodMap } from '@/models/personhood';
import { readNotebookAsText } from '@/services/notebook';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const maxDuration = 60;

export async function POST() {
  const map = loadPersonhoodMap();
  const preferred_name = map.person.preferred_name;
  const personhood_document = JSON.stringify(map, null, 2);
  const notebook = await readNotebookAsText();
  const routines = JSON.stringify(map.routines, null, 2);

  // Load conversation log
  const convPath = join(process.cwd(), 'data', 'conversations.jsonl');
  const conversations = existsSync(convPath)
    ? readFileSync(convPath, 'utf-8').trim()
    : '(no conversations recorded this week)';

  const n = conversations.split('\n').filter(Boolean).length;
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const date_range = `${fmt(weekAgo)}–${fmt(today)}`;

  // Load subagent prompt file — split on ===DIVIDER===
  const rawSubagents = loadPrompt('letter_subagents');
  const subagentBlocks = rawSubagents.split(/# ={5,}/);

  // Extract each subagent system prompt (Mood/Memory/Changes/Routines/Joy)
  const [moodPrompt, memoryPrompt, changesPrompt, routinesPrompt, joyPrompt] =
    subagentBlocks
      .filter(b => b.trim().length > 30)
      .slice(0, 5)
      .map(b =>
        b
          .replace(/{{preferred_name}}/g, preferred_name)
          .replace(/{{conversations}}/g, conversations)
          .replace(/{{notebook}}/g, notebook)
          .replace(/{{personhood_document}}/g, personhood_document)
          .replace(/{{prior_notebook_summaries}}/g, notebook)
          .replace(/{{routines}}/g, routines)
          .trim()
      );

  // ── Fan out: 5 subagents in parallel (4.7 capability #7) ─────────
  const [moodOut, memoryOut, changesOut, routinesOut, joyOut] =
    await callClaudeParallel([
      { systemPrompt: moodPrompt,    messages: [{ role: 'user', content: 'Produce your structured observations.' }], effort: 'high', taskBudget: TASK_BUDGETS.letterSubagent },
      { systemPrompt: memoryPrompt,  messages: [{ role: 'user', content: 'Produce your structured observations.' }], effort: 'high', taskBudget: TASK_BUDGETS.letterSubagent },
      { systemPrompt: changesPrompt, messages: [{ role: 'user', content: 'Produce your structured observations.' }], effort: 'high', taskBudget: TASK_BUDGETS.letterSubagent },
      { systemPrompt: routinesPrompt,messages: [{ role: 'user', content: 'Produce your structured observations.' }], effort: 'high', taskBudget: TASK_BUDGETS.letterSubagent },
      { systemPrompt: joyPrompt,     messages: [{ role: 'user', content: 'Produce your structured observations.' }], effort: 'high', taskBudget: TASK_BUDGETS.letterSubagent },
    ]);

  // ── Synthesizer (4.7 capability #7 + #3 self-verification) ───────
  const synthPrompt = loadPrompt('weekly_letter', {
    preferred_name,
    mood_observations: moodOut,
    memory_observations: memoryOut,
    change_observations: changesOut,
    routine_observations: routinesOut,
    joy_observations: joyOut,
    personhood_document,
    rolling_notebook: notebook,
    n: String(n),
    date_range,
  });

  const letter = await callClaude({
    systemPrompt: synthPrompt,
    messages: [{ role: 'user', content: 'Write the weekly letter.' }],
    effort: 'xhigh',
    taskBudget: TASK_BUDGETS.letterSynthesizer,
  });

  return NextResponse.json({ letter, date_range, n });
}
