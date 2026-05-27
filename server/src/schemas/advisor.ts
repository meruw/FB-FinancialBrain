import { z } from 'zod';

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
  brainBasis: z.string(),
});

export type AdvisorOutput = z.infer<typeof advisorSchema>;
