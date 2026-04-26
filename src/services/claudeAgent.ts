import { createClient } from './claude';
import { TOOL_DEFINITIONS, executeTool } from './agentTools';

export interface TraceStep {
  iteration: number;
  tool: string;
  input: Record<string, unknown>;
  result_summary: string;
}

export interface AgentResult {
  answer: string;
  evidence: { claim: string; source: string }[];
  confidence: 'high' | 'medium' | 'low';
  suggested_follow_up?: string;
  trace: TraceStep[];
  iterations_used: number;
  tokens_used: number;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export async function callClaudeAgentLoop(opts: {
  systemPrompt: string;
  question: string;
  maxIterations?: number;
}): Promise<AgentResult> {
  const { systemPrompt, question, maxIterations = 10 } = opts;
  const client = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [{ role: 'user', content: question }];
  const trace: TraceStep[] = [];
  let totalTokens = 0;
  let finalAnswer: Omit<AgentResult, 'trace' | 'iterations_used' | 'tokens_used'> | null = null;

  for (let i = 1; i <= maxIterations; i++) {
    // Force finalize on second-to-last iteration
    const toolChoice = i >= maxIterations - 1
      ? { type: 'tool', name: 'finalize_answer' }
      : { type: 'auto' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await (client.messages.create as Function)({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      tool_choice: toolChoice,
      messages,
    });

    totalTokens += response.usage?.input_tokens ?? 0;
    totalTokens += response.usage?.output_tokens ?? 0;

    // Append assistant message
    messages.push({ role: 'assistant', content: response.content });

    // Extract tool use blocks (skip thinking blocks)
    const toolUseBlocks = (response.content as unknown[]).filter(
      (b): b is ToolUseBlock => (b as { type: string }).type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) break; // end_turn with no tool calls

    // Dispatch tool calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = [];

    for (const block of toolUseBlocks) {
      if (block.name === 'finalize_answer') {
        const inp = block.input as {
          answer: string;
          evidence: { claim: string; source: string }[];
          confidence: 'high' | 'medium' | 'low';
          suggested_follow_up?: string;
        };

        finalAnswer = {
          answer: inp.answer ?? '',
          evidence: inp.evidence ?? [],
          confidence: inp.confidence ?? 'medium',
          suggested_follow_up: inp.suggested_follow_up,
        };

        trace.push({
          iteration: i,
          tool: 'finalize_answer',
          input: block.input,
          result_summary: `Answer drafted (confidence: ${inp.confidence})`,
        });

        // Still need to send tool_result so the API doesn't complain
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'acknowledged',
        });
        messages.push({ role: 'user', content: toolResults });
        break; // exit the for-of loop
      }

      // Regular tool execution
      const result = await executeTool(block.name, block.input);
      const parsed = (() => { try { return JSON.parse(result); } catch { return result; } })();

      // Build a short summary for the trace
      let summary = '';
      if (block.name === 'list_notebook_files' && Array.isArray(parsed)) {
        summary = `Found ${parsed.length} files`;
      } else if (block.name === 'read_notebook_file') {
        const len = parsed?.content?.length ?? 0;
        summary = `Read ${parsed?.file} (${len} chars)`;
      } else if (block.name === 'search_conversations') {
        summary = `Found ${parsed?.total_matches ?? 0} matching turns`;
      } else if (block.name === 'check_recurrence') {
        summary = `"${parsed?.topic}" mentioned ${parsed?.total_mentions ?? 0} times across ${parsed?.days_with_mentions?.length ?? 0} days`;
      } else if (block.name === 'read_personhood_section') {
        const items = Array.isArray(parsed?.data) ? parsed.data.length : '—';
        summary = `Read ${parsed?.section} (${items} items)`;
      } else {
        summary = result.slice(0, 80);
      }

      trace.push({ iteration: i, tool: block.name, input: block.input, result_summary: summary });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    if (finalAnswer) break;

    // Continue loop with tool results
    if (toolResults.length > 0 && !finalAnswer) {
      messages.push({ role: 'user', content: toolResults });
    }
  }

  // Fallback if finalize_answer was never called
  if (!finalAnswer) {
    finalAnswer = {
      answer: 'I was unable to gather enough information to answer this question confidently. The conversation log or notebook may not contain relevant data.',
      evidence: [],
      confidence: 'low',
    };
  }

  return {
    ...finalAnswer,
    trace,
    iterations_used: trace.length,
    tokens_used: totalTokens,
  };
}
