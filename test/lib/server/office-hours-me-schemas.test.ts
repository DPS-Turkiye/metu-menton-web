import { describe, expect, it } from "vitest";

import { officeHoursProfileSchema } from "@/lib/server/office-hours-me-schemas";
import { officeHoursProfile } from "@test/fixtures/office-hours-me";

const TOP = {
  listed: true,
  defaultPlace: "A-204",
  onlineLink: null,
  contactEmail: null,
};

describe("officeHoursProfileSchema", () => {
  it("keeps a group that is not sent absent, so the backend leaves it as saved", () => {
    const parsed = officeHoursProfileSchema.parse(TOP);
    expect(parsed).not.toHaveProperty("details");
    expect(parsed).not.toHaveProperty("emails");
  });

  it("passes the whole profile through", () => {
    const profile = officeHoursProfile({
      details: {
        about: "ortalaması < 2 olanlar da gelebilir",
        topics: [{ title: "Staj", body: null }],
        courses: [{ code: "CENG 140", name: "C" }],
        expertise: ["ML"],
        responseDays: 14,
      },
      emails: { newRequest: false, cancellation: true },
    });
    expect(officeHoursProfileSchema.parse(profile)).toEqual(profile);
  });

  it.each([
    ["markup", { about: "<b>x</b>" }],
    ["too many tags", { expertise: ["a", "b", "c", "d", "e", "f"] }],
    ["a topic without a title", { topics: [{ title: "", body: null }] }],
    ["a response time over 14 days", { responseDays: 15 }],
  ])("refuses %s", (_label, change) => {
    const profile = officeHoursProfile();
    const result = officeHoursProfileSchema.safeParse({
      ...profile,
      details: { ...profile.details, ...change },
    });
    expect(result.success).toBe(false);
  });
});
