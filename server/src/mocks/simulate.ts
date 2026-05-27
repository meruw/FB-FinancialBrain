import type { SimulationResult } from '../schemas/simulate.js';

export const simulateMock: SimulationResult = {
  scenarioLabel: 'Apply all Brain recommendations this session',
  projectedCloseProbability: 0.76,
  projectedDelta: 14,
  casesResolved: 6,
  casesRemaining: 2,
  financialImpact: 55200,
  narrative:
    'Applying all Brain recommendations this session — raising the CONSTRUTECH date tolerance, releasing the conflicting SAP match, ' +
    'and booking the two recurring bank fees — would resolve 6 of the 8 open cases, unlocking $55,200 in held transactions. ' +
    'Close probability rises from 62% to 76%, a 14-point improvement achievable before the end of the working day.',
  brainBasis:
    'The Brain has observed these patterns across 7 sessions for NOBRANCHES. Each blocker has a documented resolution path ' +
    'with an average resolvability score of 0.63 — well above the threshold for confident auto-recommendation.',
};
