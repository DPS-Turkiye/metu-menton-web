import {
  IskurTaskKind,
  IskurTaskStatus,
  type IskurTask,
  type IskurTaskInput,
  type IskurTaskUpdateInput,
  type IskurTeamTasks,
  type IskurTeamTasksMember,
} from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { Weekday } from "@/interfaces/mentor";
import { ISKUR_DOCUMENT_MAX_BYTES } from "@/lib/iskur-onboarding";
import { fromIsoDay } from "@/lib/peer-reports";
import { ISO_DAY_PATTERN } from "@/lib/utils";
import {
  IskurCompleteBlock,
  IskurOutputProblem,
  type IskurAssignForm,
  type IskurPlanPreview,
  type IskurTaskForm,
} from "@/types/iskur-tasks";

/** The backend's limits (`iskur_task`, `iskur_support_activity`). */
export const ISKUR_TASK_TITLE_MAX = 200;
export const ISKUR_TASK_DESCRIPTION_MAX = 1000;
export const ISKUR_NOTE_MAX = 500;
export const ISKUR_SUPPORT_TITLE_MAX = 120;
/** 2.1: "Min 1 sa · maks 7,5 sa · 30 dk adım". */
export const ISKUR_TASK_MIN_MINUTES = 60;
export const ISKUR_TASK_MAX_MINUTES = 450;
export const ISKUR_TASK_STEP_MINUTES = 30;
export const ISKUR_TASK_DEFAULT_MINUTES = 120;
/** The actual time may run over the estimate, up to a three-day week. */
export const ISKUR_TASK_MAX_ACTUAL_MINUTES = 1350;
export const ISKUR_SUPPORT_DESCRIPTION_MAX = 500;
export const ISKUR_HTTPS_LINK = /^https:\/\/\S+$/;
/** The backend's limits for a task's handed-in files (`IskurTaskOutputFiles`, `DocumentKind.ISKUR_TASK_OUTPUT`). */
export const ISKUR_TASK_OUTPUT_MAX_FILES = 5;
/** The same 10 MB the upload route checks (`readIskurDocumentUpload`). */
export const ISKUR_TASK_OUTPUT_MAX_BYTES = ISKUR_DOCUMENT_MAX_BYTES;
export const ISKUR_TASK_OUTPUT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "docx",
  "xlsx",
  "pptx",
  "zip",
] as const;
/** For the file picker; the backend decides from the file's bytes. */
export const ISKUR_TASK_OUTPUT_ACCEPT = ISKUR_TASK_OUTPUT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

export const ISKUR_TASK_KINDS: readonly IskurTaskKind[] = [
  IskurTaskKind.TeamTask,
  IskurTaskKind.Event,
  IskurTaskKind.Corporate,
  IskurTaskKind.ContributionProject,
];

export const ISKUR_TEAM_HREF = "/student/team";

export function iskurTaskHref(taskId: string) {
  return `${ISKUR_TEAM_HREF}/tasks/${encodeURIComponent(taskId)}`;
}

/** One half-hour step up or down, kept between one hour and one work day. */
export function stepEstimate(minutes: number, direction: 1 | -1) {
  const next = minutes + direction * ISKUR_TASK_STEP_MINUTES;
  return Math.min(
    ISKUR_TASK_MAX_MINUTES,
    Math.max(ISKUR_TASK_MIN_MINUTES, next),
  );
}

/** The people a leader may give a task to: themselves and their own sub-group. */
export function assignableMembers(team: IskurTeamTasks | null) {
  return team?.members.filter((member) => member.assignable) ?? [];
}

/** A fresh "Görev ata" form: the first member of the sub-group (not the leader), due today. */
export function emptyAssignForm(
  team: IskurTeamTasks | null,
  today: string,
): IskurAssignForm {
  const people = assignableMembers(team);
  const firstMember =
    people.find((member) => member.role === IskurTeamRole.Member) ??
    people[0] ??
    null;
  return {
    title: "",
    kind: IskurTaskKind.TeamTask,
    assigneeId: firstMember?.userId ?? null,
    estimatedMinutes: ISKUR_TASK_DEFAULT_MINUTES,
    dueDate: today,
    needsOutput: false,
    description: "",
  };
}

