import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IskurThisWeekCard } from "@/components/student/iskur/this-week-card";
import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { IskurWeekDecision, IskurWeekStatus } from "@/interfaces/iskur-weeks";
import { PeerMentorGateState } from "@/interfaces/peer-mentoring";
import { ClientApiError } from "@/lib/client/api";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import { addIskurSupportEntry, getIskurWeek } from "@/lib/client/iskur-weeks";
import {
  getPeerMentorProfile,
  getReceivedPeerRequests,
} from "@/lib/client/peer-mentoring";
import {
  completeForm,
  emptyForm,
  onboarding,
} from "@test/fixtures/iskur-onboarding";
import { createIskurWeek } from "@test/fixtures/iskur-weeks";
import {
  peerMentorProfileFixture,
  receivedPeerRequest,
} from "@test/fixtures/peer-mentoring";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-weeks", () => ({
  addIskurSupportEntry: vi.fn(),
  getIskurWeek: vi.fn(),
}));
vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurOnboarding: vi.fn(),
}));
vi.mock("@/lib/client/peer-mentoring", () => ({
  getPeerMentorProfile: vi.fn(),
  getReceivedPeerRequests: vi.fn(),
}));
const gate = { state: PeerMentorGateState.Hidden };
vi.mock("@/hooks/use-peer-mentor-give", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-peer-mentor-give")>()),
  usePeerMentorGate: () => ({
    state: gate.state,
    gateAward: null,
    expired: false,
    isLoading: false,
    sessionBehind: false,
  }),
}));

