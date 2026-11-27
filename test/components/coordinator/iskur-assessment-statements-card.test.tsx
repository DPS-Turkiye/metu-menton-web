import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurAssessmentStatementsCard } from "@/components/coordinator/iskur-assessment-statements-card";
import { iskurWorkspaceQueryKey } from "@/hooks/use-iskur-workspace";
import {
  IskurAssessmentReason,
  IskurAssessmentStatus,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import { TrainingState } from "@/interfaces/training";
import {
  decideIskurAssessmentStatement,
  getIskurAssessmentStatements,
} from "@/lib/client/iskur-assessment-statement";
import {
  iskurAssessmentStatement,
  STATEMENT_ID,
} from "@test/fixtures/iskur-assessment-statement";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-assessment-statement", () => ({
  getIskurAssessmentStatements: vi.fn(),
  decideIskurAssessmentStatement: vi.fn(),
}));

const PROGRAM = "p1";
const waiting = iskurAssessmentStatement({
  teamName: "Medya ve Kreatif Üretim",
  weeklyDays: 3,
  currentMentoringMinutes: 360,
  mentoringIsDefault: true,
  trainingState: TrainingState.PrismTodo,
  reason: IskurAssessmentReason.NoMentoring,
  text: "Ekip işine odaklanmak istiyorum.",
});

describe("IskurAssessmentStatementsCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a waiting statement and sets no mentoring time in one step", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurAssessmentStatements).mockResolvedValue({
      programId: PROGRAM,
      pendingCount: 1,
      statements: [waiting],
    });
    vi.mocked(decideIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      pendingCount: 0,
      statements: [
        {
          ...waiting,
          status: IskurAssessmentStatus.Decided,
          mentoringDecision: IskurMentoringDecision.Set,
          mentoringMinutes: 0,
        },
      ],
    });
    const { queryClient } = renderWithQueryClient(
      <IskurAssessmentStatementsCard programId={PROGRAM} />,
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    expect(
      await screen.findByRole("heading", {
        name: "Değerlendirme açıklamaları (1)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Medya ve Kreatif Üretim · 3 gün · mentörlük 6 sa (varsayılan)",
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mentor olmak istemiyorum · Prism’i henüz tamamlamadı"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("“Ekip işine odaklanmak istiyorum.”"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ece Kaya için karar ver" }),
    );
    const save = screen.getByRole("button", {
      name: "Kararı kaydet ve bildir",
    });
    expect(save).toBeDisabled();
    expect(
      screen.getByText("Süreyi değiştir, testi yeniden aç ya da bir not yaz."),
    ).toBeInTheDocument();
    // Prism not finished yet: nothing to reopen.
    expect(screen.queryByLabelText("Testi yeniden açabilir")).toBeNull();

    await user.click(screen.getByLabelText("0 sa: tüm süre ekip çalışmasına"));
    expect(
      screen.getByText("Yeni hafta: mentörlük 0 sa · ekip çalışması 22,5 sa"),
    ).toBeInTheDocument();
    await user.click(save);

    expect(decideIskurAssessmentStatement).toHaveBeenCalledWith(
      PROGRAM,
      STATEMENT_ID,
      {
        mentoring: IskurMentoringDecision.Set,
        mentoringMinutes: 0,
        openRetake: false,
        note: null,
      },
    );
    expect(
      await screen.findByText("Karar bekleyen açıklama yok."),
    ).toBeInTheDocument();
    // The placement's mentoring time changed, so the workspace reloads it.
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: iskurWorkspaceQueryKey(PROGRAM),
    });
    await user.click(screen.getByText("Karar verilenler (1)"));
    expect(
      screen.getByText(/Haftalık mentörlük süren: yok/),
    ).toBeInTheDocument();
  });

  it("checks typed hours and reopens the test only while Prism waits for a decision", async () => {
    const user = userEvent.setup();
    vi.mocked(getIskurAssessmentStatements).mockResolvedValue({
      programId: PROGRAM,
      pendingCount: 1,
      statements: [{ ...waiting, trainingState: TrainingState.PrismPending }],
    });
    vi.mocked(decideIskurAssessmentStatement).mockResolvedValue({
      programId: PROGRAM,
      pendingCount: 0,
      statements: [],
    });
    renderWithQueryClient(
      <IskurAssessmentStatementsCard programId={PROGRAM} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Ece Kaya için karar ver" }),
    );
    await user.click(screen.getByLabelText("Başka bir süre"));
    await user.type(
      screen.getByLabelText("Saat (0,5 saatlik adımlarla)"),
      "1,2",
    );
    const hours = screen.getByLabelText("Saat (0,5 saatlik adımlarla)");
    expect(hours).toHaveAttribute("aria-invalid", "true");
    expect(hours).toHaveAccessibleDescription(
      "Mentorluk süresi 0,5 saatlik adımlarla girilir (ör. 1,5).",
    );
    await user.clear(hours);
    await user.type(hours, "3");
    expect(hours).toHaveAttribute("aria-invalid", "false");
    await user.click(screen.getByLabelText("Testi yeniden açabilir"));
    await user.type(
      screen.getByLabelText("Stajyere not (isteğe bağlı)"),
      "Bir kez daha dene.",
    );
    await user.click(
      screen.getByRole("button", { name: "Kararı kaydet ve bildir" }),
    );

    expect(decideIskurAssessmentStatement).toHaveBeenCalledWith(
      PROGRAM,
      STATEMENT_ID,
      {
        mentoring: IskurMentoringDecision.Set,
        mentoringMinutes: 180,
        openRetake: true,
        note: "Bir kez daha dene.",
      },
    );
  });
});
