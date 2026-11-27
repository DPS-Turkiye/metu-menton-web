import {
  IskurAssessmentReason,
  IskurAssessmentStatus,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";

export const STATEMENT_ID = "00000000-0000-4000-8000-0000000000f1";

export function iskurAssessmentStatement(
  overrides: Partial<IskurAssessmentStatement> = {},
): IskurAssessmentStatement {
  return {
    id: STATEMENT_ID,
    userId: "u-ece",
    fullName: "Ece Kaya",
    teamName: null,
    weeklyDays: null,
    currentMentoringMinutes: null,
    mentoringIsDefault: false,
    trainingState: null,
    peerMentor: false,
    reason: IskurAssessmentReason.Failed,
    text: "Testi iki kez denedim, geçemedim.",
    status: IskurAssessmentStatus.Pending,
    mentoringDecision: null,
    mentoringMinutes: null,
    retakeOpened: false,
    decisionNote: null,
    decidedByName: null,
    createdAt: "2026-11-27T09:15:00Z",
    decidedAt: null,
    ...overrides,
  };
}
