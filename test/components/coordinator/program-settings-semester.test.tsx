import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramSettingsView } from "@/components/coordinator/program-settings-view";
import type { CoordinatorProgramDetail } from "@/interfaces/coordinator-program";
import { ProgramFeature, ProgramType } from "@/interfaces/program";
import {
  getCoordinatorProgram,
  getProgramEligibleEmails,
} from "@/lib/client/coordinator-programs";
import { coordinatorProgramDetail } from "@test/fixtures/coordinator-programs";
import { renderWithQueryClient } from "@test/test-utils";

// The settings body is the same in both editions; the Teknokent header needs the fewest mocks.
vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Teknokent };
});
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/coordinator/programs/program-1/settings"),
}));
vi.mock("@/lib/client/coordinator-programs", () => ({
  getCoordinatorProgram: vi.fn(),
  getProgramEligibleEmails: vi.fn(),
}));
vi.mock("@/components/coordinator/program-training-editor", () => ({
  ProgramTrainingEditor: () => <p>Eğitim düzenleyici</p>,
}));
vi.mock("@/components/coordinator/program-peer-categories-section", () => ({
  ProgramPeerCategories: () => <p>Kategoriler</p>,
}));
vi.mock("@/components/coordinator/program-curriculum-section", () => ({
  ProgramCurriculumSection: () => null,
}));

function semester(
  features: ProgramFeature[],
  myFeatures: ProgramFeature[] = features,
): CoordinatorProgramDetail {
  const detail = coordinatorProgramDetail();
  return {
    ...detail,
    program: {
      ...detail.program,
      type: ProgramType.Semester,
      features,
      myFeatures,
    },
  };
}

describe("Program Ayarları of a semester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProgramEligibleEmails).mockResolvedValue([]);
  });

  it("lists the semester's features and the peer sections it runs", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      semester([ProgramFeature.PeerMentoring, ProgramFeature.Iskur]),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    const features = await screen.findByRole("region", {
      name: "Program özellikleri",
    });
    expect(within(features).getByText("Akran Mentörlüğü")).toBeVisible();
    expect(within(features).getByText("İŞKUR")).toBeVisible();
    expect(
      within(features).queryByText("Office Hours"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Eğitim düzenleyici")).toBeInTheDocument();
    expect(screen.getByText("Kategoriler")).toBeInTheDocument();
  });

  it("leaves the peer sections out for a coordinator of Office Hours only", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      semester(
        [ProgramFeature.PeerMentoring, ProgramFeature.OfficeHours],
        [ProgramFeature.OfficeHours],
      ),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    await screen.findByRole("region", { name: "Program özellikleri" });
    expect(screen.queryByText("Eğitim düzenleyici")).not.toBeInTheDocument();
    expect(screen.queryByText("Kategoriler")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Akran Mentoru eğitimi" }),
    ).not.toBeInTheDocument();
  });
});
