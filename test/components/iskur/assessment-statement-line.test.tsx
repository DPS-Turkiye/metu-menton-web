import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurAssessmentStatementLine } from "@/components/iskur/assessment-statement-line";
import { iskurAssessmentQueryKey } from "@/hooks/use-iskur-assessment-statement";
import { ClientApiError } from "@/lib/client/api";
import { getMyIskurAssessmentStatement } from "@/lib/client/iskur-assessment-statement";
import { iskurAssessmentStatement } from "@test/fixtures/iskur-assessment-statement";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-assessment-statement", () => ({
  getMyIskurAssessmentStatement: vi.fn(),
}));

const TRAINING = "/student/peer-mentoring/training";

describe("IskurAssessmentStatementLine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers to explain while the intern may send and has mentoring time", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: "p1",
      canSend: true,
      latest: null,
    });
    renderWithQueryClient(
      <IskurAssessmentStatementLine mentoringTarget={360} />,
    );
    expect(
      await screen.findByText("Değerlendirmeyi tamamlayamadın mı?", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Koordinatörüne açıkla" }),
    ).toHaveAttribute("href", TRAINING);
  });

  it("says the statement waits, with a link to its status", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockResolvedValue({
      programId: "p1",
      canSend: false,
      latest: iskurAssessmentStatement(),
    });
    renderWithQueryClient(
      <IskurAssessmentStatementLine mentoringTarget={360} />,
    );
    expect(
      await screen.findByRole("link", { name: "Durumu gör" }),
    ).toHaveAttribute("href", TRAINING);
  });

  it("shows nothing to someone who is not an İŞKUR intern", async () => {
    vi.mocked(getMyIskurAssessmentStatement).mockRejectedValue(
      new ClientApiError("Not an intern", 404),
    );
    const { queryClient } = renderWithQueryClient(
      <IskurAssessmentStatementLine mentoringTarget={360} />,
    );
    // Settled as "no statement state" (not still loading) before checking that nothing shows.
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(iskurAssessmentQueryKey)?.status).toBe(
        "success",
      ),
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