/** A task back in the form, for "Düzenle" and "Başka üyeye ata". */
export function editAssignForm(task: IskurTask): IskurAssignForm {
  return {
    title: task.title,
    kind: task.kind,
    assigneeId: task.assignee.userId,
    estimatedMinutes: task.estimatedMinutes,
    dueDate: task.dueDate,
    needsOutput: task.needsOutput,
    description: task.description ?? "",
  };
}

/** The title of the person's open contribution project, which a second one may not join; the edited task aside. */
export function otherContributionProject(
  member: IskurTeamTasksMember | null,
  editedTaskId: string | null,
): string | null {
  return (
    member?.tasks.find(
      (task) =>
        task.kind === IskurTaskKind.ContributionProject &&
        task.status === IskurTaskStatus.Open &&
        task.id !== editedTaskId,
    )?.title ?? null
  );
}

/** "2 görev + katkı projesi" on a member's row: their tasks this week, the contribution project aside. */
export function memberTaskCounts(member: IskurTeamTasksMember) {
  const project = member.tasks.some(
    (task) => task.kind === IskurTaskKind.ContributionProject,
  );
  return {
    tasks: member.tasks.filter(
      (task) => task.kind !== IskurTaskKind.ContributionProject,
    ).length,
    project,
  };
}

/** How full the plan is against the target, 0–100; null without a target. */
export function planPercent(member: IskurTeamTasksMember) {
  if (!member.teamMinutes) return null;
  return Math.min(
    100,
    Math.floor((member.plannedMinutes / member.teamMinutes) * 100),
  );
}

/** The form as the backend takes it; null while the title or the assignee is missing. */
export function assignInput(form: IskurAssignForm): IskurTaskInput | null {
  const title = form.title.trim();
  if (!title || !form.assigneeId || !form.dueDate) return null;
  const description = form.description.trim();
  return {
    assigneeId: form.assigneeId,
    title,
    kind: form.kind,
    estimatedMinutes: form.estimatedMinutes,
    dueDate: form.dueDate,
    needsOutput: form.needsOutput,
    description: description || null,
  };
}

const WEEKDAY_OF_JS_DAY: readonly Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];

/** The weekday of a "yyyy-mm-dd" day; null for anything that is not one. */
export function weekdayOf(day: string): Weekday | null {
  if (!ISO_DAY_PATTERN.test(day)) return null;
  return WEEKDAY_OF_JS_DAY[fromIsoDay(day).getDay()] ?? null;
}

/**
 * Whether the due date ("yyyy-mm-dd") is one of the assignee's work days: null while they have not given their days,
 * when any day is accepted.
 */
export function dueOnWorkDay(
  member: IskurTeamTasksMember | null,
  dueDate: string,
): boolean | null {
  const weekday = weekdayOf(dueDate);
  if (!member || member.workDays.length === 0 || weekday == null) return null;
  return member.workDays.includes(weekday);
}

/**
 * "Mert: 12 → 14 sa / 16,5 sa": the assignee's planned time before and after this task, against their target. A task
 * being edited leaves its own saved time out of the plan it already counts in.
 */
export function planPreview(
  member: IskurTeamTasksMember | null,
  estimatedMinutes: number,
  edited: IskurTask | null = null,
): IskurPlanPreview | null {
  if (!member) return null;
  const counted =
    edited?.assignee.userId === member.userId &&
    edited.status !== IskurTaskStatus.HandedOver
      ? edited.estimatedMinutes
      : 0;
  const after = member.plannedMinutes - counted + estimatedMinutes;
  return {
    fullName: member.fullName,
    before: member.plannedMinutes,
    after,
    target: member.teamMinutes,
    over: member.teamMinutes != null && after > member.teamMinutes,
  };
}

