import type { IskurTaskKind, IskurTaskStatus } from "@/interfaces/iskur-tasks";

/**
 * The İŞKUR weekly log (backend `IskurWeekResponse`) and the leader's review (`IskurLeaderQueueResponse`,
 * `IskurLeaderWeekResponse`). The leader's shapes carry peer mentoring as numbers only.
 */

export enum IskurWeekStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  Approved = "APPROVED",
  RevisionRequested = "REVISION_REQUESTED",
  Rejected = "REJECTED",
}

export enum IskurWeekDecision {
  Approve = "APPROVE",
  Revision = "REVISION",
  Reject = "REJECT",
}

export enum IskurWorkEntryKind {
  Team = "TEAM",
  SupportActivity = "SUPPORT_ACTIVITY",
}

export interface IskurWeekPerson {
  userId: string;
  fullName: string;
}

export interface IskurWeekSplit {
  totalMinutes: number;
  mentoringMinutes: number;
  teamMinutes: number;
}

export interface IskurWeekTotals {
  teamMinutes: number;
  mentoringMinutes: number;
}

export interface IskurWeekMentoring {
  meetingCount: number;
  meetingMinutes: number;
  activityMinutes: number;
  supportMinutes: number;
  reportsSubmitted: number;
  reportsDue: number;
  meetingsAhead: boolean;
}

export interface IskurWorkEntry {
  id: string;
  /** "yyyy-mm-dd". */
  date: string;
  kind: IskurWorkEntryKind;
  taskId: string | null;
  supportActivityId: string | null;
  title: string;
  minutes: number;
  output: string | null;
  note: string | null;
}

export interface IskurWeekTask {
  id: string;
  title: string;
  kind: IskurTaskKind;
  estimatedMinutes: number;
  dueDate: string;
  status: IskurTaskStatus;
  needsOutput: boolean;
  actualMinutes: number | null;
}

export interface IskurSupportOption {
  id: string;
  title: string;
  description: string | null;
}

export interface IskurWeekDecisionInfo {
  decision: IskurWeekDecision;
  reason: string | null;
  timeMatchesWork: boolean;
  effortDocumented: boolean;
  outputsSufficient: boolean;
  decidedAt: string;
  decidedBy: IskurWeekPerson | null;
}

export interface IskurWeekObjection {
  text: string;
  at: string;
}

export enum IskurWeekEventKind {
  Submitted = "SUBMITTED",
  Approved = "APPROVED",
  Revision = "REVISION",
  Rejected = "REJECTED",
  Objection = "OBJECTION",
}

/** One step of a week's history: a send, a decision (reason and checks) or the intern's objection. */
export interface IskurWeekHistoryEvent {
  /** The order within the week, from 0. */
  step: number;
  kind: IskurWeekEventKind;
  at: string;
  /** null when that account is gone. */
  by: IskurWeekPerson | null;
  text: string | null;
  /** Set on decisions only. */
  timeMatchesWork: boolean | null;
  effortDocumented: boolean | null;
  outputsSufficient: boolean | null;
}

export interface IskurWeek {
  /** The Monday, "yyyy-mm-dd". */
  weekStart: string;
  weekId: string | null;
  status: IskurWeekStatus;
  editable: boolean;
  canSubmit: boolean;
  submittedAt: string | null;
  decision: IskurWeekDecisionInfo | null;
  objection: IskurWeekObjection | null;
  reviewer: IskurWeekPerson | null;
  /** null while the intern's work days are not set. */
  split: IskurWeekSplit | null;
  totals: IskurWeekTotals;
  mentoring: IskurWeekMentoring;
  needsSupportActivity: boolean;
  entries: IskurWorkEntry[];
  tasks: IskurWeekTask[];
  supportActivities: IskurSupportOption[];
  /** Oldest first; empty until the week is sent. */
  history: IskurWeekHistoryEvent[];
}

export interface IskurWorkEntryInput {
  date: string;
  kind: IskurWorkEntryKind;
  taskId: string | null;
  supportActivityId: string | null;
  title: string | null;
  minutes: number;
  output: string | null;
  note: string | null;
}

export interface IskurSupportEntryInput {
  activityId: string;
  date: string;
  minutes: number;
}

export interface IskurLeaderQueueRow {
  userId: string;
  fullName: string;
  weekId: string | null;
  status: IskurWeekStatus | null;
  submittedAt: string | null;
  teamMinutes: number;
  mentoringMinutes: number;
}

export interface IskurLeaderQueue {
  weekStart: string;
  people: IskurLeaderQueueRow[];
}

export interface IskurLeaderTeamLine {
  date: string;
  title: string;
  minutes: number;
  output: string | null;
  note: string | null;
  taskStatus: IskurTaskStatus | null;
  handoverReason: string | null;
}

/** One day of peer mentoring as the leader sees it: counts, minutes, and the pool titles of support activities. */
export interface IskurLeaderMentoringDay {
  date: string;
  meetingCount: number;
  reportsSubmitted: number;
  reportsDue: number;
  minutes: number;
  supportActivityTitles: string[];
}

export interface IskurLeaderWeek {
  weekId: string;
  weekStart: string;
  person: { userId: string; fullName: string; weeklyDays: number | null };
  status: IskurWeekStatus;
  submittedAt: string | null;
  split: IskurWeekSplit | null;
  totals: IskurWeekTotals;
  team: IskurLeaderTeamLine[];
  mentoring: {
    minutes: number;
    meetingCount: number;
    reportsSubmitted: number;
    reportsDue: number;
    days: IskurLeaderMentoringDay[];
  };
  decision: IskurWeekDecisionInfo | null;
  objection: IskurWeekObjection | null;
  canDecide: boolean;
  queue: IskurLeaderQueueRow[];
  history: IskurWeekHistoryEvent[];
}

export interface IskurWeekDecisionInput {
  decision: IskurWeekDecision;
  timeMatchesWork: boolean;
  effortDocumented: boolean;
  outputsSufficient: boolean;
  reason: string | null;
}
