import { IskurTaskStatus } from "@/interfaces/iskur-tasks";
import {
  IskurWeekDecision,
  IskurWorkEntryKind,
  type IskurWeek,
  type IskurWeekDecisionInput,
  type IskurWorkEntry,
  type IskurWorkEntryInput,
} from "@/interfaces/iskur-weeks";
import { ISKUR_TASK_MAX_MINUTES, parseMinutes } from "@/lib/iskur-tasks";
import { withKey, withKeys } from "@/lib/keyed-list";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";
import {
  IskurLineKind,
  IskurLineProblem,
  IskurTodoKind,
  type IskurDecisionForm,
  type IskurEntryDraft,
  type IskurTodo,
} from "@/types/iskur-weeks";

/** The backend's limits (`iskur_work_entry`). */
export const ISKUR_DAY_MINUTES = ISKUR_TASK_MAX_MINUTES;
export const ISKUR_ENTRY_TITLE_MAX = 200;
export const ISKUR_WEEK_ENTRIES_MAX = 60;
export const ISKUR_SUPPORT_DEFAULT_MINUTES = 60;

export const ISKUR_WORK_LOG_HREF = "/student/work-log";

/** Query-key prefixes: every cached week, and every review queue, starts with one of these. */
export const ISKUR_WEEK_KEY = "iskur-week";
export const ISKUR_REVIEW_QUEUE_KEY = "iskur-review-queue";

export function iskurWorkLogHref(weekStart: string, weekly = false) {
  return `${ISKUR_WORK_LOG_HREF}?view=${weekly ? "weekly" : "daily"}&week=${weekStart}`;
}

export function iskurLeaderWeekHref(weekId: string) {
  return `/student/team/weeks/${encodeURIComponent(weekId)}`;
}

export function iskurFallbackWeekHref(programId: string, weekId: string) {
  return `/coordinator/programs/${encodeURIComponent(programId)}/iskur/weeks/${encodeURIComponent(weekId)}`;
}

export function iskurFallbackQueueHref(programId: string) {
  return `/coordinator/programs/${encodeURIComponent(programId)}/iskur/weeks`;
}

/** Logged against the target, 0–100; null without a target. */
export function percentOf(logged: number, target: number | null | undefined) {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.round((logged / target) * 100));
}

export function entryDrafts(
  entries: readonly IskurWorkEntry[],
): IskurEntryDraft[] {
  return withKeys(
    entries.map((entry) => ({
      date: entry.date,
      kind: entry.kind,
      taskId: entry.taskId,
      supportActivityId: entry.supportActivityId,
      title: entry.title,
      minutes: String(entry.minutes),
      output: entry.output ?? "",
      note: entry.note ?? "",
    })),
  );
}

/** A new team line on a day, optionally on one of the week's tasks. */
export function teamDraft(
  date: string,
  task: { id: string; title: string; estimatedMinutes: number } | null,
): IskurEntryDraft {
  return withKey({
    date,
    kind: IskurWorkEntryKind.Team,
    taskId: task?.id ?? null,
    supportActivityId: null,
    title: task?.title ?? "",
    minutes: task ? String(task.estimatedMinutes) : "",
    output: "",
    note: "",
  });
}

/** What stops a line from being saved, shown next to it; null when it is fine. */
export function lineProblem(draft: IskurEntryDraft): IskurLineProblem | null {
  const minutes = parseMinutes(draft.minutes);
  if (minutes == null || minutes > ISKUR_DAY_MINUTES) {
    return IskurLineProblem.Minutes;
  }
  if (draft.kind === IskurWorkEntryKind.SupportActivity) {
    return draft.supportActivityId ? null : IskurLineProblem.Activity;
  }
  return draft.title.trim() || draft.taskId ? null : IskurLineProblem.Title;
}

/** What a line is, for its badge: a support activity, a line on a task, or free team work. */
export function lineKind(
  draft: IskurEntryDraft,
  taskIds: readonly string[],
): IskurLineKind {
  if (draft.kind === IskurWorkEntryKind.SupportActivity) {
    return IskurLineKind.Support;
  }
  return draft.taskId && taskIds.includes(draft.taskId)
    ? IskurLineKind.Task
    : IskurLineKind.Team;
}

