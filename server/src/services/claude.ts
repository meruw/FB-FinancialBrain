import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

/**
 * One client, reused. Anthropic SDK reads ANTHROPIC_API_KEY from env automatically,
 * but we pass it explicitly for clarity.
 */
// maxRetries=0 because every route already falls back to a mock on failure.
// Retries just delay the fallback without adding value in a demo context.
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0 });

export interface ClaudeCallOptions {
  /** Override the default model for this call. Useful for Narrator -> Opus. */
  model?: string;
  /** System prompt. Keep concise. Long context goes in user messages. */
  system: string;
  /** User-facing prompt content. Should produce JSON if the route validates with Zod. */
  user: string;
  /** Hard cap on output tokens. Tune per feature - Narrator needs more. */
  maxTokens?: number;
  /** 0 = deterministic. Use 0 for debugger/advisor. Bump to 0.4 for Narrator prose. */
  temperature?: number;
  /**
   * Request timeout in milliseconds. Falls back to mock if exceeded.
   * Targets: brief/debug/risk = 8000, narrator = 15000.
   */
  timeoutMs?: number;
}

/**
 * Returns the first text block. We use structured-JSON-in-text by convention,
 * not tool use - simpler to debug and good enough for this scope.
 *
 * Always wrap calls in try/catch at the route layer and fall back to a mock
 * if this throws. The demo cannot break.
 */
export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const model = opts.model ?? env.CLAUDE_MODEL;
  const start = Date.now();

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
      },
      { timeout: opts.timeoutMs ?? 8000 },
    );

    const firstBlock = response.content[0];
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error(`Unexpected response shape: first block type = ${firstBlock?.type}`);
    }

    logger.info('claude.call.ok', {
      model,
      ms: Date.now() - start,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return firstBlock.text;
  } catch (err) {
    logger.error('claude.call.fail', {
      model,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Parses a JSON object from Claude's text response.
 * Claude sometimes wraps JSON in ```json fences even when told not to — strip them.
 * Returns `unknown` so callers are forced to validate (via Zod) before using the data.
 * Throws if the result is not valid JSON. Caller should catch and fall back.
 */
export function extractJson(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped);
}
