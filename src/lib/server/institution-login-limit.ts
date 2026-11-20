import "server-only";

import { clientAddress, createRateLimiter } from "@/lib/server/rate-limit";

/**
 * Starting an institution login costs nothing to ask for and leaves a state in the backend's Redis for ten minutes,
 * so each address gets a budget, shared by every provider's start. It is wide because a campus or a dormitory signs in
 * from a handful of addresses: it stops a script, not a lecture hall. The backend caps all starts together behind it.
 */
const STARTS_PER_ADDRESS_PER_MINUTE = 120;
const takeStart = createRateLimiter(STARTS_PER_ADDRESS_PER_MINUTE, 60_000);

/** The header the browser client reads to say how long to wait. */
export const RETRY_AFTER_HEADER = "X-Rate-Limit-Retry-After-Seconds";

export function takeInstitutionLoginStart(headers: Headers) {
  return takeStart(clientAddress(headers));
}
