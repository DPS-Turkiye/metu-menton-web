import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurTeamReveal } from "@/hooks/use-iskur-team-reveal";
import {
  IskurPlacementStatus,
  IskurTeamRole,
} from "@/interfaces/iskur-workspace";
import { ClientApiError } from "@/lib/client/api";
import { getIskurTeamReveal } from "@/lib/client/iskur-onboarding";
import { reveal } from "@test/fixtures/iskur-onboarding";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurTeamReveal: vi.fn(),
}));

describe("useIskurTeamReveal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("groups the team and says whether the placement is still provisional", async () => {
    vi.mocked(getIskurTeamReveal).mockResolvedValue(reveal());
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurTeamReveal(), { wrapper });
    await waitFor(() => expect(result.current.placement).not.toBeNull());
    expect(result.current.provisional).toBe(true);
    expect(result.current.leads).toBe(false);
    expect(result.current.groups).toHaveLength(2);
  });

  it("knows a leader with a final placement", async () => {
    const base = reveal();
    const placement = base.placement;
    if (!placement) throw new Error("fixture has no placement");
    vi.mocked(getIskurTeamReveal).mockResolvedValue({
      ...base,
      placement: {
        ...placement,
        status: IskurPlacementStatus.Final,
        myRole: IskurTeamRole.Leader,
      },
    });
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurTeamReveal(), { wrapper });
    await waitFor(() => expect(result.current.placement).not.toBeNull());
    expect(result.current.provisional).toBe(false);
    expect(result.current.leads).toBe(true);
  });

  it("shows nothing to someone who is not an intern", async () => {
    vi.mocked(getIskurTeamReveal).mockRejectedValue(
      new ClientApiError("yok", 404),
    );
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurTeamReveal(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reveal).toBeNull();
    expect(result.current.groups).toEqual([]);
  });
});
