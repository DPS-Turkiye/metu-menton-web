import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  iskurWorkspaceQueryKey,
  useIskurWorkspace,
} from "@/hooks/use-iskur-workspace";
import {
  IskurTeamRole,
  type IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import {
  getIskurWorkspace,
  placeIskurIntern,
} from "@/lib/client/iskur-workspace";
import { IskurDialogKind } from "@/types/iskur-workspace";
import { iskurPerson, iskurWorkspace } from "@test/fixtures/iskur-workspace";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-workspace", () => ({
  createDefaultIskurStructure: vi.fn(),
  createIskurTeam: vi.fn(),
  createIskurUnit: vi.fn(),
  deleteIskurTeam: vi.fn(),
  deleteIskurUnit: vi.fn(),
  finalizeIskurPlacements: vi.fn(),
  getIskurWorkspace: vi.fn(),
  placeIskurIntern: vi.fn(),
  unplaceIskurIntern: vi.fn(),
  updateIskurTeam: vi.fn(),
  updateIskurUnit: vi.fn(),
}));

const workspace = iskurWorkspace();

async function renderLoaded() {
  const { queryClient, wrapper } = queryWrapper();
  const view = renderHook(() => useIskurWorkspace("p1"), { wrapper });
  await waitFor(() => expect(view.result.current.workspace).not.toBeNull());
  return { ...view, queryClient };
}

describe("useIskurWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurWorkspace).mockResolvedValue(workspace);
  });

  it("runs one save at a time and keeps the dialog open until it answers", async () => {
    let answer: (value: IskurWorkspace) => void = () => undefined;
    vi.mocked(placeIskurIntern).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { result, queryClient } = await renderLoaded();

    act(() => result.current.openPlacement(iskurPerson()));
    act(() => result.current.setRole(IskurTeamRole.Leader));
    act(() => result.current.savePlacement());
    await waitFor(() => expect(result.current.saving).toBe(true));
    act(() => result.current.savePlacement());
    act(() => result.current.close());

    expect(placeIskurIntern).toHaveBeenCalledTimes(1);
    expect(result.current.dialog?.kind).toBe(IskurDialogKind.Place);

    const updated = iskurWorkspace({ pool: [] });
    await act(async () => answer(updated));
    await waitFor(() => expect(result.current.dialog).toBeNull());
    expect(queryClient.getQueryData(iskurWorkspaceQueryKey("p1"))).toEqual(
      updated,
    );
  });

  it("clears the leader when the team or the role changes, and leaves the person out of the leader choices", async () => {
    const { result } = await renderLoaded();
    const leader = workspace.units[0]?.teams[0]?.people[0];
    if (!leader) throw new Error("fixture has a leader");

    act(() => result.current.openPlacement(leader));
    expect(result.current.leaderOptions).toEqual([]);
    expect(result.current.defaultMentoringMinutes).toBe(360);

    act(() => result.current.openPlacement(iskurPerson()));
    expect(result.current.leaderOptions.map((p) => p.userId)).toEqual([
      "u-leader",
    ]);
    act(() => result.current.setLeader("u-leader"));
    act(() => result.current.setTeam("t2"));
    expect(result.current.form?.leaderId).toBeNull();
    act(() => result.current.setTeam("t1"));
    act(() => result.current.setLeader("u-leader"));
    act(() => result.current.setRole(IskurTeamRole.Leader));
    expect(result.current.form?.leaderId).toBeNull();
    expect(result.current.defaultMentoringMinutes).toBeNull();

    act(() => result.current.setMentoringHours("abc"));
    act(() => result.current.savePlacement());
    expect(placeIskurIntern).not.toHaveBeenCalled();
  });

  it("does nothing for a blank name or before the workspace has loaded", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.openUnit(null));
    act(() => result.current.setName("   "));
    expect(result.current.canSaveName).toBe(false);
    act(() => result.current.saveName());
    act(() => result.current.confirm());
    act(() => result.current.unplace());
    expect(result.current.dialog?.kind).toBe(IskurDialogKind.Unit);

    vi.mocked(getIskurWorkspace).mockReturnValue(
      new Promise(() => {
        // Never settles: the workspace stays unloaded.
      }),
    );
    const { wrapper } = queryWrapper();
    const pending = renderHook(() => useIskurWorkspace("p2"), { wrapper });
    act(() => pending.result.current.openPlacement(iskurPerson()));
    act(() =>
      pending.result.current.openFinalize({ teamId: null, unitId: null }, null),
    );
    expect(pending.result.current.dialog).toBeNull();
    expect(pending.result.current.leaderOptions).toEqual([]);
  });
});
