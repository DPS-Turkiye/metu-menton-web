"use client";

import {
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  LifeBuoy,
  RotateCcw,
  Send,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { IskurProgressCard } from "@/components/student/iskur/progress-card";
import { useIskurThisWeek } from "@/hooks/use-iskur-week";
import { useReportDuration } from "@/hooks/use-report-format";
import { ISKUR_TEAM_HREF } from "@/lib/iskur-tasks";
import { todoHref } from "@/lib/iskur-today";
import { iskurWorkLogHref, todoKey } from "@/lib/iskur-weeks";
import { reportWeekLabel } from "@/lib/peer-daily-report";
import { formatReportDay } from "@/lib/peer-weekly-report";
import { formatDateTime } from "@/lib/utils";
import { IskurTodoKind, type IskurTodo } from "@/types/iskur-weeks";

type ThisWeek = ReturnType<typeof useIskurThisWeek>;

/**
 * The İŞKUR home's own blocks (Figma 6.1/6.1b): "Bugün yapman gerekenler", then "Bu Haftam" with the week's hours on
 * each side.
 */
export function IskurThisWeekCard() {
  const t = useTranslations("iskurWeek.card");
  const locale = useLocale();
  const state = useIskurThisWeek();
  const week = state.week;
  if (state.failed) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  if (state.hidden || state.loading || !week) return null;

  return (
    <>
      <IskurToday state={state} />
      <section
        aria-labelledby="iskur-this-week"
        className="rounded-card border border-border-default bg-background-surface p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="iskur-this-week" className="type-h3 text-text-primary">
            {t("title", { week: reportWeekLabel(week.weekStart, locale) })}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size={ButtonSize.Small}
              variant={ButtonVariant.Ghost}
              href={ISKUR_TEAM_HREF}
            >
              {t("team")}
            </Button>
            <Button
              size={ButtonSize.Small}
              variant={ButtonVariant.Secondary}
              href={iskurWorkLogHref(week.weekStart)}
            >
              {t("openLog")}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-card border border-border-default">
          <button
            type="button"
            onClick={state.toggleHours}
            aria-expanded={state.hoursOpen}
            aria-controls="iskur-this-week-hours"
            className="flex w-full items-center justify-between px-4 py-3 type-label text-text-primary focus-visible:outline-2 focus-visible:outline-border-selected"
          >
            {t("hours")}
            {state.hoursOpen ? (
              <ChevronUp aria-hidden className="size-4" />
            ) : (
              <ChevronDown aria-hidden className="size-4" />
            )}
          </button>
          <div
            id="iskur-this-week-hours"
            hidden={!state.hoursOpen}
            className="grid gap-3 px-4 pb-4 md:grid-cols-2"
          >
            <IskurProgressCard
              title={t("mentoring")}
              caption={t("logged")}
              logged={week.totals.mentoringMinutes}
              target={week.split?.mentoringMinutes ?? null}
            />
            <IskurProgressCard
              title={t("teamWork")}
              caption={t("logged")}
              logged={week.totals.teamMinutes}
              target={week.split?.teamMinutes ?? null}
            />
          </div>
        </div>
      </section>
    </>
  );
}

/** "Bugün yapman gerekenler": one row per thing to do, the first one's action as the block's main button. */
function IskurToday({ state }: { state: ThisWeek }) {
  const t = useTranslations("iskurToday");
  return (
    <section aria-labelledby="iskur-today" className="flex flex-col gap-3.5">
      <h2
        id="iskur-today"
        className="flex items-baseline gap-2 type-h3 text-text-primary"
      >
        {t("title")}
        {state.todos.length > 0 ? (
          <span aria-hidden className="type-body-sm text-text-muted">
            {state.todos.length}
          </span>
        ) : null}
      </h2>
      {state.todos.length === 0 ? (
        <p className="rounded-card border border-border-subtle p-5 type-body-sm text-text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-default bg-background-surface">
          {state.todos.map((todo, index) => (
            <li key={todoKey(todo)} className="px-4 py-3">
              {todo.kind === IskurTodoKind.Support ? (
                <SupportTodo state={state} />
              ) : (
                <TodoRow todo={todo} primary={index === 0} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const TODO_ICONS: Record<IskurTodoKind, LucideIcon> = {
  [IskurTodoKind.Reports]: Hourglass,
  [IskurTodoKind.Revision]: RotateCcw,
  [IskurTodoKind.Request]: User,
  [IskurTodoKind.MissingDay]: Clock,
  [IskurTodoKind.Submit]: Send,
  [IskurTodoKind.FridaySubmit]: Send,
  [IskurTodoKind.Task]: Users,
  [IskurTodoKind.Support]: LifeBuoy,
};

interface TodoText {
  title: string;
  hint: string;
  action: string;
}

/** The words of a row; which rows exist and where they lead is decided in lib/iskur-today. */
function useTodoText(todo: IskurTodo): TodoText {
  const t = useTranslations("iskurToday");
  const tCard = useTranslations("iskurWeek.card");
  const tTopic = useTranslations("peerTopics");
  const locale = useLocale();
  const duration = useReportDuration();
  const dayLabel = (day: string) => {
    const { weekday, date } = formatReportDay(day, locale);
    return `${weekday}, ${date}`;
  };
  switch (todo.kind) {
    case IskurTodoKind.Reports:
      return {
        title: tCard("reports", { count: todo.count }),
        hint: tCard("reportsHint"),
        action: t("actions.writeReport"),
      };
    case IskurTodoKind.Request:
      return {
        title: t("request", { name: todo.menteeName }),
        hint: t("requestHint", {
          topic: tTopic(todo.category),
          date: formatDateTime(todo.createdAt, locale),
        }),
        action: t("actions.reply"),
      };
    case IskurTodoKind.MissingDay:
      return {
        title: t("missingDay", { day: dayLabel(todo.date) }),
        hint: t("missingDayHint", { planned: duration(todo.plannedMinutes) }),
        action: t("actions.complete"),
      };
    case IskurTodoKind.Revision:
      return {
        title: t(todo.previous ? "revisionPrevious" : "revision"),
        hint: todo.reason
          ? t("revisionHint", { reason: todo.reason })
          : t("revisionNoReason"),
        action: t("actions.fix"),
      };
    case IskurTodoKind.Submit:
      return {
        title: t(todo.previous ? "submitPrevious" : "submit"),
        hint: t("submitHint"),
        action: t("actions.send"),
      };
    case IskurTodoKind.FridaySubmit:
      return {
        title: t("submitToday"),
        hint: t("submitTodayHint"),
        action: t("actions.send"),
      };
    case IskurTodoKind.Task:
      return {
        title: todo.title,
        hint: tCard(todo.needsOutput ? "taskWithOutput" : "task", {
          day: dayLabel(todo.dueDate),
        }),
        action: t("actions.open"),
      };
    case IskurTodoKind.Support:
      return {
        title: tCard("support"),
        hint: tCard("supportHint"),
        action: tCard("supportChoose"),
      };
  }
}

function TodoRow({ todo, primary }: { todo: IskurTodo; primary: boolean }) {
  const text = useTodoText(todo);
  const href = todoHref(todo);
  const Icon = TODO_ICONS[todo.kind];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Icon aria-hidden className="size-4 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="type-body text-text-primary">{text.title}</p>
        <p className="type-caption text-text-muted">{text.hint}</p>
      </div>
      {href ? (
        <Button
          size={ButtonSize.Small}
          variant={primary ? ButtonVariant.Primary : ButtonVariant.Secondary}
          href={href}
          aria-label={`${text.action}: ${text.title}`}
        >
          {text.action}
        </Button>
      ) : null}
    </div>
  );
}

/** The support-activity prompt, answered in place: pick one from the pool and add an hour today. */
function SupportTodo({ state }: { state: ThisWeek }) {
  const t = useTranslations("iskurWeek.card");
  const options = state.supportOptions;
  return (
    <div className="flex items-start gap-3">
      <LifeBuoy aria-hidden className="mt-1 size-4 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="type-body text-text-primary">{t("support")}</p>
        <p className="type-caption text-text-muted">{t("supportHint")}</p>
        {state.picking ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="iskur-support-pick">
              {t("supportPick")}
            </label>
            <select
              id="iskur-support-pick"
              value={state.activityId ?? ""}
              onChange={(event) => state.setActivityId(event.target.value)}
              className="h-10 rounded-input border border-border-control bg-background-surface px-3 type-body-sm"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
            <Button
              size={ButtonSize.Small}
              onClick={state.addSupport}
              disabled={state.busy || state.activityId == null}
            >
              {t("supportAdd")}
            </Button>
            <Button
              size={ButtonSize.Small}
              variant={ButtonVariant.Ghost}
              onClick={state.cancelPicking}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : options.length > 0 ? (
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Secondary}
            onClick={state.startPicking}
          >
            {t("supportChoose")}
          </Button>
        ) : (
          <p className="type-caption text-text-muted">{t("supportEmpty")}</p>
        )}
      </div>
    </div>
  );
}
