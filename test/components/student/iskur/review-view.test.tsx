import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurReviewView } from "@/components/student/iskur/review-view";
import { IskurWeekDecision, IskurWeekStatus } from "@/interfaces/iskur-weeks";
import { ClientApiError } from "@/lib/client/api";
import {
  decideIskurLeaderWeek,
  getIskurLeaderWeek,
} from "@/lib/client/iskur-weeks";
import { createIskurLeaderWeek, WEEK_ID } from "@test/fixtures/iskur-weeks";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-weeks", () => ({
  decideIskurFallbackWeek: vi.fn(),
  decideIskurLeaderWeek: vi.fn(),
  getIskurFallbackWeek: vi.fn(),
  getIskurLeaderWeek: vi.fn(),
}));

describe("IskurReviewView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurLeaderWeek).mockResolvedValue(createIskurLeaderWeek());
  });

  it("shows team work in full and mentoring as numbers with the content hidden", async () => {
    renderWithQueryClient(
      <IskurReviewView reviewer={{ programId: null }} weekId={WEEK_ID} />,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: /Mert Demir/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sponsor listesi: 10 firma")).toBeInTheDocument();
    expect(screen.getByText("İlk 6 firma")).toBeInTheDocument();
    const mentoring = screen.getByRole("region", { name: "Akran Mentörlüğü" });
    expect(within(mentoring).getByText("İçerik gizli")).toBeInTheDocument();
    expect(
      within(mentoring).getByText("2 görüşme · 1/2 rapor gönderildi"),
    ).toBeInTheDocument();
    expect(
      within(mentoring).getByText("Destek faaliyeti: Açık ofis saati"),
    ).toBeInTheDocument();
    expect(
      within(mentoring).getByText(/Mentee adları, görüşme notları/),
    ).toBeInTheDocument();
    // Ayşe has not started; Mert's own row is not repeated.
    const queue = screen.getByRole("region", { name: "Sıradaki kayıtlar" });
    expect(within(queue).getByText("Ayşe Yıldız")).toBeInTheDocument();
    expect(within(queue).queryByText("Mert Demir")).not.toBeInTheDocument();
  });

  it("asks for a reason before a rejection, then sends the decision", async () => {
    const user = userEvent.setup();
    vi.mocked(decideIskurLeaderWeek).mockResolvedValue(
      createIskurLeaderWeek({
        status: IskurWeekStatus.Rejected,
        canDecide: false,
        decision: {
          decision: IskurWeekDecision.Reject,
          reason: "Süre işle tutarsız",
          timeMatchesWork: false,
          effortDocumented: false,
          outputsSufficient: false,
          decidedAt: "2026-11-21T10:00:00Z",
          decidedBy: null,
        },
      }),
    );
    renderWithQueryClient(
      <IskurReviewView reviewer={{ programId: null }} weekId={WEEK_ID} />,
    );
    const send = await screen.findByRole("button", { name: "Kararı gönder" });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reddet" }));
    expect(send).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Gerekçe" }),
      "Süre işle tutarsız",
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Raporlar ve çıktılar yeterli" }),
    );
    await user.click(send);
    await waitFor(() => expect(decideIskurLeaderWeek).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Süre işle tutarsız")).toBeInTheDocument();
  });

  it("says a week the caller does not review was not found", async () => {
    vi.mocked(getIskurLeaderWeek).mockRejectedValue(
      new ClientApiError("x", 404),
    );
    renderWithQueryClient(
      <IskurReviewView reviewer={{ programId: null }} weekId={WEEK_ID} />,
    );
    expect(
      await screen.findByText("Haftalık kayıt bulunamadı."),
    ).toBeInTheDocument();
  });
});
