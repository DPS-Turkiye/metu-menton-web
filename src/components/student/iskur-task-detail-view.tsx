// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { Button, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import { useIskurTask } from "@/hooks/use-iskur-task";
import { useReportDuration } from "@/hooks/use-report-format";
import { IskurTaskStatus, type IskurTask } from "@/interfaces/iskur-tasks";
import {
  isHttpsLink,
  ISKUR_NOTE_MAX,
  ISKUR_TEAM_HREF,
} from "@/lib/iskur-tasks";
import { formatReportDay } from "@/lib/peer-weekly-report";

const STATUS_TONES: Record<IskurTaskStatus, StatusTone> = {
  [IskurTaskStatus.Open]: StatusTone.Info,
  [IskurTaskStatus.Done]: StatusTone.Success,
  [IskurTaskStatus.HandedOver]: StatusTone.Warning,
};

type View = ReturnType<typeof useIskurTask>;

/**
 * "Görev detayı" (handbook note 338:2423): the task as assigned, and for its assignee the actual time, the output
 * (a link or a note) and the moves: complete, hand over to next week, reopen. A leader of the team may reopen or
 * delete it.
 */
export function IskurTaskDetailView({ taskId }: { taskId: string }) {
  const t = useTranslations("iskurTask");
  const view = useIskurTask(taskId);

  if (view.loading) {
    return <p className="type-body text-text-muted">{t("loading")}</p>;
  }
  if (view.notFound || !view.task || !view.form) {
    return (
      <Card>
        <h1 className="type-h3 text-text-primary">
          {t(view.notFound ? "notFound" : "loadFailed")}
        </h1>
        <Link
          href={ISKUR_TEAM_HREF}
          className="mt-3 inline-block type-label text-text-accent hover:underline"
        >
          {t("backToTeam")}
        </Link>
      </Card>
    );
  }
  const task = view.task;

  return (
    <div className="space-y-6">
      <nav aria-label={t("breadcrumb")} className="type-label-sm">
        <Link href="/student" className="text-text-accent hover:underline">
          {t("home")}
        </Link>
        <span aria-hidden className="mx-1.5 text-text-accent">
          /
        </span>
        <Link
          href={ISKUR_TEAM_HREF}
          className="text-text-accent hover:underline"
        >
          {t("team")}
        </Link>
        <span aria-hidden className="mx-1.5 text-text-accent">
          /
        </span>
        <span className="text-text-accent">{t("title")}</span>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Summary task={task} />
          {view.canWork ? <WorkForm view={view} task={task} /> : null}
          {!view.canWork ? <Outcome task={task} /> : null}
        </div>
        <Actions view={view} task={task} />
      </div>
    </div>
  );
}

function Summary({ task }: { task: IskurTask }) {
  const t = useTranslations("iskurTask");
  const tKind = useTranslations("iskurTask.kinds");
  const locale = useLocale();
  const duration = useReportDuration();
  const due = formatReportDay(task.dueDate, locale);
  return (
    <Card labelledBy="iskur-task-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 id="iskur-task-title" className="type-h2 text-text-primary">
          {task.title}
        </h1>
        <StatusBadge tone={STATUS_TONES[task.status]}>
          {t(`status.${task.status}`)}
        </StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Fact label={t("kind")} value={tKind(task.kind)} />
        <Fact label={t("dueDate")} value={`${due.weekday} · ${due.date}`} />
        <Fact label={t("estimate")} value={duration(task.estimatedMinutes)} />
        <Fact label={t("assignee")} value={task.assignee.fullName} />
        {task.assignedBy ? (
          <Fact label={t("assignedBy")} value={task.assignedBy.fullName} />
        ) : null}
        <Fact
          label={t("output")}
          value={t(task.needsOutput ? "outputNeeded" : "outputOptional")}
        />
      </dl>
      {task.description ? (
        <p className="mt-4 whitespace-pre-line type-body text-text-secondary">
          {task.description}
        </p>
      ) : null}
      {task.status === IskurTaskStatus.HandedOver && task.handoverReason ? (
        <p className="mt-4 rounded-card bg-status-warning-bg p-4 type-body-sm text-status-warning-text">
          {t("handedOverBecause", { reason: task.handoverReason })}
        </p>
      ) : null}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-body text-text-primary">{value}</dd>
    </div>
  );
}

