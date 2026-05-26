import { z } from 'zod';

export const debugSchema = z.object({
  transactionId: z.string(),
  diagnosis: z.string(),
  rootCause: z.enum([
    'date_tolerance_miss',
    'no_sap_counterpart',
    'sap_already_matched',
    'amount_mismatch',
    'likely_duplicate',
  ]),
  vendorContext: z.string().nullable(),
  suggestedFix: z.string(),
  suggestedToleranceDays: z.number().int().positive().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type DebugDiagnosis = z.infer<typeof debugSchema>;
