import {
  IskurAssessmentReason,
  IskurAssessmentStatus,
  IskurDecisionProblem,
  IskurMentoringChoice,
  IskurMentoringDecision,
  type IskurAssessmentDecisionForm,
  type IskurAssessmentDecisionInput,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";
import { TrainingState } from "@/interfaces/training";
import {
  defaultMentoringMinutes,
  ISKUR_MINUTES_PER_DAY,
  mentoringMinutesOf,
} from "@/lib/iskur-workspace";
import type { IskurFormProblem } from "@/types/iskur-workspace";

/** The backend's limit for the intern's text. */
export const ISKUR_ASSESSMENT_TEXT_MAX = 1000;
/** The backend's limit for the coordinator's note. */
export const ISKUR_ASSESSMENT_NOTE_MAX = 500;

export const iskurAssessmentStatementsQueryKey = (programId: string) =>
  ["iskur-assessment-statements", programId] as const;

/** The pick list in the order the form shows it. */
export const ISKUR_ASSESSMENT_REASONS = Object.values(IskurAssessmentReason);

/** A text worth sending: something besides spaces, within the limit. */
export function isSendableStatement(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= ISKUR_ASSESSMENT_TEXT_MAX;
}

export function isWaiting(statement: IskurAssessmentStatement) {
  return statement.status === IskurAssessmentStatus.Pending;
}

/** Which line tells the intern what the decision did to their weekly mentoring time. */
export function mentoringOutcome(statement: IskurAssessmentStatement): {
  key:
    | "mentoringKept"
    | "mentoringNone"
    | "mentoringHours"
    | "mentoringDefaultHours";
  minutes: number;
} {
  const minutes = statement.mentoringMinutes;
  if (
    statement.mentoringDecision === null ||
    statement.mentoringDecision === IskurMentoringDecision.Keep ||
    minutes === null
  )
    return { key: "mentoringKept", minutes: 0 };
  if (minutes === 0) return { key: "mentoringNone", minutes };
  return {
    key:
      statement.mentoringDecision === IskurMentoringDecision.Default
        ? "mentoringDefaultHours"
        : "mentoringHours",
    minutes,
  };
}

/** The coordinator's list in two parts: what waits for a decision, and what was decided or closed. */
export function splitStatements(
  statements: readonly IskurAssessmentStatement[],
) {
  return {
    waiting: statements.filter(isWaiting),
    closed: statements.filter((statement) => !isWaiting(statement)),
  };
}

/** A retake makes sense only while the intern waits for a Prism decision; before that they can take the test anyway. */
export function canOfferRetake(statement: IskurAssessmentStatement) {
  return statement.trainingState === TrainingState.PrismPending;
}

export const emptyDecisionForm = (): IskurAssessmentDecisionForm => ({
  choice: IskurMentoringChoice.Keep,
  hours: "",
  retake: false,
  note: "",
});

/** The request for the form, or why it cannot go yet: it must change the time, reopen the test or say something. */
export function decisionInput(
  form: IskurAssessmentDecisionForm,
  statement: IskurAssessmentStatement,
):
  | { ok: true; input: IskurAssessmentDecisionInput }
  | { ok: false; problem: IskurFormProblem | IskurDecisionProblem } {
  const note = form.note.trim() || null;
  const openRetake = form.retake && canOfferRetake(statement);
  let mentoring = IskurMentoringDecision.Keep;
  let mentoringMinutes: number | null = null;
  switch (form.choice) {
    case IskurMentoringChoice.None:
      mentoring = IskurMentoringDecision.Set;
      mentoringMinutes = 0;
      break;
    case IskurMentoringChoice.Hours: {
      const parsed = mentoringMinutesOf(
        form.hours.trim(),
        statement.weeklyDays,
      );
      if (!parsed.ok) return parsed;
      mentoring = IskurMentoringDecision.Set;
      mentoringMinutes = parsed.minutes;
      break;
    }
    case IskurMentoringChoice.Default:
      mentoring = IskurMentoringDecision.Default;
      break;
    case IskurMentoringChoice.Keep:
      if (!openRetake && note === null)
        return { ok: false, problem: IskurDecisionProblem.Empty };
  }
  return {
    ok: true,
    input: { mentoring, mentoringMinutes, openRetake, note },
  };
}

/** The week after the decision, for the form's live line; null while the days or the typed hours are unknown. */
export function decisionPreview(
  form: IskurAssessmentDecisionForm,
  statement: IskurAssessmentStatement,
): { mentoringMinutes: number; teamMinutes: number } | null {
  const days = statement.weeklyDays;
  if (days === null) return null;
  let mentoring: number | null;
  switch (form.choice) {
    case IskurMentoringChoice.Keep:
      mentoring = statement.currentMentoringMinutes;
      break;
    case IskurMentoringChoice.None:
      mentoring = 0;
      break;
    case IskurMentoringChoice.Hours: {
      const parsed = mentoringMinutesOf(form.hours.trim(), days);
      mentoring = parsed.ok ? parsed.minutes : null;
      break;
    }
    case IskurMentoringChoice.Default:
      mentoring = defaultMentoringMinutes(days);
  }
  if (mentoring === null) return null;
  return {
    mentoringMinutes: mentoring,
    teamMinutes: days * ISKUR_MINUTES_PER_DAY - mentoring,
  };
}
