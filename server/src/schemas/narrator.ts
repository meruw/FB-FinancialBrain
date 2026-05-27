import { z } from 'zod';

export const narratorSchema = z.object({
  sessionId: z.string(),
  headline: z.string(),
  narrative: z.string(),
  learnedThisSession: z.array(
    z.object({
      insight: z.string(),
      category: z.enum(['vendor', 'pattern', 'risk']),
    })
  ),
  stats: z.object({
    matched: z.number().int(),
    unmatched: z.number().int(),
    closeProbability: z.number().min(0).max(1),
    resolvedBlockers: z.number().int(),
  }),
  // All three injected from code — Claude does not generate these.
  nextCloseProbability: z.number().min(0).max(1),
  nextCloseDelta: z.number().int(),
  sessionsToTarget: z.number().int().nonnegative(),
});

export type Narrative = z.infer<typeof narratorSchema>;
