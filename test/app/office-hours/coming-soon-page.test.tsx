import { afterEach, describe, expect, it, vi } from "vitest";

import OfficeHoursComingSoonPage from "@/app/office-hours/coming-soon/page";

class NotFound extends Error {}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound();
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("office-hours coming-soon page", () => {
  it("leaves the message to the layout while Office Hours is closed", () => {
    vi.stubEnv("OFFICE_HOURS_ENABLED", "");
    expect(OfficeHoursComingSoonPage()).toBeNull();
  });

  it("answers like a missing page once Office Hours is open", () => {
    vi.stubEnv("OFFICE_HOURS_ENABLED", "true");
    expect(() => OfficeHoursComingSoonPage()).toThrow(NotFound);
  });
});
