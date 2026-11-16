import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PeerParticipantsView } from "@/components/coordinator/peer-participants-view";
import {
  BadgeSource,
  GateBadgeState,
  type GateBadgeProfile,
  type GateBadgeRow,
} from "@/interfaces/badges";
import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import {
  getProgramBadgeRoster,
  postGateBadgeAward,
  postGateBadgeRevoke,
} from "@/lib/client/badges";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/components/coordinator/program-detail-frame", () => ({
  ProgramDetailFrame: ({
    children,
    participantFilters,
    tabCounts,
  }: {
    children: (detail: unknown) => ReactNode;
    participantFilters?: ReactNode;
    tabCounts?: Record<string, number | null>;
  }) => (
    <>
      <p data-testid="counts">{JSON.stringify(tabCounts)}</p>
      {participantFilters}
      {children({})}
    </>
  ),
}));
vi.mock("@/lib/client/badges", () => ({
  getProgramBadgeRoster: vi.fn(),
  postGateBadgeAward: vi.fn(),
  postGateBadgeRevoke: vi.fn(),
}));

function profile(overrides: Partial<GateBadgeProfile> = {}): GateBadgeProfile {
  return {
    department: "Endüstri Mühendisliği",
    classYear: 4,
    mentorProfile: true,
    categories: [
      PeerTopicCategory.CareerInternship,
      PeerTopicCategory.AcademicDevelopment,
    ],
    activeMentees: 3,
    menteeCapacity: 4,
    ...overrides,
  };
}

function row(overrides: Partial<GateBadgeRow>): GateBadgeRow {
  return {
    userId: "u1",
    fullName: "Zeynep Öğrenci",
    email: "zeynep@odtu-dev.invalid",
    programId: "p1",
    programName: "İŞKUR 2026 Bahar",
    state: GateBadgeState.None,
    awardId: null,
    source: null,
    awardedAt: null,
    revokedAt: null,
    reason: null,
    training: { videoWatched: false, attempts: 0, bestScore: null },
    profile: profile({ mentorProfile: false, categories: [], classYear: 2 }),
    ...overrides,
  };
}

const mert = row({
  userId: "u2",
  fullName: "Mert Demir",
  state: GateBadgeState.Active,
  awardId: "a2",
  source: BadgeSource.Coordinator,
  awardedAt: "2026-11-08T10:00:00Z",
  profile: profile(),
});
const elif = row({
  userId: "u3",
  fullName: "Elif Karaca",
  state: GateBadgeState.Active,
  awardId: "a3",
  profile: profile({
    activeMentees: 4,
    categories: [PeerTopicCategory.CareerInternship],
  }),
});
const zeynepKoc = row({
  userId: "u4",
  fullName: "Zeynep Koç",
  state: GateBadgeState.Active,
  awardId: "a4",
  profile: profile({
    department: "İşletme",
    classYear: 3,
    mentorProfile: false,
    categories: [],
  }),
});

