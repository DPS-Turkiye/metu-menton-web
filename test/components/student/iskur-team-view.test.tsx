import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurTeamView } from "@/components/student/iskur-team-view";
import { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { ClientApiError } from "@/lib/client/api";
import {
  createIskurTask,
  deleteIskurTask,
  editIskurTask,
  getIskurTeamTasks,
} from "@/lib/client/iskur-tasks";
import {
  createIskurTeamMember,
  createIskurTeamTasks,
  MEMBER_ID,
  createIskurTask as taskFixture,
} from "@test/fixtures/iskur-tasks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-weeks", () => ({
  getIskurLeaderQueue: vi.fn().mockResolvedValue({
    weekStart: "2026-11-16",
    people: [],
  }),
  getIskurWeek: vi.fn().mockRejectedValue(new Error("not placed")),
}));
vi.mock("@/lib/client/iskur-tasks", () => ({
  createIskurTask: vi.fn(),
  deleteIskurTask: vi.fn(),
  editIskurTask: vi.fn(),
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
    expect(screen.getByText("12 sa planlı / 16 sa 30 dk")).toBeInTheDocument();
    expect(
      screen.getByText(/^Görev günleri henüz belli değil/),
    ).toBeInTheDocument();
    const task = screen.getByRole("link", {
      name: /Sponsor listesi: 10 firma/,
    });
    expect(task).toHaveAttribute(
      "href",
      "/student/team/tasks/00000000-0000-4000-8000-0000000000b1",
    );

    const form = screen.getByRole("region", { name: /^Görev ata/ });
    expect(
      within(form).getByRole("button", { name: "Görevi ata" }),
    ).toBeDisabled();
    await user.type(
      within(form).getByRole("textbox", { name: "Görev" }),
      "Afiş",
    );
    await user.click(within(form).getByRole("button", { name: "Etkinlik" }));
    await user.click(
      within(form).getByRole("button", { name: "Süreyi 30 dakika artır" }),
    );
    expect(
      within(form).getByText("Mert Demir: 12 sa → 14 sa 30 dk / 16 sa 30 dk"),
    ).toBeInTheDocument();
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
    const form = await screen.findByRole("region", { name: /^Görev ata/ });
    await user.click(
      within(form).getByRole("button", { name: "Süreyi 30 dakika artır" }),
    );
    expect(within(form).getByText(/hedef aşılıyor/)).toBeInTheDocument();
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
              taskFixture({
                id: "done",
                title: "Fotoğraf arşivi",
                status: IskurTaskStatus.Done,
              }),
              taskFixture({
                id: "over",
                title: "Web içerik",
                status: IskurTaskStatus.HandedOver,
              }),
            ],
          }),
        ],
      }),
    );
    renderWithQueryClient(<IskurTeamView />);
    expect(
      await screen.findByText("Bu haftaki görevlerin"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /^Görev ata/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Ekip lideri görünümü")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link", {
      name: /Fotoğraf arşivi|Web içerik/,
    });
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Web içerik"),
      expect.stringContaining("Fotoğraf arşivi"),
    ]);

    await user.click(screen.getByRole("tab", { name: /Üyeler/ }));
    const roster = screen.getByRole("region", { name: "Ekipteki kişiler" });
    expect(within(roster).getAllByText("Ekip lideri")).toHaveLength(2);
    expect(within(roster).getByText("Mert Demir")).toBeInTheDocument();
  });

  describe("a leader's task actions", () => {
    const MERT = createIskurTeamMember();
    const OTHER_ID = "00000000-0000-4000-8000-0000000000a9";
    const team = createIskurTeamTasks({
      members: [
        createIskurTeamMember({
          tasks: [taskFixture({ canManage: true })],
        }),
        createIskurTeamMember({
          userId: OTHER_ID,
          fullName: "Aslı Yıldız",
          tasks: [],
        }),
      ],
    });

    async function openMenu(action: string) {
      const user = userEvent.setup();
      vi.mocked(getIskurTeamTasks).mockResolvedValue(team);
      renderWithQueryClient(<IskurTeamView />);
      await user.click(
        await screen.findByRole("button", {
          name: "Sponsor listesi: 10 firma: diğer işlemler",
        }),
      );
      await user.click(screen.getByRole("button", { name: action }));
      return user;
    }

    it("edits a task in the form and saves only a change", async () => {
      vi.mocked(editIskurTask).mockResolvedValue(team);
      const user = await openMenu("Düzenle");

      const form = screen.getByRole("region", {
        name: `Görevi düzenle · ${MERT.fullName}`,
      });
      const save = within(form).getByRole("button", { name: "Kaydet" });
      expect(save).toBeDisabled();
      const title = within(form).getByRole("textbox", { name: "Görev" });
      expect(title).toHaveValue("Sponsor listesi: 10 firma");
      await user.clear(title);
      await user.type(title, "Sponsor listesi: 15 firma");
      await user.click(save);

      await waitFor(() => expect(editIskurTask).toHaveBeenCalledTimes(1));
      expect(vi.mocked(editIskurTask).mock.calls[0]).toMatchObject([
        taskFixture().id,
        { title: "Sponsor listesi: 15 firma", assigneeId: MEMBER_ID },
      ]);
      expect(createIskurTask).not.toHaveBeenCalled();
      expect(await screen.findByText("Görev güncellendi.")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Görevi ata" }),
      ).toBeInTheDocument();
    });

    it("gives a task to another member", async () => {
      vi.mocked(editIskurTask).mockResolvedValue(team);
      const user = await openMenu("Başka üyeye ata");

      const form = screen.getByRole("region", { name: "Başka üyeye ata" });
      await user.click(
        within(form).getByRole("button", { name: "Aslı Yıldız" }),
      );
      await user.click(within(form).getByRole("button", { name: "Kaydet" }));
      await waitFor(() =>
        expect(vi.mocked(editIskurTask).mock.calls[0]?.[1]).toMatchObject({
          assigneeId: OTHER_ID,
        }),
      );
    });

    it("asks before cancelling a task", async () => {
      vi.mocked(deleteIskurTask).mockResolvedValue(team);
      const user = await openMenu("İptal et");

      const dialog = screen.getByRole("dialog", {
        name: "Görev iptal edilsin mi?",
      });
      await user.click(within(dialog).getByRole("button", { name: "Vazgeç" }));
      expect(deleteIskurTask).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole("button", {
          name: "Sponsor listesi: 10 firma: diğer işlemler",
        }),
      );
      await user.click(screen.getByRole("button", { name: "İptal et" }));
      await user.click(screen.getByRole("button", { name: "Görevi iptal et" }));
      await waitFor(() =>
        expect(vi.mocked(deleteIskurTask).mock.calls[0]?.[0]).toBe(
          taskFixture().id,
        ),
      );
      expect(await screen.findByText("Görev iptal edildi.")).toBeVisible();
    });

    it("offers no edit on a done task, which is locked", async () => {
      vi.mocked(getIskurTeamTasks).mockResolvedValue(
        createIskurTeamTasks({
          members: [
            createIskurTeamMember({
              tasks: [
                taskFixture({
                  canManage: true,
                  status: IskurTaskStatus.Done,
                }),
              ],
            }),
          ],
        }),
      );
      const user = userEvent.setup();
      renderWithQueryClient(<IskurTeamView />);
      await user.click(
        await screen.findByRole("button", { name: /diğer işlemler/ }),
      );
      expect(screen.queryByRole("button", { name: "Düzenle" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "İptal et" }),
      ).toBeInTheDocument();
    });

    it("refuses a second contribution project before it is sent", async () => {
      vi.mocked(getIskurTeamTasks).mockResolvedValue(
        createIskurTeamTasks({
          members: [
            createIskurTeamMember({
              tasks: [
                taskFixture({
                  title: "Staj rehberi",
                  kind: IskurTaskKind.ContributionProject,
                }),
              ],
            }),
          ],
        }),
      );
      const user = userEvent.setup();
      renderWithQueryClient(<IskurTeamView />);
      const form = await screen.findByRole("region", { name: /^Görev ata/ });
      expect(
        within(form).getByText(/zaten var \(Staj rehberi\)/),
      ).toBeVisible();
      await user.type(
        within(form).getByRole("textbox", { name: "Görev" }),
        "İkinci proje",
      );
      const submit = within(form).getByRole("button", { name: "Görevi ata" });
      expect(submit).toBeEnabled();
      await user.click(
        within(form).getByRole("button", { name: "Katkı projesi" }),
      );
      expect(submit).toBeDisabled();
    });

    it("lists another member's tasks, and starts a task for them from their row", async () => {
      vi.mocked(getIskurTeamTasks).mockResolvedValue(team);
      const user = userEvent.setup();
      renderWithQueryClient(<IskurTeamView />);
      await user.click(
        await screen.findByRole("button", {
          name: "Aslı Yıldız görevlerini göster",
        }),
      );
      const shown = screen.getByRole("region", {
        name: "Aslı Yıldız · bu haftaki görevler",
      });
      expect(within(shown).getByText("Bu hafta için görev yok.")).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: /^Görev ata · Aslı Yıldız/ }),
      );
      expect(
        screen.getByRole("region", { name: "Görev ata · Aslı Yıldız" }),
      ).toBeVisible();
    });
  });

  it("says when the intern is not placed yet, and offers a retry on a failure", async () => {
    vi.mocked(getIskurTeamTasks).mockRejectedValue(
      new ClientApiError("x", 404),
    );
    renderWithQueryClient(<IskurTeamView />);
    expect(
      await screen.findByRole("heading", {
        name: "Henüz bir ekibe yerleştirilmedin",
      }),
    ).toBeInTheDocument();
  });

  it("offers a retry when the team could not load", async () => {
    vi.mocked(getIskurTeamTasks).mockRejectedValue(
      new ClientApiError("x", 500),
    );
    renderWithQueryClient(<IskurTeamView />);
    expect(
      await screen.findByText(
        "Ekip bilgileri yüklenemedi.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yeniden dene" }),
    ).toBeInTheDocument();
  });
});
