export enum ProgramMentorStatus {
  Pending = "PENDING",
  Accepted = "ACCEPTED",
  Rejected = "REJECTED",
}

export enum ProgramMentorInvitedBy {
  Coordinator = "COORDINATOR",
  Mentor = "MENTOR",
}

export enum ProgramStatus {
  Draft = "DRAFT",
  Active = "ACTIVE",
  Completed = "COMPLETED",
}

/**
 * Mirrors the backend ProgramType. Teknokent runs STARTUP_MENTORING; ODTÜ creates only SEMESTER programs, whose
 * features decide their tabs. PEER_MENTORING and OFFICE_HOURS are the older ODTÜ types, converted to SEMESTER by the
 * backend.
 */
export enum ProgramType {
  StartupMentoring = "STARTUP_MENTORING",
  PeerMentoring = "PEER_MENTORING",
  OfficeHours = "OFFICE_HOURS",
  Semester = "SEMESTER",
}

/** What a semester runs; İŞKUR needs Akran Mentörlüğü, and a semester has at least one. */
export enum ProgramFeature {
  PeerMentoring = "PEER_MENTORING",
  OfficeHours = "OFFICE_HOURS",
  Iskur = "ISKUR",
}

/** The kinds of open work that keep a feature on or a student in their semester (409 `PROGRAM_WORK_OPEN`). */
export enum ProgramBlockerKind {
  ActiveMentorship = "ACTIVE_MENTORSHIP",
  OpenRequest = "OPEN_REQUEST",
  IskurPlacement = "ISKUR_PLACEMENT",
  UpcomingOfficeHoursMeeting = "UPCOMING_OFFICE_HOURS_MEETING",
  UnsentReport = "UNSENT_REPORT",
}

/** One line of a refusal: how much open work of a kind there is. Counts only, never names. */
export type ProgramBlocker = {
  kind: ProgramBlockerKind;
  feature: ProgramFeature;
  count: number;
};

/** The backend's codes for refused program and membership changes; `code` is free text, so a const object. */
export const ProgramErrorCode = {
  WorkOpen: "PROGRAM_WORK_OPEN",
  FeaturesInvalid: "PROGRAM_FEATURES_INVALID",
  AlreadyInProgram: "ALREADY_IN_PROGRAM",
  NotInProgram: "NOT_IN_PROGRAM",
} as const;

export type ProgramStartup = {
  id: string;
  name: string;
  description?: string | null;
};

export type ProgramMemberSummary = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  founder: boolean;
};

export type ProgramStartupRoster = {
  id: string;
  name: string;
  description?: string | null;
  members: ProgramMemberSummary[];
};

export type ProgramMentor = {
  mentorId: string;
  fullName: string;
  email: string;
  status: ProgramMentorStatus;
  invitedBy: ProgramMentorInvitedBy;
  createdAt: string;
  role?: string | null;
};

export type Program = {
  id: string;
  name: string;
  coordinatorId: string;
  coordinatorName: string;
  createdAt: string;
  status: ProgramStatus;
  /** A semester's features; [] for other types. */
  features: ProgramFeature[];
  startups: ProgramStartup[];
  mentors: ProgramMentor[];
};

export type ProgramDetail = {
  id: string;
  name: string;
  coordinatorId: string;
  coordinatorName: string;
  createdAt: string;
  startups: ProgramStartupRoster[];
  mentors: ProgramMentor[];
};

export type ProgramInvitation = {
  programId: string;
  programName: string;
  coordinatorId: string;
  coordinatorName: string;
  createdAt: string;
};

export type OrganizationProgram = {
  id: string;
  name: string;
  coordinatorName: string;
  /** Students who joined as a team of one, so mentee screens drop the startup pages and wording. */
  individualMentees: boolean;
};

export type OrganizationPrograms = {
  programs: OrganizationProgram[];
  activeProgramId: string | null;
};

export type ProgramName = {
  id: string;
  name: string;
  /** Students join as a team of one, so signup skips the startup questions. */
  individualMentees: boolean;
};

/** Whether the signed-in address may join a program; `message` says why not. */
export type ProgramEligibility = {
  eligible: boolean;
  message: string | null;
};

/**
 * The signed-in person's semester features (`GET /api/me/program-features`): [] when they are in no semester, null
 * when the backend does not say (one older than semesters), so nothing is hidden.
 */
export type MyProgramFeatures = {
  programFeatures: ProgramFeature[] | null;
};