describe("IskurThisWeekCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wednesday 18 November; only Date is faked, so the queries' timers still run.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T09:00:00+03:00"));
    gate.state = PeerMentorGateState.Hidden;
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(emptyForm()));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists today's to-dos above the week's hours, each with its action", async () => {
    const user = userEvent.setup();
    gate.state = PeerMentorGateState.Earned;
    vi.mocked(getPeerMentorProfile).mockResolvedValue(
      peerMentorProfileFixture(),
    );
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([
      receivedPeerRequest("r1", "Zeynep Koç"),
    ]);
    vi.mocked(getIskurOnboarding).mockResolvedValue(
      onboarding(completeForm({ submittedAt: "2026-11-13T12:00:00Z" })),
    );
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      weekStart === null
        ? Promise.resolve(createIskurWeek({ needsSupportActivity: true }))
        : Promise.reject(new ClientApiError("x", 404)),
    );
    vi.mocked(addIskurSupportEntry).mockResolvedValue(createIskurWeek());
    renderWithQueryClient(<IskurThisWeekCard />);

    const today = await screen.findByRole("region", {
      name: /Yapılacaklar/,
    });
    expect(
      await within(today).findByRole("link", {
        name: "Yanıtla: Yeni mentorluk talebi: Zeynep Koç",
      }),
    ).toHaveAttribute("href", "/student/peer-mentoring?as=MENTOR");
    expect(
      within(today).getByRole("link", {
        name: "Raporu doldur: 1 görüşme raporu bekliyor",
      }),
    ).toHaveAttribute("href", "/student/peer-mentoring?as=MENTOR&tab=report");
    expect(
      await within(today).findByRole("link", {
        name: /^Tamamla: Pzt, 16 Kasım için çalışma kaydı yok/,
      }),
    ).toHaveAttribute(
      "href",
      "/student/work-log?view=daily&week=2026-11-16&day=2026-11-16",
    );
    expect(within(today).getByText(/Planlanan 4 sa/)).toBeInTheDocument();
    expect(
      within(today).getByRole("link", {
        name: "Çıktı yükle: Sponsor listesi: 10 firma",
      }),
    ).toHaveAttribute("href", "/student/team/tasks/task-1");
    expect(within(today).getAllByRole("listitem")).toHaveLength(5);

    const week = screen.getByRole("region", { name: /Bu Haftam/ });
    expect(within(week).getByText("2 sa 40 dk / 6 sa")).toBeInTheDocument();
    expect(
      within(week).getByRole("link", { name: "Çalışma kaydını aç" }),
    ).toHaveAttribute("href", "/student/work-log?view=daily&week=2026-11-16");
    await user.click(
      within(week).getByRole("button", { name: "Çalışma saati" }),
    );
    expect(
      screen.queryByRole("progressbar", { name: "Akran Mentörlüğü" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(today).getByRole("button", { name: "Faaliyet seç" }),
    );
    await user.click(
      within(today).getByRole("button", { name: "Bugüne 1 saat ekle" }),
    );
    await waitFor(() => expect(addIskurSupportEntry).toHaveBeenCalledTimes(1));
  });

  it("keeps the coordinator's mentoring target and says Rozet bekleniyor until the badge", async () => {
    gate.state = PeerMentorGateState.NoBadge;
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      weekStart === null
        ? Promise.resolve(createIskurWeek())
        : Promise.reject(new ClientApiError("x", 404)),
    );
    const first = renderWithQueryClient(<IskurThisWeekCard />);

    const week = await screen.findByRole("region", { name: /Bu Haftam/ });
    expect(within(week).getByText("Rozet bekleniyor")).toBeInTheDocument();
    expect(within(week).getByText("2 sa 40 dk / 6 sa")).toBeInTheDocument();
    first.unmount();

    gate.state = PeerMentorGateState.Earned;
    vi.mocked(getPeerMentorProfile).mockResolvedValue(
      peerMentorProfileFixture(),
    );
    vi.mocked(getReceivedPeerRequests).mockResolvedValue([]);
    renderWithQueryClient(<IskurThisWeekCard />);
    const earned = await screen.findByRole("region", { name: /Bu Haftam/ });
    expect(within(earned).queryByText("Rozet bekleniyor")).toBeNull();
  });

  it("asks to fix a week the leader sent back, with the leader's note", async () => {
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      Promise.resolve(
        weekStart === null
          ? createIskurWeek()
          : createIskurWeek({
              weekStart: "2026-11-09",
              status: IskurWeekStatus.RevisionRequested,
              decision: {
                decision: IskurWeekDecision.Revision,
                reason: "Salı'nın çıktısını ekle.",
                timeMatchesWork: true,
                effortDocumented: false,
                outputsSufficient: false,
                decidedAt: "2026-11-16T08:00:00Z",
                decidedBy: null,
              },
            }),
      ),
    );
    renderWithQueryClient(<IskurThisWeekCard />);
    expect(
      await screen.findByRole("link", {
        name: "Düzelt: Geçen haftanın kaydı için düzeltme istendi",
      }),
    ).toHaveAttribute("href", "/student/work-log?view=weekly&week=2026-11-09");
    expect(
      screen.getByText("Değerlendirenin notu: Salı'nın çıktısını ekle."),
    ).toBeInTheDocument();
  });

  describe("the Friday weekly-summary prompt", () => {
    const PROMPT = "Gönder: Haftalık özetini bugün liderine gönder";

    function weekIs(week: ReturnType<typeof createIskurWeek>) {
      vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
        weekStart === null
          ? Promise.resolve(week)
          : Promise.reject(new ClientApiError("x", 404)),
      );
    }

    it("shows on Friday while the week is unsent, by the Istanbul date", async () => {
      // 22:30 UTC on Thursday is already 01:30 on Friday in Istanbul.
      vi.setSystemTime(new Date("2026-11-19T22:30:00Z"));
      weekIs(createIskurWeek());
      renderWithQueryClient(<IskurThisWeekCard />);
      expect(await screen.findByRole("link", { name: PROMPT })).toHaveAttribute(
        "href",
        "/student/work-log?view=weekly&week=2026-11-16",
      );
      expect(
        screen.getByText(
          "İŞKUR programında haftalık özet cuma günü liderine gider.",
        ),
      ).toBeInTheDocument();
    });

    it("is hidden once the week is sent", async () => {
      vi.setSystemTime(new Date("2026-11-20T09:00:00+03:00"));
      weekIs(
        createIskurWeek({
          status: IskurWeekStatus.Submitted,
          editable: false,
          canSubmit: false,
        }),
      );
      renderWithQueryClient(<IskurThisWeekCard />);
      await screen.findByRole("region", { name: /Yapılacaklar/ });
      expect(screen.queryByRole("link", { name: PROMPT })).toBeNull();
    });

    it("is hidden on another day", async () => {
      // 23:30 in Istanbul on Thursday (20:30 UTC).
      vi.setSystemTime(new Date("2026-11-19T23:30:00+03:00"));
      weekIs(createIskurWeek());
      renderWithQueryClient(<IskurThisWeekCard />);
      await screen.findByRole("region", { name: /Yapılacaklar/ });
      expect(screen.queryByRole("link", { name: PROMPT })).toBeNull();
    });
  });

  it("opens a task without an output to hand in with Görevi aç (handbook p.05)", async () => {
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      weekStart === null
        ? Promise.resolve(
            createIskurWeek({
              tasks: createIskurWeek().tasks.map((task) => ({
                ...task,
                needsOutput: false,
              })),
            }),
          )
        : Promise.reject(new ClientApiError("x", 404)),
    );
    renderWithQueryClient(<IskurThisWeekCard />);
    const today = await screen.findByRole("region", { name: /Yapılacaklar/ });
    expect(
      await within(today).findByRole("link", {
        name: "Görevi aç: Sponsor listesi: 10 firma",
      }),
    ).toHaveAttribute("href", "/student/team/tasks/task-1");
    expect(
      within(today).queryByRole("link", { name: /^Çıktı yükle/ }),
    ).toBeNull();
  });

  it("says when nothing is waiting today", async () => {
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      weekStart === null
        ? Promise.resolve(
            createIskurWeek({
              mentoring: {
                ...createIskurWeek().mentoring,
                reportsSubmitted: 2,
              },
              tasks: createIskurWeek().tasks.map((task) => ({
                ...task,
                status: IskurTaskStatus.Done,
              })),
            }),
          )
        : Promise.reject(new ClientApiError("x", 404)),
    );
    renderWithQueryClient(<IskurThisWeekCard />);
    expect(
      await screen.findByText("Bugün için bekleyen bir şey yok."),
    ).toBeInTheDocument();
  });

  it("is not shown to someone who is not placed", async () => {
    vi.mocked(getIskurWeek).mockRejectedValue(new ClientApiError("x", 404));
    const { container } = renderWithQueryClient(<IskurThisWeekCard />);
    await waitFor(() => expect(getIskurWeek).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });
});
