// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { ProgramDetailFrame } from "@/components/coordinator/program-detail-frame";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { IskurReviewView } from "@/components/student/iskur/review-view";
import { WEEK_STATUS_TONES } from "@/components/student/iskur/week-status";
import { useIskurReviewQueue } from "@/hooks/use-iskur-review";
import { useReportDuration } from "@/hooks/use-report-format";
import { ProgramTab } from "@/lib/coordinator-program-detail";
import { iskurWorkspaceHref } from "@/lib/iskur-support-activities";
import { iskurFallbackQueueHref } from "@/lib/iskur-weeks";

/**
 * The weeks no team leader can review (a one-leader team's leader and its members without a leader), which fall to
 * the program's coordinators (product decision, 19 Nov). This week only; one row per person.
 */
export function IskurFallbackWeeksView({ programId }: { programId: string }) {
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.IskurTeams}>
      {() => <QueueBody programId={programId} />}
    </ProgramDetailFrame>
  );
}

function QueueBody({ programId }: { programId: string }) {
  const t = useTranslations("iskurReview.fallback");
  const tStatus = useTranslations("iskurReview.status");
  const duration = useReportDuration();
  const queue = useIskurReviewQueue({ programId }, null);
  return (
    <div className="space-y-4">
      <Link
        href={iskurWorkspaceHref(programId)}
        className="type-label-sm text-text-accent hover:underline"
      >
        {t("back")}
      </Link>
      <h2 className="type-h3 text-text-primary">{t("title")}</h2>
      <p className="type-body-sm text-text-secondary">{t("subtitle")}</p>
      {queue.failed ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {t("failed")}
        </p>
      ) : queue.loading ? (
        <p role="status" className="type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : queue.people.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-default px-6 py-10 text-center type-body-sm text-text-secondary">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-default bg-background-surface">
          {queue.people.map((row) => (
            <li
              key={row.userId}
              className="flex flex-wrap items-center gap-3 px-5 py-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block type-label text-text-primary">
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
                <Link
                  href={queue.hrefOf(row.weekId)}
                  className="type-label-sm text-text-accent hover:underline"
                >
                  {t("open")}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IskurFallbackWeekView({
  programId,
  weekId,
}: {
  programId: string;
  weekId: string;
}) {
  return (
    <ProgramDetailFrame programId={programId} tab={ProgramTab.IskurTeams}>
      {() => (
        <IskurReviewView
          reviewer={{ programId }}
          weekId={weekId}
          backHref={iskurFallbackQueueHref(programId)}
        />
      )}
    </ProgramDetailFrame>
  );
}