function WorkForm({ view, task }: { view: View; task: IskurTask }) {
  const t = useTranslations("iskurTask.work");
  const locked = task.status === IskurTaskStatus.Done;
  const form = view.form;
  if (!form) return null;
  return (
    <Card labelledBy="iskur-task-work">
      <h2 id="iskur-task-work" className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      {locked ? (
        <p className="mt-2 type-body-sm text-text-muted">{t("locked")}</p>
      ) : null}
      <div className="mt-4 space-y-4">
        <label className="block space-y-2">
          <span className="type-label text-text-primary">{t("actual")}</span>
          <input
            inputMode="numeric"
            value={form.actualMinutes}
            readOnly={locked || view.busy}
            maxLength={4}
            onChange={(event) => view.setActualMinutes(event.target.value)}
            aria-invalid={view.minutesInvalid}
            aria-describedby="iskur-task-actual-hint"
            className={`${ISKUR_FIELD_CLASS} max-w-40`}
          />
          <span
            id="iskur-task-actual-hint"
            className={`block type-caption ${view.minutesInvalid ? "text-status-error-text" : "text-text-muted"}`}
          >
            {t(view.minutesInvalid ? "actualInvalid" : "actualHint")}
          </span>
        </label>
        <label className="block space-y-2">
          <span className="type-label text-text-primary">{t("link")}</span>
          <input
            type="url"
            value={form.outputLink}
            readOnly={locked || view.busy}
            placeholder={t("linkPlaceholder")}
            maxLength={ISKUR_NOTE_MAX}
            aria-invalid={view.linkInvalid}
            aria-describedby="iskur-task-link-hint"
            onChange={(event) => view.setOutputLink(event.target.value)}
            className={ISKUR_FIELD_CLASS}
          />
          <span
            id="iskur-task-link-hint"
            className={`block type-caption ${view.linkInvalid ? "text-status-error-text" : "text-text-muted"}`}
          >
            {t(view.linkInvalid ? "linkInvalid" : "linkHint")}
          </span>
        </label>
        <label className="block space-y-2">
          <span className="type-label text-text-primary">{t("note")}</span>
          <textarea
            value={form.outputNote}
            readOnly={locked || view.busy}
            maxLength={ISKUR_NOTE_MAX}
            rows={3}
            onChange={(event) => view.setOutputNote(event.target.value)}
            className={ISKUR_FIELD_CLASS}
          />
        </label>
        {!locked ? (
          <Button
            variant={ButtonVariant.Secondary}
            onClick={view.save}
            disabled={!view.canSave}
          >
            {t("save")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** What a leader sees of someone else's task: the recorded time and output, read-only. */
function Outcome({ task }: { task: IskurTask }) {
  const t = useTranslations("iskurTask.work");
  const duration = useReportDuration();
  return (
    <Card labelledBy="iskur-task-outcome">
      <h2 id="iskur-task-outcome" className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      <dl className="mt-4 space-y-3">
        <Fact
          label={t("actual")}
          value={
            task.actualMinutes == null
              ? t("none")
              : duration(task.actualMinutes)
          }
        />
        <div>
          <dt className="type-caption text-text-muted">{t("link")}</dt>
          <dd className="type-body">
            <OutputLink link={task.outputLink} />
          </dd>
        </div>
        <Fact label={t("note")} value={task.outputNote ?? t("none")} />
      </dl>
    </Card>
  );
}

/** Only an https address becomes a link, checked again here so a bad row can never be a javascript: link. */
function OutputLink({ link }: { link: string | null }) {
  const t = useTranslations("iskurTask.work");
  if (!link) return <span className="text-text-primary">{t("none")}</span>;
  if (!isHttpsLink(link)) {
    return <span className="break-all text-text-primary">{link}</span>;
  }
  return (
    <a
      href={link.trim()}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-text-accent hover:underline"
    >
      {link}
    </a>
  );
}

function Actions({ view, task }: { view: View; task: IskurTask }) {
  const t = useTranslations("iskurTask.actions");
  const tBlock = useTranslations("iskurTask.block");
  const canReopen =
    task.status !== IskurTaskStatus.Open && (view.canWork || view.canManage);
  return (
    <Card labelledBy="iskur-task-actions" className="h-fit space-y-4">
      <h2 id="iskur-task-actions" className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      {view.canWork && task.status !== IskurTaskStatus.Done ? (
        <div className="space-y-2">
          <Button
            fullWidth
            onClick={view.complete}
            disabled={!view.canComplete}
            aria-describedby={
              view.completeBlock ? "iskur-task-complete-block" : undefined
            }
          >
            {t("complete")}
          </Button>
          {view.completeBlock ? (
            <p
              id="iskur-task-complete-block"
              className="type-caption text-text-muted"
            >
              {tBlock(view.completeBlock)}
            </p>
          ) : null}
        </div>
      ) : null}
      {view.canWork && view.open ? (
        view.handingOver ? (
          <div className="space-y-2">
            <label className="block space-y-2">
              <span className="type-label text-text-primary">
                {t("handoverReason")}
              </span>
              <textarea
                value={view.form?.handoverReason ?? ""}
                maxLength={ISKUR_NOTE_MAX}
                rows={3}
                onChange={(event) => view.setHandoverReason(event.target.value)}
                className={ISKUR_FIELD_CLASS}
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant={ButtonVariant.Secondary}
                onClick={view.handOver}
                disabled={!view.canHandOver}
              >
                {t("handOverConfirm")}
              </Button>
              <Button
                variant={ButtonVariant.Ghost}
                onClick={view.cancelHandover}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            fullWidth
            variant={ButtonVariant.Secondary}
            onClick={view.startHandover}
            disabled={view.busy}
          >
            {t("handOver")}
          </Button>
        )
      ) : null}
      {canReopen ? (
        <Button
          fullWidth
          variant={ButtonVariant.Secondary}
          onClick={view.reopen}
          disabled={view.busy}
        >
          {t("reopen")}
        </Button>
      ) : null}
      {view.canManage ? (
        view.confirmingDelete ? (
          <div
            role="group"
            aria-labelledby="iskur-task-delete-confirm"
            className="space-y-2"
          >
            <p
              id="iskur-task-delete-confirm"
              className="type-body-sm text-text-primary"
            >
              {t("deleteConfirm")}
            </p>
            <div className="flex gap-2">
              <Button
                variant={ButtonVariant.Destructive}
                onClick={view.remove}
                disabled={view.busy}
              >
                {t("deleteYes")}
              </Button>
              <Button variant={ButtonVariant.Ghost} onClick={view.cancelDelete}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            fullWidth
            variant={ButtonVariant.Destructive}
            onClick={view.askDelete}
            disabled={view.busy}
          >
            {t("delete")}
          </Button>
        )
      ) : null}
      <p className="type-caption text-text-muted">{t("footnote")}</p>
    </Card>
  );
}
