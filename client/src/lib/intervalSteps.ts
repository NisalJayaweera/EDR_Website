/**
 * Canonical discrete interval steps shared across client and server.
 * The slider index maps directly into this array — no free-range values.
 */
export const INTERVAL_STEPS_MS: number[] = [
  1,                    // 1 ms
  5,                    // 5 ms
  10,                   // 10 ms
  50,                   // 50 ms
  100,                  // 100 ms
  500,                  // 500 ms
  1_000,                // 1 s
  5_000,                // 5 s
  10_000,               // 10 s
  30_000,               // 30 s
  60_000,               // 1 min
  5 * 60_000,           // 5 min
  10 * 60_000,          // 10 min
  30 * 60_000,          // 30 min
  60 * 60_000,          // 1 hour
  2 * 60 * 60_000,      // 2 hours
  5 * 60 * 60_000,      // 5 hours
  10 * 60 * 60_000,     // 10 hours
  15 * 60 * 60_000,     // 15 hours
  20 * 60 * 60_000,     // 20 hours
  24 * 60 * 60_000,     // 24 hours
];

export const INTERVAL_STEPS_SET = new Set(INTERVAL_STEPS_MS);

export function formatInterval(ms: number): string {
  if (ms < 1_000)       return `${ms} ms`;
  if (ms < 60_000)      return `${ms / 1_000} s`;
  if (ms < 3_600_000)   return `${ms / 60_000} min`;
  return `${ms / 3_600_000} hr`;
}

/**
 * Finds the index in INTERVAL_STEPS_MS closest to a given ms value.
 * Used to snap saved DB values (which may not exactly match if migrated) back to a valid step.
 */
export function findClosestStepIndex(valueMs: number): number {
  let closest = 0;
  let minDiff = Math.abs(INTERVAL_STEPS_MS[0] - valueMs);
  for (let i = 1; i < INTERVAL_STEPS_MS.length; i++) {
    const diff = Math.abs(INTERVAL_STEPS_MS[i] - valueMs);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  }
  return closest;
}
