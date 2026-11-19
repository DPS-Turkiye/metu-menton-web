import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurWorkLogView } from "@/components/student/iskur/work-log-view";
import { IskurWeekDecision, IskurWeekStatus } from "@/interfaces/iskur-weeks";
import { ClientApiError } from "@/lib/client/api";
import {
  getIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/client/iskur-weeks";
import { createIskurWeek } from "@test/fixtures/iskur-weeks";
import { renderWithQueryClient } from "@test/test-utils";

let search = new URLSearchParams("view=daily&week=2026-11-16&day=2026-11-17");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/student/work-log",
  useSearchParams: () => search,
}));
vi.mock("@/lib/client/iskur-weeks", () => ({
  addIskurSupportEntry: vi.fn(),
  getIskurWeek: vi.fn(),
  objectToIskurWeek: vi.fn(),
  saveIskurWeekEntries: vi.fn(),
  submitIskurWeek: vi.fn(),
}));

describe("IskurWorkLogView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams("view=daily&week=2026-11-16&day=2026-11-17");
    vi.mocked(getIskurWeek).mockResolvedValue(createIskurWeek());
  });

  it("edits a day's lines and saves the draft", async () => {
    const user = userEvent.setup();
    vi.mocked(saveIskurWeekEntries).mockResolvedValue(createIskurWeek());
    renderWithQueryClient(<IskurWorkLogView />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Çalışma kaydı" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Günlük raporu aç →" }),
    ).toHaveAttribute("href", expect.stringContaining("day=2026-11-17"));
    expect(
      screen.getByDisplayValue("Sponsor listesi: 10 firma"),
    ).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Taslak olarak kaydet" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Ekle" }));
    const title = screen.getAllByRole("textbox", { name: "Başlık" }).at(-1);
    const minutes = screen
      .getAllByRole("textbox", { name: "Süre (dk)" })
      .at(-1);
    if (!title || !minutes) throw new Error("the new line is missing");
    await user.type(title, "Ekip toplantısı");
    await user.type(minutes, "60");
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(saveIskurWeekEntries).toHaveBeenCalledTimes(1));
  });

  it("shows the week's summary, keeps the mentoring contents out, and sends the week", async () => {
    const user = userEvent.setup();
    search = new URLSearchParams("view=weekly&week=2026-11-16");
    vi.mocked(submitIskurWeek).mockResolvedValue(
      createIskurWeek({
        status: IskurWeekStatus.Submitted,
        editable: false,
        canSubmit: false,
      }),
    );
    renderWithQueryClient(<IskurWorkLogView />);
    expect(
      await screen.findByRole("heading", { name: "Haftanın özeti" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Toplam kayıtlı süre: 5 sa 40 dk / 22 sa 30 dk"),
    ).toBeInTheDocument();
    const mentoring = screen.getByRole("region", {
      name: "Akran Mentörlüğü ayrıntısı",
    });
    expect(within(mentoring).getByText("1 / 2")).toBeInTheDocument();
    expect(
      within(mentoring).getByText(/görüşme içeriklerini görmez/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Haftalık kaydı ekip liderine gönder",
      }),
    );
    await waitFor(() =>
      expect(submitIskurWeek).toHaveBeenCalledWith("2026-11-16"),
    );
  });

  it("shows the leader's reason and the objection box after a revision", async () => {
    search = new URLSearchParams("view=weekly&week=2026-11-16");
    vi.mocked(getIskurWeek).mockResolvedValue(
      createIskurWeek({
        status: IskurWeekStatus.RevisionRequested,
        decision: {
          decision: IskurWeekDecision.Revision,
          reason: "Çıktı bağlantısı eksik",
          timeMatchesWork: true,
          effortDocumented: true,
          outputsSufficient: false,
          decidedAt: "2026-11-21T10:00:00Z",
          decidedBy: { userId: "leader-1", fullName: "Zeynep Kaya" },
        },
      }),
    );
    renderWithQueryClient(<IskurWorkLogView />);
    expect(
      await screen.findByText("Çıktı bağlantısı eksik"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Karara itiraz et" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Düzeltilmiş kaydı yeniden gönder" }),
    ).toBeInTheDocument();
  });

  it("says when the intern is not placed", async () => {
    vi.mocked(getIskurWeek).mockRejectedValue(new ClientApiError("x", 404));
    renderWithQueryClient(<IskurWorkLogView />);
    expect(
      await screen.findByText("Henüz bir ekibe yerleştirilmedin"),
    ).toBeInTheDocument();
  });
});
