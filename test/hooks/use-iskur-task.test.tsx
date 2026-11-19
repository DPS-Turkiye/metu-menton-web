import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurTask } from "@/hooks/use-iskur-task";
import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { ClientApiError } from "@/lib/client/api";
import {
  deleteIskurTask,
  getIskurTask,
  removeIskurTaskOutput,
  updateIskurTask,
  uploadIskurTaskOutput,
} from "@/lib/client/iskur-tasks";
import { useToastStore } from "@/stores/toast-store";
import { IskurCompleteBlock } from "@/types/iskur-tasks";
import {
  createIskurTask,
  createIskurTaskOutputFile,
  createIskurTeamTasks,
  OUTPUT_ID,
  TASK_ID,
} from "@test/fixtures/iskur-tasks";
import { queryWrapper } from "@test/fixtures/query-wrapper";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/client/iskur-tasks", () => ({
  deleteIskurTask: vi.fn(),
  getIskurTask: vi.fn(),
  iskurTaskOutputHref: (taskId: string, outputId: string) =>
    `/files/${taskId}/${outputId}`,
  removeIskurTaskOutput: vi.fn(),
  updateIskurTask: vi.fn(),
  uploadIskurTaskOutput: vi.fn(),
}));

const pdf = (name = "rapor.pdf", size = 8) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf" });
const lastToast = () => useToastStore.getState().toasts.at(-1)?.message;

async function renderLoaded() {
  const { queryClient, wrapper } = queryWrapper();
  const view = renderHook(() => useIskurTask(TASK_ID), { wrapper });
  await waitFor(() => expect(view.result.current.task).not.toBeNull());
  return { ...view, queryClient };
}

