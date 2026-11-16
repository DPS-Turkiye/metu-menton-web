/** A peer program's participants: its students, badge holders, undecided requests and switched-on categories. */
export type PeerProgramCounts = {
  students: number;
  peerMentors: number;
  openRequests: number;
  activeCategories: number;
};

/** An Office Hours program spans the university, so these are the university's numbers. */
export type OfficeHoursProgramCounts = {
  academicians: number;
  withAvailability: number;
  awaitingDecision: number;
};

/** Who takes part in a peer or Office Hours program; both parts are null for a startup program. */
export type ProgramCounts = {
  peer: PeerProgramCounts | null;
  officeHours: OfficeHoursProgramCounts | null;
};
