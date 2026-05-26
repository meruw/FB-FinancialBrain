/**
 * Prompt builder for Session Brief / Close Guarantee.
 *
 * All prompts live as pure functions in this directory. No I/O. No Claude
 * SDK. They take inputs, return { system, user } strings. This makes them
 * easy to test, iterate on, and copy between features.
 *
 * Tips when writing:
 *   - The system prompt sets the role and JSON contract.
 *   - The user prompt carries the data (brain + transactions).
 *   - Always instruct: "Return ONLY valid JSON. No prose, no markdown fences."
 *   - Always show the exact JSON shape in the system prompt.
 *
 * Fill this in on Day 1.
 */

// export interface BriefPromptInput {
//   brain: string;        // already-serialized brain JSON
//   sessionId: string;
// }

// export function briefPrompt(input: BriefPromptInput) {
//   const system = `
// You are the Financial Brain of FastBank Recon Intelligence.
// You produce a Close Guarantee briefing for the user opening a reconciliation
// session. You always return STRICT JSON matching this shape:
//
// {
//   "closeProbability": number between 0 and 1,
//   "briefing": "1-2 short paragraphs of plain English",
//   "sessionsAnalyzed": integer,
//   "blockers": [{ "label": string, "severity": "low"|"medium"|"high", "knownPattern": boolean }],
//   "estimatedResolutionMinutes": integer
// }
//
// Rules:
// - Use only the data given. Do not invent vendors or amounts.
// - The briefing must reference at least one specific vendor or pattern from the brain.
// - Do NOT wrap your response in markdown fences. Return raw JSON only.
//   `.trim();

//   const user = `
// Financial Brain (customer context):
// ${input.brain}
//
// Session to brief: ${input.sessionId}
//
// Return the JSON now.
//   `.trim();

//   return { system, user };
// }
