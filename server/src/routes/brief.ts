/**
 * Session Brief / Close Guarantee route.
 *
 * This is the CANONICAL feature route. The other 3 features (debug, advise,
 * narrate) follow the same pattern. Copy this file when you build them.
 *
 * Pattern:
 *   1. Parse + validate input with Zod
 *   2. Build prompt from Brain + feature-specific data
 *   3. Call Claude
 *   4. Validate output with Zod
 *   5. On ANY error, return the fallback mock so the demo never breaks
 *
 * This file is intentionally empty for now - filled in on Day 1.
 * Wire it up in src/index.ts when ready.
 */

// import { Router } from 'express';
// import { z } from 'zod';
// import { callClaude, extractJson } from '../services/claude.js';
// import { brainAsPromptContext } from '../services/brain.js';
// import { briefSchema, type Brief } from '../schemas/brief.js';
// import { briefPrompt } from '../prompts/brief.js';
// import { briefMock } from '../mocks/brief.js';
// import { env } from '../env.js';
// import { logger } from '../utils/logger.js';

// const InputSchema = z.object({
//   sessionId: z.string(),
// });

// export const briefRouter = Router();

// briefRouter.post('/', async (req, res) => {
//   const parsed = InputSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
//   }

//   // Hard demo-mode short circuit
//   if (env.DEMO_MODE) {
//     return res.json(briefMock);
//   }

//   try {
//     const brain = await brainAsPromptContext();
//     const { system, user } = briefPrompt({ brain, sessionId: parsed.data.sessionId });
//     const text = await callClaude({ system, user, temperature: 0 });
//     const json = extractJson(text);
//     const validated: Brief = briefSchema.parse(json);
//     res.json(validated);
//   } catch (err) {
//     logger.warn('brief.fallback', { error: String(err) });
//     res.json(briefMock);
//   }
// });
