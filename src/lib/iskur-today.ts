import type { IskurOnboardingForm } from "@/interfaces/iskur-onboarding";
import { IskurWeekStatus, type IskurWeek } from "@/interfaces/iskur-weeks";
import { Weekday } from "@/interfaces/mentor";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import type { PeerMentoringRequest } from "@/interfaces/peer-mentoring";
import { dayMinutes } from "@/lib/iskur-onboarding";
import { iskurTaskHref, weekdayOf } from "@/lib/iskur-tasks";
import {
  iskurWorkLogHref,
  PEER_REPORTS_HREF,
  weekTodos,
} from "@/lib/iskur-weeks";
import { PEER_MENTOR_GIVE_HREF } from "@/lib/peer-mentoring";
import { reportDayOf, shiftReportDay } from "@/lib/peer-reports";
import { IskurTodoKind, type IskurTodo } from "@/types/iskur-weeks";

const DAYS_IN_WEEK = 7;
/** Without a schedule, a week counts as done from its Friday. */
const FRIDAY_OFFSET = 4;

export interface IskurTodayInput {
  week: IskurWeek;
  /** Last week, when it could be read. */
  previousWeek: IskurWeek | null;
  /** The intern's onboarding form: its schedule says which days are work days. */
  form: IskurOnboardingForm | null;
  /** The peer requests the caller received as a mentor. */
  requests: readonly PeerMentoringRequest[];
  /** "yyyy-mm-dd", Turkish time. */
  today: string;
}

export interface IskurPlannedDay {
  date: string;
  minutes: number;
}

/** The week's work days with the minutes planned on each, from the sent form; empty until it is sent. */
export function plannedDays(
  weekStart: string,
  form: IskurOnboardingForm | null,
): IskurPlannedDay[] {
  if (!form?.submittedAt) return [];
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) =>
    shiftReportDay(weekStart, offset),
  )
    .map((date) => {
      const weekday = weekdayOf(date);
      return {
        date,
        minutes: weekday == null ? 0 : dayMinutes(form.schedule, weekday),
      };
    })
    .filter((day) => day.minutes > 0);
}

/**
 * The work days before today with nothing logged, while the week can still be changed. Days before the form was sent
 * are left out: nobody owed a log on them, and a student placed mid-week would otherwise open on a list of misses.
 */
export function missingLogDays(
  week: IskurWeek,
  form: IskurOnboardingForm | null,
  today: string,
): IskurPlannedDay[] {
  if (!week.editable || !form?.submittedAt) return [];
  const from = reportDayOf(form.submittedAt);
  const logged = new Set(week.entries.map((entry) => entry.date));
  return plannedDays(week.weekStart, form).filter(
    (day) => day.date < today && day.date >= from && !logged.has(day.date),
  );
}

/** Whether the intern's week is over: today is their last work day or later. */
function weekOver(
  week: IskurWeek,
  form: IskurOnboardingForm | null,
  today: string,
) {
  const last =
    plannedDays(week.weekStart, form).at(-1)?.date ??
    shiftReportDay(week.weekStart, FRIDAY_OFFSET);
  return today >= last;
}

/**
 * A week the leader sent back, or one ready to send: last week's at once, this week's from its last work day. On a
 * Friday an unsent week always gets the "send it today" prompt, even before it has lines: that is the program's day
 * for the weekly summary. It is a prompt only; the backend sets no deadline.
 */
function weekTodo(
  week: IskurWeek,
  previous: boolean,
  form: IskurOnboardingForm | null,
  today: string,
): IskurTodo | null {
  if (!week.editable) return null;
  if (week.status === IskurWeekStatus.RevisionRequested) {
    return {
      kind: IskurTodoKind.Revision,
      weekStart: week.weekStart,
      previous,
      reason: week.decision?.reason ?? null,
    };
  }
  if (
    !previous &&
    week.status === IskurWeekStatus.Draft &&
    weekdayOf(today) === Weekday.Friday
  ) {
    return { kind: IskurTodoKind.FridaySubmit, weekStart: week.weekStart };
  }
  const due = previous || weekOver(week, form, today);
  if (week.status === IskurWeekStatus.Draft && week.canSubmit && due) {
    return { kind: IskurTodoKind.Submit, weekStart: week.weekStart, previous };
  }
  return null;
}

/**
 * "Bugün yapman gerekenler" on the İŞKUR home: meeting reports first, then a week sent back, new mentoring
 * requests, work days with no log, a week to send, the open tasks and the support-activity prompt.
 */
export function todayTodos({
  week,
  previousWeek,
  form,
  requests,
  today,
}: IskurTodayInput): IskurTodo[] {
  const base = weekTodos(week);
  const weeks = [
    previousWeek ? weekTodo(previousWeek, true, form, today) : null,
    weekTodo(week, false, form, today),
  ].filter((todo) => todo != null);
  const ofKind = (todos: readonly IskurTodo[], kind: IskurTodoKind) =>
    todos.filter((todo) => todo.kind === kind);
  const newRequests: IskurTodo[] = requests
    .filter((request) => request.status === MentorshipRequestStatus.Pending)
    .map((request) => ({
      kind: IskurTodoKind.Request,
      requestId: request.id,
      menteeName: request.mentee.fullName,
      category: request.category,
      createdAt: request.createdAt,
    }));
  const missing: IskurTodo[] = missingLogDays(week, form, today).map((day) => ({
    kind: IskurTodoKind.MissingDay,
    weekStart: week.weekStart,
    date: day.date,
    plannedMinutes: day.minutes,
  }));
  return [
    ...ofKind(base, IskurTodoKind.Reports),
    ...ofKind(weeks, IskurTodoKind.Revision),
    ...newRequests,
    ...missing,
    ...ofKind(weeks, IskurTodoKind.FridaySubmit),
    ...ofKind(weeks, IskurTodoKind.Submit),
    ...ofKind(base, IskurTodoKind.Task),
    ...ofKind(base, IskurTodoKind.Support),
  ];
}

/**
 * Where a to-do's action leads: the report, the requests, the day or the week in Çalışma kaydı, or the task. The
 * support prompt has no link; it is answered in place.
 */
export function todoHref(todo: IskurTodo): string | null {
  switch (todo.kind) {
    case IskurTodoKind.Reports:
      return PEER_REPORTS_HREF;
    case IskurTodoKind.Request:
      return PEER_MENTOR_GIVE_HREF;
    case IskurTodoKind.MissingDay:
      return iskurWorkLogHref(todo.weekStart, false, todo.date);
    case IskurTodoKind.Revision:
    case IskurTodoKind.Submit:
    case IskurTodoKind.FridaySubmit:
      return iskurWorkLogHref(todo.weekStart, true);
    case IskurTodoKind.Task:
      return iskurTaskHref(todo.taskId);
    case IskurTodoKind.Support:
      return null;
  }
}
