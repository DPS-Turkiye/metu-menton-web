import type { IskurTeamRole } from "@/interfaces/iskur-workspace";
import type { Weekday } from "@/interfaces/mentor";

/** İŞKUR team tasks (backend `IskurTaskResponse`, `IskurTeamTasksResponse`): Ekibim (2.1) and "Görev detayı". */

export enum IskurTaskKind {
  TeamTask = "TEAM_TASK",
  Event = "EVENT",
  Corporate = "CORPORATE",
  ContributionProject = "CONTRIBUTION_PROJECT",
}

export enum IskurTaskStatus {
  Open = "OPEN",
  Done = "DONE",
  /** Moved to next week, with a reason. */
  HandedOver = "HANDED_OVER",
}

export interface IskurTaskPerson {
  userId: string;
  fullName: string;
}

/** A file handed in with a task (backend `IskurTaskResponse.OutputFile`). */
export interface IskurTaskOutputFile {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** The caller uploaded it and the task is not done. */
  canRemove: boolean;
}

export interface IskurTask {
  id: string;
  teamId: string;
  teamName: string;
  assignee: IskurTaskPerson;
  assignedBy: IskurTaskPerson | null;
  title: string;
  kind: IskurTaskKind;
  estimatedMinutes: number;
  /** "yyyy-mm-dd". */
  dueDate: string;
  needsOutput: boolean;
  description: string | null;
  status: IskurTaskStatus;
  actualMinutes: number | null;
  outputLink: string | null;
  outputNote: string | null;
  handoverReason: string | null;
  completedAt: string | null;
  createdAt: string;
  /** The caller is the assignee: they record time and output, complete or hand over. */
  canWork: boolean;
  /** The caller leads the task's team: they may reopen or delete it. */
  canManage: boolean;
  outputFiles: IskurTaskOutputFile[];
  /** False while file storage is not set up: the upload control stays hidden. */
  outputFilesEnabled: boolean;
  /** The caller may add one more file now. */
  canAttach: boolean;
}

export interface IskurTeamTasksMember {
  userId: string;
  fullName: string;
  role: IskurTeamRole;
  weeklyDays: number | null;
  /** The person's weekly team-work target; null while their work days are not set. */
  teamMinutes: number | null;
  plannedMinutes: number;
  overTarget: boolean;
  /** The caller may assign to this person: themselves or their own sub-group. */
  assignable: boolean;
  /** The days the person works, from their onboarding form; empty until they send it. */
  workDays: Weekday[];
  tasks: IskurTask[];
}

export interface IskurRosterPerson {
  userId: string;
  fullName: string;
  role: IskurTeamRole;
  leaderId: string | null;
}

export interface IskurTeamTasks {
  /** The Monday, "yyyy-mm-dd". */
  weekStart: string;
  team: { id: string; name: string; unitName: string };
  viewerRole: IskurTeamRole;
  canAssign: boolean;
  members: IskurTeamTasksMember[];
  roster: IskurRosterPerson[];
}

/** The files handed in with a program's tasks, as its coordinators read them (backend `IskurTaskOutputsResponse`). */
export interface IskurTaskOutputs {
  programId: string;
  enabled: boolean;
  tasks: IskurTaskOutputsTask[];
}

export interface IskurTaskOutputsTask {
  taskId: string;
  title: string;
  teamName: string;
  assignee: IskurTaskPerson;
  status: IskurTaskStatus;
  /** "yyyy-mm-dd". */
  dueDate: string;
  files: Omit<IskurTaskOutputFile, "canRemove">[];
}

export interface IskurTaskInput {
  assigneeId: string;
  title: string;
  kind: IskurTaskKind;
  estimatedMinutes: number;
  dueDate: string;
  needsOutput: boolean;
  description: string | null;
}

/** The assignee's fields are replaced as sent; a null status keeps the current one. */
export interface IskurTaskUpdateInput {
  status: IskurTaskStatus | null;
  actualMinutes: number | null;
  outputLink: string | null;
  outputNote: string | null;
  handoverReason: string | null;
}
