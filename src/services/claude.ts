import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-7';

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';

// Token budgets per call site (from CLAUDE.md)
export const TASK_BUDGETS = {
  conversation: 3000,
  shoeboxPerBatch: 15000,
  nightlyReflection: 8000,
  letterSubagent: 10000,
  letterSynthesizer: 20000,
  agentInvestigator: 25000,
} as const;

export function createClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: {
      'anthropic-beta': 'task-budgets-2026-03-13',
    },
  });
}

export interface KithMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeCallOptions {
  systemPrompt: string;
  messages: KithMessage[];
  effort?: EffortLevel;
  taskBudget?: number;
  maxTokens?: number;
}

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const client = createClient();
  const effort = opts.effort ?? 'medium';

  // Opus 4.7 uses adaptive thinking + output_config.effort (SDK types lag behind)
  const response = await (client.messages.create as Function)({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort },
    system: opts.systemPrompt,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
  });

  // Extract text blocks only (thinking blocks are internal)
  const textContent = (response.content as Array<{ type: string; text?: string }>)
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('');

  return textContent;
}

// Parallel subagent invocation for the weekly letter
export async function callClaudeParallel(calls: ClaudeCallOptions[]): Promise<string[]> {
  return Promise.all(calls.map(callClaude));
}
