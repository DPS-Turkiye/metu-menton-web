import type {
  IskurFinalizeInput,
  IskurPerson,
  IskurTeam,
  IskurTeamRole,
  IskurUnit,
} from "@/interfaces/iskur-workspace";

/** Which dialog the placement screen has open. */
export enum IskurDialogKind {
  Place = "PLACE",
  Unit = "UNIT",
  Team = "TEAM",
  Finalize = "FINALIZE",
  DeleteUnit = "DELETE_UNIT",
  DeleteTeam = "DELETE_TEAM",
}

export type IskurDialog =
  | { kind: IskurDialogKind.Place; person: IskurPerson; placed: boolean }
  | { kind: IskurDialogKind.Unit; unit: IskurUnit | null }
  | { kind: IskurDialogKind.Team; unitId: string; team: IskurTeam | null }
  | {
      kind: IskurDialogKind.Finalize;
      scope: IskurFinalizeInput;
      /** The team or unit's name; null for the whole program. */
      name: string | null;
      count: number;
    }
  | { kind: IskurDialogKind.DeleteUnit; unit: IskurUnit }
  | { kind: IskurDialogKind.DeleteTeam; team: IskurTeam };

/** The placement dialog's fields as typed; `mentoringHours` is text so "1,5" can be typed. */
export interface IskurPlacementForm {
  teamId: string;
  role: IskurTeamRole;
  leaderId: string | null;
  weeklyDays: number | null;
  mentoringHours: string;
}

/** What an intern's sent onboarding form says about their placement. */
export interface IskurPlacementPreference {
  weeklyDays: number | null;
  wantsLeadership: boolean;
  /** Each chosen unit's self-rated skill score; the form keeps no order between units. */
  unitScores: Record<string, number>;
}

/** The dialog values a new placement takes from the form, null where the form says nothing. */
export interface IskurPlacementPrefill {
  teamId: string | null;
  role: IskurTeamRole;
  weeklyDays: number | null;
}

/** Why the placement dialog cannot be saved yet. */
export enum IskurFormProblem {
  NoTeam = "NO_TEAM",
  MentoringNeedsDays = "MENTORING_NEEDS_DAYS",
  MentoringStep = "MENTORING_STEP",
  MentoringTooMuch = "MENTORING_TOO_MUCH",
}
