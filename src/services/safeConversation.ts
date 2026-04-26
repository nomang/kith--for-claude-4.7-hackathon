import { callClaude, TASK_BUDGETS, type KithMessage } from './claude';
import { loadPrompt } from './promptLoader';
import { loadPersonhoodMap } from '../models/personhood';
import { readNotebookAsText, appendToNotebook, type NotebookFile } from './notebook';
import { appendFileSync } from 'fs';
import { join } from 'path';

export interface KithResponse {
  spoken_response: string;
  observation: string;
  risk_flag: boolean;
  notebook_updates: Partial<Record<NotebookFile, string>>;
}

export async function chat(
  utterance: string,
  history: KithMessage[] = []
): Promise<KithResponse> {
  const map = loadPersonhoodMap();
  const notebook = readNotebookAsText();
  const preferred_name = map.person.preferred_name;

  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = now.getHours();
  const time_of_day =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const last_10_turns = history
    .slice(-10)
    .map(m => `${m.role === 'user' ? preferred_name : 'Kith'}: ${m.content}`)
    .join('\n');

  const thisWeek = map.this_week;
  const whats_happening_today = thisWeek?.whats_happening_today ?? 'Nothing specific noted for today.';
  const whos_visiting_or_calling = thisWeek?.whos_visiting_or_calling ?? 'No visits or calls noted today.';

  const systemPrompt = loadPrompt('kith_voice', {
    preferred_name,
    personhood_map: JSON.stringify(map, null, 2),
    notebook,
    date,
    time_of_day,
    whats_happening_today,
    whos_visiting_or_calling,
    sensitive_handling_mode: map.sensitive_handling_mode,
    last_10_turns: last_10_turns || '(start of conversation)',
  });

  // Adaptive thinking: use xhigh for distressed/complex turns, medium for simple greetings
  const isComplex = isComplexUtterance(utterance, map.comfort_and_avoid.topics_to_avoid);
  const effort = isComplex ? 'xhigh' : 'medium';

  const messages: KithMessage[] = [
    ...history,
    { role: 'user', content: utterance },
  ];

  const raw = await callClaude({
    systemPrompt,
    messages,
    effort,
    taskBudget: TASK_BUDGETS.conversation,
  });

  const parsed = parseResponse(raw);

  // Persist observation to conversation log
  logConversation(utterance, parsed);

  // Write notebook updates
  for (const [file, content] of Object.entries(parsed.notebook_updates)) {
    if (content) {
      appendToNotebook(file as NotebookFile, content);
    }
  }

  return parsed;
}

function isComplexUtterance(utterance: string, avoidTopics: string[]): boolean {
  const lower = utterance.toLowerCase();
  const riskWords = ['fell', "can't breathe", 'bleeding', 'hurt', 'die', 'scared', 'pills', 'lost', 'don\'t know'];
  if (riskWords.some(w => lower.includes(w))) return true;
  if (avoidTopics.some(t => lower.includes(t.substring(0, 15).toLowerCase()))) return true;
  if (lower.length > 120) return true;
  return false;
}

function parseResponse(raw: string): KithResponse {
  // Claude may wrap JSON in markdown code fences
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      spoken_response: parsed.spoken_response ?? '',
      observation: parsed.observation ?? '',
      risk_flag: parsed.risk_flag ?? false,
      notebook_updates: parsed.notebook_updates ?? {},
    };
  } catch {
    // Fallback if JSON parse fails — return raw as spoken_response
    return {
      spoken_response: raw.trim(),
      observation: '(parse error — raw response returned)',
      risk_flag: false,
      notebook_updates: {},
    };
  }
}

function logConversation(utterance: string, response: KithResponse) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    user: utterance,
    kith: response.spoken_response,
    observation: response.observation,
    risk_flag: response.risk_flag,
  }) + '\n';

  try {
    appendFileSync(join(process.cwd(), 'data', 'conversations.jsonl'), entry);
  } catch {
    // Non-fatal — file may not exist yet
  }
}
