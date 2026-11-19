import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTaskDetailView } from "@/components/student/iskur-task-detail-view";
import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { ClientApiError } from "@/lib/client/api";
import {
  deleteIskurTask,
  getIskurTask,
  updateIskurTask,
} from "@/lib/client/iskur-tasks";
import {
  createIskurTask,
  createIskurTeamTasks,
  TASK_ID,
} from "@test/fixtures/iskur-tasks";
import { renderWithQueryClient } from "@test/test-utils";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/client/iskur-tasks", () => ({
  deleteIskurTask: vi.fn(),
  getIskurTask: vi.fn(),
  updateIskurTask: vi.fn(),
}));

describe("IskurTaskDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the assignee record the time and output, then complete", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({ needsOutput: true, description: "A3 afiş" }),
    );
    vi.mocked(updateIskurTask).mockResolvedValue(
      createIskurTask({ status: IskurTaskStatus.Done, actualMinutes: 90 }),
    );
    renderWithQueryClient(<IskurTaskDetailView taskId={TASK_ID} />);

    expect(
      await screen.findByRole("heading", { name: "Sponsor listesi: 10 firma" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A3 afiş")).toBeInTheDocument();
    expect(screen.getByText("Teslim edilecek çıktı var")).toBeInTheDocument();
    const complete = screen.getByRole("button", { name: "Görevi tamamla" });
    expect(complete).toBeDisabled();
    expect(
      screen.getByText("Tamamlamak için gerçekleşen süreyi gir."),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /Gerçekleşen süre/ }),
      "90",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Çıktı bağlantısı/ }),
      "http://x",
    );
    expect(
      screen.getByText("Bağlantı https:// ile başlamalı.", {
        selector: "span",
      }),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: /Çıktı bağlantısı/ }));
    await user.type(
      screen.getByRole("textbox", { name: "Çıktı notu" }),
      "Teslim edildi",
    );
    await user.click(complete);

    await waitFor(() => expect(updateIskurTask).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateIskurTask).mock.calls[0]?.[1]).toEqual({
      status: IskurTaskStatus.Done,
      actualMinutes: 90,
      outputLink: null,
      outputNote: "Teslim edildi",
      handoverReason: null,
    });
    expect(
      await screen.findByText(
        "Tamamlanan görev değiştirilemez; değiştirmek için önce yeniden aç.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yeniden aç" }),
    ).toBeInTheDocument();
  });

  it("hands a task over to next week with a reason", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTask).mockResolvedValue(createIskurTask());
    vi.mocked(updateIskurTask).mockResolvedValue(
      createIskurTask({
        status: IskurTaskStatus.HandedOver,
        handoverReason: "Veri bekleniyor",
      }),
    );
    renderWithQueryClient(<IskurTaskDetailView taskId={TASK_ID} />);
    await user.click(
      await screen.findByRole("button", { name: "Sonraki haftaya devret" }),
    );
    const confirm = screen.getByRole("button", { name: "Devret" });
    expect(confirm).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Gerekçe" }),
      "Veri bekleniyor",
    );
    await user.click(confirm);
    expect(
      await screen.findByText(
        "Sonraki haftaya devredildi · gerekçe: Veri bekleniyor",
      ),
    ).toBeInTheDocument();
  });

  it("shows a leader the recorded output read-only, with a safe link, and deletes after asking", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({
        canWork: false,
        canManage: true,
        status: IskurTaskStatus.Done,
        actualMinutes: 105,
        outputLink: "https://drive.example.test/afis.pdf",
      }),
    );
    vi.mocked(deleteIskurTask).mockResolvedValue(createIskurTeamTasks());
    renderWithQueryClient(<IskurTaskDetailView taskId={TASK_ID} />);

    const link = await screen.findByRole("link", {
      name: "https://drive.example.test/afis.pdf",
    });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("1 sa 45 dk")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Görevi tamamla" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Görevi sil" }));
    await user.click(screen.getByRole("button", { name: "Evet, sil" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/student/team"));
  });

  it("never turns a stored non-https output into a link", async () => {
    vi.mocked(getIskurTask).mockResolvedValue(
      createIskurTask({
        canWork: false,
        canManage: true,
        outputLink: "javascript:alert(1)",
      }),
    );
    renderWithQueryClient(<IskurTaskDetailView taskId={TASK_ID} />);
    expect(await screen.findByText("javascript:alert(1)")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "javascript:alert(1)" }),
    ).not.toBeInTheDocument();
  });

  it("says a hidden task was not found", async () => {
    vi.mocked(getIskurTask).mockRejectedValue(new ClientApiError("x", 404));
    renderWithQueryClient(<IskurTaskDetailView taskId={TASK_ID} />);
    expect(
      await screen.findByRole("heading", { name: "Görev bulunamadı." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ekibime dön" })).toHaveAttribute(
      "href",
      "/student/team",
    );
  });
});
