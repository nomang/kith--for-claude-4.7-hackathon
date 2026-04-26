import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { loadPersonhoodMapFixed } from '@/models/personhoodMap';

const NOTEBOOK_DIR = join(process.cwd(), 'data', 'kith_notebook');
const CONV_PATH    = join(process.cwd(), 'data', 'conversations.jsonl');

/* ── Anthropic tool definitions ─────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_DEFINITIONS: any[] = [
  {
    name: 'list_notebook_files',
    description: "List Kith's notebook files with sizes. Call this first to decide which files are worth reading.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_notebook_file',
    description: "Read one of Kith's notebook files in full.",
    input_schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          enum: ['today.md', 'recurring_themes.md', 'joy_log.md', 'concerns.md', 'gentle_boundaries.md'],
          description: 'Which notebook file to read',
        },
      },
      required: ['file'],
    },
  },
  {
    name: 'search_conversations',
    description: 'Search conversation logs for turns containing any of the given keywords. Returns matching user turns, Kith responses, and observations.',
    input_schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Search terms — case-insensitive. A turn is included if it matches any keyword.',
        },
        days_back: {
          type: 'integer',
          default: 7,
          description: 'How many days of history to search (default 7)',
        },
        max_results: {
          type: 'integer',
          default: 20,
          description: 'Maximum number of turns to return',
        },
      },
      required: ['keywords'],
    },
  },
  {
    name: 'check_recurrence',
    description: 'Count how many times a topic appears across conversations and on which days. Useful for detecting trends.',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic keyword or name to count' },
        days_back: { type: 'integer', default: 14, description: 'How many days of history to check' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'read_personhood_section',
    description: 'Read one section of the Personhood Map without loading the full document.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['important_people', 'familiar_memories', 'routines', 'comfort_topics', 'sensitive_topics', 'never_guess_rules'],
        },
      },
      required: ['section'],
    },
  },
  {
    name: 'finalize_answer',
    description: 'Call this when you have enough evidence to answer the question. The investigation stops immediately.',
    input_schema: {
      type: 'object',
      properties: {
        answer: {
          type: 'string',
          description: 'Direct, warm answer to the caregiver\'s question. 2-4 paragraphs.',
        },
        evidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim:  { type: 'string' },
              source: { type: 'string', description: "e.g. 'recurring_themes.md', 'conversations · 2026-04-21', 'check_recurrence · 7 days'" },
            },
            required: ['claim', 'source'],
          },
        },
        confidence: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'How confident you are given the available data',
        },
        suggested_follow_up: {
          type: 'string',
          description: 'One optional, concrete suggestion for the caregiver',
        },
      },
      required: ['answer', 'evidence', 'confidence'],
    },
  },
];

/* ── Tool implementations ────────────────────────────────────────────────── */
interface ConvEntry { ts: string; user: string; kith: string; observation: string; risk_flag: boolean }

function loadConversations(): ConvEntry[] {
  if (!existsSync(CONV_PATH)) return [];
  return readFileSync(CONV_PATH, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l) as ConvEntry; } catch { return null; } })
    .filter(Boolean) as ConvEntry[];
}

function daysSince(ts: string): number {
  return (Date.now() - new Date(ts).getTime()) / 86_400_000;
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {

    case 'list_notebook_files': {
      const files = ['today.md', 'recurring_themes.md', 'joy_log.md', 'concerns.md', 'gentle_boundaries.md'];
      const result = files.map(f => {
        const p = join(NOTEBOOK_DIR, f);
        if (!existsSync(p)) return { file: f, size_chars: 0, exists: false };
        const stat = statSync(p);
        const content = readFileSync(p, 'utf-8');
        return { file: f, size_chars: content.length, lines: content.split('\n').length, modified: stat.mtime.toISOString().split('T')[0] };
      });
      return JSON.stringify(result);
    }

    case 'read_notebook_file': {
      const file = input.file as string;
      const p = join(NOTEBOOK_DIR, file);
      if (!existsSync(p)) return JSON.stringify({ file, content: '(empty)', error: 'file not found' });
      return JSON.stringify({ file, content: readFileSync(p, 'utf-8') });
    }

    case 'search_conversations': {
      const keywords = (input.keywords as string[]).map(k => k.toLowerCase());
      const daysBack  = (input.days_back as number) ?? 7;
      const maxResults = (input.max_results as number) ?? 20;

      const matches = loadConversations()
        .filter(e => daysSince(e.ts) <= daysBack)
        .filter(e =>
          keywords.some(k =>
            e.user?.toLowerCase().includes(k) ||
            e.kith?.toLowerCase().includes(k) ||
            e.observation?.toLowerCase().includes(k)
          )
        )
        .slice(0, maxResults)
        .map(e => ({
          date: e.ts.split('T')[0],
          day_ago: Math.round(daysSince(e.ts)),
          user: e.user,
          kith: e.kith,
          observation: e.observation,
          risk_flag: e.risk_flag,
        }));

      return JSON.stringify({ total_matches: matches.length, turns: matches });
    }

    case 'check_recurrence': {
      const topic   = ((input.topic as string) ?? '').toLowerCase();
      const daysBack = (input.days_back as number) ?? 14;

      const all = loadConversations().filter(e => daysSince(e.ts) <= daysBack);
      const matches = all.filter(e =>
        e.user?.toLowerCase().includes(topic) ||
        e.kith?.toLowerCase().includes(topic) ||
        e.observation?.toLowerCase().includes(topic)
      );

      const byDay: Record<string, number> = {};
      matches.forEach(e => {
        const d = e.ts.split('T')[0];
        byDay[d] = (byDay[d] ?? 0) + 1;
      });

      const sampleQuotes = matches
        .slice(0, 3)
        .map(e => e.user || e.observation)
        .filter(Boolean);

      return JSON.stringify({
        topic,
        total_mentions: matches.length,
        days_with_mentions: Object.keys(byDay).sort(),
        mentions_per_day: byDay,
        sample_quotes: sampleQuotes,
      });
    }

    case 'read_personhood_section': {
      const section = input.section as string;
      const map = loadPersonhoodMapFixed();
      if (!map) return JSON.stringify({ error: 'No personhood map found' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (map as any)[section];
      return JSON.stringify({ section, data: data ?? null });
    }

    case 'finalize_answer': {
      // Handled by caller — this should never be executed here
      return JSON.stringify({ acknowledged: true });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
