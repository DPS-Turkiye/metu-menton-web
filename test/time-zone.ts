/**
 * The browser zones a Turkey-time screen is checked in. The suite pins Istanbul (vitest.config.mts), which hides a
 * date read on the browser's own clock; UTC is CI's browser, London a student abroad.
 */
export const BROWSER_TIME_ZONES = [
  "Europe/Istanbul",
  "UTC",
  "Europe/London",
] as const;

/**
 * Runs `check` with the process (and so every Date) in another zone, then puts Istanbul back; for an async check,
 * once it has settled.
 */
export function inTimeZone<T>(zone: string, check: () => T): T {
  const pinned = process.env.TZ;
  const restore = () => {
    process.env.TZ = pinned;
  };
  process.env.TZ = zone;
  let result: T;
  try {
    result = check();
  } catch (error) {
    restore();
    throw error;
  }
  if (result instanceof Promise) {
    // The same promise, only with the zone put back once it settles.
    return result.finally(restore) as T;
  }
  restore();
  return result;
}
