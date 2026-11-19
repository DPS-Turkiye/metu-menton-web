"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { IskurProgressCard } from "@/components/student/iskur/progress-card";
import { useIskurThisWeek } from "@/hooks/use-iskur-week";
import { ISKUR_TEAM_HREF, iskurTaskHref } from "@/lib/iskur-tasks";
import {
  iskurWorkLogHref,
  PEER_REPORTS_HREF,
  todoKey,
} from "@/lib/iskur-weeks";
import { reportWeekLabel } from "@/lib/peer-daily-report";
import { formatReportDay } from "@/lib/peer-weekly-report";
import { IskurTodoKind, type IskurTodo } from "@/types/iskur-weeks";

type ThisWeek = ReturnType<typeof useIskurThisWeek>;

/** "Bu Haftam" on the İŞKUR home (Figma 1.1a/1.1b): the week's hours on each side, and what is left to do. */
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

      <h3 className="mt-6 type-label text-text-primary">{t("todos")}</h3>
      {state.todos.length === 0 ? (
        <p className="mt-2 type-body-sm text-text-muted">{t("noTodos")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-card border border-border-default">
          {state.todos.map((todo) => (
            <li key={todoKey(todo)} className="px-4 py-3">
              <Todo todo={todo} state={state} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Todo({ todo, state }: { todo: IskurTodo; state: ThisWeek }) {
  const t = useTranslations("iskurWeek.card");
  const locale = useLocale();
  if (todo.kind === IskurTodoKind.Task) {
    const due = formatReportDay(todo.dueDate, locale);
    return (
      <Link
        href={iskurTaskHref(todo.taskId)}
        className="block focus-visible:outline-2 focus-visible:outline-border-selected"
      >
        <span className="block type-body text-text-primary">{todo.title}</span>
        <span className="block type-caption text-text-muted">
          {t(todo.needsOutput ? "taskWithOutput" : "task", {
            day: `${due.weekday}, ${due.date}`,
          })}
        </span>
      </Link>
    );
  }
  if (todo.kind === IskurTodoKind.Reports) {
    return (
      <Link
        href={PEER_REPORTS_HREF}
        className="block focus-visible:outline-2 focus-visible:outline-border-selected"
      >
        <span className="block type-body text-text-primary">
          {t("reports", { count: todo.count })}
        </span>
        <span className="block type-caption text-text-muted">
          {t("reportsHint")}
        </span>
      </Link>
    );
  }
  const options = state.supportOptions;
  return (
    <div className="space-y-2">
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
  );
}
