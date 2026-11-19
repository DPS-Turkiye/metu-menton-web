"use client";

import { ChevronLeft, ChevronRight, Lock, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS, Segmented } from "@/components/student/iskur-ui";
import { IskurProgressCard } from "@/components/student/iskur/progress-card";
import { WEEK_STATUS_TONES } from "@/components/student/iskur/week-status";
import { useIskurWorkLog } from "@/hooks/use-iskur-week";
import { useReportDuration } from "@/hooks/use-report-format";
import { IskurWorkEntryKind, type IskurWeek } from "@/interfaces/iskur-weeks";
import {
  ISKUR_NOTE_MAX,
  ISKUR_TEAM_HREF,
  parseMinutes,
} from "@/lib/iskur-tasks";
import { ISKUR_ENTRY_TITLE_MAX, lineKind } from "@/lib/iskur-weeks";
import { reportDayHref, reportWeekHref } from "@/lib/peer-reports";
import { formatReportDay } from "@/lib/peer-weekly-report";
import { IskurLineProblem, type IskurEntryDraft } from "@/types/iskur-weeks";
import { PeerReportView } from "@/types/peer-reports";

type Log = ReturnType<typeof useIskurWorkLog>;

/**
 * Çalışma kaydı (Figma 3.1 Günlük, 3.2 Haftalık özet): team work and support activities as lines of the week, and
 * the week sent to the team leader. The peer meetings, their reports and the daily/weekly evaluation stay in
 * Faaliyet Raporum, linked from here; only their numbers are counted.
 */
