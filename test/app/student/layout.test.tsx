import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AcademicianLayout from "@/app/academician/layout";
import StudentLayout from "@/app/student/layout";
import { ISKUR_ONBOARDING_HREF } from "@/lib/iskur-onboarding";
import { iskurOnboardingRedirect } from "@/lib/server/iskur-onboarding-gate";
import { setOfficeHoursOpen } from "@test/mocks/office-hours-open";
import { InLocale } from "@test/test-utils";

class NotFound extends Error {}
class Redirected extends Error {}

vi.mock(
  "@/hooks/use-office-hours-open",
  () => import("@test/mocks/office-hours-open"),
);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound();
  },
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
vi.mock("@/lib/server/iskur-onboarding-gate", () => ({
  iskurOnboardingRedirect: vi.fn(async () => null),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/components/student/student-frame", () => ({
  StudentFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="student-frame">{children}</div>
  ),
}));
vi.mock("@/components/academician/academician-frame", () => ({
  AcademicianFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="academician-frame">{children}</div>
  ),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  setOfficeHoursOpen(true);
});

describe("ODTÜ workspace layouts", () => {
  it.each([undefined, "", "TEKNOKENT", "teknokent"])(
    "answer like a missing route in the Teknokent edition (APP_EDITION=%s)",
    async (value) => {
      vi.stubEnv("APP_EDITION", value);
      await expect(StudentLayout({ children: <p>x</p> })).rejects.toThrow(
        NotFound,
      );
      await expect(AcademicianLayout({ children: <p>x</p> })).rejects.toThrow(
        NotFound,
      );
    },
  );

  it("open the student workspace in its frame in the ODTÜ edition", async () => {
    vi.stubEnv("APP_EDITION", "ODTU");
    render(await StudentLayout({ children: <p>Ana Sayfa</p> }));
    expect(screen.getByTestId("student-frame")).toHaveTextContent("Ana Sayfa");
  });

  it("send a new İŞKUR intern to onboarding before any student page", async () => {
    vi.stubEnv("APP_EDITION", "ODTU");
    vi.mocked(iskurOnboardingRedirect).mockResolvedValueOnce(
      ISKUR_ONBOARDING_HREF,
    );
    await expect(StudentLayout({ children: <p>x</p> })).rejects.toThrow(
      new Redirected(ISKUR_ONBOARDING_HREF),
    );
  });

  it("open the academician workspace in its frame in the ODTÜ edition", async () => {
    vi.stubEnv("APP_EDITION", "ODTU");
    render(await AcademicianLayout({ children: <p>Randevu Talepleri</p> }));
    expect(screen.getByTestId("academician-frame")).toHaveTextContent(
      "Randevu Talepleri",
    );
  });

  it("show the academicians Office Hours coming soon in their frame while it is closed", async () => {
    vi.stubEnv("APP_EDITION", "ODTU");
    setOfficeHoursOpen(false);
    render(
      <InLocale locale="tr">
        {await AcademicianLayout({ children: <p>Randevu Talepleri</p> })}
      </InLocale>,
    );
    expect(screen.getByTestId("academician-frame")).toHaveTextContent(
      "Office Hours çok yakında",
    );
    expect(screen.queryByText("Randevu Talepleri")).toBeNull();
  });
});
