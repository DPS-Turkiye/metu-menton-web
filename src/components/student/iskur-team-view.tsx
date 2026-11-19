"use client";

import {
  ArrowRight,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Square,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import {
  InitialsAvatar,
  ISKUR_FIELD_CLASS,
  TabPanel,
  UnderlineTabs,
} from "@/components/student/iskur-ui";
import { WEEK_STATUS_TONES } from "@/components/student/iskur/week-status";
import { useIskurTeam } from "@/hooks/use-iskur-team";
import { useReportDuration } from "@/hooks/use-report-format";
import {
  IskurTaskStatus,
  type IskurTask,
  type IskurTeamTasks,
  type IskurTeamTasksMember,
} from "@/interfaces/iskur-tasks";
import { IskurTeamRole } from "@/interfaces/iskur-workspace";
import {
  ISKUR_TASK_DESCRIPTION_MAX,
  ISKUR_TASK_KINDS,
  ISKUR_TASK_MAX_MINUTES,
  ISKUR_TASK_MIN_MINUTES,
  ISKUR_TASK_TITLE_MAX,
  iskurTaskHref,
  isPlanFull,
  orderedTasks,
} from "@/lib/iskur-tasks";
import { formatReportDay } from "@/lib/peer-weekly-report";
import { initials } from "@/lib/utils";
import { IskurTeamTab } from "@/types/iskur-tasks";

const TABS_ID = "iskur-team";

type Team = ReturnType<typeof useIskurTeam>;

/** Ekibim (Figma 2.1): the week's team tasks by person, the leader's "Görev ata" form, and the team's people. */
export function IskurTeamView() {
  const t = useTranslations("iskurTeam");
  const team = useIskurTeam();

  if (team.loading) {
    return <p className="type-body text-text-muted">{t("loading")}</p>;
  }
  if (team.notPlaced) {
    return (
      <Card>
        <h1 className="type-h3 text-text-primary">{t("notPlaced.title")}</h1>
        <p className="mt-2 type-body text-text-secondary">
          {t("notPlaced.body")}
        </p>
      </Card>
    );
  }
  if (team.failed || !team.team) {
    return (
      <div role="alert" className="space-y-3">
        <p className="type-body text-status-error-text">{t("loadFailed")}</p>
        <Button variant={ButtonVariant.Secondary} onClick={team.retry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  const data = team.team;
  const leader = data.viewerRole === IskurTeamRole.Leader;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="type-h1 text-text-primary">{data.team.name}</h1>
          <p className="mt-1 type-body-sm text-text-secondary">
            {data.team.unitName}
          </p>
        </div>
        {leader ? (
          <StatusBadge tone={StatusTone.Info}>{t("leaderView")}</StatusBadge>
        ) : null}
      </div>

      <UnderlineTabs
        label={t("tabsLabel")}
        idPrefix={TABS_ID}
        selected={team.tab}
        onSelect={team.setTab}
        tabs={[
          {
            id: IskurTeamTab.Tasks,
            label: t("tabs.tasks"),
            count: team.taskCount,
          },
          ...(leader
            ? [
                {
                  id: IskurTeamTab.Weeks,
                  label: t("tabs.weeks"),
                  count: team.reviews.people.length,
                },
              ]
            : []),
          {
            id: IskurTeamTab.Members,
            label: t("tabs.members"),
            count: team.memberCount,
          },
        ]}
      />
      <TabPanel
        idPrefix={TABS_ID}
        id={IskurTeamTab.Tasks}
        selected={team.tab === IskurTeamTab.Tasks}
      >
        <div
          className={`grid gap-6 ${data.canAssign ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}
        >
          <TaskList team={team} data={data} />
          {data.canAssign ? <AssignForm team={team} /> : null}
        </div>
      </TabPanel>
      {leader ? (
        <TabPanel
          idPrefix={TABS_ID}
          id={IskurTeamTab.Weeks}
          selected={team.tab === IskurTeamTab.Weeks}
        >
          <WeekQueue team={team} />
        </TabPanel>
      ) : null}
      <TabPanel
        idPrefix={TABS_ID}
        id={IskurTeamTab.Members}
        selected={team.tab === IskurTeamTab.Members}
      >
        <Roster data={data} />
      </TabPanel>
    </div>
  );
}

function TaskList({ team, data }: { team: Team; data: IskurTeamTasks }) {
  const t = useTranslations("iskurTeam");
  return (
    <section
      aria-labelledby="iskur-team-tasks"
      aria-busy={team.fetching}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="iskur-team-tasks" className="type-h3 text-text-primary">
          {t(
            data.viewerRole === IskurTeamRole.Leader
              ? "tasksTitleLeader"
              : "tasksTitleMember",
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={team.previousWeek}
            aria-label={t("previousWeek")}
            className="grid size-9 place-items-center rounded-full border border-border-default bg-background-surface hover:bg-background-subtle focus-visible:outline-2 focus-visible:outline-border-selected"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <span className="type-label text-text-primary">{team.weekLabel}</span>
          <button
            type="button"
            onClick={team.nextWeek}
            aria-label={t("nextWeek")}
            className="grid size-9 place-items-center rounded-full border border-border-default bg-background-surface hover:bg-background-subtle focus-visible:outline-2 focus-visible:outline-border-selected"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      {data.members.map((member) => (
        <MemberTasks key={member.userId} member={member} />
      ))}
      <p className="type-caption text-text-muted">{t("footnote")}</p>
    </section>
  );
}

function MemberTasks({ member }: { member: IskurTeamTasksMember }) {
  const t = useTranslations("iskurTeam");
  const duration = useReportDuration();
  const tasks = orderedTasks(member.tasks);
  return (
    <article className="overflow-hidden rounded-card border border-border-default bg-background-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <InitialsAvatar initials={initials(member.fullName)} />
          <div>
            <p className="type-label text-text-primary">{member.fullName}</p>
            <p className="type-caption text-text-muted">
              {member.weeklyDays == null || member.teamMinutes == null
                ? t("daysMissing")
                : t("target", {
                    days: member.weeklyDays,
                    target: duration(member.teamMinutes),
                  })}
            </p>
          </div>
        </div>
        <StatusBadge
          tone={isPlanFull(member) ? StatusTone.Warning : StatusTone.Neutral}
        >
          {member.teamMinutes == null
            ? t("plannedOnly", { planned: duration(member.plannedMinutes) })
            : t("planned", {
                planned: duration(member.plannedMinutes),
                target: duration(member.teamMinutes),
              })}
        </StatusBadge>
      </header>
      {tasks.length === 0 ? (
        <p className="border-t border-border-subtle px-5 py-4 type-body-sm text-text-muted">
          {t("noTasks")}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} assignee={member.fullName} />
          ))}
        </ul>
      )}
    </article>
  );
}

function TaskRow({ task, assignee }: { task: IskurTask; assignee: string }) {
  const t = useTranslations("iskurTeam");
  const tKind = useTranslations("iskurTask.kinds");
  const locale = useLocale();
  const duration = useReportDuration();
  const Icon =
    task.status === IskurTaskStatus.Done
      ? CheckSquare
      : task.status === IskurTaskStatus.HandedOver
        ? ArrowRight
        : Square;
  return (
    <li>
      <Link
        href={iskurTaskHref(task.id)}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-background-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-selected"
      >
        <Icon
          aria-hidden
          className={`size-5 shrink-0 ${
            task.status === IskurTaskStatus.Done
              ? "text-text-accent"
              : "text-text-muted"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate type-body text-text-primary">
            {task.title}
          </span>
          <span className="block type-caption text-text-muted">
            {t("taskMeta", {
              kind: tKind(task.kind),
              day: formatReportDay(task.dueDate, locale).weekday,
            })}
            <span className="sr-only">
              {" · "}
              {t(`status.${task.status}`)}
            </span>
          </span>
        </span>
        <span className="type-body-sm text-text-secondary">
          {duration(task.estimatedMinutes)}
        </span>
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-full bg-background-selected type-caption text-text-accent"
        >
          {initials(assignee)}
        </span>
      </Link>
    </li>
  );
}

function AssignForm({ team }: { team: Team }) {
  const t = useTranslations("iskurTeam.assign");
  const tKind = useTranslations("iskurTask.kinds");
  const duration = useReportDuration();
  const { form, preview } = team;
  return (
    <Card labelledBy="iskur-assign-title" className="h-fit">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          team.submit();
        }}
      >
        <h2 id="iskur-assign-title" className="type-h3 text-text-primary">
          {t("title")}
        </h2>
        <label className="block space-y-2">
          <span className="type-label text-text-primary">{t("task")}</span>
          <input
            value={form.title}
            maxLength={ISKUR_TASK_TITLE_MAX}
            onChange={(event) => team.setTitle(event.target.value)}
            placeholder={t("taskPlaceholder")}
            className={ISKUR_FIELD_CLASS}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="type-label-sm text-text-secondary">
            {t("kind")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {ISKUR_TASK_KINDS.map((kind) => (
              <Chip
                key={kind}
                selected={form.kind === kind}
                onClick={() => team.setKind(kind)}
              >
                {tKind(kind)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="type-label-sm text-text-secondary">
            {t("assignee")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {team.people.map((person) => (
              <Chip
                key={person.userId}
                selected={form.assigneeId === person.userId}
                onClick={() => team.setAssignee(person.userId)}
              >
                {person.fullName}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span
              id="iskur-assign-estimate"
              className="type-label text-text-primary"
            >
              {t("estimate")}
            </span>
            <div
              role="group"
              aria-labelledby="iskur-assign-estimate"
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={team.lessTime}
                disabled={form.estimatedMinutes <= ISKUR_TASK_MIN_MINUTES}
                aria-label={t("less")}
                className="grid size-12 place-items-center rounded-button bg-background-selected text-text-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-border-selected"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <output
                aria-live="polite"
                className="grid h-12 min-w-20 place-items-center rounded-input border border-border-default px-3 type-body"
              >
                {duration(form.estimatedMinutes)}
              </output>
              <button
                type="button"
                onClick={team.moreTime}
                disabled={form.estimatedMinutes >= ISKUR_TASK_MAX_MINUTES}
                aria-label={t("more")}
                className="grid size-12 place-items-center rounded-button bg-background-selected text-text-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-border-selected"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
            <p className="type-caption text-text-muted">{t("estimateHint")}</p>
          </div>
          <label className="block space-y-2">
            <span className="type-label text-text-primary">{t("dueDate")}</span>
            <input
              type="date"
              value={form.dueDate}
              min={team.today}
              onChange={(event) => team.setDueDate(event.target.value)}
              className={ISKUR_FIELD_CLASS}
            />
          </label>
        </div>
        <p
          role="status"
          className={`type-caption ${preview?.over ? "text-status-warning-text" : "text-text-muted"}`}
        >
          {preview == null
            ? null
            : preview.target == null
              ? t("previewNoTarget", {
                  name: preview.fullName,
                  before: duration(preview.before),
                  after: duration(preview.after),
                })
              : t(preview.over ? "previewOver" : "preview", {
                  name: preview.fullName,
                  before: duration(preview.before),
                  after: duration(preview.after),
                  target: duration(preview.target),
                })}
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            role="switch"
            checked={form.needsOutput}
            onChange={(event) => team.setNeedsOutput(event.target.checked)}
            className="size-5"
          />
          <span className="type-body-sm text-text-primary">
            {t("needsOutput")}
          </span>
        </label>
        <label className="block space-y-2">
          <span className="type-label text-text-primary">
            {t("description")}
          </span>
          <textarea
            value={form.description}
            maxLength={ISKUR_TASK_DESCRIPTION_MAX}
            onChange={(event) => team.setDescription(event.target.value)}
            rows={4}
            className={ISKUR_FIELD_CLASS}
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button
            variant={ButtonVariant.Ghost}
            size={ButtonSize.Medium}
            onClick={team.cancel}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!team.canSubmit}
            aria-busy={team.submitting}
          >
            {t("submit")}
          </Button>
        </div>
        <p className="type-caption text-text-muted">{t("footnote")}</p>
      </form>
    </Card>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-10 rounded-full border px-4 type-label-sm focus-visible:outline-2 focus-visible:outline-border-selected ${
        selected
          ? "border-border-selected bg-background-selected text-text-accent"
          : "border-border-default bg-background-surface text-text-primary hover:bg-background-subtle"
      }`}
    >
      {children}
    </button>
  );
}

function WeekQueue({ team }: { team: Team }) {
  const t = useTranslations("iskurTeam.weeks");
  const tStatus = useTranslations("iskurReview.status");
  const duration = useReportDuration();
  const { people } = team.reviews;
  return (
    <Card labelledBy="iskur-team-weeks">
      <h2 id="iskur-team-weeks" className="type-h3 text-text-primary">
        {t("title", { week: team.weekLabel })}
      </h2>
      {team.reviews.failed ? (
        <p role="alert" className="mt-3 type-body-sm text-status-error-text">
          {t("failed")}
        </p>
      ) : team.reviews.loading ? (
        <p role="status" className="mt-3 type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : people.length === 0 ? (
        <p className="mt-3 type-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border-subtle">
          {people.map((row) => (
            <li
              key={row.userId}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <InitialsAvatar initials={initials(row.fullName)} />
              <span className="min-w-0 flex-1">
                <span className="block type-body text-text-primary">
                  {row.fullName}
                </span>
                <span className="block type-caption text-text-muted">
                  {t("totals", {
                    team: duration(row.teamMinutes),
                    mentoring: duration(row.mentoringMinutes),
                  })}
                </span>
              </span>
              <StatusBadge
                tone={
                  row.status
                    ? WEEK_STATUS_TONES[row.status]
                    : StatusTone.Neutral
                }
              >
                {row.status ? tStatus(row.status) : t("notStarted")}
              </StatusBadge>
              {row.weekId ? (
                <Button
                  size={ButtonSize.Small}
                  variant={ButtonVariant.Secondary}
                  href={team.reviews.hrefOf(row.weekId)}
                >
                  {t("open")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 type-caption text-text-muted">{t("privacy")}</p>
    </Card>
  );
}

function Roster({ data }: { data: IskurTeamTasks }) {
  const t = useTranslations("iskurTeam.roster");
  return (
    <Card labelledBy="iskur-roster-title">
      <h2 id="iskur-roster-title" className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      <ul className="mt-4 divide-y divide-border-subtle">
        {data.roster.map((person) => (
          <li key={person.userId} className="flex items-center gap-3 py-3">
            <InitialsAvatar initials={initials(person.fullName)} />
            <span className="flex-1 type-body text-text-primary">
              {person.fullName}
            </span>
            <StatusBadge
              tone={
                person.role === IskurTeamRole.Leader
                  ? StatusTone.Info
                  : StatusTone.Neutral
              }
            >
              {t(`role.${person.role}`)}
            </StatusBadge>
          </li>
        ))}
      </ul>
      <p className="mt-4 type-caption text-text-muted">{t("privacy")}</p>
    </Card>
  );
}
