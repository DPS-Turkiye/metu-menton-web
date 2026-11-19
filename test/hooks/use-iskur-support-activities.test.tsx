import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurSupportActivities } from "@/hooks/use-iskur-support-activities";
import { ClientApiError } from "@/lib/client/api";
import {
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  getIskurSupportActivities,
  updateIskurSupportActivity,
} from "@/lib/client/iskur-support-activities";
import { useToastStore } from "@/stores/toast-store";
import {
  createIskurSupportActivities,
  createIskurSupportActivity as activityFixture,
} from "@test/fixtures/iskur-tasks";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-support-activities", () => ({
  createDefaultIskurSupportActivities: vi.fn(),
  createIskurSupportActivity: vi.fn(),
  deleteIskurSupportActivity: vi.fn(),
  getIskurSupportActivities: vi.fn(),
  updateIskurSupportActivity: vi.fn(),
}));

const pool = createIskurSupportActivities();

async function renderLoaded() {
  const { queryClient, wrapper } = queryWrapper();
  const view = renderHook(() => useIskurSupportActivities("p1"), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return { ...view, queryClient };
}

describe("useIskurSupportActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurSupportActivities).mockResolvedValue(pool);
    for (const call of [
      createDefaultIskurSupportActivities,
      createIskurSupportActivity,
      deleteIskurSupportActivity,
      updateIskurSupportActivity,
    ]) {
      vi.mocked(call).mockResolvedValue(pool);
    }
  });

  it("adds a new activity and closes the form", async () => {
    const { result } = await renderLoaded();
    expect(result.current.activities).toHaveLength(1);
    act(() => result.current.startNew());
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setTitle(" Vaka çalışması "));
    act(() => result.current.setDescription("Salı"));
    act(() => result.current.setActive(false));
    act(() => result.current.save());
    await waitFor(() => expect(result.current.form).toBeNull());
    expect(createIskurSupportActivity).toHaveBeenCalledWith("p1", {
      title: "Vaka çalışması",
      description: "Salı",
      active: false,
    });
  });

  it("edits, retires, seeds and deletes", async () => {
    const { result } = await renderLoaded();
    const activity = activityFixture();
    act(() => result.current.startEdit(activity));
    act(() => result.current.setTitle("Açık ofis (Salı)"));
    act(() => result.current.save());
    await waitFor(() => expect(result.current.form).toBeNull());
    expect(updateIskurSupportActivity).toHaveBeenCalledWith("p1", "act-1", {
      title: "Açık ofis (Salı)",
      description: null,
      active: true,
    });

    act(() => result.current.toggleActive(activity));
    await waitFor(() => expect(updateIskurSupportActivity).toHaveBeenCalledTimes(2));
    expect(vi.mocked(updateIskurSupportActivity).mock.calls[1]?.[2].active).toBe(false);

    act(() => result.current.createDefaults());
    await waitFor(() => expect(createDefaultIskurSupportActivities).toHaveBeenCalledWith("p1"));
    act(() => result.current.remove(activity));
    await waitFor(() => expect(deleteIskurSupportActivity).toHaveBeenCalledWith("p1", "act-1"));
    act(() => result.current.cancel());
    expect(result.current.form).toBeNull();
  });

  it("shows a refusal", async () => {
    vi.mocked(createDefaultIskurSupportActivities).mockRejectedValue(
      new ClientApiError("Havuz zaten dolu.", 409),
    );
    const { result } = await renderLoaded();
    act(() => result.current.createDefaults());
    await waitFor(() =>
      expect(useToastStore.getState().toasts.at(-1)?.message).toBe("Havuz zaten dolu."),
    );
  });
});
