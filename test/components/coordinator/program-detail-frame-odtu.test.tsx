import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { useEdition } from "@/hooks/use-edition";
import { ProgramLifecycle } from "@/interfaces/coordinator-program";
import { Edition } from "@/interfaces/edition";
import { ProgramType } from "@/interfaces/program";
import {
  getCoordinatorProgram,
  getCoordinatorPrograms,
  launchCoordinatorProgram,
} from "@/lib/client/coordinator-programs";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import {
  coordinatorProgram,
  coordinatorProgramDetail,
} from "@test/fixtures/coordinator-programs";
import { renderWithQueryClient } from "@test/test-utils";

const { push } = vi.hoisted(() => ({ push: vi.fn<(href: string) => void>() }));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/coordinator/programs/oh-1"),
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/use-edition", () => ({ useEdition: vi.fn() }));

vi.mock("@/lib/client/coordinator-programs", () => ({
  getCoordinatorProgram: vi.fn(),
  getCoordinatorPrograms: vi.fn(),
  getProgramTeams: vi.fn(async () => []),
  launchCoordinatorProgram: vi.fn(),
}));

function officeHours() {
  return coordinatorProgramDetail({
    program: coordinatorProgram({
      id: "oh-1",
      name: "ODTÜ Office Hours",
      type: ProgramType.OfficeHours,
      lifecycle: ProgramLifecycle.Active,
    }),
    coordinators: [{ id: "c-1", fullName: "Elif Demir", owner: true }],
  });
}

function renderFrame(
  tab: ProgramTab,
  counts?: Partial<Record<ProgramTab, number | null>>,
) {
  return renderWithQueryClient(
    <ProgramDetailFrame programId="oh-1" tab={tab} tabCounts={counts}>
      {() => <p>Sekme içeriği</p>}
    </ProgramDetailFrame>,
  );
}

