/** A team leader's request for help from another team (student handbook p.14, p.18), as the backend tells it. */
export enum IskurTeamSupportStatus {
  Open = "OPEN",
  Accepted = "ACCEPTED",
  Declined = "DECLINED",
}

export interface IskurTeamSupport {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  taskId: string | null;
  taskTitle: string | null;
  openedByName: string | null;
  need: string;
  status: IskurTeamSupportStatus;
  answerNote: string | null;
  answeredByName: string | null;
  createdAt: string;
  answeredAt: string | null;
  /** The caller leads the asked team and the request is still open. */
  canAnswer: boolean;
}

export interface IskurTeamSupportTeam {
  id: string;
  name: string;
  unitName: string;
}

/** A leader's view: the other teams they can ask, what their team was asked and what it asked. */
export interface IskurTeamSupports {
  programId: string;
  teamId: string;
  teamName: string;
  teams: IskurTeamSupportTeam[];
  incoming: IskurTeamSupport[];
  outgoing: IskurTeamSupport[];
}

export interface IskurTeamSupportInput {
  toTeamId: string;
  taskId: string | null;
  need: string;
}
