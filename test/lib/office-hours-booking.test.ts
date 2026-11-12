import { describe, expect, it } from "vitest";

import {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";
import {
  canCancelMeeting,
  cancelNeedsReason,
  ownSideOf,
} from "@/lib/office-hours-booking";
import { officeHoursRequest } from "@test/fixtures/office-hours";

const NOW = Date.parse("2026-11-12T09:00:00Z");
const HOUR = 60 * 60 * 1000;

function accepted(startsAt: string) {
  return officeHoursRequest({
    status: OfficeHoursRequestStatus.Accepted,
    meeting: { startsAt, durationMinutes: 45 },
  });
}

describe("office hours cancelling", () => {
  it("offers cancelling an accepted meeting only until it starts", () => {
    expect(canCancelMeeting(accepted("2026-11-12T10:00:00Z"), NOW)).toBe(true);
    expect(canCancelMeeting(accepted("2026-11-12T09:00:00Z"), NOW)).toBe(false);
    expect(canCancelMeeting(officeHoursRequest(), NOW)).toBe(false);
  });

  it("asks the academic for a reason within 24 hours, and the student never", () => {
    const soon = new Date(NOW + 23 * HOUR).toISOString();
    const later = new Date(NOW + 25 * HOUR).toISOString();

    expect(cancelNeedsReason(OfficeHoursRole.Instructor, soon, NOW)).toBe(true);
    expect(cancelNeedsReason(OfficeHoursRole.Instructor, later, NOW)).toBe(
      false,
    );
    expect(cancelNeedsReason(OfficeHoursRole.Student, soon, NOW)).toBe(false);
  });

  it("finds the viewer's own side of a request", () => {
    const request = officeHoursRequest();

    expect(ownSideOf(OfficeHoursRole.Student, request).id).toBe("student-1");
    expect(ownSideOf(OfficeHoursRole.Instructor, request).id).toBe(
      "academic-1",
    );
  });
});
