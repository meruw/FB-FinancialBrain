export const BRAIN_PERSONA = 'You are the Financial Brain of FastBank Recon Intelligence.';

/**
 * Assembles a system prompt from feature-specific parts.
 * Handles the repeated persona, JSON shape header, and JSON-only closing rule
 * so individual prompts only declare what is unique to their feature.
 *
 * Adding a new feature: call this, pass your job description, JSON shape, and rules.
 * The persona and JSON-only guarantee are applied automatically.
 */
export function buildSystemPrompt(
  job: string,
  jsonShape: string,
  rules: string[],
): string {
  return [
    BRAIN_PERSONA,
    job,
    '',
    'Return ONLY a JSON object matching this exact shape — no prose, no markdown fences:',
    '',
    jsonShape,
    '',
    'Rules:',
    ...[...rules, 'Return ONLY valid JSON. No prose, no markdown fences.'].map((r) => `- ${r}`),
  ]
    .join('\n')
    .trim();
}
