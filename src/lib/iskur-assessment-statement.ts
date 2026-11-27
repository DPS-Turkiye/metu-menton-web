import {
  IskurAssessmentReason,
  IskurAssessmentStatus,
  IskurMentoringDecision,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";

/** The backend's limit for the intern's text. */
export const ISKUR_ASSESSMENT_TEXT_MAX = 1000;
/** The backend's limit for the coordinator's note. */
export const ISKUR_ASSESSMENT_NOTE_MAX = 500;

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