describe("program detail frame, ODTÜ edition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEdition).mockReturnValue(Edition.Odtu);
    vi.mocked(usePathname).mockReturnValue("/coordinator/programs/oh-1");
    vi.mocked(getCoordinatorProgram).mockResolvedValue(officeHours());
    vi.mocked(getCoordinatorPrograms).mockResolvedValue([
      coordinatorProgram({ id: "oh-1", name: "ODTÜ Office Hours" }),
      coordinatorProgram({ id: "peer-1", name: "Akran Mentörlüğü 2026 Güz" }),
    ]);
  });

  it("shows the breadcrumb, the name with its type and status, the line under it and Raporlar as a tab", async () => {
    renderFrame(ProgramTab.Academics, { [ProgramTab.Appointments]: 86 });

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "ODTÜ Office Hours",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Office Hours")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(
      screen.getByText("Üniversite geneli · Koordinatör: Elif Demir"),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Konum" })).toHaveTextContent(
      "Programlarım / ODTÜ Office Hours",
    );
    expect(screen.getByRole("link", { name: "Programlarım" })).toHaveAttribute(
      "href",
      "/coordinator/programs",
    );
    expect(screen.getByRole("link", { name: /^Randevular/ })).toHaveAttribute(
      "href",
      "/coordinator/programs/oh-1/appointments",
    );
    expect(screen.getByRole("link", { name: /^Randevular/ })).toHaveTextContent(
      "86",
    );
    expect(screen.getByRole("link", { name: "Raporlar" })).toHaveAttribute(
      "href",
      "/coordinator/programs/oh-1/report",
    );
    expect(screen.getByRole("link", { name: "Katılımcılar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Sekme içeriği")).toBeInTheDocument();
  });

  it("shows Katılımcılar's sub-tabs as a segmented control, Öğrenciler included", async () => {
    renderFrame(ProgramTab.Academics);

    expect(
      await screen.findByRole("link", { name: "Akademisyenler" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Öğrenciler" })).toHaveAttribute(
      "href",
      "/coordinator/programs/oh-1/students",
    );
  });

  it("jumps to another of the coordinator's programs from the picker", async () => {
    renderFrame(ProgramTab.Overview);

    const picker = await screen.findByRole("combobox", { name: "Program seç" });
    expect(
      await screen.findByRole("option", { name: "Akran Mentörlüğü 2026 Güz" }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(picker, "peer-1");
    expect(push).toHaveBeenCalledWith("/coordinator/programs/peer-1");
  });

  it("leaves the picker out for the admin, who reaches programs from their own list", async () => {
    vi.mocked(usePathname).mockReturnValue("/admin/programs/oh-1");
    renderFrame(ProgramTab.Overview);

    expect(
      await screen.findByRole("navigation", { name: "Konum" }),
    ).toHaveTextContent("Programlar / ODTÜ Office Hours");
    expect(
      screen.queryByRole("combobox", { name: "Program seç" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Raporlar" })).toHaveAttribute(
      "href",
      "/admin/programs/oh-1/report",
    );
  });

  it("puts the counts a page knows on Katılımcılar's sub-tabs, with its filters beside them", async () => {
    vi.mocked(getCoordinatorProgram).mockResolvedValue(
      coordinatorProgramDetail({
        program: coordinatorProgram({
          id: "oh-1",
          name: "Akran Mentörlüğü 2026 Güz",
          type: ProgramType.PeerMentoring,
          lifecycle: ProgramLifecycle.Active,
        }),
      }),
    );
    renderWithQueryClient(
      <ProgramDetailFrame
        programId="oh-1"
        tab={ProgramTab.PeerMentors}
        tabCounts={{ [ProgramTab.Students]: 312, [ProgramTab.PeerMentors]: 38 }}
        participantFilters={<span>Kapasite filtresi</span>}
      >
        {() => <p>Sekme içeriği</p>}
      </ProgramDetailFrame>,
    );

    expect(
      await screen.findByRole("link", { name: "Öğrenciler · 312" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Akran Mentorları · 38" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Kapasite filtresi")).toBeInTheDocument();
  });

  it("keeps the Teknokent header for the Teknokent edition", async () => {
    vi.mocked(useEdition).mockReturnValue(Edition.Teknokent);
    renderFrame(ProgramTab.Academics);

    expect(
      await screen.findByRole("link", { name: "Program raporu" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Raporlar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Program seç" }),
    ).not.toBeInTheDocument();
  });

  describe("a draft (Figma 152:7447)", () => {
    function draft(
      coordinators: { id: string; fullName: string; owner: boolean }[],
    ) {
      return coordinatorProgramDetail({
        program: coordinatorProgram({
          id: "oh-1",
          name: "ODTÜ Office Hours",
          type: ProgramType.OfficeHours,
          lifecycle: ProgramLifecycle.Draft,
        }),
        coordinators,
      });
    }

    it("gives the admin Programı Başlat in the header instead of the banner", async () => {
      vi.mocked(usePathname).mockReturnValue("/admin/programs/oh-1");
      vi.mocked(getCoordinatorProgram).mockResolvedValue(
        draft([{ id: "c-1", fullName: "Elif Demir", owner: true }]),
      );
      vi.mocked(launchCoordinatorProgram).mockResolvedValue(officeHours());
      const user = userEvent.setup();
      renderFrame(ProgramTab.Overview);

      const launch = await screen.findByRole("button", {
        name: "Programı Başlat",
      });
      expect(launch.closest("header")).not.toBeNull();
      expect(screen.queryByText(/Program henüz başlatılmadı/)).toBeNull();
      await user.click(launch);
      expect(launchCoordinatorProgram).toHaveBeenCalledWith("oh-1");
    });

    it("keeps the admin's launch closed, and says why, until a coordinator is assigned", async () => {
      vi.mocked(usePathname).mockReturnValue("/admin/programs/oh-1");
      vi.mocked(getCoordinatorProgram).mockResolvedValue(draft([]));
      renderFrame(ProgramTab.Overview);

      const launch = await screen.findByRole("button", {
        name: "Programı Başlat",
      });
      expect(launch).toBeDisabled();
      expect(launch).toHaveAccessibleDescription(
        "Başlatmadan önce bir koordinatör ata.",
      );
    });

    it("keeps the banner for coordinators, with no launch", async () => {
      vi.mocked(getCoordinatorProgram).mockResolvedValue(
        draft([{ id: "c-1", fullName: "Elif Demir", owner: true }]),
      );
      renderFrame(ProgramTab.Overview);

      expect(
        await screen.findByText(/yönetici başlattığında/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Programı Başlat" }),
      ).toBeNull();
    });
  });
});
