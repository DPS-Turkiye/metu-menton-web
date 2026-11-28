import { describe, expect, it } from "vitest";

import {
  IskurAssessmentStatus,
  IskurDecisionProblem,
  IskurMentoringChoice,
  IskurMentoringDecision,
} from "@/interfaces/iskur-assessment-statement";
import { TrainingState } from "@/interfaces/training";
import {
  canOfferRetake,
  decisionInput,
  decisionPreview,
  emptyDecisionForm,
  ISKUR_ASSESSMENT_TEXT_MAX,
  isSendableStatement,
  isWaiting,
  mentoringOutcome,
  nextWaitingId,
  splitStatements,
  thisWeekAssessmentLine,
} from "@/lib/iskur-assessment-statement";
import { IskurAssessmentLine } from "@/types/iskur-assessment";
import { IskurFormProblem } from "@/types/iskur-workspace";
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
  const threeDays = iskurAssessmentStatement({
    weeklyDays: 3,
    currentMentoringMinutes: 360,
    mentoringIsDefault: true,
    trainingState: TrainingState.PrismTodo,
  });
  const form = (overrides: Partial<ReturnType<typeof emptyDecisionForm>>) => ({
    ...emptyDecisionForm(),
    ...overrides,
  });

  it("splits waiting statements from closed ones", () => {
    const decided = iskurAssessmentStatement({
      id: "d",
      status: IskurAssessmentStatus.Decided,
    });
    expect(splitStatements([decided, threeDays])).toEqual({
      waiting: [threeDays],
      closed: [decided],
    });
  });

  it("hands focus to the statement in the decided one's place, else the one before it", () => {
    const a = iskurAssessmentStatement({ id: "a" });
    const b = iskurAssessmentStatement({ id: "b" });
    const c = iskurAssessmentStatement({ id: "c" });
    const d = iskurAssessmentStatement({ id: "d" });
    expect(nextWaitingId([a, b, c], "b", [a, c])).toBe("c");
    expect(nextWaitingId([a, b, c], "c", [a, b])).toBe("b");
    // The next one was decided elsewhere meanwhile: the one after it.
    expect(nextWaitingId([a, b, c, d], "b", [a, d])).toBe("d");
    expect(nextWaitingId([a], "a", [])).toBeNull();
    // Only new statements are left: the first of them.
    expect(nextWaitingId([a], "a", [d])).toBe("d");
    expect(nextWaitingId([], "a", [b])).toBe("b");
  });

  it("offers a retake only while the intern waits for a Prism decision", () => {
    expect(canOfferRetake(threeDays)).toBe(false);
    expect(
      canOfferRetake({
        ...threeDays,
        trainingState: TrainingState.PrismPending,
      }),
    ).toBe(true);
  });

  it("turns the form into the backend's decision", () => {
    expect(
      decisionInput(form({ choice: IskurMentoringChoice.None }), threeDays),
    ).toEqual({
      ok: true,
      input: {
        mentoring: IskurMentoringDecision.Set,
        mentoringMinutes: 0,
        openRetake: false,
        note: null,
      },
    });
    expect(
      decisionInput(
        form({
          choice: IskurMentoringChoice.Hours,
          hours: "1,5",
          note: " Tamam ",
        }),
        threeDays,
      ),
    ).toEqual({
      ok: true,
      input: {
        mentoring: IskurMentoringDecision.Set,
        mentoringMinutes: 90,
        openRetake: false,
        note: "Tamam",
      },
    });
    expect(
      decisionInput(form({ choice: IskurMentoringChoice.Default }), threeDays),
    ).toMatchObject({
      ok: true,
      input: {
        mentoring: IskurMentoringDecision.Default,
        mentoringMinutes: null,
      },
    });
  });

  it("refuses an empty decision, a retake that can't be offered and bad hours", () => {
    expect(decisionInput(form({}), threeDays)).toEqual({
      ok: false,
      problem: IskurDecisionProblem.Empty,
    });
    expect(decisionInput(form({ retake: true }), threeDays)).toEqual({
      ok: false,
      problem: IskurDecisionProblem.Empty,
    });
    expect(
      decisionInput(
        form({ choice: IskurMentoringChoice.Hours, hours: "1,2" }),
        threeDays,
      ),
    ).toEqual({ ok: false, problem: IskurFormProblem.MentoringStep });
    expect(
      decisionInput(
        form({ choice: IskurMentoringChoice.Hours, hours: "23" }),
        threeDays,
      ),
    ).toEqual({ ok: false, problem: IskurFormProblem.MentoringTooMuch });
    expect(
      decisionInput(form({ choice: IskurMentoringChoice.Hours, hours: "2" }), {
        ...threeDays,
        weeklyDays: null,
      }),
    ).toEqual({ ok: false, problem: IskurFormProblem.MentoringNeedsDays });
  });

  it("previews the week after the decision", () => {
    expect(decisionPreview(form({}), threeDays)).toEqual({
      mentoringMinutes: 360,
      teamMinutes: 990,
    });
    expect(
      decisionPreview(form({ choice: IskurMentoringChoice.None }), threeDays),
    ).toEqual({ mentoringMinutes: 0, teamMinutes: 1350 });
    expect(
      decisionPreview(
        form({ choice: IskurMentoringChoice.Hours, hours: "x" }),
        threeDays,
      ),
    ).toBeNull();
    expect(
      decisionPreview(form({ choice: IskurMentoringChoice.Default }), {
        ...threeDays,
        weeklyDays: 1,
      }),
    ).toEqual({ mentoringMinutes: 120, teamMinutes: 330 });
    expect(
      decisionPreview(form({}), { ...threeDays, weeklyDays: null }),
    ).toBeNull();
  });

  it("tells Bu Haftam what to say under the mentoring target", () => {
    const mine = { programId: "p1", canSend: true, latest: null };
    expect(thisWeekAssessmentLine(mine, 360)).toBe(IskurAssessmentLine.Offer);
    // No mentoring time to fill (often the coordinator's decision): nothing to explain.
    expect(thisWeekAssessmentLine(mine, 0)).toBeNull();
    expect(thisWeekAssessmentLine(mine, null)).toBeNull();
    expect(
      thisWeekAssessmentLine(
        { ...mine, canSend: false, latest: iskurAssessmentStatement() },
        0,
      ),
    ).toBe(IskurAssessmentLine.Waiting);
    expect(
      thisWeekAssessmentLine(
        {
          ...mine,
          canSend: false,
          latest: iskurAssessmentStatement({
            status: IskurAssessmentStatus.Decided,
          }),
        },
        360,
      ),
    ).toBeNull();
    // Not an İŞKUR intern.
    expect(thisWeekAssessmentLine(null, 360)).toBeNull();
  });
});