describe("useIskurTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({ needsOutput: true }),
    );
  });

  it("blocks completing until the time and an output are there, then completes", async () => {
    vi.mocked(updateIskurTask).mockResolvedValue(
      createIskurTask({ status: IskurTaskStatus.Done, actualMinutes: 105 }),
    );
    const { result } = await renderLoaded();
    expect(result.current.completeBlock).toBe(IskurCompleteBlock.ActualMissing);
    expect(result.current.canComplete).toBe(false);

    act(() => result.current.setActualMinutes("105"));
    expect(result.current.completeBlock).toBe(IskurCompleteBlock.OutputMissing);
    act(() => result.current.setOutputLink("http://x.test"));
    expect(result.current.linkInvalid).toBe(true);
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setOutputLink("https://x.test/afis.pdf"));
    act(() => result.current.setOutputNote("İki öneri"));
    expect(result.current.canComplete).toBe(true);

    act(() => result.current.complete());
    await waitFor(() =>
      expect(result.current.task?.status).toBe(IskurTaskStatus.Done),
    );
    expect(updateIskurTask).toHaveBeenCalledWith(TASK_ID, {
      status: IskurTaskStatus.Done,
      actualMinutes: 105,
      outputLink: "https://x.test/afis.pdf",
      outputNote: "İki öneri",
      handoverReason: null,
    });
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
      "Görev tamamlandı.",
    );
  });

  it("saves the fields without moving the task, and hands it over with a reason", async () => {
    vi.mocked(updateIskurTask).mockResolvedValue(createIskurTask());
    const { result } = await renderLoaded();
    expect(result.current.canSave).toBe(false);
    // A time that would wipe the stored one, or that the backend refuses, cannot be saved.
    act(() => result.current.setActualMinutes("abc"));
    expect(result.current.minutesInvalid).toBe(true);
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setActualMinutes("2000"));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setActualMinutes("30"));
    expect(result.current.canSave).toBe(true);
    act(() => result.current.save());
    await waitFor(() => expect(updateIskurTask).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateIskurTask).mock.calls[0]?.[1].status).toBeNull();

    act(() => result.current.startHandover());
    expect(result.current.handingOver).toBe(true);
    expect(result.current.canHandOver).toBe(false);
    act(() => result.current.setHandoverReason("Veri bekleniyor"));
    expect(result.current.canHandOver).toBe(true);
    act(() => result.current.handOver());
    await waitFor(() => expect(updateIskurTask).toHaveBeenCalledTimes(2));
    expect(vi.mocked(updateIskurTask).mock.calls[1]?.[1]).toMatchObject({
      status: IskurTaskStatus.HandedOver,
      handoverReason: "Veri bekleniyor",
    });
    act(() => result.current.cancelHandover());
    expect(result.current.handingOver).toBe(false);
  });

  it("reopens, and shows the refusal when a save is turned down", async () => {
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({
        status: IskurTaskStatus.Done,
        canWork: false,
        canManage: true,
      }),
    );
    vi.mocked(updateIskurTask).mockRejectedValue(
      new ClientApiError(
        "Görev bu arada değişti; sayfayı yenileyip yeniden dene.",
        409,
      ),
    );
    const { result } = await renderLoaded();
    expect(result.current.canManage).toBe(true);
    act(() => result.current.reopen());
    await waitFor(() =>
      expect(useToastStore.getState().toasts.at(-1)?.message).toBe(
        "Görev bu arada değişti; sayfayı yenileyip yeniden dene.",
      ),
    );
    expect(vi.mocked(updateIskurTask).mock.calls[0]?.[1].status).toBe(
      IskurTaskStatus.Open,
    );
  });

  it("asks before deleting, then goes back to the team", async () => {
    vi.mocked(deleteIskurTask).mockResolvedValue(createIskurTeamTasks());
    const { result } = await renderLoaded();
    act(() => result.current.askDelete());
    expect(result.current.confirmingDelete).toBe(true);
    act(() => result.current.cancelDelete());
    expect(result.current.confirmingDelete).toBe(false);
    act(() => result.current.remove());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/student/team"));
    expect(deleteIskurTask).toHaveBeenCalledWith(TASK_ID);
  });

  it("tells a hidden task from a failed load", async () => {
    vi.mocked(getIskurTask).mockRejectedValue(new ClientApiError("x", 404));
    const { wrapper } = queryWrapper();
    const view = renderHook(() => useIskurTask(TASK_ID), { wrapper });
    await waitFor(() => expect(view.result.current.notFound).toBe(true));
    expect(view.result.current.form).toBeNull();
  });

  it("hands in a file, which then counts as the output, and keeps what is typed", async () => {
    const withFile = createIskurTask({
      needsOutput: true,
      outputFiles: [createIskurTaskOutputFile()],
    });
    vi.mocked(uploadIskurTaskOutput).mockResolvedValue(withFile);
    const { result } = await renderLoaded();
    act(() => result.current.setActualMinutes("60"));
    expect(result.current.completeBlock).toBe(IskurCompleteBlock.OutputMissing);
    expect(result.current.canAttach).toBe(true);

    const file = pdf();
    act(() => result.current.attachFile(file));
    await waitFor(() => expect(result.current.outputFiles).toHaveLength(1));
    expect(uploadIskurTaskOutput).toHaveBeenCalledWith(TASK_ID, file);
    expect(lastToast()).toBe("Dosya eklendi.");
    expect(result.current.form?.actualMinutes).toBe("60");
    expect(result.current.completeBlock).toBeNull();
    expect(result.current.outputHref(OUTPUT_ID)).toBe(
      `/files/${TASK_ID}/${OUTPUT_ID}`,
    );
  });

  it("refuses a file it can tell is wrong before sending it", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.attachFile(pdf("betik.js")));
    expect(lastToast()).toBe(
      "PDF, PNG, JPG, DOCX, XLSX, PPTX ya da ZIP dosyası seç.",
    );
    act(() => result.current.attachFile(pdf("rapor.pdf", 0)));
    expect(lastToast()).toBe("Dosya boş.");
    act(() =>
      result.current.attachFile(pdf("rapor.pdf", 10 * 1024 * 1024 + 1)),
    );
    expect(lastToast()).toBe("Dosya en fazla 10 MB olabilir.");
    expect(uploadIskurTaskOutput).not.toHaveBeenCalled();
  });

  it("sends nothing when the task takes no more files", async () => {
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({ canAttach: false, outputFilesEnabled: false }),
    );
    const { result } = await renderLoaded();
    expect(result.current.canAttach).toBe(false);
    expect(result.current.outputFilesEnabled).toBe(false);
    act(() => result.current.attachFile(pdf()));
    expect(uploadIskurTaskOutput).not.toHaveBeenCalled();
  });

  it("shows the server's reason when an upload or a removal is refused", async () => {
    vi.mocked(uploadIskurTaskOutput).mockRejectedValue(
      new ClientApiError("Dosya yükleme şu an kapalı.", 503),
    );
    // Not an Error: the hook falls back to its own text.
    vi.mocked(removeIskurTaskOutput).mockRejectedValue("down");
    const { result } = await renderLoaded();
    act(() => result.current.attachFile(pdf()));
    await waitFor(() =>
      expect(lastToast()).toBe("Dosya yükleme şu an kapalı."),
    );
    await waitFor(() => expect(result.current.busy).toBe(false));
    act(() => result.current.removeFile(OUTPUT_ID));
    await waitFor(() => expect(lastToast()).toBe("Dosya kaldırılamadı."));
  });

  it("takes a file back", async () => {
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({ outputFiles: [createIskurTaskOutputFile()] }),
    );
    vi.mocked(removeIskurTaskOutput).mockResolvedValue(createIskurTask());
    const { result } = await renderLoaded();
    expect(result.current.outputFiles).toHaveLength(1);
    act(() => result.current.removeFile(OUTPUT_ID));
    await waitFor(() => expect(result.current.outputFiles).toHaveLength(0));
    expect(removeIskurTaskOutput).toHaveBeenCalledWith(TASK_ID, OUTPUT_ID);
    expect(lastToast()).toBe("Dosya kaldırıldı.");
  });
});
