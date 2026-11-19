"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { IskurTaskInput, IskurTeamTasks } from "@/interfaces/iskur-tasks";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import { createIskurTask, getIskurTeamTasks } from "@/lib/client/iskur-tasks";
import {
  assignableMembers,
  assignInput,
  emptyAssignForm,
  planPreview,
  stepEstimate,
  taskCount,
} from "@/lib/iskur-tasks";
import { reportWeekLabel } from "@/lib/peer-daily-report";
import {
  reportDayOf,
  reportWeekStart,
  shiftReportWeek,
} from "@/lib/peer-reports";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import { IskurTeamTab, type IskurAssignForm } from "@/types/iskur-tasks";

/** Every cached week of Ekibim starts with this, so a task change can refresh them all. */
export const ISKUR_TEAM_TASKS_KEY = "iskur-team-tasks";

export const iskurTeamTasksQueryKey = (weekStart: string) =>
  [ISKUR_TEAM_TASKS_KEY, weekStart] as const;

function isNotPlaced(error: unknown) {
  return error instanceof ClientApiError && error.status === 404;
}

/**
 * Ekibim (2.1): the caller's team for one week, the tab shown, and the leader's "Görev ata" form. The form is a draft
 * over a fresh default, so it needs no effect to follow the team once it loads.
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

  const query = useQuery({
    queryKey: iskurTeamTasksQueryKey(weekStart),
    queryFn: () => getIskurTeamTasks(weekStart),
    retry: (failures, error) => !isNotPlaced(error) && failures < 1,
    // Another week keeps the screen (and the half-written form) while it loads.
    placeholderData: keepPreviousData,
  });
  const team = query.data ?? null;
  const form = draft ?? emptyAssignForm(team, today);
  const people = assignableMembers(team);
  const assignee =
    people.find((member) => member.userId === form.assigneeId) ?? null;
  const input = assignInput(form);

  const assign = useMutation({
    mutationFn: (input: IskurTaskInput) => createIskurTask(input),
    onSuccess: (data: IskurTeamTasks) => {
      queryClient.setQueryData(iskurTeamTasksQueryKey(data.weekStart), data);
      // A task due in another week shows there, so the leader sees what they assigned.
      setWeekStart(data.weekStart);
      setDraft(null);
      showToast({ message: t("assigned"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("assignFailed")),
        tone: ToastTone.Error,
      }),
  });

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
    weekLabel: reportWeekLabel(weekStart, locale),
    previousWeek: () => setWeekStart((week) => shiftReportWeek(week, -1)),
    nextWeek: () => setWeekStart((week) => shiftReportWeek(week, 1)),
    tab,
    setTab,
    taskCount: taskCount(team),
    memberCount: team?.roster.length ?? 0,
    today,
    form,
    people,
    preview: planPreview(assignee, form.estimatedMinutes),
    setTitle: (title: string) => update({ title }),
    setKind: (kind: IskurAssignForm["kind"]) => update({ kind }),
    setAssignee: (assigneeId: string) => update({ assigneeId }),
    setDueDate: (dueDate: string) => update({ dueDate }),
    setNeedsOutput: (needsOutput: boolean) => update({ needsOutput }),
    setDescription: (description: string) => update({ description }),
    lessTime: () =>
      update({ estimatedMinutes: stepEstimate(form.estimatedMinutes, -1) }),
    moreTime: () =>
      update({ estimatedMinutes: stepEstimate(form.estimatedMinutes, 1) }),
    canSubmit: input != null && !assign.isPending,
    submitting: assign.isPending,
    submit: () => {
      if (input && !assign.isPending) assign.mutate(input);
    },
    cancel: () => setDraft(null),
  };
}
