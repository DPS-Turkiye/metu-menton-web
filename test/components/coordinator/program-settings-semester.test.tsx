import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramSettingsView } from "@/components/coordinator/program-settings-view";
import {
  ProgramLifecycle,
  type CoordinatorProgramDetail,
} from "@/interfaces/coordinator-program";
import {
  ProgramBlockerKind,
  ProgramFeature,
  ProgramType,
} from "@/interfaces/program";
import { ClientApiError } from "@/lib/client/api";
import {
  getCoordinatorProgram,
  getProgramEligibleEmails,
  updateCoordinatorProgramFeatures,
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
  updateCoordinatorProgramFeatures: vi.fn(),
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
  lifecycle = ProgramLifecycle.Draft,
): CoordinatorProgramDetail {
  const detail = coordinatorProgramDetail();
  return {
    ...detail,
    program: {
      ...detail.program,
      type: ProgramType.Semester,
      features,
      myFeatures,
      lifecycle,
    },
  };
}

const ALL = [
  ProgramFeature.PeerMentoring,
  ProgramFeature.OfficeHours,
  ProgramFeature.Iskur,
];

async function featuresRegion() {
  return screen.findByRole("region", { name: "Program özellikleri" });
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

    const features = await featuresRegion();
    expect(
      within(features).getByRole("switch", { name: /^Akran Mentörlüğü/ }),
    ).toBeChecked();
    expect(
      within(features).getByRole("switch", { name: /^İŞKUR/ }),
    ).toBeChecked();
    expect(
      within(features).getByRole("switch", { name: /^Office Hours/ }),
    ).not.toBeChecked();
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

    await featuresRegion();
    expect(screen.queryByText("Eğitim düzenleyici")).not.toBeInTheDocument();
    expect(screen.queryByText("Kategoriler")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Akran Mentoru eğitimi" }),
    ).not.toBeInTheDocument();
  });

  it("lets a coordinator switch a draft's features and saves them on their own", async () => {
    const user = userEvent.setup();
    vi.mocked(getCoordinatorProgram).mockResolvedValue(semester(ALL));
    vi.mocked(updateCoordinatorProgramFeatures).mockResolvedValue(
      semester([ProgramFeature.OfficeHours]),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    const features = await featuresRegion();
    const save = within(features).getByRole("button", {
      name: "Özellikleri kaydet",
    });
    expect(save).toBeDisabled();
    await user.click(
      within(features).getByRole("switch", { name: /^Akran Mentörlüğü/ }),
    );
    expect(
      within(features).getByRole("switch", { name: /^İŞKUR/ }),
    ).not.toBeChecked();
    await user.click(save);

    expect(updateCoordinatorProgramFeatures).toHaveBeenCalledWith("program-1", [
      ProgramFeature.OfficeHours,
    ]);
    expect(
      await screen.findByText("Program özellikleri kaydedildi."),
    ).toBeInTheDocument();
  });

  it("keeps at least one feature on", async () => {
    const user = userEvent.setup();
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      semester([ProgramFeature.OfficeHours]),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    const features = await featuresRegion();
    await user.click(
      within(features).getByRole("switch", { name: /^Office Hours/ }),
    );
    expect(within(features).getByRole("alert")).toHaveTextContent(
      "En az bir özellik açık kalmalı.",
    );
    expect(
      within(features).getByRole("button", { name: "Özellikleri kaydet" }),
    ).toBeDisabled();
  });

  it("closes the switches for a coordinator once the semester has started", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      semester(ALL, ALL, ProgramLifecycle.Active),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    const features = await featuresRegion();
    expect(
      within(features).getByText(
        "Program başladı; özellikleri artık yönetici değiştirir.",
      ),
    ).toBeInTheDocument();
    for (const toggle of within(features).getAllByRole("switch")) {
      expect(toggle).toBeDisabled();
    }
    expect(
      within(features).queryByRole("button", { name: "Özellikleri kaydet" }),
    ).not.toBeInTheDocument();
  });

  it("shows the admin what open work keeps a feature on after launch", async () => {
    const user = userEvent.setup();
    vi.mocked(usePathname).mockReturnValue(
      "/admin/programs/program-1/settings",
    );
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      semester(ALL, ALL, ProgramLifecycle.Active),
    );
    vi.mocked(updateCoordinatorProgramFeatures).mockRejectedValue(
      new ClientApiError("Açık işler var.", 409, "PROGRAM_WORK_OPEN", {}, [
        {
          kind: ProgramBlockerKind.ActiveMentorship,
          feature: ProgramFeature.PeerMentoring,
          count: 2,
        },
        {
          kind: ProgramBlockerKind.IskurPlacement,
          feature: ProgramFeature.Iskur,
          count: 1,
        },
      ]),
    );
    renderWithQueryClient(<ProgramSettingsView programId="program-1" />);

    const features = await featuresRegion();
    await user.click(
      within(features).getByRole("switch", { name: /^Akran Mentörlüğü/ }),
    );
    await user.click(
      within(features).getByRole("button", { name: "Özellikleri kaydet" }),
    );

    const refusal = await within(features).findByRole("alert");
    expect(refusal).toHaveTextContent("Kapatılamadı; açık işler var:");
    expect(
      within(refusal).getByText("Akran Mentörlüğü: 2 süren mentorluk"),
    ).toBeInTheDocument();
    expect(
      within(refusal).getByText("İŞKUR: 1 İŞKUR yerleştirmesi"),
    ).toBeInTheDocument();

    await user.click(within(features).getByRole("button", { name: "Vazgeç" }));
    expect(within(features).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      within(features).getByRole("switch", { name: /^Akran Mentörlüğü/ }),
    ).toBeChecked();
  });
});
