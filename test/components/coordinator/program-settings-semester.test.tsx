import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramSettingsView } from "@/components/coordinator/program-settings-view";
import type { CoordinatorProgramDetail } from "@/interfaces/coordinator-program";
import { ProgramFeature, ProgramType } from "@/interfaces/program";
import {
  getCoordinatorProgram,
  getProgramEligibleEmails,
  setProgramCoordinatorFeatures,
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
  setProgramCoordinatorFeatures: vi.fn(),
  removeProgramCoordinator: vi.fn(),
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
    vi.mocked(usePathname).mockReturnValue(
      "/coordinator/programs/program-1/settings",
    );
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

  describe("coordinators per feature", () => {
    function withCoordinators(): CoordinatorProgramDetail {
      return {
        ...semester([ProgramFeature.PeerMentoring, ProgramFeature.OfficeHours]),
        coordinators: [
          {
            id: "c-1",
            fullName: "Elif Demir",
            owner: true,
            features: [
              ProgramFeature.PeerMentoring,
              ProgramFeature.OfficeHours,
            ],
          },
          {
            id: "c-2",
            fullName: "Burcu Şen",
            owner: false,
            features: [ProgramFeature.OfficeHours],
          },
        ],
      };
    }

    it("lets the admin switch which features a coordinator runs, keeping at least one", async () => {
      const user = userEvent.setup();
      vi.mocked(usePathname).mockReturnValue(
        "/admin/programs/program-1/settings",
      );
      vi.mocked(getCoordinatorProgram).mockResolvedValue(withCoordinators());
      vi.mocked(setProgramCoordinatorFeatures).mockResolvedValue([]);
      renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

      const burcu = await screen.findByRole("group", {
        name: "Burcu Şen hangi özellikleri yürütür",
      });
      const officeHours = within(burcu).getByRole("button", {
        name: "Office Hours",
      });
      expect(officeHours).toHaveAttribute("aria-pressed", "true");
      expect(officeHours).toBeDisabled();
      expect(
        within(burcu).queryByRole("button", { name: "İŞKUR" }),
      ).not.toBeInTheDocument();

      await user.click(
        within(burcu).getByRole("button", { name: "Akran Mentörlüğü" }),
      );
      expect(setProgramCoordinatorFeatures).toHaveBeenCalledWith(
        "program-1",
        "c-2",
        [ProgramFeature.PeerMentoring, ProgramFeature.OfficeHours],
      );
    });

    it("shows a coordinator each colleague's features without switches", async () => {
      vi.mocked(getCoordinatorProgram).mockResolvedValue(withCoordinators());
      renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

      const burcu = await screen.findByRole("group", {
        name: "Burcu Şen hangi özellikleri yürütür",
      });
      expect(within(burcu).queryByRole("button")).not.toBeInTheDocument();
      expect(within(burcu).getByText("Office Hours")).toBeInTheDocument();
      expect(
        within(burcu).queryByText("Akran Mentörlüğü"),
      ).not.toBeInTheDocument();
    });
  });
});
