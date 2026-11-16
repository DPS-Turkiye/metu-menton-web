import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OdtuProgramsView } from "@/components/admin/odtu-programs-view";
import { useAdminOverview } from "@/hooks/use-admin-overview";
import type { AdminOverview, AdminUser } from "@/interfaces/admin-overview";
import { ProgramStatus, ProgramType } from "@/interfaces/program";
import { UserAccountStatus, UserRole } from "@/interfaces/session";
import { adminProgram } from "@test/fixtures/admin-programs";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Odtu };
});
vi.mock("@/hooks/use-admin-overview", () => ({
  useAdminOverview: vi.fn(),
}));
vi.mock("@/components/admin/assign-coordinator-dialog", () => ({
  AssignCoordinatorDialog: ({
    programName,
    onClose,
  }: {
    programName: string;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={`Koordinatör: ${programName}`}>
      <button type="button" onClick={onClose}>
        Kapat
      </button>
    </div>
  ),
}));

function coordinator(id: string, fullName: string): AdminUser {
  return {
    id,
    email: `${id}@metu.test`,
    fullName,
    role: UserRole.Coordinator,
    status: UserAccountStatus.Approved,
    organizationId: null,
    organizationName: null,
    jobTitle: null,
  };
}

const overview: AdminOverview = {
  programs: [
    adminProgram({
      id: "peer",
      name: "Akran Mentörlüğü 2026 Güz",
      type: ProgramType.PeerMentoring,
      startDate: "2026-09-01",
      endDate: "2027-01-31",
      coordinatorIds: ["selin"],
      coordinatorName: "Selin Er",
      counts: {
        peer: {
          students: 312,
          peerMentors: 38,
          openRequests: 14,
          activeCategories: 2,
        },
        officeHours: null,
      },
    }),
    adminProgram({
      id: "oh",
      name: "ODTÜ Office Hours",
      type: ProgramType.OfficeHours,
      coordinatorIds: ["can", "selin"],
      coordinatorName: "Can Aksoy, Selin Er",
    }),
    adminProgram({
      id: "draft",
      name: "Kariyer Akran Mentörlüğü 2027",
      type: ProgramType.PeerMentoring,
      status: ProgramStatus.Draft,
      startDate: "2027-02-01",
      coordinatorIds: [],
    }),
  ],
  users: [coordinator("selin", "Selin Er"), coordinator("can", "Can Aksoy")],
  mentorships: [],
  requests: [],
  bottlenecks: [],
  meetingsLast8Weeks: 0,
};

function showing(data: AdminOverview | undefined, extra = {}) {
  vi.mocked(useAdminOverview).mockReturnValue({
    data,
    isLoading: false,
    error: null,
    ...extra,
  } as ReturnType<typeof useAdminOverview>);
}

function rowOf(name: string) {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return within(row);
}

describe("admin Programlar (ODTÜ)", () => {
  beforeEach(() => showing(overview));

  it("lists each program with its type, status, coordinator, dates and participants", () => {
    renderWithQueryClient(<OdtuProgramsView />);

    const peer = rowOf("Akran Mentörlüğü 2026 Güz");
    expect(peer.getByText("Akran Mentörlüğü")).toBeInTheDocument();
    expect(peer.getByText("Aktif")).toBeInTheDocument();
    expect(peer.getByText("Selin Er")).toBeInTheDocument();
    expect(peer.getByText("Eyl 2026 – Oca 2027")).toBeInTheDocument();
    expect(peer.getByText("312")).toBeInTheDocument();
    expect(
      peer.getByRole("link", {
        name: "Akran Mentörlüğü 2026 Güz programını aç",
      }),
    ).toHaveAttribute("href", "/admin/programs/peer");

    const officeHours = rowOf("ODTÜ Office Hours");
    expect(officeHours.getByText("Can Aksoy +1")).toBeInTheDocument();
    expect(officeHours.getByText("Üniversite geneli")).toBeInTheDocument();
    expect(officeHours.getByText("Tümü")).toBeInTheDocument();

    const draft = rowOf("Kariyer Akran Mentörlüğü 2027");
    expect(draft.getByText("Taslak")).toBeInTheDocument();
    expect(draft.getByText("Koordinatör yok")).toBeInTheDocument();
    expect(draft.getByText("Şub 2027 · taslak")).toBeInTheDocument();
    expect(draft.getByText("—")).toBeInTheDocument();
  });

  it("names each row by its program for screen readers", () => {
    renderWithQueryClient(<OdtuProgramsView />);

    expect(
      screen.getByRole("rowheader", { name: "ODTÜ Office Hours" }),
    ).toBeInTheDocument();
  });

  it("stops filtering by a coordinator who no longer coordinates anything", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithQueryClient(<OdtuProgramsView />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Koordinatör" }),
      "can",
    );
    expect(
      screen.queryByText("Akran Mentörlüğü 2026 Güz"),
    ).not.toBeInTheDocument();

    showing({
      ...overview,
      programs: overview.programs.filter((program) => program.id !== "oh"),
    });
    rerender(<OdtuProgramsView />);

    expect(screen.getByText("Akran Mentörlüğü 2026 Güz")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Koordinatör" })).toHaveValue(
      "ALL",
    );
  });

  it("counts each segment and narrows the table to it", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramsView />);

    const segments = screen.getByRole("group", { name: "Program durumu" });
    expect(
      within(segments).getByRole("button", { name: "Tümü 3" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(segments).getByRole("button", { name: "Aktif 2" }),
    ).toBeInTheDocument();
    expect(
      within(segments).getByRole("button", { name: "Tamamlanan 0" }),
    ).toBeInTheDocument();

    await user.click(
      within(segments).getByRole("button", { name: "Taslak 1" }),
    );

    expect(
      screen.getByText("Kariyer Akran Mentörlüğü 2027"),
    ).toBeInTheDocument();
    expect(screen.queryByText("ODTÜ Office Hours")).not.toBeInTheDocument();
  });

  it("filters by search, type and coordinator, and offers only the ODTÜ program types", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramsView />);

    const type = screen.getByRole("combobox", { name: "Program türü" });
    expect(
      within(type)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Program türü: Tümü", "Akran Mentörlüğü", "Office Hours"]);
    await user.selectOptions(type, ProgramType.OfficeHours);
    expect(screen.getByText("ODTÜ Office Hours")).toBeInTheDocument();
    expect(
      screen.queryByText("Akran Mentörlüğü 2026 Güz"),
    ).not.toBeInTheDocument();
    await user.selectOptions(type, "ALL");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Koordinatör" }),
      "selin",
    );
    expect(screen.getByText("Akran Mentörlüğü 2026 Güz")).toBeInTheDocument();
    expect(screen.getByText("ODTÜ Office Hours")).toBeInTheDocument();
    expect(
      screen.queryByText("Kariyer Akran Mentörlüğü 2027"),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Program ara" }),
      "zzz",
    );
    expect(
      screen.getByText("Bu filtrelere uyan program yok."),
    ).toBeInTheDocument();
  });

  it("assigns a coordinator from a row without one, and adds one from a row's ⋯ menu", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramsView />);

    await user.click(
      rowOf("Kariyer Akran Mentörlüğü 2027").getByRole("button", {
        name: "Koordinatör ata",
      }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "Koordinatör: Kariyer Akran Mentörlüğü 2027",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Akran Mentörlüğü 2026 Güz için diğer işlemler",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Koordinatör ekle" }));
    expect(
      screen.getByRole("dialog", {
        name: "Koordinatör: Akran Mentörlüğü 2026 Güz",
      }),
    ).toBeInTheDocument();
  });

  it("links to the new-program wizard and explains who creates programs", () => {
    renderWithQueryClient(<OdtuProgramsView />);

    expect(
      screen.getByRole("link", { name: "Yeni Program Oluştur" }),
    ).toHaveAttribute("href", "/admin/programs/new");
    expect(
      screen.getByText(/Programları yalnızca Admin oluşturur ve başlatır/),
    ).toBeInTheDocument();
  });

  it("says so while loading, on failure and when there are no programs", () => {
    showing(undefined, { isLoading: true });
    const { unmount } = renderWithQueryClient(<OdtuProgramsView />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Programlar yükleniyor…",
    );
    expect(
      screen.queryByRole("group", { name: "Program durumu" }),
    ).not.toBeInTheDocument();
    unmount();

    showing(undefined, { error: new Error("boom") });
    const failed = renderWithQueryClient(<OdtuProgramsView />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    failed.unmount();

    showing({ ...overview, programs: [] });
    renderWithQueryClient(<OdtuProgramsView />);
    expect(screen.getByText(/Henüz program yok/)).toBeInTheDocument();
  });
});
