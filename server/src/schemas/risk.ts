import { z } from 'zod';

export const riskSchema = z.object({
  transactionId: z.string(),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),
  riskLabel: z.string(),
  flags: z.array(
    z.object({
      type: z.enum([
        'duplicate_payment',
        'unusual_amount',
        'vendor_anomaly',
        'timing_anomaly',
        'missing_sap_entry',
        'policy_violation',
      ]),
      description: z.string(),
    })
  ),
  recommendation: z.enum(['escalate', 'review', 'auto_resolve', 'ignore']),
  brainBasis: z.string(),
});

export type RiskAssessment = z.infer<typeof riskSchema>;
