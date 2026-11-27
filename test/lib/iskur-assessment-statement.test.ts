import { describe, expect, it } from "vitest";

import {
  IskurAssessmentStatus,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import {
  ISKUR_ASSESSMENT_TEXT_MAX,
  isSendableStatement,
  isWaiting,
  mentoringOutcome,
} from "@/lib/iskur-assessment-statement";
import { iskurAssessmentStatement } from "@test/fixtures/iskur-assessment-statement";

describe("İŞKUR assessment statement helpers", () => {
  it("sends only a text with something besides spaces, within the limit", () => {
    expect(isSendableStatement("  Geçemedim  ")).toBe(true);
    expect(isSendableStatement("   ")).toBe(false);
    expect(isSendableStatement("a".repeat(ISKUR_ASSESSMENT_TEXT_MAX))).toBe(
      true,
    );
    expect(isSendableStatement("a".repeat(ISKUR_ASSESSMENT_TEXT_MAX + 1))).toBe(
      false,
    );
  });

  it("knows a waiting statement", () => {
    expect(isWaiting(iskurAssessmentStatement())).toBe(true);
    expect(
      isWaiting(
        iskurAssessmentStatement({ status: IskurAssessmentStatus.Decided }),
      ),
    ).toBe(false);
  });

  it.each([
    [IskurMentoringDecision.Keep, 120, "mentoringKept", 0],
    [null, null, "mentoringKept", 0],
    [IskurMentoringDecision.Set, null, "mentoringKept", 0],
    [IskurMentoringDecision.Set, 0, "mentoringNone", 0],
    [IskurMentoringDecision.Set, 180, "mentoringHours", 180],
    [IskurMentoringDecision.Default, 360, "mentoringDefaultHours", 360],
  ] as const)(
    "tells the intern what %s with %s minutes did",
    (decision, minutes, key, shown) => {
      expect(
        mentoringOutcome(
          iskurAssessmentStatement({
            status: IskurAssessmentStatus.Decided,
            mentoringDecision: decision,
            mentoringMinutes: minutes,
          }),
        ),
      ).toEqual({ key, minutes: shown });
    },
  );
});
