import { describe, expect, it } from "vitest";

import { OfficeHoursAppointmentAction } from "@/interfaces/academician-office-hours";
import {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
} from "@/interfaces/office-hours";
import {
  canCancelMeeting,
  courseCancelNeedsReason,
  ownSideOf,
} from "@/lib/office-hours-booking";
import { officeHoursRequest } from "@test/fixtures/office-hours";

const NOW = new Date("2026-11-12T09:00:00Z");
const HOUR = 60 * 60 * 1000;

function accepted(startsAt: string) {
  return officeHoursRequest({
    status: OfficeHoursRequestStatus.Accepted,
    meeting: { startsAt, durationMinutes: 45 },
    allowedActions: [OfficeHoursAppointmentAction.Cancel],
  });
}

describe("office hours cancelling", () => {
  it("offers cancelling only when the backend allows it and the meeting hasn't started", () => {
    expect(canCancelMeeting(accepted("2026-11-12T10:00:00Z"), NOW)).toBe(true);
    expect(canCancelMeeting(accepted("2026-11-12T09:00:00Z"), NOW)).toBe(false);
    expect(
      canCancelMeeting(
        { ...accepted("2026-11-12T10:00:00Z"), allowedActions: [] },
        NOW,
      ),
    ).toBe(false);
    expect(canCancelMeeting(officeHoursRequest(), NOW)).toBe(false);
  });

  it("asks the academic for a reason within 24 hours, and the student never", () => {
    const soon = {
      startsAt: new Date(NOW.getTime() + 23 * HOUR).toISOString(),
      durationMinutes: 45,
    };
    const later = {
      startsAt: new Date(NOW.getTime() + 25 * HOUR).toISOString(),
      durationMinutes: 45,
    };

    expect(courseCancelNeedsReason(OfficeHoursRole.Instructor, soon, NOW)).toBe(
      true,
    );
    expect(
      courseCancelNeedsReason(OfficeHoursRole.Instructor, later, NOW),
    ).toBe(false);
    expect(courseCancelNeedsReason(OfficeHoursRole.Student, soon, NOW)).toBe(
      false,
    );
  });

  it("finds the viewer's own side of a request", () => {
    const request = officeHoursRequest();

    expect(ownSideOf(OfficeHoursRole.Student, request).id).toBe("student-1");
    expect(ownSideOf(OfficeHoursRole.Instructor, request).id).toBe(
      "academic-1",
    );
  });
});
