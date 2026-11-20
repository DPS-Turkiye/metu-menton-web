import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurTaskOutputs } from "@/hooks/use-iskur-task-outputs";
import { getIskurTaskOutputs } from "@/lib/client/iskur-tasks";
import {
  createIskurTaskOutputs,
  OUTPUT_ID,
  TASK_ID,
} from "@test/fixtures/iskur-tasks";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-tasks", () => ({
  getIskurTaskOutputs: vi.fn(),
  iskurProgramTaskOutputHref: (
    programId: string,
    taskId: string,
    outputId: string,
  ) => `/files/${programId}/${taskId}/${outputId}`,
}));

describe("useIskurTaskOutputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the program's files and links each under the program", async () => {
    vi.mocked(getIskurTaskOutputs).mockResolvedValue(createIskurTaskOutputs());
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurTaskOutputs("p1"), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.enabled).toBe(false);

    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    expect(getIskurTaskOutputs).toHaveBeenCalledWith("p1");
    expect(result.current.enabled).toBe(true);
    expect(result.current.fileCount).toBe(1);
    expect(result.current.hrefOf(TASK_ID, OUTPUT_ID)).toBe(
      `/files/p1/${TASK_ID}/${OUTPUT_ID}`,
    );
  });

  it("says when the list could not be read", async () => {
    vi.mocked(getIskurTaskOutputs).mockRejectedValue(new Error("x"));
    const { wrapper } = queryWrapper();
    const { result } = renderHook(() => useIskurTaskOutputs("p1"), { wrapper });
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.tasks).toEqual([]);
    expect(result.current.fileCount).toBe(0);
  });
});
