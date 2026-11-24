"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useIskurReviewQueue } from "@/hooks/use-iskur-review";
import {
  IskurTaskKind,
  type IskurTask,
  type IskurTaskInput,
  type IskurTeamTasks,
} from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  createIskurTask,
  deleteIskurTask,
  editIskurTask,
  getIskurTeamTasks,
} from "@/lib/client/iskur-tasks";
import {
  assignableMembers,
  assignInput,
  dueOnWorkDay,
  editAssignForm,
  emptyAssignForm,
  otherContributionProject,
  planPreview,
  stepEstimate,
  taskCount,
} from "@/lib/iskur-tasks";
import { iskurWeekLabel } from "@/lib/iskur-weeks";
import {
  reportDayOf,
  reportWeekStart,
  shiftReportWeek,
} from "@/lib/peer-reports";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import {
  IskurAssignMode,
  IskurTeamTab,
  type IskurAssignForm,
} from "@/types/iskur-tasks";

/** Every cached week of Ekibim starts with this, so a task change can refresh them all. */
export const ISKUR_TEAM_TASKS_KEY = "iskur-team-tasks";

export const iskurTeamTasksQueryKey = (weekStart: string) =>
  [ISKUR_TEAM_TASKS_KEY, weekStart] as const;

function isNotPlaced(error: unknown) {
  return error instanceof ClientApiError && error.status === 404;
}

/**
 * Ekibim (Figma 9.1): the caller's team for one week, the tab shown, the member whose tasks are listed, and the
 * leader's form for a new task or one they edit, give to someone else or cancel. The form is a draft over a fresh
 * default, so it needs no effect to follow the team once it loads.
 */
