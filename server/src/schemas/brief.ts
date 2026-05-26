/**
 * JSON contract for the Session Brief / Close Guarantee feature.
 *
 * This schema is the source of truth for what Claude must return AND what
 * the frontend can expect. If you change this file, both sides break - that
 * is the point.
 *
 * Fill this in on Day 1 when wiring up the Brief feature. Mirror the shape
 * the frontend BrainBriefing component will consume.
 */

// import { z } from 'zod';

// export const briefSchema = z.object({
//   closeProbability: z.number().min(0).max(1),
//   briefing: z.string(),
//   sessionsAnalyzed: z.number().int(),
//   blockers: z.array(
//     z.object({
//       label: z.string(),
//       severity: z.enum(['low', 'medium', 'high']),
//       knownPattern: z.boolean(),
//     })
//   ),
//   estimatedResolutionMinutes: z.number().int().positive(),
// });

// export type Brief = z.infer<typeof briefSchema>;
