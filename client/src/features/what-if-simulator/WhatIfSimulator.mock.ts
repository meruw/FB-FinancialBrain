import type { SimulationResult, SimulationScenario } from '@/types/domain';

// Fallback per scenarioType. Used when the API fails or returns invalid JSON.
// Keep numbers consistent with the values referenced in the demo pitch.
export const simulationMocks: Record<SimulationScenario, SimulationResult> = {
  threshold_change: {
    scenarioLabel: 'Apply all Brain recommendations',
    projectedCloseProbability: 0.84,
    projectedDelta: 22,
    casesResolved: 6,
    casesRemaining: 2,
    financialImpact: 55200,
    narrative:
      'Applying every recommendation resolves the APEX SYSTEMS INC tolerance pattern, ' +
      'clears the two unclassified bank fees, and flags the duplicate payment for treasury. ' +
      'Close probability lifts to 84% — comparable to the November 2025 close.',
    brainBasis:
      'Based on 7 months of close history and the resolvability profile of each open case.',
  },
  tolerance_change: {
    scenarioLabel: 'Raise APEX SYSTEMS INC tolerance to 5 days',
    projectedCloseProbability: 0.71,
    projectedDelta: 9,
    casesResolved: 3,
    casesRemaining: 5,
    financialImpact: 28400,
    narrative:
      'The APEX tolerance pattern has appeared in 5 of the last 6 months. Widening the ' +
      'date window to 5 days clears 3 cases immediately and aligns with the November rule set.',
    brainBasis:
      'Tolerance change tested against APEX vendor profile (avg delay 4.2 days, max 4.8).',
  },
  vendor_fix: {
    scenarioLabel: 'Resolve every APEX SYSTEMS INC case',
    projectedCloseProbability: 0.78,
    projectedDelta: 16,
    casesResolved: 4,
    casesRemaining: 4,
    financialImpact: 38600,
    narrative:
      'Resolving all APEX cases (3 tolerance misses + 1 duplicate flag) lifts close probability to 78%. ' +
      'The duplicate requires treasury sign-off but the historical pattern suggests it clears in under a day.',
    brainBasis:
      'APEX vendor profile across 6 months · last-similar-action: resolved in 18h.',
  },
};
