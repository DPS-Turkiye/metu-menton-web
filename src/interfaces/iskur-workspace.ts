/** İŞKUR workspace placement (backend `IskurWorkspaceResponse`): units, thematic teams and who works where. */

export enum IskurTeamRole {
  Leader = "LEADER",
  Member = "MEMBER",
}

export enum IskurPlacementStatus {
  Provisional = "PROVISIONAL",
  Final = "FINAL",
}

/** Something the coordinator should look at; none of these blocks a change. */
export enum IskurWarning {
  TeamSize = "TEAM_SIZE",
  SubgroupSize = "SUBGROUP_SIZE",
  NoLeader = "NO_LEADER",
  LeaderFewDays = "LEADER_FEW_DAYS",
  NoLeaderAssigned = "NO_LEADER_ASSIGNED",
  DaysMissing = "DAYS_MISSING",
}

export interface IskurCoordinator {
  userId: string;
  fullName: string;
}

/** A student or peer mentor of the program, placed or not. */
export interface IskurPerson {
  userId: string;
  fullName: string;
  email: string;
  department: string | null;
  iskurParticipant: boolean;
  /** Holds the Akran Mentoru badge (or was a peer mentor before badges); false shows "Rozet bekleniyor". */
  peerMentor: boolean;
}

export interface IskurWeeklySplit {
  totalMinutes: number;
  mentoringMinutes: number;
  teamMinutes: number;
  mentoringIsDefault: boolean;
}

export interface IskurPlacement extends IskurPerson {
  teamId: string;
  role: IskurTeamRole;
  leaderId: string | null;
  status: IskurPlacementStatus;
  weeklyDays: number | null;
  split: IskurWeeklySplit | null;
  warnings: IskurWarning[];
  finalizedAt: string | null;
}

export interface IskurTeam {
  id: string;
  name: string;
  sortOrder: number;
  /** Leaders first, each followed by their sub-group, then members without a leader. */
  people: IskurPlacement[];
  warnings: IskurWarning[];
}

export interface IskurUnit {
  id: string;
  name: string;
  sortOrder: number;
  coordinator: IskurCoordinator | null;
  teams: IskurTeam[];
}

export interface IskurWorkspace {
  programId: string;
  units: IskurUnit[];
  /** In the program and not placed yet. */
  pool: IskurPerson[];
  coordinators: IskurCoordinator[];
  counts: {
    interns: number;
    placed: number;
    finalized: number;
    leaders: number;
  };
}

export interface IskurUnitInput {
  name: string;
  coordinatorId: string | null;
}

export interface IskurTeamInput {
  name: string;
}

export interface IskurPlacementInput {
  teamId: string;
  role: IskurTeamRole;
  leaderId: string | null;
  weeklyDays: number | null;
  /** Null keeps the default share for the days. */
  mentoringMinutes: number | null;
}

/** Neither set finalizes the whole program. */
export interface IskurFinalizeInput {
  teamId: string | null;
  unitId: string | null;
}
