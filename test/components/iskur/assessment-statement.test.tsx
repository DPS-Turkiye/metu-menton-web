import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurAssessmentStatement } from "@/components/iskur/assessment-statement";
import {
  IskurAssessmentStatus,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import { ClientApiError } from "@/lib/client/api";
import {
  getMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/client/iskur-assessment-statement";
import { iskurAssessmentStatement } from "@test/fixtures/iskur-assessment-statement";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-assessment-statement", () => ({
  getMyIskurAssessmentStatement: vi.fn(),
  sendIskurAssessmentStatement: vi.fn(),
}));

const PROGRAM = "p1";

describe("IskurAssessmentStatement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets an intern without the badge pick a reason and explain", async () => {
    const user = userEvent.setup();
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: true,
      latest: null,
    });
    vi.mocked(sendIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: false,
      latest: iskurAssessmentStatement(),
    });
    renderWithQueryClient(<IskurAssessmentStatement />);

    await user.click(
      await screen.findByRole("button", { name: "Koordinatörüne açıkla" }),
    );
    const send = screen.getByRole("button", { name: "Gönder" });
    await user.type(screen.getByLabelText("Kısaca anlat"), "  Geçemedim.  ");
    expect(send).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Neden?"), "FAILED");
    await user.click(send);

    expect(sendIskurAssessmentStatement).toHaveBeenCalledWith(
      "FAILED",
      "Geçemedim.",
    );
    expect(
      await screen.findByText(/^Açıklaman koordinatörüne iletildi ·/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Seçtiğin neden: Testi geçemedim"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Koordinatörüne açıkla" }),
    ).toBeNull();
  });

  it("shows the decision: no mentoring time, a retake and the note", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: true,
      latest: iskurAssessmentStatement({
        status: IskurAssessmentStatus.Decided,
        mentoringDecision: IskurMentoringDecision.Set,
        mentoringMinutes: 0,
        retakeOpened: true,
        decisionNote: "Bu dönem ekip işine odaklan.",
        decidedAt: "2026-11-28T10:00:00Z",
      }),
    });
    renderWithQueryClient(<IskurAssessmentStatement />);

    expect(
      await screen.findByText(
        "Haftalık mentörlük süren: yok; tüm saatlerin ekip çalışmasında.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Testi Prism üzerinden yeniden alabilirsin."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Koordinatörünün notu: Bu dönem ekip işine odaklan."),
    ).toBeInTheDocument();
  });

  it("shows hours when the coordinator set another value", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: true,
      latest: iskurAssessmentStatement({
        status: IskurAssessmentStatus.Decided,
        mentoringDecision: IskurMentoringDecision.Set,
        mentoringMinutes: 90,
        decidedAt: "2026-11-28T10:00:00Z",
      }),
    });
    renderWithQueryClient(<IskurAssessmentStatement />);
    expect(
      await screen.findByText("Haftalık mentörlük süren: 1,5 sa"),
    ).toBeInTheDocument();
  });

  it("names no date for a decision the backend sent without one", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: true,
      latest: iskurAssessmentStatement({
        status: IskurAssessmentStatus.Decided,
        mentoringDecision: IskurMentoringDecision.Keep,
        decidedAt: null,
      }),
    });
    renderWithQueryClient(<IskurAssessmentStatement />);
    expect(
      await screen.findByText("Koordinatörün karar verdi"),
    ).toBeInTheDocument();
  });

  it("closes the form once the backend no longer takes a statement", async () => {
    const user = userEvent.setup();
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: true,
      latest: null,
    });
    const { queryClient } = renderWithQueryClient(<IskurAssessmentStatement />);
    await user.click(
      await screen.findByRole("button", { name: "Koordinatörüne açıkla" }),
    );
    expect(screen.getByLabelText("Kısaca anlat")).toBeInTheDocument();

    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      canSend: false,
      latest: iskurAssessmentStatement(),
    });
    await queryClient.invalidateQueries();

    expect(
      await screen.findByText(
        "Koordinatörün karar verdiğinde bildirim alırsın.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Kısaca anlat")).toBeNull();
  });

  it("shows nothing to someone who is not an İŞKUR intern", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockRejectedValue(
      new ClientApiError("Not an intern", 404),
    );
    renderWithQueryClient(<IskurAssessmentStatement />);
    await vi.waitFor(() =>
      expect(getMyIskurAssessmentStatement).toHaveBeenCalled(),
    );
    expect(
      screen.queryByRole("region", { name: "Değerlendirme açıklaması" }),
    ).toBeNull();
  });
});
