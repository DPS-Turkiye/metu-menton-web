import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTaskOutputsCard } from "@/components/coordinator/iskur-task-outputs-card";
import { getIskurTaskOutputs } from "@/lib/client/iskur-tasks";
import {
  createIskurTaskOutputs,
  OUTPUT_ID,
  TASK_ID,
} from "@test/fixtures/iskur-tasks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-tasks", () => ({
  getIskurTaskOutputs: vi.fn(),
  iskurProgramTaskOutputHref: (
    programId: string,
    taskId: string,
    outputId: string,
  ) => `/files/${programId}/${taskId}/${outputId}`,
}));

describe("IskurTaskOutputsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists each task's files with a download link", async () => {
    vi.mocked(getIskurTaskOutputs).mockResolvedValue(createIskurTaskOutputs());
    renderWithQueryClient(<IskurTaskOutputsCard programId="p1" />);

    expect(
      await screen.findByRole("heading", { name: "Görev çıktıları" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 dosya")).toBeInTheDocument();
    expect(screen.getByText("Sponsor listesi: 10 firma")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Medya ve Kreatif Üretim · Mert Demir · son tarih 20 Kasım",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "afis-oneri.pdf dosyasını indir",
    });
    expect(link).toHaveAttribute("href", `/files/p1/${TASK_ID}/${OUTPUT_ID}`);
    expect(link).toHaveAttribute("download");
    expect(screen.queryByText(/şu an kapalı/)).not.toBeInTheDocument();
  });

  it("says when nothing was handed in and when file storage is off", async () => {
    vi.mocked(getIskurTaskOutputs).mockResolvedValue(
      createIskurTaskOutputs({ enabled: false, tasks: [] }),
    );
    renderWithQueryClient(<IskurTaskOutputsCard programId="p1" />);

    expect(
      await screen.findByText("Henüz teslim edilen dosya yok."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dosya yükleme şu an kapalı/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("says when the list could not be loaded", async () => {
    vi.mocked(getIskurTaskOutputs).mockRejectedValue(new Error("x"));
    renderWithQueryClient(<IskurTaskOutputsCard programId="p1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Görev çıktıları yüklenemedi.",
    );
  });
});
