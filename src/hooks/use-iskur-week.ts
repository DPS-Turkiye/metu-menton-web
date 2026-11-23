"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useIskurMentorRequests } from "@/hooks/use-iskur-home";
import { iskurOnboardingQueryKey } from "@/hooks/use-iskur-onboarding";
import {
  IskurWeekDecision,
  IskurWeekStatus,
  IskurWorkEntryKind,
  type IskurWeek,
} from "@/interfaces/iskur-weeks";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import {
  addIskurSupportEntry,
  getIskurWeek,
  objectToIskurWeek,
  saveIskurWeekEntries,
  submitIskurWeek,
} from "@/lib/client/iskur-weeks";
import { todayTodos } from "@/lib/iskur-today";
import {
  dayMinutes,
  entriesInput,
  entryDrafts,
  ISKUR_REVIEW_QUEUE_KEY,
  ISKUR_SUPPORT_DEFAULT_MINUTES,
  ISKUR_WEEK_KEY,
  iskurWeekDays,
  iskurWeekLabel,
  lineProblem,
  overflowingDays,
  teamDraft,
} from "@/lib/iskur-weeks";
import { parseReportSearch } from "@/lib/peer-daily-report";
import {
  reportDayHref,
  reportDayOf,
  reportWeekDays,
  shiftReportWeek,
} from "@/lib/peer-reports";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import type { IskurEntryDraft } from "@/types/iskur-weeks";
import type { PeerReportView } from "@/types/peer-reports";

export const iskurWeekQueryKey = (weekStart: string | null) =>
  [ISKUR_WEEK_KEY, weekStart ?? "current"] as const;

function isNotPlaced(error: unknown) {
  return error instanceof ClientApiError && error.status === 404;
}

/** The changes a week allows, shared by Bu Haftam and Çalışma kaydı: every one answers with the whole week. */
function useWeekChanges(
  weekStart: string | null,
  onSaved: (data: IskurWeek) => void,
) {
  const t = useTranslations("iskurWeek");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (call: () => Promise<IskurWeek>) => call(),
    onSuccess: (data) => {
      // Bu Haftam keeps this week under its own "current" key: write both, so neither screen shows the old week.
      queryClient.setQueryData(iskurWeekQueryKey(data.weekStart), data);
      if (weekStart == null) {
        queryClient.setQueryData(iskurWeekQueryKey(null), data);
      }
      // A leader logs their own week too: their review queue on this device follows a sent week.
      void queryClient.invalidateQueries({
        queryKey: [ISKUR_REVIEW_QUEUE_KEY],
      });
      onSaved(data);
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });
  return {
    busy: change.isPending,
    run: (call: () => Promise<IskurWeek>) => {
      if (!change.isPending) change.mutate(call);
    },
  };
}

/**
 * The İŞKUR home (6.1/6.1b): "Bugün yapman gerekenler" from this week, last week, the onboarding schedule and the
 * received peer requests; this week's targets and what is logged; and a quick support-activity pick when no peer
 * meeting is planned. A person who is not placed gets neither block.
 */
export function useIskurThisWeek() {
  const [now] = useState(() => new Date());
  const today = reportDayOf(now.toISOString());
  const [hoursOpen, setHoursOpen] = useState(true);
  const [picking, setPicking] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: iskurWeekQueryKey(null),
    queryFn: () => getIskurWeek(null),
    retry: (failures, error) => !isNotPlaced(error) && failures < 1,
  });
  const week = query.data ?? null;
  // The list's other sources only refine it: if they fail it shows what the week alone gives. While they load the
  // blocks wait, so rows do not pop in and move the main button after the first paint.
  const form = useQuery({
    queryKey: iskurOnboardingQueryKey,
    queryFn: getIskurOnboarding,
    enabled: week != null,
    retry: false,
  });
  const previousStart = week ? shiftReportWeek(week.weekStart, -1) : null;
  const previous = useQuery({
    queryKey: iskurWeekQueryKey(previousStart),
    queryFn: () => getIskurWeek(previousStart),
    enabled: previousStart != null,
    retry: false,
  });
  const { received } = useIskurMentorRequests();
  const changes = useWeekChanges(null, () => setPicking(false));
  const chosen = activityId ?? week?.supportActivities[0]?.id ?? null;
  return {
    week,
    supportOptions: week?.supportActivities ?? [],
    hidden: isNotPlaced(query.error),
    loading:
      query.isPending ||
      (week != null && (form.isPending || previous.isPending)),
    failed: query.isError && !isNotPlaced(query.error),
    todos: week
      ? todayTodos({
          week,
          previousWeek: previous.data ?? null,
          form: form.data?.form ?? null,
          requests: received.waiting,
          today,
        })
      : [],
    hoursOpen,
    toggleHours: () => setHoursOpen((open) => !open),
    picking,
    startPicking: () => setPicking(true),
    cancelPicking: () => setPicking(false),
    activityId: chosen,
    setActivityId,
    busy: changes.busy,
    addSupport: () => {
      if (!week || !chosen) return;
      changes.run(() =>
        addIskurSupportEntry(week.weekStart, {
          activityId: chosen,
          date: today,
          minutes: ISKUR_SUPPORT_DEFAULT_MINUTES,
        }),
      );
    },
  };
}

/**
 * Çalışma kaydı (3.1 Günlük, 3.2 Haftalık): the view, week and day live in the URL like Faaliyet Raporum's, so a
 * notification's link lands on the right week. The day's lines are edited as a draft over the saved week, and the
 * draft and an objection belong to the week they were written in.
 */
