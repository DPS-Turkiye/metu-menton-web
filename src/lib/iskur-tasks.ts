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
import {
  IskurCompleteBlock,
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

/** "Mert: 12 → 14 sa / 16,5 sa": the assignee's planned time before and after this task, against their target. */
export function planPreview(
  member: IskurTeamTasksMember | null,
  estimatedMinutes: number,
): IskurPlanPreview | null {
  if (!member) return null;
  const after = member.plannedMinutes + estimatedMinutes;
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

/** A whole number of minutes from the form, or null when empty or not a positive number. */
export function parseMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes > 0 ? minutes : null;
}

export function isHttpsLink(value: string) {
  return /^https:\/\/\S+$/.test(value.trim());
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

/** What still stops "Görevi tamamla": the actual time, a valid link, and an output when the task asks for one. */
export function completeBlock(
  task: IskurTask,
  form: IskurTaskForm,
): IskurCompleteBlock | null {
  if (parseMinutes(form.actualMinutes) == null) {
    return IskurCompleteBlock.ActualMissing;
  }
  const link = form.outputLink.trim();
  if (link && !isHttpsLink(link)) return IskurCompleteBlock.LinkInvalid;
  if (task.needsOutput && !link && !form.outputNote.trim()) {
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
  return [...tasks].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] || a.dueDate.localeCompare(b.dueDate),
  );
}

/** The week's task count for the "Görevler" tab. */
export function taskCount(team: IskurTeamTasks | null) {
  return (
    team?.members.reduce((total, member) => total + member.tasks.length, 0) ?? 0
  );
}
