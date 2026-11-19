import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamView } from "@/components/student/iskur-team-view";
import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { ClientApiError } from "@/lib/client/api";
import { createIskurTask, getIskurTeamTasks } from "@/lib/client/iskur-tasks";
import {
  createIskurTask as taskFixture,
  createIskurTeamMember,
  createIskurTeamTasks,
  MEMBER_ID,
} from "@test/fixtures/iskur-tasks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-tasks", () => ({
  createIskurTask: vi.fn(),
  getIskurTeamTasks: vi.fn(),
}));

describe("IskurTeamView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurTeamTasks).mockResolvedValue(createIskurTeamTasks());
  });

  it("shows a leader the team's tasks by person and the Görev ata form", async () => {
    const user = userEvent.setup();
    vi.mocked(createIskurTask).mockResolvedValue(createIskurTeamTasks());
    renderWithQueryClient(<IskurTeamView />);

    expect(
      await screen.findByRole("heading", { name: "Medya ve Kreatif Üretim" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ekip lideri görünümü")).toBeInTheDocument();
    expect(screen.getByText("3 gün · Ekip Çalışmaları hedefi 16 sa 30 dk")).toBeInTheDocument();
    expect(screen.getByText("12 sa planlı / 16 sa 30 dk")).toBeInTheDocument();
    expect(screen.getByText("Görev günleri henüz belli değil")).toBeInTheDocument();
    const task = screen.getByRole("link", { name: /Sponsor listesi: 10 firma/ });
    expect(task).toHaveAttribute(
      "href",
      "/student/team/tasks/00000000-0000-4000-8000-0000000000b1",
    );

    const form = screen.getByRole("region", { name: "Görev ata" });
    expect(within(form).getByRole("button", { name: "Görevi ata" })).toBeDisabled();
    await user.type(within(form).getByRole("textbox", { name: "Görev" }), "Afiş");
    await user.click(within(form).getByRole("button", { name: "Etkinlik" }));
    await user.click(within(form).getByRole("button", { name: "Süreyi 30 dakika artır" }));
    expect(within(form).getByText("Mert Demir: 12 sa → 14 sa 30 dk / 16 sa 30 dk")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Görevi ata" }));

    await waitFor(() => expect(createIskurTask).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createIskurTask).mock.calls[0]?.[0]).toMatchObject({
      assigneeId: MEMBER_ID,
      title: "Afiş",
      estimatedMinutes: 150,
    });
  });

  it("warns when the new task goes over the assignee's target", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTeamTasks).mockResolvedValue(
      createIskurTeamTasks({
        members: [createIskurTeamMember({ plannedMinutes: 900 })],
      }),
    );
    renderWithQueryClient(<IskurTeamView />);
    const form = await screen.findByRole("region", { name: "Görev ata" });
    await user.click(within(form).getByRole("button", { name: "Süreyi 30 dakika artır" }));
    expect(within(form).getByRole("status")).toHaveTextContent("hedef aşılıyor");
  });

  it("shows a member only their own tasks, without the form, and the roster", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurTeamTasks).mockResolvedValue(
      createIskurTeamTasks({
        viewerRole: IskurTeamRole.Member,
        canAssign: false,
        members: [
          createIskurTeamMember({
            tasks: [
              taskFixture({ id: "done", title: "Fotoğraf arşivi", status: IskurTaskStatus.Done }),
              taskFixture({ id: "over", title: "Web içerik", status: IskurTaskStatus.HandedOver }),
            ],
          }),
        ],
      }),
    );
    renderWithQueryClient(<IskurTeamView />);
    expect(await screen.findByText("Bu haftaki görevlerin")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Görev ata" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ekip lideri görünümü")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Fotoğraf arşivi|Web içerik/ });
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Web içerik"),
      expect.stringContaining("Fotoğraf arşivi"),
    ]);

    await user.click(screen.getByRole("tab", { name: /Üyeler/ }));
    const roster = screen.getByRole("region", { name: "Ekipteki kişiler" });
    expect(within(roster).getAllByText("Ekip lideri")).toHaveLength(2);
    expect(within(roster).getByText("Mert Demir")).toBeInTheDocument();
  });

  it("says when the intern is not placed yet, and offers a retry on a failure", async () => {
    vi.mocked(getIskurTeamTasks).mockRejectedValue(new ClientApiError("x", 404));
    renderWithQueryClient(<IskurTeamView />);
    expect(
      await screen.findByRole("heading", { name: "Henüz bir ekibe yerleştirilmedin" }),
    ).toBeInTheDocument();
  });

  it("offers a retry when the team could not load", async () => {
    vi.mocked(getIskurTeamTasks).mockRejectedValue(new ClientApiError("x", 500));
    renderWithQueryClient(<IskurTeamView />);
    expect(
      await screen.findByText("Ekip bilgileri yüklenemedi.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeInTheDocument();
  });
});