export function useIskurWorkLog() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [now] = useState(() => new Date());
  const today = reportDayOf(now.toISOString());
  const search = parseReportSearch(
    Object.fromEntries(params.entries()),
    today,
    iskurWeekDays,
  );
  const query = useQuery({
    queryKey: iskurWeekQueryKey(search.week),
    queryFn: () => getIskurWeek(search.week),
    retry: (failures, error) => !isNotPlaced(error) && failures < 1,
  });
  // Only the week in the URL counts: while another week loads, nothing of the last one stays editable.
  const week = query.data?.weekStart === search.week ? query.data : null;
  const [draft, setDraft] = useState<{
    weekStart: string;
    lines: IskurEntryDraft[];
  } | null>(null);
  const [objectionDraft, setObjectionDraft] = useState<{
    weekStart: string;
    text: string;
  } | null>(null);
  // The two "add" pickers of the day: a task (empty = a line without one) and a support activity.
  const [pickedTask, setPickedTask] = useState("");
  const [pickedActivity, setPickedActivity] = useState("");
  const current = draft?.weekStart === search.week ? draft : null;
  const dirty = current != null;
  const lines = current ? current.lines : week ? entryDrafts(week.entries) : [];
  const objection =
    objectionDraft?.weekStart === search.week ? objectionDraft.text : "";
  const changes = useWeekChanges(search.week, (data) => {
    // A save that answers after a move to another week leaves that week's draft alone.
    setDraft((current) =>
      current?.weekStart === data.weekStart ? null : current,
    );
    setObjectionDraft((current) =>
      current?.weekStart === data.weekStart ? null : current,
    );
  });

  function go(next: { view?: PeerReportView; week?: string; day?: string }) {
    const target = new URLSearchParams(params.toString());
    target.set("view", next.view ?? search.view);
    target.set("week", next.week ?? search.week);
    if (next.day === undefined && next.week !== undefined) target.delete("day");
    else target.set("day", next.day ?? search.day);
    router.replace(`${pathname}?${target.toString()}`, { scroll: false });
  }
  const edit = (next: IskurEntryDraft[]) => {
    if (week) setDraft({ weekStart: search.week, lines: next });
  };
  const input = entriesInput(lines);
  const editable = week?.editable ?? false;
  const canObjectHere =
    week?.decision != null &&
    week.decision.decision !== IskurWeekDecision.Approve &&
    week.objection == null;

  return {
    week,
    loading: week == null && !query.isError,
    notPlaced: isNotPlaced(query.error),
    failed: query.isError && !isNotPlaced(query.error),
    view: search.view,
    setView: (view: PeerReportView) => go({ view }),
    weekStart: search.week,
    weekLabel: iskurWeekLabel(search.week, locale),
    previousWeek: () => go({ week: shiftReportWeek(search.week, -1) }),
    nextWeek: () => go({ week: shiftReportWeek(search.week, 1) }),
    canGoNext: shiftReportWeek(search.week, 1) <= today,
    days: iskurWeekDays(search.week),
    day: search.day,
    /** The mentoring report has working days only, so a weekend day links to none. */
    dailyReportHref: reportWeekDays(search.week).includes(search.day)
      ? reportDayHref(search.day)
      : null,
    today,
    selectDay: (day: string) => go({ day }),
    editable,
    lines,
    dayLines: lines.filter((line) => line.date === search.day),
    dayMinutes: dayMinutes(lines, search.day),
    canAddToDay: editable && search.day <= today,
    taskIds: week?.tasks.map((task) => task.id) ?? [],
    /** Haftalık shows what is saved, not an unsaved draft. */
    savedTeamLines: entryDrafts(week?.entries ?? []).filter(
      (line) => line.kind === IskurWorkEntryKind.Team,
    ),
    totalMinutes: week
      ? week.totals.teamMinutes + week.totals.mentoringMinutes
      : 0,
    resend: week?.status === IskurWeekStatus.RevisionRequested,
    overflowing: overflowingDays(lines),
    lineProblem,
    dirty,
    pickedTask,
    setPickedTask,
    pickedActivity,
    setPickedActivity,
    addTeamLine: () => {
      const task =
        week?.tasks.find((candidate) => candidate.id === pickedTask) ?? null;
      edit([...lines, teamDraft(search.day, task)]);
    },
    addSupportLine: () => {
      const activity = week?.supportActivities.find(
        (candidate) => candidate.id === pickedActivity,
      );
      if (!activity) return;
      edit([
        ...lines,
        {
          ...teamDraft(search.day, null),
          kind: IskurWorkEntryKind.SupportActivity,
          supportActivityId: activity.id,
          title: activity.title,
          minutes: String(ISKUR_SUPPORT_DEFAULT_MINUTES),
        },
      ]);
    },
    updateLine: (key: string, patch: Partial<Omit<IskurEntryDraft, "key">>) =>
      edit(
        lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
      ),
    removeLine: (key: string) => edit(lines.filter((line) => line.key !== key)),
    discard: () => setDraft(null),
    busy: changes.busy,
    canSave: editable && dirty && input != null && !changes.busy,
    save: () => {
      if (input) changes.run(() => saveIskurWeekEntries(search.week, input));
    },
    canSubmit: (week?.canSubmit ?? false) && !dirty && !changes.busy,
    submit: () => changes.run(() => submitIskurWeek(search.week)),
    objection,
    setObjection: (text: string) =>
      setObjectionDraft({ weekStart: search.week, text }),
    canObjectHere,
    canObject: canObjectHere && objection.trim().length > 0 && !changes.busy,
    object: () => {
      const text = objection.trim();
      if (text) changes.run(() => objectToIskurWeek(search.week, text));
    },
  };
}
