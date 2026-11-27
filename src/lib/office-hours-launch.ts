import { UserRole } from "@/interfaces/session";
import { hasPermission } from "@/lib/permissions";

/** The error code the web's Office Hours routes answer with while the feature is still coming soon. */
export const OFFICE_HOURS_COMING_SOON = "OFFICE_HOURS_COMING_SOON";

/**
 * OFFICE_HOURS_ENABLED: only `true` opens Office Hours. Unset, blank or anything else keeps it "coming soon", so a
 * deployment that never sets it stays closed until the academicians can sign in (ODTÜ CAS).
 */
export function parseOfficeHoursEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Whether this person sees Office Hours: everyone once it is switched on, the admin always. */
export function officeHoursOpenFor(
  enabled: boolean,
  holder: Parameters<typeof hasPermission>[0],
): boolean {
  return enabled || hasPermission(holder, UserRole.Admin);
}

// `.+` for the program id: decoding turns an escaped slash inside one id segment into a real one, and blocking a
// path that does not exist costs nothing.
const OFFICE_HOURS_API_PATHS = [
  /^\/api\/office-hours(?:\/|$)/,
  /^\/api\/coordinator\/programs\/.+\/(?:office-hours|academics)(?:\/|$)/,
];

/**
 * The web's Office Hours proxy routes: the student, academician and LTI calls, and the coordinator's OH tabs. The path
 * is decoded first, as the router does, so an escaped letter cannot slip past.
 */
export function isOfficeHoursApiPath(pathname: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A malformed escape is checked as written; the router refuses it anyway.
  }
  return OFFICE_HOURS_API_PATHS.some((pattern) => pattern.test(path));
}
