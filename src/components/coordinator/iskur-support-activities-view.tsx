// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import { useIskurSupportActivities } from "@/hooks/use-iskur-support-activities";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { iskurWorkspaceHref } from "@/lib/iskur-support-activities";
import { ISKUR_NOTE_MAX, ISKUR_SUPPORT_TITLE_MAX } from "@/lib/iskur-tasks";

type Pool = ReturnType<typeof useIskurSupportActivities>;

/**
 * The support-activity pool (rules frame 322:3413, "Görüşme olmayan hafta"): what interns may pick for peer mentoring
 * in a week without a meeting. The program's coordinators add, rename, retire and delete activities.
 */
export function IskurSupportActivitiesView({
  programId,
}: {
  programId: string;
}) {
  const pool = useIskurSupportActivities(programId);
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.IskurTeams}>
      {() => <PoolBody pool={pool} programId={programId} />}
    </ProgramDetailFrame>
  );
}

function PoolBody({ pool, programId }: { pool: Pool; programId: string }) {
  const t = useTranslations("iskurSupport");
  if (pool.loading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (pool.failed) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={iskurWorkspaceHref(programId)}
            className="type-label-sm text-text-accent hover:underline"
          >
            {t("back")}
          </Link>
          <h2 className="mt-1 type-h3 text-text-primary">{t("title")}</h2>
          <p className="type-body-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pool.activities.length === 0 ? (
            <Button
              size={ButtonSize.Small}
              disabled={pool.busy}
              onClick={pool.createDefaults}
            >
              {t("createDefaults")}
            </Button>
          ) : null}
          <Button
            size={ButtonSize.Small}
            variant={ButtonVariant.Secondary}
            onClick={pool.startNew}
          >
            {t("add")}
          </Button>
        </div>
      </div>
      {pool.form ? <ActivityForm pool={pool} /> : null}
      {pool.activities.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-default bg-background-surface">
          {pool.activities.map((activity) => (
            <li
              key={activity.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 type-label text-text-primary">
                  {activity.title}
                  {activity.active ? null : (
                    <StatusBadge tone={StatusTone.Neutral}>
                      {t("retired")}
                    </StatusBadge>
                  )}
                </p>
                {activity.description ? (
                  <p className="type-body-sm text-text-secondary">
                    {activity.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size={ButtonSize.Small}
                  variant={ButtonVariant.Ghost}
                  onClick={() => pool.startEdit(activity)}
                  aria-label={t("editLabel", { title: activity.title })}
                >
                  {t("edit")}
                </Button>
                <Button
                  size={ButtonSize.Small}
                  variant={ButtonVariant.Ghost}
                  disabled={pool.busy}
                  onClick={() => pool.toggleActive(activity)}
                >
                  {t(activity.active ? "retire" : "restore")}
                </Button>
                <Button
                  size={ButtonSize.Small}
                  variant={ButtonVariant.Destructive}
                  disabled={pool.busy}
                  onClick={() => pool.remove(activity)}
                  aria-label={t("deleteLabel", { title: activity.title })}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="type-caption text-text-muted">{t("footnote")}</p>
    </div>
  );
}

function ActivityForm({ pool }: { pool: Pool }) {
  const t = useTranslations("iskurSupport.form");
  const form = pool.form;
  if (!form) return null;
  return (
    <Card labelledBy="iskur-support-form" className="space-y-4">
      <h3 id="iskur-support-form" className="type-label text-text-primary">
        {t(form.id ? "editTitle" : "newTitle")}
      </h3>
      <label className="block space-y-2">
        <span className="type-label-sm text-text-secondary">{t("title")}</span>
        <input
          value={form.title}
          maxLength={ISKUR_SUPPORT_TITLE_MAX}
          onChange={(event) => pool.setTitle(event.target.value)}
          className={ISKUR_FIELD_CLASS}
        />
      </label>
      <label className="block space-y-2">
        <span className="type-label-sm text-text-secondary">
          {t("description")}
        </span>
        <textarea
          value={form.description}
          maxLength={ISKUR_NOTE_MAX}
          rows={2}
          onChange={(event) => pool.setDescription(event.target.value)}
          className={ISKUR_FIELD_CLASS}
        />
      </label>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => pool.setActive(event.target.checked)}
          className="size-5"
        />
        <span className="type-body-sm text-text-primary">{t("active")}</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant={ButtonVariant.Ghost} onClick={pool.cancel}>
          {t("cancel")}
        </Button>
        <Button onClick={pool.save} disabled={!pool.canSave}>
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}