export function IskurWorkLogView() {
  const t = useTranslations("iskurWeek");
  const log = useIskurWorkLog();

  if (log.loading) {
    return (
      <p role="status" className="type-body text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (log.notPlaced) {
    return (
      <Card>
        <h1 className="type-h3 text-text-primary">{t("notPlaced.title")}</h1>
        <p className="mt-2 type-body text-text-secondary">
          {t("notPlaced.body")}
        </p>
      </Card>
    );
  }
  if (log.failed || !log.week) {
    return (
      <p role="alert" className="type-body text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  const week = log.week;

  return (
    <div className="space-y-6">
      <nav aria-label={t("breadcrumb")} className="type-label-sm">
        <Link href="/student" className="text-text-accent hover:underline">
          {t("home")}
        </Link>
        <span aria-hidden className="mx-1.5 text-text-accent">
          /
        </span>
        <span className="text-text-accent">{t("title")}</span>
      </nav>
      <div>
        <h1 className="type-h1 text-text-primary">{t("title")}</h1>
        <p className="mt-1 type-body-sm text-text-secondary">{t("intro")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label={t("viewLabel")}
          options={[
            { id: PeerReportView.Daily, label: t("dailyView") },
            { id: PeerReportView.Weekly, label: t("weeklyView") },
          ]}
          selected={log.view}
          onSelect={log.setView}
        />
        <div className="flex items-center gap-3">
          <WeekArrow label={t("previousWeek")} onClick={log.previousWeek}>
            <ChevronLeft aria-hidden className="size-4" />
          </WeekArrow>
          <span className="type-label text-text-primary">{log.weekLabel}</span>
          <WeekArrow
            label={t("nextWeek")}
            onClick={log.nextWeek}
            disabled={!log.canGoNext}
          >
            <ChevronRight aria-hidden className="size-4" />
          </WeekArrow>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={WEEK_STATUS_TONES[week.status]}>
          {t(`status.${week.status}`)}
        </StatusBadge>
        {week.reviewer ? (
          <span className="type-caption text-text-muted">
            {t("reviewer", { name: week.reviewer.fullName })}
          </span>
        ) : null}
      </div>
      {log.view === PeerReportView.Daily ? (
        <Daily log={log} week={week} />
      ) : (
        <Weekly log={log} week={week} />
      )}
    </div>
  );
}

function WeekArrow({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-border-default bg-background-surface hover:bg-background-subtle disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-border-selected"
    >
      {children}
    </button>
  );
}

function Daily({ log, week }: { log: Log; week: IskurWeek }) {
  const t = useTranslations("iskurWeek.daily");
  const locale = useLocale();
  const duration = useReportDuration();
  return (
    <div className="space-y-6">
      <ol aria-label={t("days")} className="grid gap-3 sm:grid-cols-5">
        {log.days.map((day) => {
          const label = formatReportDay(day, locale);
          const selected = day === log.day;
          return (
            <li key={day}>
              <button
                type="button"
                aria-current={selected ? "date" : undefined}
                onClick={() => log.selectDay(day)}
                className={`flex w-full flex-col items-start gap-1 rounded-card border p-4 text-left focus-visible:outline-2 focus-visible:outline-border-selected ${
                  selected
                    ? "border-border-selected bg-background-selected"
                    : "border-border-default bg-background-surface hover:bg-background-subtle"
                }`}
              >
                <span className="type-label text-text-primary">
                  {label.weekday} · {label.date}
                </span>
                {day === log.today ? (
                  <span className="type-caption text-text-muted">
                    {t("today")}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card labelledBy="iskur-day-work" className="space-y-5">
          <h2 id="iskur-day-work" className="type-h3 text-text-primary">
            {t("title")}
          </h2>
          <section aria-labelledby="iskur-day-mentoring" className="space-y-2">
            <h3
              id="iskur-day-mentoring"
              className="type-label-sm uppercase text-text-muted"
            >
              {t("mentoring")}
            </h3>
            <p className="type-body-sm text-text-secondary">
              {t("mentoringHint")}
            </p>
            <Link
              href={reportDayHref(log.day)}
              className="inline-block type-label text-text-accent hover:underline"
            >
              {t("openDailyReport")}
            </Link>
          </section>
          <section aria-labelledby="iskur-day-team" className="space-y-3">
            <h3
              id="iskur-day-team"
              className="type-label-sm uppercase text-text-muted"
            >
              {t("lines")}
            </h3>
            {log.dayLines.length === 0 ? (
              <p className="type-body-sm text-text-muted">{t("noLines")}</p>
            ) : (
              <ul className="space-y-3">
                {log.dayLines.map((line) => (
                  <LineEditor key={line.key} log={log} line={line} />
                ))}
              </ul>
            )}
            {log.canAddToDay ? (
              <div className="flex flex-wrap items-end gap-3 rounded-card bg-background-subtle p-4">
                <label className="space-y-1">
                  <span className="block type-label-sm text-text-secondary">
                    {t("addTeam")}
                  </span>
                  <select
                    value={log.pickedTask}
                    onChange={(event) => log.setPickedTask(event.target.value)}
                    className="h-10 rounded-input border border-border-control bg-background-surface px-3 type-body-sm"
                  >
                    <option value="">{t("freeLine")}</option>
                    {week.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size={ButtonSize.Small}
                  variant={ButtonVariant.Secondary}
                  onClick={log.addTeamLine}
                >
                  {t("add")}
                </Button>
                {week.supportActivities.length > 0 ? (
                  <>
                    <label className="space-y-1">
                      <span className="block type-label-sm text-text-secondary">
                        {t("addSupport")}
                      </span>
                      <select
                        value={log.pickedActivity}
                        onChange={(event) =>
                          log.setPickedActivity(event.target.value)
                        }
                        className="h-10 rounded-input border border-border-control bg-background-surface px-3 type-body-sm"
                      >
                        <option value="">{t("choose")}</option>
                        {week.supportActivities.map((activity) => (
                          <option key={activity.id} value={activity.id}>
                            {activity.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      size={ButtonSize.Small}
                      variant={ButtonVariant.Secondary}
                      disabled={!log.pickedActivity}
                      onClick={log.addSupportLine}
                    >
                      {t("addSupportButton")}
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
          {log.overflowing.includes(log.day) ? (
            <p role="alert" className="type-caption text-status-error-text">
              {t("dayOver")}
            </p>
          ) : null}
          {log.editable ? <SaveBar log={log} /> : <Locked />}
        </Card>
        <Card labelledBy="iskur-day-summary" className="h-fit space-y-3">
          <h2 id="iskur-day-summary" className="type-h3 text-text-primary">
            {t("summary")}
          </h2>
          <p className="type-body text-text-primary">
            {t("dayLogged", { minutes: duration(log.dayMinutes) })}
          </p>
          <p className="type-caption text-text-muted">{t("dayLimit")}</p>
          <IskurProgressCard
            title={t("weekTeam")}
            caption={t("logged")}
            logged={week.totals.teamMinutes}
            target={week.split?.teamMinutes ?? null}
          />
          <p className="type-caption text-text-muted">{t("officialNote")}</p>
        </Card>
      </div>
    </div>
  );
}

function LineEditor({ log, line }: { log: Log; line: IskurEntryDraft }) {
  const t = useTranslations("iskurWeek.line");
  const support = line.kind === IskurWorkEntryKind.SupportActivity;
  const kind = lineKind(line, log.taskIds);
  const problem = log.lineProblem(line);
  const hintId = `${line.key}-problem`;
  const readOnly = !log.editable || log.busy;
  return (
    <li className="space-y-3 rounded-card border border-border-default p-4">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone={support ? StatusTone.Info : StatusTone.Neutral}>
          {t(`kind.${kind}`)}
        </StatusBadge>
        {log.editable ? (
          <button
            type="button"
            onClick={() => log.removeLine(line.key)}
            aria-label={t("remove", { title: line.title || t("untitled") })}
            className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-background-subtle focus-visible:outline-2 focus-visible:outline-border-selected"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <label className="block space-y-1">
          <span className="block type-label-sm text-text-secondary">
            {t("title")}
          </span>
          <input
            value={line.title}
            readOnly={readOnly || support}
            aria-invalid={problem === IskurLineProblem.Title}
            aria-describedby={problem ? hintId : undefined}
            maxLength={ISKUR_ENTRY_TITLE_MAX}
            onChange={(event) =>
              log.updateLine(line.key, { title: event.target.value })
            }
            className={ISKUR_FIELD_CLASS}
          />
        </label>
        <label className="block space-y-1">
          <span className="block type-label-sm text-text-secondary">
            {t("minutes")}
          </span>
          <input
            inputMode="numeric"
            maxLength={3}
            value={line.minutes}
            readOnly={readOnly}
            aria-invalid={problem === IskurLineProblem.Minutes}
            aria-describedby={problem ? hintId : undefined}
            onChange={(event) =>
              log.updateLine(line.key, { minutes: event.target.value })
            }
            className={ISKUR_FIELD_CLASS}
          />
        </label>
      </div>
      {problem && log.editable ? (
        <p id={hintId} className="type-caption text-status-error-text">
          {t(`problem.${problem}`)}
        </p>
      ) : null}
      {support ? (
        <p className="type-caption text-text-muted">{t("supportHint")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="type-caption text-text-muted sm:col-span-2">
            {t("teamHint")}
          </p>
          <label className="block space-y-1">
            <span className="block type-label-sm text-text-secondary">
              {t("output")}
            </span>
            <input
              value={line.output}
              readOnly={readOnly}
              maxLength={ISKUR_NOTE_MAX}
              onChange={(event) =>
                log.updateLine(line.key, { output: event.target.value })
              }
              className={ISKUR_FIELD_CLASS}
            />
          </label>
          <label className="block space-y-1">
            <span className="block type-label-sm text-text-secondary">
              {t("note")}
            </span>
            <input
              value={line.note}
              readOnly={readOnly}
              maxLength={ISKUR_NOTE_MAX}
              onChange={(event) =>
                log.updateLine(line.key, { note: event.target.value })
              }
              className={ISKUR_FIELD_CLASS}
            />
          </label>
        </div>
      )}
    </li>
  );
}

function SaveBar({ log }: { log: Log }) {
  const t = useTranslations("iskurWeek");
  return (
    <div className="flex flex-wrap justify-end gap-3">
      {log.dirty ? (
        <Button variant={ButtonVariant.Ghost} onClick={log.discard}>
          {t("discard")}
        </Button>
      ) : null}
      <Button onClick={log.save} disabled={!log.canSave} aria-busy={log.busy}>
        {t("saveDraft")}
      </Button>
    </div>
  );
}

function Locked() {
  const t = useTranslations("iskurWeek");
  return (
    <p className="flex items-center gap-2 type-body-sm text-text-muted">
      <Lock aria-hidden className="size-4" />
      {t("locked")}
    </p>
  );
}

function Weekly({ log, week }: { log: Log; week: IskurWeek }) {
  const t = useTranslations("iskurWeek.weekly");
  const locale = useLocale();
  const duration = useReportDuration();
  const team = log.lines.filter(
    (line) => line.kind === IskurWorkEntryKind.Team,
  );
  const total = week.totals.teamMinutes + week.totals.mentoringMinutes;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card labelledBy="iskur-week-summary" className="space-y-4">
          <h2 id="iskur-week-summary" className="type-h3 text-text-primary">
            {t("summary")}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <IskurProgressCard
              title={t("mentoring")}
              caption={t("byTarget")}
              logged={week.totals.mentoringMinutes}
              target={week.split?.mentoringMinutes ?? null}
            />
            <IskurProgressCard
              title={t("teamWork")}
              caption={t("byTarget")}
              logged={week.totals.teamMinutes}
              target={week.split?.teamMinutes ?? null}
            />
          </div>
          <p className="type-body-sm text-text-primary">
            {week.split
              ? t("total", {
                  logged: duration(total),
                  target: duration(week.split.totalMinutes),
                })
              : t("totalNoTarget", { logged: duration(total) })}
          </p>
        </Card>
        <Card labelledBy="iskur-week-team" className="space-y-3">
          <h2 id="iskur-week-team" className="type-h3 text-text-primary">
            {t("team")}
          </h2>
          {team.length === 0 ? (
            <p className="type-body-sm text-text-muted">{t("noTeam")}</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {team.map((line) => (
                <li
                  key={line.key}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <span>
                    <span className="block type-body text-text-primary">
                      {line.title}
                    </span>
                    <span className="block type-caption text-text-muted">
                      {line.output
                        ? t("lineWithOutput", {
                            day: formatReportDay(line.date, locale).weekday,
                            output: line.output,
                          })
                        : formatReportDay(line.date, locale).weekday}
                    </span>
                  </span>
                  <span className="type-body-sm text-text-secondary">
                    {duration(parseMinutes(line.minutes) ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card labelledBy="iskur-week-mentoring" className="space-y-3">
          <h2 id="iskur-week-mentoring" className="type-h3 text-text-primary">
            {t("mentoringDetail")}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-4">
            <Fact
              label={t("meetings")}
              value={String(week.mentoring.meetingCount)}
            />
            <Fact
              label={t("reports")}
              value={t("reportsValue", {
                sent: week.mentoring.reportsSubmitted,
                due: week.mentoring.reportsDue,
              })}
            />
            <Fact
              label={t("otherWork")}
              value={duration(week.mentoring.activityMinutes)}
            />
            <Fact
              label={t("supportWork")}
              value={duration(week.mentoring.supportMinutes)}
            />
          </dl>
          <p className="rounded-card bg-status-warning-bg p-3 type-caption text-status-warning-text">
            {t("privacy")}
          </p>
          <Link
            href={reportWeekHref(week.weekStart)}
            className="inline-block type-label text-text-accent hover:underline"
          >
            {t("openWeeklyReport")}
          </Link>
        </Card>
      </div>
      <Send log={log} week={week} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-background-subtle p-3">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-h3 text-text-primary">{value}</dd>
    </div>
  );
}

function Send({ log, week }: { log: Log; week: IskurWeek }) {
  const t = useTranslations("iskurWeek.send");
  const tDecision = useTranslations("iskurWeek.decision");
  const decision = week.decision;
  return (
    <Card labelledBy="iskur-week-send" className="h-fit space-y-4">
      <h2 id="iskur-week-send" className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      {decision ? (
        <div className="space-y-2">
          <StatusBadge tone={WEEK_STATUS_TONES[week.status]}>
            {tDecision(decision.decision)}
          </StatusBadge>
          {decision.decidedBy ? (
            <p className="type-caption text-text-muted">
              {t("decidedBy", { name: decision.decidedBy.fullName })}
            </p>
          ) : null}
          {decision.reason ? (
            <p className="whitespace-pre-line type-body-sm text-text-primary">
              {decision.reason}
            </p>
          ) : null}
        </div>
      ) : null}
      {week.objection ? (
        <p className="rounded-card bg-background-subtle p-3 type-body-sm text-text-primary">
          {t("objected", { text: week.objection.text })}
        </p>
      ) : log.canObjectHere ? (
        <div className="space-y-2">
          <label className="block space-y-2">
            <span className="type-label text-text-primary">
              {t("objection")}
            </span>
            <textarea
              value={log.objection}
              maxLength={ISKUR_NOTE_MAX}
              rows={3}
              onChange={(event) => log.setObjection(event.target.value)}
              className={ISKUR_FIELD_CLASS}
            />
          </label>
          <Button
            variant={ButtonVariant.Secondary}
            onClick={log.object}
            disabled={!log.canObject}
          >
            {t("objectionSend")}
          </Button>
        </div>
      ) : null}
      {week.editable ? (
        <div className="space-y-2">
          <Button fullWidth onClick={log.submit} disabled={!log.canSubmit}>
            {t(log.resend ? "resend" : "submit")}
          </Button>
          <p className="type-caption text-text-muted">
            {t(log.dirty ? "saveFirst" : "hint")}
          </p>
        </div>
      ) : (
        <p className="type-caption text-text-muted">
          {t(`locked.${week.status}`)}
        </p>
      )}
      <Link
        href={ISKUR_TEAM_HREF}
        className="inline-block type-label-sm text-text-accent hover:underline"
      >
        {t("team")}
      </Link>
    </Card>
  );
}
