import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurThisWeek, useIskurWorkLog } from "@/hooks/use-iskur-week";
import {
  IskurWeekDecision,
  IskurWeekStatus,
  IskurWorkEntryKind,
} from "@/interfaces/iskur-weeks";
import { ClientApiError } from "@/lib/client/api";
import {
  addIskurSupportEntry,
  getIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/client/iskur-weeks";
import { PeerReportView } from "@/types/peer-reports";
import { ACTIVITY_ID, createIskurWeek } from "@test/fixtures/iskur-weeks";
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

describe("useIskurThisWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurWeek).mockResolvedValue(
      createIskurWeek({ needsSupportActivity: true }),
    );
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

  it("hides the card for someone not placed", async () => {
    vi.mocked(getIskurWeek).mockRejectedValue(new ClientApiError("x", 404));
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurThisWeek(), { wrapper });
    await waitFor(() => expect(result.current.hidden).toBe(true));
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
