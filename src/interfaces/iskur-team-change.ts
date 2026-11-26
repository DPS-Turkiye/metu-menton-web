/** An intern's team change request during the trial (student handbook p.18), as the backend tells its state. */
export enum IskurTeamChangeStatus {
  Pending = "PENDING",
  Moved = "MOVED",
  Declined = "DECLINED",
  Cancelled = "CANCELLED",
}

export interface IskurTeamChange {
  id: string;
  userId: string;
  fullName: string;
  /** The team the intern asked to leave. */
  fromTeamName: string | null;
  /** The team they are in now; differs from fromTeamName once they were moved. */
  currentTeamName: string | null;
  reason: string;
  status: IskurTeamChangeStatus;
  decisionNote: string | null;
  decidedByName: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** The intern's side: whether they may ask now, and their latest request. */
export interface IskurTeamChangeMine {
  programId: string;
  canAsk: boolean;
  latest: IskurTeamChange | null;
}

/** A program's requests for its coordinators, waiting ones first. */
export interface IskurTeamChanges {
  programId: string;
  requests: IskurTeamChange[];
}
