/**
 * İŞKUR onboarding (Figma 284:2, 02–05) as the backend sends it: the intern's form (`IskurOnboardingResponse`), their
 * team (`IskurTeamRevealResponse`) and the coordinators' list of forms (`IskurApplicationsResponse`).
 */

import type {
  IskurPlacementStatus,
  IskurTeamRole,
} from "@/interfaces/iskur-workspace";
import type { Weekday } from "@/interfaces/mentor";

export enum IskurSkillLevel {
  None = "NONE",
  Beginner = "BEGINNER",
  Good = "GOOD",
  Expert = "EXPERT",
}

export enum IskurTeamRolePreference {
  IdeaGenerator = "IDEA_GENERATOR",
  Planner = "PLANNER",
  Executor = "EXECUTOR",
  Connector = "CONNECTOR",
}

export enum IskurDocumentSlot {
  Cv = "CV",
  Transcript = "TRANSCRIPT",
}

/** "HH:mm" to "HH:mm" on one day, Turkish time. */
export interface IskurScheduleRange {
  day: Weekday;
  start: string;
  end: string;
}

export interface IskurSkillAnswer {
  skillId: string;
  level: IskurSkillLevel;
}

export interface IskurLeadership {
  wants: boolean;
  motivation: string | null;
  experience: string | null;
  conflict: string | null;
}

/** What the intern sees of an uploaded file; only the program's coordinators can open it. */
export interface IskurFileRef {
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface IskurDocuments {
  cv: IskurFileRef | null;
  transcript: IskurFileRef | null;
}

export interface IskurOnboardingForm {
  weeklyDays: number | null;
  schedule: IskurScheduleRange[];
  priorIskurDays: number | null;
  unitIds: string[];
  skills: IskurSkillAnswer[];
  teamRoles: IskurTeamRolePreference[];
  documents: IskurDocuments;
  leadership: IskurLeadership;
  submittedAt: string | null;
}

export interface IskurSkill {
  id: string;
  name: string;
}

export interface IskurOnboardingUnit {
  id: string;
  name: string;
  teamNames: string[];
  skills: IskurSkill[];
}

/** `documentsEnabled` is false while file storage is not set up: the documents step is closed and needs no CV. */
export interface IskurOnboardingContext {
  programId: string;
  programName: string;
  department: string | null;
  classYear: number | null;
  units: IskurOnboardingUnit[];
  documentsEnabled: boolean;
  maxIskurDays: number;
  termWeeks: number;
  minimumLeaderDays: number;
  maxTeamRoles: number;
  answerMaxLength: number;
  /** False once a sent form's intern is placed. */
  editable: boolean;
}

export interface IskurOnboarding {
  form: IskurOnboardingForm;
  context: IskurOnboardingContext;
}

/** The whole form as the intern has it on screen; files go through their own upload. */
export interface IskurOnboardingInput {
  weeklyDays: number | null;
  schedule: IskurScheduleRange[];
  priorIskurDays: number | null;
  unitIds: string[];
  skills: IskurSkillAnswer[];
  teamRoles: IskurTeamRolePreference[];
  leadership: IskurLeadership;
}

export interface IskurPersonRef {
  userId: string;
  fullName: string;
}

export interface IskurTeamMember {
  userId: string;
  fullName: string;
  role: IskurTeamRole;
  leaderId: string | null;
  me: boolean;
}

/** `trialWeek` is 1–4 during the trial weeks of a provisional placement, otherwise null. */
export interface IskurRevealPlacement {
  status: IskurPlacementStatus;
  trialWeek: number | null;
  myRole: IskurTeamRole;
  myLeader: IskurPersonRef | null;
  unit: { name: string; coordinator: IskurPersonRef | null };
  team: { name: string; people: IskurTeamMember[] };
  commonDays: Weekday[];
}

export interface IskurTeamReveal {
  programId: string;
  programName: string;
  onboardingSubmitted: boolean;
  placement: IskurRevealPlacement | null;
}

export interface IskurApplication {
  userId: string;
  fullName: string;
  submittedAt: string;
  weeklyDays: number | null;
  schedule: IskurScheduleRange[];
  priorIskurDays: number | null;
  remainingIskurDays: number | null;
  unitIds: string[];
  skills: IskurSkillAnswer[];
  teamRoles: IskurTeamRolePreference[];
  documents: IskurDocuments;
  leadership: IskurLeadership;
}

export interface IskurApplications {
  programId: string;
  units: { id: string; name: string; skills: IskurSkill[] }[];
  applications: IskurApplication[];
  drafts: number;
}
