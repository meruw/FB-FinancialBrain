import { z } from 'zod';

const provenanceSchema = z.object({
  historicalAccuracy: z.object({
    rate: z.number().min(0).max(1),
    matchCount: z.number().int().nonnegative(),
  }),
  patternSource: z.object({
    hitCount: z.number().int().nonnegative(),
    windowSize: z.number().int().positive(),
    windowUnit: z.literal('closes'),
  }),
  lastSimilarAction: z
    .object({
      occurredAt: z.string(),
      outcome: z.enum(['accepted', 'rejected', 'modified', 'skipped']),
    })
    .nullable(),
});

export const advisorSchema = z.object({
  transactionId: z.string(),
  action: z.string(),
  actionType: z.enum([
    'release_match',
    'mark_fee',
    'manual_match',
    'escalate',
    'flag_duplicate',
  ]),
  reasoning: z.string(),
  steps: z.array(
    z.object({
      order: z.number().int().positive(),
      instruction: z.string(),
    }),
  ),
  risk: z.enum(['critical', 'high', 'medium', 'low']),
  confidenceScore: z.number().min(0).max(1),
  brainBasis: z.string(),
  provenance: provenanceSchema.nullable(),
});

export type AdvisorOutput = z.infer<typeof advisorSchema>;
export type AdvisorProvenance = z.infer<typeof provenanceSchema>;
