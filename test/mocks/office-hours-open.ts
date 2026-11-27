import type { useOfficeHoursOpen as useRealOfficeHoursOpen } from "@/hooks/use-office-hours-open";

type OfficeHoursOpen = ReturnType<typeof useRealOfficeHoursOpen>;

let state: OfficeHoursOpen = { open: true, known: true };

/**
 * Stands in for the session-backed hook, so a screen renders without a SessionProvider. Open unless a test says
 * otherwise; a test that closes it resets it in its own beforeEach. Use with
 * vi.mock("@/hooks/use-office-hours-open", () => import("@test/mocks/office-hours-open")).
 */
export function useOfficeHoursOpen(): OfficeHoursOpen {
  return state;
}

export function setOfficeHoursOpen(open: boolean, known = true) {
  state = { open, known };
}
