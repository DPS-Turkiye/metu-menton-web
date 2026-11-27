import { describe, expect, it } from "vitest";

import { UserRole } from "@/interfaces/session";
import {
  isOfficeHoursApiPath,
  officeHoursOpenFor,
  parseOfficeHoursEnabled,
} from "@/lib/office-hours-launch";

describe("parseOfficeHoursEnabled", () => {
  it.each(["true", "TRUE", " true "])("opens Office Hours for %j", (value) => {
    expect(parseOfficeHoursEnabled(value)).toBe(true);
  });

  it.each([undefined, "", " ", "false", "1", "yes", "on"])(
    "keeps Office Hours coming soon for %j",
    (value) => {
      expect(parseOfficeHoursEnabled(value)).toBe(false);
    },
  );
});

describe("officeHoursOpenFor", () => {
  it("opens Office Hours to everyone once it is switched on", () => {
    for (const role of [
      UserRole.Mentee,
      UserRole.Academician,
      UserRole.Coordinator,
    ]) {
      expect(officeHoursOpenFor(true, { role })).toBe(true);
    }
  });

  it("keeps it closed to everyone but the admin while it is coming soon", () => {
    expect(officeHoursOpenFor(false, { role: UserRole.Mentee })).toBe(false);
    expect(officeHoursOpenFor(false, { role: UserRole.Academician })).toBe(
      false,
    );
    expect(officeHoursOpenFor(false, { role: UserRole.Coordinator })).toBe(
      false,
    );
    expect(officeHoursOpenFor(false, { role: UserRole.Admin })).toBe(true);
  });

  it("counts an admin permission held beside another primary role", () => {
    expect(
      officeHoursOpenFor(false, {
        role: UserRole.Coordinator,
        permissions: [UserRole.Coordinator, UserRole.Admin],
      }),
    ).toBe(true);
  });

  it("is closed to nobody signed in", () => {
    expect(officeHoursOpenFor(false, null)).toBe(false);
  });
});

describe("isOfficeHoursApiPath", () => {
  it.each([
    "/api/office-hours",
    "/api/office-hours/me/requests",
    "/api/office-hours/availability",
    "/api/office-hours/calendar/abc123",
    "/api/office-hours/courses/course-1/office-hours",
    "/api/coordinator/programs/p-1/office-hours/appointments",
    "/api/coordinator/programs/p-1/office-hours/students",
    "/api/coordinator/programs/p-1/academics",
    "/api/office%2Dhours/me/requests",
  ])("covers %s", (path) => {
    expect(isOfficeHoursApiPath(path)).toBe(true);
  });

  it.each([
    "/api/session",
    "/api/student/appointments",
    "/api/admin/academics",
    "/api/coordinator/programs/p-1",
    "/api/coordinator/programs/p-1/students",
    "/api/office-hoursx",
    "/student/office-hours",
    "/api/%E0%A4%A",
  ])("leaves %s alone", (path) => {
    expect(isOfficeHoursApiPath(path)).toBe(false);
  });
});
