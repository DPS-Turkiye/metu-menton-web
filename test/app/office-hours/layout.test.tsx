import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import OfficeHoursLayout from "@/app/office-hours/layout";
import { InLocale } from "@test/test-utils";

class NotFound extends Error {}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound();
  },
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("office hours layout", () => {
  it("opens in the ODTÜ edition once Office Hours is switched on", async () => {
    vi.stubEnv("APP_EDITION", "ODTU");
    vi.stubEnv("OFFICE_HOURS_ENABLED", "true");
    render(await OfficeHoursLayout({ children: <p>Derslerim</p> }));
    expect(screen.getByText("Derslerim")).toBeInTheDocument();
  });

  it.each([undefined, "", "false"])(
    "shows Office Hours coming soon instead of the course pages (OFFICE_HOURS_ENABLED=%s)",
    async (value) => {
      vi.stubEnv("APP_EDITION", "ODTU");
      vi.stubEnv("OFFICE_HOURS_ENABLED", value);
      render(
        <InLocale locale="tr">
          {await OfficeHoursLayout({ children: <p>Derslerim</p> })}
        </InLocale>,
      );
      expect(screen.getByText("Office Hours çok yakında")).toBeInTheDocument();
      expect(screen.queryByText("Derslerim")).toBeNull();
    },
  );

  it("answers like a missing route in the Teknokent edition", async () => {
    vi.stubEnv("APP_EDITION", "TEKNOKENT");
    await expect(
      OfficeHoursLayout({ children: <p>Derslerim</p> }),
    ).rejects.toThrow(NotFound);
  });
});
