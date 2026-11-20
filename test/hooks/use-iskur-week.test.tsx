import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurThisWeek, useIskurWorkLog } from "@/hooks/use-iskur-week";
import {
  IskurWeekDecision,
  IskurWeekStatus,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import { PeerMentorGateState } from "@/interfaces/peer-mentoring";
import { ClientApiError } from "@/lib/client/api";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import {
  addIskurSupportEntry,
  getIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/client/iskur-weeks";
import {
  getPeerMentorProfile,
  getReceivedPeerRequests,
} from "@/lib/client/peer-mentoring";
import { IskurTodoKind } from "@/types/iskur-weeks";
import { PeerReportView } from "@/types/peer-reports";
import {
  completeForm,
  emptyForm,
  onboarding,
} from "@test/fixtures/iskur-onboarding";
import { ACTIVITY_ID, createIskurWeek } from "@test/fixtures/iskur-weeks";
import {
  peerMentorProfileFixture,
  receivedPeerRequest,
} from "@test/fixtures/peer-mentoring";
import { queryWrapper } from "@test/fixtures/query-wrapper";

const replace = vi.fn();
let search = new URLSearchParams("view=daily&week=2026-11-16&day=2026-11-17");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/student/work-log",
  useSearchParams: () => search,
}));
vi.mock("@/lib/client/iskur-weeks", () => ({
  addIskurSupportEntry: vi.fn(),
  getIskurWeek: vi.fn(),
  objectToIskurWeek: vi.fn(),
  saveIskurWeekEntries: vi.fn(),
  submitIskurWeek: vi.fn(),
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

describe("useIskurThisWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wednesday of the fixture week; only Date is faked, so waitFor keeps its timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T09:00:00+03:00"));
    gate.state = PeerMentorGateState.Hidden;
    vi.mocked(getIskurWeek).mockImplementation((weekStart) =>
      weekStart === null
        ? Promise.resolve(createIskurWeek({ needsSupportActivity: true }))
        : Promise.reject(new ClientApiError("x", 404)),
    );
    vi.mocked(getIskurOnboarding).mockResolvedValue(onboarding(emptyForm()));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the to-dos and adds a support activity for today", async () => {
    vi.mocked(addIskurSupportEntry).mockResolvedValue(createIskurWeek());
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurThisWeek(), { wrapper });
    await waitFor(() => expect(result.current.week).not.toBeNull());
    expect(getIskurWeek).toHaveBeenCalledWith(null);
    expect(result.current.todos.map((todo) => todo.kind)).toEqual([
      "reports",
      "task",
      "support",
    ]);
    expect(result.current.hoursOpen).toBe(true);
    act(() => result.current.toggleHours());
    expect(result.current.hoursOpen).toBe(false);

    act(() => result.current.startPicking());
    expect(result.current.activityId).toBe(ACTIVITY_ID);
    act(() => result.current.addSupport());
    await waitFor(() => expect(result.current.picking).toBe(false));
    expect(vi.mocked(addIskurSupportEntry).mock.calls[0]?.[1]).toMatchObject({
      activityId: ACTIVITY_ID,
      minutes: 60,
    });
  });

  it("adds a new request, a work day with no log and last week's unsent log", async () => {
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
      Promise.resolve(
        weekStart === null
          ? createIskurWeek({ needsSupportActivity: true })
          : createIskurWeek({ weekStart: "2026-11-09" }),
      ),
    );
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurThisWeek(), { wrapper });
    await waitFor(() => expect(result.current.todos).toHaveLength(6));
    expect(getIskurWeek).toHaveBeenCalledWith("2026-11-09");
    expect(result.current.todos.map((todo) => todo.kind)).toEqual([
      IskurTodoKind.Reports,
      IskurTodoKind.Request,
      IskurTodoKind.MissingDay,
      IskurTodoKind.Submit,
      IskurTodoKind.Task,
      IskurTodoKind.Support,
    ]);
  });

  it("hides the card for someone not placed, and asks nothing else", async () => {
    vi.mocked(getIskurWeek).mockRejectedValue(new ClientApiError("x", 404));
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurThisWeek(), { wrapper });
    await waitFor(() => expect(result.current.hidden).toBe(true));
    expect(getIskurOnboarding).not.toHaveBeenCalled();
    expect(getIskurWeek).toHaveBeenCalledTimes(1);
  });
});