export function useIskurTeam() {
  const t = useTranslations("iskurTeam");
  const locale = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const today = reportDayOf(now.toISOString());
  const [weekStart, setWeekStart] = useState(() => reportWeekStart(now));
  const [tab, setTab] = useState(IskurTeamTab.Tasks);
  const [draft, setDraft] = useState<IskurAssignForm | null>(null);
  const [edited, setEdited] = useState<{
    task: IskurTask;
    mode: IskurAssignMode.Edit | IskurAssignMode.Reassign;
  } | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<IskurTask | null>(null);

  const query = useQuery({
    queryKey: iskurTeamTasksQueryKey(weekStart),
    queryFn: () => getIskurTeamTasks(weekStart),
    retry: (failures, error) => !isNotPlaced(error) && failures < 1,
    // Another week keeps the screen (and the half-written form) while it loads.
    placeholderData: keepPreviousData,
  });
  const team = query.data ?? null;
  // "Haftalık kayıtlar" is a leader's tab: the weeks of the people they review, for the week shown.
  const reviews = useIskurReviewQueue(
    { programId: null },
    weekStart,
    team?.viewerRole === IskurTeamRole.Leader,
  );
  const form =
    draft ??
    (edited ? editAssignForm(edited.task) : emptyAssignForm(team, today));
  const people = assignableMembers(team);
  const assignee =
    people.find((member) => member.userId === form.assigneeId) ?? null;
  const input = assignInput(form);
  const onWorkDay = dueOnWorkDay(assignee, form.dueDate);
  const mode = edited?.mode ?? IskurAssignMode.Create;
  // As on the backend, a due date and person left as they were are not checked again.
  const dayChecked =
    form.dueDate !== edited?.task.dueDate ||
    form.assigneeId !== edited.task.assignee.userId;
  // A second contribution project is refused, so the form says so before it is sent.
  const otherProject = otherContributionProject(
    assignee,
    edited?.task.id ?? null,
  );
  const blockedByProject =
    form.kind === IskurTaskKind.ContributionProject && otherProject !== null;
  const shown =
    team?.members.find((member) => member.userId === shownId) ??
    team?.members.find((member) => member.userId === form.assigneeId) ??
    team?.members[0] ??
    null;
  const unchanged =
    edited !== null &&
    JSON.stringify(form) === JSON.stringify(editAssignForm(edited.task));
  const closeForm = () => {
    setDraft(null);
    setEdited(null);
  };

  const assign = useMutation({
    mutationFn: (input: IskurTaskInput) =>
      edited ? editIskurTask(edited.task.id, input) : createIskurTask(input),
    onSuccess: async (data: IskurTeamTasks, sent) => {
      // A task moved to another week leaves the one it was in.
      if (edited) {
        await queryClient.invalidateQueries({
          queryKey: [ISKUR_TEAM_TASKS_KEY],
        });
      }
      queryClient.setQueryData(iskurTeamTasksQueryKey(data.weekStart), data);
      // A task due in another week shows there, so the leader sees what they assigned.
      setWeekStart(data.weekStart);
      setShownId(sent.assigneeId);
      closeForm();
      showToast({
        message: t(edited ? "edited" : "assigned"),
        tone: ToastTone.Success,
      });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("assignFailed")),
        tone: ToastTone.Error,
      }),
  });

  const cancelTask = useMutation({
    mutationFn: (task: IskurTask) => deleteIskurTask(task.id),
    onSuccess: async (data: IskurTeamTasks, task) => {
      await queryClient.invalidateQueries({ queryKey: [ISKUR_TEAM_TASKS_KEY] });
      queryClient.setQueryData(iskurTeamTasksQueryKey(data.weekStart), data);
      setCancelling(null);
      if (edited?.task.id === task.id) closeForm();
      showToast({ message: t("cancelled"), tone: ToastTone.Success });
    },
    onError: (failure: Error) => {
      setCancelling(null);
      showToast({
        message: errorMessage(failure, t("cancelFailed")),
        tone: ToastTone.Error,
      });
    },
  });

  const startEdit = (
    task: IskurTask,
    mode: IskurAssignMode.Edit | IskurAssignMode.Reassign,
  ) => {
    setDraft(null);
    setEdited({ task, mode });
    setShownId(task.assignee.userId);
  };

  const update = (patch: Partial<IskurAssignForm>) =>
    setDraft({ ...form, ...patch });

  return {
    team,
    loading: query.isPending,
    fetching: query.isFetching,
    notPlaced: isNotPlaced(query.error),
    failed: query.isError && !isNotPlaced(query.error),
    retry: () => void query.refetch(),
    weekStart,
    weekLabel: iskurWeekLabel(weekStart, locale),
    previousWeek: () => setWeekStart((week) => shiftReportWeek(week, -1)),
    nextWeek: () => setWeekStart((week) => shiftReportWeek(week, 1)),
    tab,
    setTab,
    taskCount: taskCount(team),
    memberCount: team?.roster.length ?? 0,
    reviews,
    /** The earliest due date the form takes: today, or a late task's own date while it stays. */
    earliestDue:
      edited && edited.task.dueDate < today ? edited.task.dueDate : today,
    form,
    people,
    /** The member whose tasks are listed under the team's workload. */
    shown,
    show: setShownId,
    mode,
    editedTask: edited?.task ?? null,
    /** "Görev ata" on a member's row: a new task for them. */
    startAssign: (userId: string) => {
      setEdited(null);
      setShownId(userId);
      setDraft({ ...emptyAssignForm(team, today), assigneeId: userId });
    },
    startEdit: (task: IskurTask) => startEdit(task, IskurAssignMode.Edit),
    startReassign: (task: IskurTask) =>
      startEdit(task, IskurAssignMode.Reassign),
    cancelling,
    askCancel: setCancelling,
    dismissCancel: () => setCancelling(null),
    confirmCancel: () => {
      if (cancelling && !cancelTask.isPending) cancelTask.mutate(cancelling);
    },
    isCancelling: cancelTask.isPending,
    otherProject,
    preview: planPreview(assignee, form.estimatedMinutes, edited?.task ?? null),
    /** true / false once the assignee has given their work days; null before. */
    onWorkDay,
    // Another leader's member is not on the list, but their task can still be edited.
    assigneeName: assignee?.fullName ?? edited?.task.assignee.fullName ?? "",
    setTitle: (title: string) => update({ title }),
    setKind: (kind: IskurAssignForm["kind"]) => update({ kind }),
    setAssignee: (assigneeId: string) => {
      update({ assigneeId });
      setShownId(assigneeId);
    },
    setDueDate: (dueDate: string) => update({ dueDate }),
    setNeedsOutput: (needsOutput: boolean) => update({ needsOutput }),
    setDescription: (description: string) => update({ description }),
    lessTime: () =>
      update({ estimatedMinutes: stepEstimate(form.estimatedMinutes, -1) }),
    moreTime: () =>
      update({ estimatedMinutes: stepEstimate(form.estimatedMinutes, 1) }),
    canSubmit:
      input != null &&
      (onWorkDay !== false || !dayChecked) &&
      !blockedByProject &&
      !unchanged &&
      !assign.isPending,
    submitting: assign.isPending,
    submit: () => {
      if (input && !assign.isPending) assign.mutate(input);
    },
    cancel: closeForm,
  };
}
