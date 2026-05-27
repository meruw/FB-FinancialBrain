import { z } from 'zod';

export const simulateInputSchema = z.object({
  sessionId: z.string(),
  scenarioType: z.enum(['tolerance_change', 'vendor_fix', 'threshold_change']),
  vendorName: z.string().optional(),
  proposedToleranceDays: z.number().int().positive().optional(),
});

// Only the fields Claude generates. Numeric projections are injected from code.
export const simulateClaudeSchema = z.object({
  scenarioLabel: z.string(),
  narrative: z.string(),
  brainBasis: z.string(),
});

// Full output shape — numeric fields injected by the route, not Claude.
export const simulateSchema = z.object({
  scenarioLabel: z.string(),
  projectedCloseProbability: z.number().min(0).max(1),
  projectedDelta: z.number().int(),
  casesResolved: z.number().int().nonnegative(),
  casesRemaining: z.number().int().nonnegative(),
  financialImpact: z.number(),
  narrative: z.string(),
  brainBasis: z.string(),
});

export type SimulateInput = z.infer<typeof simulateInputSchema>;
export type SimulationResult = z.infer<typeof simulateSchema>;