/**
 * The drafts as the backend takes them; null while a line has a problem, a day passes one work day, or the week
 * has more lines than the backend keeps.
 */
export function entriesInput(
  drafts: readonly IskurEntryDraft[],
): IskurWorkEntryInput[] | null {
  if (drafts.length > ISKUR_WEEK_ENTRIES_MAX) return null;
  const lines: IskurWorkEntryInput[] = [];
  for (const draft of drafts) {
    const minutes = parseMinutes(draft.minutes);
    if (minutes == null || lineProblem(draft) != null) return null;
    const support = draft.kind === IskurWorkEntryKind.SupportActivity;
    const title = draft.title.trim();
    lines.push({
      date: draft.date,
      kind: draft.kind,
      taskId: support ? null : draft.taskId,
      supportActivityId: support ? draft.supportActivityId : null,
      title: support ? null : title || null,
      minutes,
      output: support ? null : draft.output.trim() || null,
      note: support ? null : draft.note.trim() || null,
    });
  }
  return overflowingDays(drafts).length > 0 ? null : lines;
}

/** Minutes typed for a day so far; a line not yet a number counts as zero. */
export function dayMinutes(drafts: readonly IskurEntryDraft[], date: string) {
  return drafts
    .filter((draft) => draft.date === date)
    .reduce((total, draft) => total + (parseMinutes(draft.minutes) ?? 0), 0);
}

/** The days whose lines pass one work day. */
export function overflowingDays(drafts: readonly IskurEntryDraft[]) {
  const days = [...new Set(drafts.map((draft) => draft.date))];
  return days.filter((day) => dayMinutes(drafts, day) > ISKUR_DAY_MINUTES);
}

/** Bu Haftam's "Yapılacaklar": open tasks, meeting reports still to send, and the support-activity prompt. */
export function weekTodos(week: IskurWeek): IskurTodo[] {
  const todos: IskurTodo[] = week.tasks
    .filter((task) => task.status === IskurTaskStatus.Open)
    .map((task) => ({
      kind: IskurTodoKind.Task,
      taskId: task.id,
      title: task.title,
      dueDate: task.dueDate,
      needsOutput: task.needsOutput,
    }));
  const reports = week.mentoring.reportsDue - week.mentoring.reportsSubmitted;
  if (reports > 0)
    todos.unshift({ kind: IskurTodoKind.Reports, count: reports });
  if (week.needsSupportActivity) todos.push({ kind: IskurTodoKind.Support });
  return todos;
}

/** Where the meeting reports are written: "Faaliyet Raporum" on the Mentorluk Ver side. */
export const PEER_REPORTS_HREF = `${PEER_MENTOR_GIVE_HREF}&tab=report`;

/** A stable key for a to-do line. */
export function todoKey(todo: IskurTodo): string {
  switch (todo.kind) {
    case IskurTodoKind.Task:
      return `${todo.kind}-${todo.taskId}`;
    case IskurTodoKind.Request:
      return `${todo.kind}-${todo.requestId}`;
    case IskurTodoKind.MissingDay:
      return `${todo.kind}-${todo.date}`;
    case IskurTodoKind.Revision:
    case IskurTodoKind.Submit:
      return `${todo.kind}-${todo.weekStart}`;
    case IskurTodoKind.Reports:
    case IskurTodoKind.Support:
      return todo.kind;
  }
}

export function emptyDecisionForm(): IskurDecisionForm {
  return {
    decision: null,
    timeMatchesWork: false,
    effortDocumented: false,
    outputsSufficient: false,
    reason: "",
  };
}

/** The leader's decision as the backend takes it; null without a decision, or without a reason when one is needed. */
export function decisionInput(
  form: IskurDecisionForm,
): IskurWeekDecisionInput | null {
  if (form.decision == null) return null;
  const reason = form.reason.trim();
  if (form.decision !== IskurWeekDecision.Approve && !reason) return null;
  return {
    decision: form.decision,
    timeMatchesWork: form.timeMatchesWork,
    effortDocumented: form.effortDocumented,
    outputsSufficient: form.outputsSufficient,
    reason: reason || null,
  };
}

/** Whether the chosen decision needs a written reason (a revision or a rejection). */
export function reasonNeeded(form: IskurDecisionForm) {
  return form.decision != null && form.decision !== IskurWeekDecision.Approve;
}
