import "server-only";

import { parseOfficeHoursEnabled } from "@/lib/office-hours-launch";

/** OFFICE_HOURS_ENABLED, read per request (server-side only), so the switch flips with a restart and no rebuild. */
export function officeHoursEnabled(): boolean {
  return parseOfficeHoursEnabled(process.env.OFFICE_HOURS_ENABLED);
}
