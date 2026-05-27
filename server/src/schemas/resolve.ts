import { z } from 'zod';

const actionTypeSchema = z.enum([
  'release_match',
  'mark_fee',
  'manual_match',
  'escalate',
  'flag_duplicate',
]);

export const resolveInputSchema = z.object({
  transactionId: z.string(),
  actionType: actionTypeSchema,
});

export const resolveSchema = z.object({
  transactionId: z.string(),
  actionType: actionTypeSchema,
  resolved: z.literal(true),
  updatedStats: z.object({
    matched: z.number().int().nonnegative(),
    unmatched: z.number().int().nonnegative(),
    closeProbability: z.number().min(0).max(1),
    nextCloseProbability: z.number().min(0).max(1),
    nextCloseDelta: z.number().int(),
    sessionsToTarget: z.number().int().nonnegative(),
  }),
});

export type ResolveInput = z.infer<typeof resolveInputSchema>;
export type ResolveResult = z.infer<typeof resolveSchema>;