/** A member's card in the list: "12 sa planlı / 16,5 sa", warned when the plan meets or passes the target. */
export function isPlanFull(member: IskurTeamTasksMember) {
  return (
    member.teamMinutes != null && member.plannedMinutes >= member.teamMinutes
  );
}

export function taskForm(task: IskurTask): IskurTaskForm {
  return {
    actualMinutes: task.actualMinutes == null ? "" : String(task.actualMinutes),
    outputLink: task.outputLink ?? "",
    outputNote: task.outputNote ?? "",
    handoverReason: task.handoverReason ?? "",
  };
}

/** A whole number of minutes from the form, or null when empty, not a positive number, or over a three-day week. */
export function parseMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes > 0 && minutes <= ISKUR_TASK_MAX_ACTUAL_MINUTES
    ? minutes
    : null;
}

export function isHttpsLink(value: string) {
  return ISKUR_HTTPS_LINK.test(value.trim());
}

/** Whether the typed time can be saved: empty, or a valid number of minutes. */
export function minutesSavable(form: IskurTaskForm) {
  return !form.actualMinutes.trim() || parseMinutes(form.actualMinutes) != null;
}

/** The assignee's save: their time, output and (for a handover) reason, with the status to move to. */
export function taskUpdateInput(
  form: IskurTaskForm,
  status: IskurTaskStatus | null,
): IskurTaskUpdateInput {
  const link = form.outputLink.trim();
  const note = form.outputNote.trim();
  const reason = form.handoverReason.trim();
  return {
    status,
    actualMinutes: parseMinutes(form.actualMinutes),
    outputLink: link || null,
    outputNote: note || null,
    handoverReason:
      status === IskurTaskStatus.HandedOver ? reason || null : null,
  };
}

/** Why a chosen file cannot be handed in, before it is sent; the backend checks the content too. */
export function taskOutputProblem(file: {
  name: string;
  size: number;
}): IskurOutputProblem | null {
  if (file.size === 0) return IskurOutputProblem.Empty;
  if (file.size > ISKUR_TASK_OUTPUT_MAX_BYTES) {
    return IskurOutputProblem.TooLarge;
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot < 0 ? "" : file.name.slice(dot + 1).toLowerCase();
  return ISKUR_TASK_OUTPUT_EXTENSIONS.some((allowed) => allowed === extension)
    ? null
    : IskurOutputProblem.WrongType;
}

/**
 * What still stops "Görevi tamamla": the actual time, a valid link, and an output when the task asks for one (a
 * link, a note or a handed-in file).
 */
export function completeBlock(
  task: IskurTask,
  form: IskurTaskForm,
): IskurCompleteBlock | null {
  if (parseMinutes(form.actualMinutes) == null) {
    return IskurCompleteBlock.ActualMissing;
  }
  const link = form.outputLink.trim();
  if (link && !isHttpsLink(link)) return IskurCompleteBlock.LinkInvalid;
  if (
    task.needsOutput &&
    !link &&
    !form.outputNote.trim() &&
    task.outputFiles.length === 0
  ) {
    return IskurCompleteBlock.OutputMissing;
  }
  return null;
}

/** Whether the typed link can be saved: empty, or an https address. */
export function linkSavable(form: IskurTaskForm) {
  const link = form.outputLink.trim();
  return !link || isHttpsLink(link);
}

/** A member's tasks in the order 2.1 lists them: open first, then handed over, then done; by due date inside. */
export function orderedTasks(tasks: readonly IskurTask[]) {
  const rank: Record<IskurTaskStatus, number> = {
    [IskurTaskStatus.Open]: 0,
    [IskurTaskStatus.HandedOver]: 1,
    [IskurTaskStatus.Done]: 2,
  };
  const byDay = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...tasks].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      byDay(a.dueDate, b.dueDate) ||
      byDay(a.createdAt, b.createdAt),
  );
}

/** The week's task count for the "Görevler" tab. */
export function taskCount(team: IskurTeamTasks | null) {
  return (
    team?.members.reduce((total, member) => total + member.tasks.length, 0) ?? 0
  );
}