describe("PeerParticipantsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProgramBadgeRoster).mockResolvedValue([
      row({}),
      mert,
      elif,
      zeynepKoc,
    ]);
  });

  it("shows each peer mentor's department, categories, badge and load, from one roster", async () => {
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );

    const table = await screen.findByRole("table", {
      name: "Akran Mentorları",
    });
    const mertRow = within(table).getByText("Mert Demir").closest("tr")!;
    expect(mertRow).toHaveTextContent("Endüstri Mühendisliği · 4");
    expect(within(mertRow).getByText("Kariyer ve Staj")).toBeInTheDocument();
    expect(within(mertRow).getByText("Akademik Gelişim")).toBeInTheDocument();
    expect(within(mertRow).getByText("Rozet Doğrulandı")).toBeInTheDocument();
    expect(mertRow).toHaveTextContent("3 / 4 mentee");
    expect(
      within(table).getByText("Elif Karaca").closest("tr"),
    ).toHaveTextContent("4 / 4 · dolu");
    const koc = within(table).getByText("Zeynep Koç").closest("tr")!;
    expect(within(koc).getByText("Profil oluşturulmadı")).toBeInTheDocument();
    expect(within(table).queryByText("Zeynep Öğrenci")).not.toBeInTheDocument();
    expect(screen.getByTestId("counts")).toHaveTextContent(
      '{"STUDENTS":4,"PEER_MENTORS":3}',
    );
    expect(getProgramBadgeRoster).toHaveBeenCalledWith("p1", null);
    expect(screen.getByText(/koordinatöre görünmez/)).toBeInTheDocument();
  });

  it("narrows Akran Mentorları by capacity", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );
    await screen.findByRole("table", { name: "Akran Mentorları" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Kapasite" }),
      "FULL",
    );

    const table = screen.getByRole("table", { name: "Akran Mentorları" });
    expect(within(table).getByText("Elif Karaca")).toBeInTheDocument();
    expect(within(table).queryByText("Mert Demir")).not.toBeInTheDocument();
  });

  // A revoke always says why; the button stays off until a reason is typed.
  it("takes a badge back from the row menu, only with a reason", async () => {
    vi.mocked(postGateBadgeRevoke).mockResolvedValue(
      row({ state: GateBadgeState.Revoked }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Mert Demir için işlemler" }),
    );
    await user.click(screen.getByRole("button", { name: "Rozeti geri al" }));

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Geri al" });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText("Neden"),
      "  Görüşmelere gelmedi ",
    );
    await user.click(confirm);

    await waitFor(() =>
      expect(postGateBadgeRevoke).toHaveBeenCalledWith(
        "p1",
        "a2",
        "Görüşmelere gelmedi",
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("closes the row menu on Escape or a click elsewhere, and gives focus back", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );
    const trigger = await screen.findByRole("button", {
      name: "Mert Demir için işlemler",
    });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", { name: "Rozeti geri al" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByText("Mert Demir"));
    expect(
      screen.queryByRole("button", { name: "Rozeti geri al" }),
    ).not.toBeInTheDocument();
  });

  it("returns focus to the row's menu button when the revoke dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );
    const trigger = await screen.findByRole("button", {
      name: "Mert Demir için işlemler",
    });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Rozeti geri al" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Vazgeç",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("tells an empty filter apart from an empty program", async () => {
    vi.mocked(getProgramBadgeRoster).mockResolvedValue([mert]);
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );
    await screen.findByText("Mert Demir");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Kapasite" }),
      "FULL",
    );

    expect(screen.getByText("Bu filtreye uyan kimse yok.")).toBeInTheDocument();
  });

  it("leaves the sub-tab counts out when the roster cannot be loaded", async () => {
    vi.mocked(getProgramBadgeRoster).mockRejectedValue(
      new Error("Katılımcılar yüklenemedi."),
    );
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Katılımcılar yüklenemedi.",
    );
    expect(screen.getByTestId("counts")).toHaveTextContent(
      '{"STUDENTS":null,"PEER_MENTORS":null}',
    );
  });

  it("awards the badge on Öğrenciler to someone who has none", async () => {
    vi.mocked(postGateBadgeAward).mockResolvedValue(
      row({ state: GateBadgeState.Active }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.Students} />,
    );

    const zeynep = (await screen.findByText("Zeynep Öğrenci")).closest("tr")!;
    expect(within(zeynep).getByText("Rozet Yok")).toBeInTheDocument();
    expect(zeynep).toHaveTextContent("Endüstri Mühendisliği · 2");
    expect(
      within(screen.getByText("Mert Demir").closest("tr")!).queryByRole(
        "button",
        {
          name: "Rozet ver",
        },
      ),
    ).not.toBeInTheDocument();
    await user.click(within(zeynep).getByRole("button", { name: "Rozet ver" }));

    await waitFor(() =>
      expect(postGateBadgeAward).toHaveBeenCalledWith("p1", "u1"),
    );
  });

  // 4T-3: started the training, no badge yet.
  it("shows who is in training and how far they got, and filters by it", async () => {
    vi.mocked(getProgramBadgeRoster).mockResolvedValue([
      row({ training: { videoWatched: true, attempts: 2, bestScore: 7 } }),
      row({
        userId: "u3",
        fullName: "Can İzledi",
        training: { videoWatched: true, attempts: 0, bestScore: null },
      }),
      row({ userId: "u5", fullName: "Ali Yeni", profile: null }),
    ]);
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.Students} />,
    );

    const zeynep = (await screen.findByText("Zeynep Öğrenci")).closest("tr")!;
    expect(within(zeynep).getByText("Eğitimde")).toBeInTheDocument();
    expect(
      within(zeynep).getByText("2 deneme · en iyi 7/10"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText("Can İzledi").closest("tr")!).getByText(
        "Video izlendi, sınav bekleniyor",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Rozet durumu" }),
      "NONE",
    );
    expect(screen.getByText("Ali Yeni")).toBeInTheDocument();
    expect(screen.queryByText("Can İzledi")).not.toBeInTheDocument();
  });

  it("shows the backend's refusal", async () => {
    vi.mocked(postGateBadgeAward).mockRejectedValue(
      new Error(
        "Rozet yalnızca bu programın onaylı öğrencilerine verilebilir.",
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.Students} />,
    );

    const zeynep = (await screen.findByText("Zeynep Öğrenci")).closest("tr")!;
    await user.click(within(zeynep).getByRole("button", { name: "Rozet ver" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Rozet yalnızca bu programın onaylı öğrencilerine verilebilir.",
    );
  });

  it("says when nobody holds the badge yet", async () => {
    vi.mocked(getProgramBadgeRoster).mockResolvedValue([row({})]);
    renderWithQueryClient(
      <PeerParticipantsView programId="p1" tab={ProgramTab.PeerMentors} />,
    );

    expect(
      await screen.findByText(
        "Bu programda henüz Akran Mentoru rozeti olan kimse yok.",
      ),
    ).toBeInTheDocument();
  });
});