describe("useIskurWorkLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams("view=daily&week=2026-11-16&day=2026-11-17");
    vi.mocked(getIskurWeek).mockResolvedValue(createIskurWeek());
  });

  async function renderLoaded() {
    const { wrapper } = queryWrapper();
    const view = renderHook(() => useIskurWorkLog(), { wrapper });
    await waitFor(() => expect(view.result.current.week).not.toBeNull());
    return view;
  }

  it("reads the week and day from the URL and moves through them", async () => {
    const { result } = await renderLoaded();
    expect(getIskurWeek).toHaveBeenCalledWith("2026-11-16");
    expect(result.current.day).toBe("2026-11-17");
    expect(result.current.dayLines).toHaveLength(1);
    act(() => result.current.setView(PeerReportView.Weekly));
    expect(replace).toHaveBeenLastCalledWith(
      expect.stringContaining("view=weekly"),
      { scroll: false },
    );
    act(() => result.current.previousWeek());
    expect(replace).toHaveBeenLastCalledWith(
      expect.stringContaining("week=2026-11-09"),
      { scroll: false },
    );
    act(() => result.current.selectDay("2026-11-18"));
    expect(replace).toHaveBeenLastCalledWith(
      expect.stringContaining("day=2026-11-18"),
      { scroll: false },
    );
  });

  it("edits the day's lines as a draft and saves them", async () => {
    vi.mocked(saveIskurWeekEntries).mockResolvedValue(createIskurWeek());
    const { result } = await renderLoaded();
    expect(result.current.canSave).toBe(false);
    act(() => result.current.addTeamLine());
    expect(result.current.dirty).toBe(true);
    // A line with no title or minutes yet cannot be saved.
    expect(result.current.canSave).toBe(false);
    const added = result.current.dayLines[1];
    if (!added) throw new Error("no line");
    act(() =>
      result.current.updateLine(added.key, {
        title: "Ekip toplantısı",
        minutes: "60",
      }),
    );
    act(() => result.current.setPickedActivity(ACTIVITY_ID));
    act(() => result.current.addSupportLine());
    expect(result.current.dayLines.at(-1)?.kind).toBe(
      IskurWorkEntryKind.SupportActivity,
    );
    expect(result.current.dayMinutes).toBe(300);
    expect(result.current.canSave).toBe(true);
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.save());
    await waitFor(() => expect(result.current.dirty).toBe(false));
    expect(vi.mocked(saveIskurWeekEntries).mock.calls[0]?.[1]).toHaveLength(3);
  });

  it("flags a day over 7.5 hours, and can drop a draft", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setPickedTask("task-1"));
    act(() => result.current.addTeamLine());
    const line = result.current.dayLines[1];
    if (!line) throw new Error("no line");
    act(() => result.current.updateLine(line.key, { minutes: "300" }));
    expect(result.current.overflowing).toEqual(["2026-11-17"]);
    expect(result.current.canSave).toBe(false);
    act(() => result.current.removeLine(line.key));
    expect(result.current.overflowing).toEqual([]);
    act(() => result.current.discard());
    expect(result.current.dirty).toBe(false);
  });

  it("submits, and objects once to a revision", async () => {
    vi.mocked(submitIskurWeek).mockResolvedValue(
      createIskurWeek({ status: IskurWeekStatus.Submitted, editable: false }),
    );
    const { result } = await renderLoaded();
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.submit());
    await waitFor(() =>
      expect(submitIskurWeek).toHaveBeenCalledWith("2026-11-16"),
    );

    vi.mocked(getIskurWeek).mockResolvedValue(
      createIskurWeek({
        status: IskurWeekStatus.RevisionRequested,
        decision: {
          decision: IskurWeekDecision.Revision,
          reason: "Çıktı eksik",
          timeMatchesWork: true,
          effortDocumented: false,
          outputsSufficient: false,
          decidedAt: "2026-11-21T10:00:00Z",
          decidedBy: null,
        },
      }),
    );
    vi.mocked(objectToIskurWeek).mockResolvedValue(createIskurWeek());
    const second = await renderLoaded();
    await waitFor(() =>
      expect(second.result.current.week?.decision).not.toBeNull(),
    );
    expect(second.result.current.canObject).toBe(false);
    act(() => second.result.current.setObjection("Bağlantıyı notta paylaştım"));
    expect(second.result.current.canObject).toBe(true);
    act(() => second.result.current.object());
    await waitFor(() =>
      expect(objectToIskurWeek).toHaveBeenCalledWith(
        "2026-11-16",
        "Bağlantıyı notta paylaştım",
      ),
    );
  });
});
