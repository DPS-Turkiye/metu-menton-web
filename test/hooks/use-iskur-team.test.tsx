import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurTeam } from "@/hooks/use-iskur-team";
import { IskurTaskKind } from "@/interfaces/iskur-tasks";
import { ClientApiError } from "@/lib/client/api";
import { createIskurTask, getIskurTeamTasks } from "@/lib/client/iskur-tasks";
import { useToastStore } from "@/stores/toast-store";
import { IskurTeamTab } from "@/types/iskur-tasks";
import {
  createIskurTeamTasks,
  LEADER_ID,
  MEMBER_ID,
} from "@test/fixtures/iskur-tasks";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-tasks", () => ({
  createIskurTask: vi.fn(),
  getIskurTeamTasks: vi.fn(),
}));

async function renderLoaded() {
  const { queryClient, wrapper } = queryWrapper();
  const view = renderHook(() => useIskurTeam(), { wrapper });
  await waitFor(() => expect(view.result.current.team).not.toBeNull());
  return { ...view, queryClient };
}

describe("useIskurTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurTeamTasks).mockResolvedValue(createIskurTeamTasks());
  });

  it("loads this week and starts the form on the first member of the sub-group", async () => {
    const { result } = await renderLoaded();
    expect(getIskurTeamTasks).toHaveBeenCalledWith(result.current.weekStart);
    expect(result.current.people.map((person) => person.userId)).toEqual([
      LEADER_ID,
      MEMBER_ID,
    ]);
    expect(result.current.form.assigneeId).toBe(MEMBER_ID);
    expect(result.current.taskCount).toBe(1);
    expect(result.current.memberCount).toBe(3);
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.preview).toMatchObject({
      before: 720,
      after: 840,
      target: 990,
    });
  });

  it("assigns the task, caches the answer and clears the form", async () => {
    const answered = createIskurTeamTasks({ weekStart: "2026-11-23" });
    vi.mocked(createIskurTask).mockResolvedValue(answered);
    const { result, queryClient } = await renderLoaded();

    act(() => result.current.setTitle("  Afiş  "));
    act(() => result.current.setKind(IskurTaskKind.Event));
    act(() => result.current.setAssignee(LEADER_ID));
    act(() => result.current.setDueDate("2026-11-24"));
    act(() => result.current.setNeedsOutput(true));
    act(() => result.current.setDescription("A3"));
    act(() => result.current.moreTime());
    act(() => result.current.moreTime());
    act(() => result.current.lessTime());
    expect(result.current.form.estimatedMinutes).toBe(150);
    expect(result.current.canSubmit).toBe(true);

    // The screen then reads the week the task went to.
    vi.mocked(getIskurTeamTasks).mockResolvedValue(answered);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.form.title).toBe(""));
    // The task is due in another week, so the screen moves there.
    expect(result.current.weekStart).toBe("2026-11-23");
    expect(createIskurTask).toHaveBeenCalledWith({
      assigneeId: LEADER_ID,
      title: "Afiş",
      kind: IskurTaskKind.Event,
      estimatedMinutes: 150,
      dueDate: "2026-11-24",
      needsOutput: true,
      description: "A3",
    });
    expect(
      queryClient.getQueryData(["iskur-team-tasks", "2026-11-23"]),
    ).toEqual(answered);
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      "Görev atandı.",
    );
  });

  it("shows the backend's refusal and keeps the form", async () => {
    vi.mocked(createIskurTask).mockRejectedValue(
      new ClientApiError(
        "Görev yalnızca kendine ya da alt grubundaki bir üyeye atanabilir.",
        400,
      ),
    );
    const { result } = await renderLoaded();
    act(() => result.current.setTitle("Afiş"));
    act(() => result.current.submit());
    await waitFor(() =>
      expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
        "Görev yalnızca kendine ya da alt grubundaki bir üyeye atanabilir.",
      ),
    );
    expect(result.current.form.title).toBe("Afiş");
    act(() => result.current.cancel());
    expect(result.current.form.title).toBe("");
  });

  it("moves between weeks and tabs", async () => {
    const { result } = await renderLoaded();
    const thisWeek = result.current.weekStart;
    act(() => result.current.nextWeek());
    expect(result.current.weekStart).not.toBe(thisWeek);
    // The last week stays on screen while the next one loads.
    expect(result.current.team).not.toBeNull();
    expect(result.current.loading).toBe(false);
    act(() => result.current.previousWeek());
    expect(result.current.weekStart).toBe(thisWeek);
    act(() => result.current.setTab(IskurTeamTab.Members));
    expect(result.current.tab).toBe(IskurTeamTab.Members);
  });

  it("tells a person who is not placed apart from a failure", async () => {
    vi.mocked(getIskurTeamTasks).mockRejectedValue(
      new ClientApiError("x", 404),
    );
    const { wrapper } = queryWrapper();
    const notPlaced = renderHook(() => useIskurTeam(), { wrapper });
    await waitFor(() => expect(notPlaced.result.current.notPlaced).toBe(true));
    expect(notPlaced.result.current.failed).toBe(false);

    vi.mocked(getIskurTeamTasks).mockRejectedValue(
      new ClientApiError("x", 500),
    );
    const other = queryWrapper();
    const failed = renderHook(() => useIskurTeam(), { wrapper: other.wrapper });
    await waitFor(() => expect(failed.result.current.failed).toBe(true), {
      timeout: 3000,
    });
  });
});
