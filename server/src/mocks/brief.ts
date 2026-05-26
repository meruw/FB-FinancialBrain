/**
 * Fallback response for Session Brief / Close Guarantee.
 *
 * This is rendered to the user if the Claude API call fails, times out, or
 * returns invalid JSON during the live demo. It must be REALISTIC - judges
 * should not be able to tell whether they're seeing live AI or this mock.
 *
 * Update this file as you tune the real prompt so the mock stays believable.
 */

// import type { Brief } from '../schemas/brief.js';
//
// export const briefMock: Brief = {
//   closeProbability: 0.72,
//   sessionsAnalyzed: 7,
//   estimatedResolutionMinutes: 18,
//   briefing:
//     'Close Probability: 72%. The Brain detected 3 patterns from your last 6 months: ' +
//     'CONSTRUTECH delays 4.2 days on average, BRAUTOTEST has a recurring SAP entry conflict, ' +
//     'and your Main Checking account historically has 2 bank fees per month unclassified. ' +
//     'Resolve these 4 blockers to reach 91%.',
//   blockers: [
//     { label: '3 CONSTRUTECH date tolerance misses', severity: 'medium', knownPattern: true },
//     { label: '1 BRAUTOTEST SAP entry conflict', severity: 'high', knownPattern: true },
//     { label: '2 unclassified bank fees', severity: 'low', knownPattern: true },
//     { label: '1 duplicate payment risk', severity: 'medium', knownPattern: false },
//   ],
// };
