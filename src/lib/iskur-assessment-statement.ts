import {
  IskurAssessmentReason,
  IskurAssessmentStatus,
  IskurMentoringDecision,
  type IskurAssessmentMine,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";
import { IskurAssessmentLine } from "@/types/iskur-assessment";

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

/**
 * The line under Bu Haftam's mentoring target: a statement waiting for the coordinator, else an offer to explain while
 * the intern may send one and still has mentoring time to fill. With no mentoring time (often the coordinator's own
 * decision) there is nothing to explain, so nothing shows.
 */
export function thisWeekAssessmentLine(
  mine: IskurAssessmentMine | null,
  mentoringTarget: number | null,
): IskurAssessmentLine | null {
  if (!mine) return null;
  if (mine.latest && isWaiting(mine.latest)) return IskurAssessmentLine.Waiting;
  if (mine.canSend && mentoringTarget !== null && mentoringTarget > 0)
    return IskurAssessmentLine.Offer;
  return null;
}
