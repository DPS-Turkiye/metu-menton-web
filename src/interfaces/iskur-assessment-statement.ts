import type { TrainingState } from "@/interfaces/training";

/** An intern's statement on the peer mentor assessment, as the backend tells its state. */
export enum IskurAssessmentStatus {
  Pending = "PENDING",
  Decided = "DECIDED",
  Cancelled = "CANCELLED",
}

/** The reason the intern picks; the text says the rest. Neutral on purpose: no private detail is asked for. */
export enum IskurAssessmentReason {
  NotStarted = "NOT_STARTED",
  Failed = "FAILED",
  NoAccess = "NO_ACCESS",
  Personal = "PERSONAL",
  NoMentoring = "NO_MENTORING",
  Other = "OTHER",
}

/** What the coordinator did with the weekly mentoring time: left it, set a value (0 = all team work), or reset it. */
export enum IskurMentoringDecision {
  Keep = "KEEP",
  Set = "SET",
  Default = "DEFAULT",
}

export interface IskurAssessmentStatement {
  id: string;
  userId: string;
  fullName: string;
  /** Where the intern stands now; null on the intern's own copy. */
  teamName: string | null;
  weeklyDays: number | null;
  currentMentoringMinutes: number | null;
  mentoringIsDefault: boolean;
  /** Filled only while the statement waits, for the coordinator. */
  trainingState: TrainingState | null;
  /** They have the badge by now. */
  peerMentor: boolean;
  reason: IskurAssessmentReason;
  text: string;
  status: IskurAssessmentStatus;
  mentoringDecision: IskurMentoringDecision | null;
  /** Weekly mentoring minutes the decision left them with; null when kept. */
  mentoringMinutes: number | null;
  retakeOpened: boolean;
  decisionNote: string | null;
  decidedByName: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** The intern's side: whether they may send one now, and their latest statement. */
export interface IskurAssessmentMine {
  programId: string;
  canSend: boolean;
  latest: IskurAssessmentStatement | null;
}

/** A program's statements for its coordinators, waiting ones first. */
export interface IskurAssessmentStatements {
  programId: string;
  pendingCount: number;
  statements: IskurAssessmentStatement[];
}

/** The coordinator's decision as the backend takes it. */
export interface IskurAssessmentDecisionInput {
  mentoring: IskurMentoringDecision;
  /** Read only with Set. */
  mentoringMinutes: number | null;
  openRetake: boolean;
  note: string | null;
}

/** The decision form's mentoring choice; None is Set with 0 minutes, said the way coordinators think of it. */
export enum IskurMentoringChoice {
  Keep = "KEEP",
  None = "NONE",
  Hours = "HOURS",
  Default = "DEFAULT",
}

export interface IskurAssessmentDecisionForm {
  choice: IskurMentoringChoice;
  hours: string;
  retake: boolean;
  note: string;
}

/** Why a decision cannot go yet, besides the placement dialog's hour problems. */
export enum IskurDecisionProblem {
  Empty = "EMPTY",
}
