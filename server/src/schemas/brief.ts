import { z } from 'zod';

export const briefSchema = z.object({
  sessionId: z.string(),
  closeProbability: z.number().min(0).max(1),
  closeProbabilityLabel: z.string(),
  blockers: z.array(
    z.object({
      description: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      vendor: z.string().nullable(),
      knownPattern: z.boolean(),
    })
  ),
  recommendations: z.array(
    z.object({
      action: z.string(),
      expectedImpact: z.string(),
      priority: z.number().int().min(1).max(3),
    })
  ),
  estimatedResolutionMinutes: z.number().int().positive(),
  brainInsight: z.string(),
});

export type Brief = z.infer<typeof briefSchema>;
