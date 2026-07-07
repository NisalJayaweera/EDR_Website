/**
 * Server-side copy of the canonical interval steps.
 * Keep in sync with client/src/lib/intervalSteps.ts
 */
export const INTERVAL_STEPS_MS: number[] = [
  1, 5, 10, 50, 100, 500,
  1_000, 5_000, 10_000, 30_000, 60_000,
  5 * 60_000, 10 * 60_000, 30 * 60_000,
  60 * 60_000, 2 * 60 * 60_000, 5 * 60 * 60_000,
  10 * 60 * 60_000, 15 * 60 * 60_000, 20 * 60 * 60_000,
  24 * 60 * 60_000,
];

export const INTERVAL_STEPS_SET = new Set(INTERVAL_STEPS_MS);
