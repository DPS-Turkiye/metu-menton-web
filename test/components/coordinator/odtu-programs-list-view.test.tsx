import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OdtuProgramsListView } from "@/components/coordinator/odtu-programs-list-view";
import { useCoordinatorPrograms } from "@/hooks/use-coordinator-programs";
import {
  ProgramLifecycle,
  type CoordinatorProgram,
} from "@/interfaces/coordinator-program";
import {
  ProgramFeature,
  ProgramStatus,
  ProgramType,
} from "@/interfaces/program";
import { coordinatorProgram } from "@test/fixtures/coordinator-programs";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/hooks/use-edition", async () => {
  const { Edition } = await import("@/interfaces/edition");
  return { useEdition: () => Edition.Odtu };
});
vi.mock("@/hooks/use-coordinator-programs", async (actual) => ({
  ...(await actual<typeof import("@/hooks/use-coordinator-programs")>()),
  useCoordinatorPrograms: vi.fn(),
}));

const officeHours = coordinatorProgram({
  id: "oh",
  name: "ODTÜ Office Hours",
  type: ProgramType.OfficeHours,
  counts: {
    peer: null,
    officeHours: {
      academicians: 2410,
      withAvailability: 1280,
      awaitingDecision: 86,
    },
  },
});

const programs: CoordinatorProgram[] = [
  coordinatorProgram({
    id: "peer",
    name: "Akran Mentörlüğü 2026 Güz",
    type: ProgramType.PeerMentoring,
    startDate: "2026-09-01",
    endDate: "2027-01-31",
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
  officeHours,
  coordinatorProgram({
    id: "draft",
    name: "Kariyer Akran Mentörlüğü 2027",
    type: ProgramType.PeerMentoring,
    status: ProgramStatus.Draft,
    lifecycle: ProgramLifecycle.Draft,
    startDate: "2027-02-01",
    endDate: null,
    counts: {
      peer: {
        students: 0,
        peerMentors: 38,
        openRequests: 0,
        activeCategories: 0,
      },
      officeHours: null,
    },
  }),
];

function showing(data: CoordinatorProgram[] | undefined, extra = {}) {
  vi.mocked(useCoordinatorPrograms).mockReturnValue({
    data,
    isLoading: false,
    error: null,
    ...extra,
  } as ReturnType<typeof useCoordinatorPrograms>);
}

describe("ODTÜ Programlarım", () => {
  beforeEach(() => showing(programs));

  it("shows each program as a card with the numbers its type cares about", () => {
    renderWithQueryClient(<OdtuProgramsListView />);

    expect(
      screen.getByText(
        "Atandığın 3 program · farklı türdeki programları aynı yerden yönetirsin.",
      ),
    ).toBeInTheDocument();
    const peer = within(
      screen.getByRole("article", { name: "Akran Mentörlüğü 2026 Güz" }),
    );
    expect(peer.getByText("Eyl 2026 – Oca 2027")).toBeInTheDocument();
    expect(peer.getByText("312")).toBeInTheDocument();
    expect(peer.getByText("bekleyen talep")).toBeInTheDocument();
    expect(peer.getByRole("link", { name: "Programı Aç" })).toHaveAttribute(
      "href",
      "/coordinator/programs/peer",
    );

    const officeHours = within(
      screen.getByRole("article", { name: "ODTÜ Office Hours" }),
    );
    expect(officeHours.getByText("Üniversite geneli")).toBeInTheDocument();
    expect(officeHours.getByText("2.410")).toBeInTheDocument();
    expect(officeHours.getByText("müsaitliği olan")).toBeInTheDocument();

    const draft = within(
      screen.getByRole("article", { name: "Kariyer Akran Mentörlüğü 2027" }),
    );
    expect(draft.getByText("Taslak")).toBeInTheDocument();
    expect(draft.getByText("aktif kategori")).toBeInTheDocument();
    expect(
      draft.getByRole("link", { name: "Program Ayarları" }),
    ).toHaveAttribute("href", "/coordinator/programs/draft/settings");
  });

  it("keeps completed programs under Tümü, opens them on their overview and encodes the id", () => {
    showing([
      coordinatorProgram({
        id: "a b/2025",
        name: "Akran Mentörlüğü 2025",
        type: ProgramType.PeerMentoring,
        status: ProgramStatus.Completed,
        lifecycle: ProgramLifecycle.Completed,
      }),
    ]);
    renderWithQueryClient(<OdtuProgramsListView />);

    const card = within(
      screen.getByRole("article", { name: "Akran Mentörlüğü 2025" }),
    );
    expect(card.getByText("Arşivlendi")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Programı Aç" })).toHaveAttribute(
      "href",
      "/coordinator/programs/a%20b%2F2025",
    );
    expect(card.getAllByText("—")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Aktif 0" })).toBeInTheDocument();
  });

  it("reminds the coordinator of drafts whose terms are still to be set", () => {
    renderWithQueryClient(<OdtuProgramsListView />);

    expect(
      screen.getByText("Yapılandırma bekleyen program"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kariyer Akran Mentörlüğü 2027 için koşulları belirle/),
    ).toBeInTheDocument();
  });

  it("narrows the cards by segment and by feature", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<OdtuProgramsListView />);

    const segments = screen.getByRole("group", { name: "Program durumu" });
    expect(
      within(segments).getByRole("button", { name: "Tümü 3" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(
      within(segments).getByRole("button", { name: "Taslak 1" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await user.click(within(segments).getByRole("button", { name: "Aktif 2" }));

    const type = screen.getByRole("combobox", { name: "Özellik" });
    expect(
      within(type)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Özellik: Tümü", "Akran Mentörlüğü", "Office Hours", "İŞKUR"]);
    await user.selectOptions(type, ProgramFeature.OfficeHours);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("article", { name: "ODTÜ Office Hours" }),
    ).toBeInTheDocument();
  });

  it("says so while loading, on failure, with no programs and with no match", async () => {
    showing(undefined, { isLoading: true });
    const loading = renderWithQueryClient(<OdtuProgramsListView />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Programların yükleniyor…",
    );
    expect(
      screen.queryByRole("group", { name: "Program durumu" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Program türü" }),
    ).not.toBeInTheDocument();
    loading.unmount();

    showing(undefined, { error: new Error("boom") });
    const failed = renderWithQueryClient(<OdtuProgramsListView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    failed.unmount();

    showing([]);
    const empty = renderWithQueryClient(<OdtuProgramsListView />);
    expect(
      screen.getByText(/Henüz atandığın bir program yok/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Yapılandırma bekleyen program"),
    ).not.toBeInTheDocument();
    empty.unmount();

    const user = userEvent.setup();
    showing([officeHours]);
    renderWithQueryClient(<OdtuProgramsListView />);
    await user.click(screen.getByRole("button", { name: "Taslak 0" }));
    expect(
      screen.getByText("Bu filtrelere uyan program yok."),
    ).toBeInTheDocument();
  });
});
