import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurReview, useIskurReviewQueue } from "@/hooks/use-iskur-review";
import { IskurWeekDecision, IskurWeekStatus } from "@/interfaces/iskur-weeks";
import {
  decideIskurFallbackWeek,
  decideIskurLeaderWeek,
  getIskurFallbackQueue,
  getIskurFallbackWeek,
  getIskurLeaderQueue,
  getIskurLeaderWeek,
} from "@/lib/client/iskur-weeks";
import { createIskurLeaderWeek, WEEK_ID } from "@test/fixtures/iskur-weeks";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-weeks", () => ({
  decideIskurFallbackWeek: vi.fn(),
  decideIskurLeaderWeek: vi.fn(),
  getIskurFallbackQueue: vi.fn(),
  getIskurFallbackWeek: vi.fn(),
  getIskurLeaderQueue: vi.fn(),
  getIskurLeaderWeek: vi.fn(),
}));

describe("useIskurReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurLeaderWeek).mockResolvedValue(createIskurLeaderWeek());
    vi.mocked(getIskurFallbackWeek).mockResolvedValue(createIskurLeaderWeek());
  });

  it("needs a reason for a revision, then sends the leader's decision", async () => {
    vi.mocked(decideIskurLeaderWeek).mockResolvedValue(
      createIskurLeaderWeek({
        status: IskurWeekStatus.RevisionRequested,
        canDecide: false,
      }),
    );
    const { wrapper } = queryWrapper();
    const { result } = renderHook(
      () => useIskurReview({ programId: null }, WEEK_ID),
      { wrapper },
    );
    await waitFor(() => expect(result.current.week).not.toBeNull());
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setDecision(IskurWeekDecision.Revision));
    act(() => result.current.setTimeMatchesWork(true));
    act(() => result.current.setEffortDocumented(true));
    act(() => result.current.setOutputsSufficient(false));
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.setReason("Çıktı bağlantısı eksik"));
    expect(result.current.canSubmit).toBe(true);
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.week?.canDecide).toBe(false));
    expect(decideIskurLeaderWeek).toHaveBeenCalledWith(WEEK_ID, {
      decision: IskurWeekDecision.Revision,
      timeMatchesWork: true,
      effortDocumented: true,
      outputsSufficient: false,
      reason: "Çıktı bağlantısı eksik",
    });
    expect(result.current.form.decision).toBeNull();
    expect(result.current.hrefOf("w2")).toBe("/student/team/weeks/w2");
  });

  it("goes through the coordinator endpoints for a fallback week", async () => {
    vi.mocked(decideIskurFallbackWeek).mockResolvedValue(
      createIskurLeaderWeek(),
    );
    const { wrapper } = queryWrapper();
    const { result } = renderHook(
      () => useIskurReview({ programId: "p1" }, WEEK_ID),
      { wrapper },
    );
    await waitFor(() => expect(result.current.week).not.toBeNull());
    expect(getIskurFallbackWeek).toHaveBeenCalledWith("p1", WEEK_ID);
    act(() => result.current.setDecision(IskurWeekDecision.Approve));
    act(() => result.current.submit());
    await waitFor(() =>
      expect(decideIskurFallbackWeek).toHaveBeenCalledTimes(1),
    );
    expect(result.current.hrefOf("w2")).toBe(
      "/coordinator/programs/p1/iskur/weeks/w2",
    );
  });
});

describe("useIskurReviewQueue", () => {
  it("reads the leader's or the coordinators' queue, only when asked", async () => {
    vi.mocked(getIskurLeaderQueue).mockResolvedValue({
      weekStart: "2026-11-16",
      people: [],
    });
    vi.mocked(getIskurFallbackQueue).mockResolvedValue({
      weekStart: "2026-11-16",
      people: createIskurLeaderWeek().queue,
    });
    const { wrapper } = queryWrapper();
    const off = renderHook(
      () => useIskurReviewQueue({ programId: null }, "2026-11-16", false),
      { wrapper },
    );
    expect(off.result.current.loading).toBe(false);
    expect(getIskurLeaderQueue).not.toHaveBeenCalled();
    const coordinators = renderHook(
      () => useIskurReviewQueue({ programId: "p1" }, null),
      { wrapper },
    );
    await waitFor(() =>
      expect(coordinators.result.current.people).toHaveLength(2),
    );
    expect(getIskurFallbackQueue).toHaveBeenCalledWith("p1", null);
  });
});
