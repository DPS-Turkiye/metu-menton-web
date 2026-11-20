import type { IskurScheduleRange } from "@/interfaces/iskur-onboarding";
import type { Keyed } from "@/lib/keyed-list";

/** The onboarding screens in order: 01 Hoş geldin, then the five steps of the form's "Adımlar" card. */
export enum IskurOnboardingStep {
  Welcome = "WELCOME",
  Days = "DAYS",
  Units = "UNITS",
  Documents = "DOCUMENTS",
  Leadership = "LEADERSHIP",
  Preview = "PREVIEW",
}

export enum IskurStepState {
  Done = "DONE",
  Current = "CURRENT",
  Upcoming = "UPCOMING",
}

/** "Sırada ne var?" on the submitted screen (Figma 5.6), in the order they happen. */
export enum IskurNextStep {
  Review = "REVIEW",
  LeadershipInterview = "LEADERSHIP_INTERVIEW",
  TeamAssignment = "TEAM_ASSIGNMENT",
}

/** A work-hours row being edited; keyed so removing one never hands its inputs to the next. */
export type IskurRangeRow = Keyed<IskurScheduleRange>;

/** Why the "Uygunluk" card says yes or no (onboarding 04). */
export interface IskurLeadershipEligibility {
  enoughDays: boolean;
  enoughDaysLeft: boolean;
  /** Always true while document upload is off: the CV is not asked for then. */
  hasCv: boolean;
  eligible: boolean;
}
