import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CoordinatorProgramAcademicsPage from "@/app/coordinator/programs/[id]/academics/page";
import CoordinatorProgramAppointmentsPage from "@/app/coordinator/programs/[id]/appointments/page";
import StudentOfficeHoursLayout from "@/app/student/office-hours/layout";
import { setOfficeHoursOpen } from "@test/mocks/office-hours-open";
import { InLocale } from "@test/test-utils";

vi.mock(
  "@/hooks/use-office-hours-open",
  () => import("@test/mocks/office-hours-open"),
);
vi.mock("@/components/coordinator/program-appointments-view", () => ({
  ProgramAppointmentsView: () => <p>Randevular</p>,
}));
vi.mock("@/components/coordinator/program-academics-view", () => ({
  ProgramAcademicsView: () => <p>Akademisyenler</p>,
}));

const params = Promise.resolve({ id: "p-1" });

async function pages(): Promise<[string, ReactNode][]> {
  return [
    ["Akademisyenler", await CoordinatorProgramAcademicsPage({ params })],
    ["Randevular", await CoordinatorProgramAppointmentsPage({ params })],
    [
      "Office Hours listesi",
      StudentOfficeHoursLayout({ children: <p>Office Hours listesi</p> }),
    ],
  ];
}

beforeEach(() => {
  setOfficeHoursOpen(true);
});

describe("Office Hours pages", () => {
  it("open as usual once Office Hours is open", async () => {
    for (const [text, page] of await pages()) {
      const { unmount } = render(<InLocale locale="tr">{page}</InLocale>);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it("show Office Hours coming soon in their place while it is closed", async () => {
    setOfficeHoursOpen(false);
    for (const [text, page] of await pages()) {
      const { unmount } = render(<InLocale locale="tr">{page}</InLocale>);
      expect(screen.getByText("Office Hours çok yakında")).toBeInTheDocument();
      expect(screen.queryByText(text)).toBeNull();
      unmount();
    }
  });
});
