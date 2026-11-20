"use client";

import { Check, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import {
  InitialsAvatar,
  ISKUR_FIELD_CLASS,
} from "@/components/student/iskur-ui";
import { IskurProgressCard } from "@/components/student/iskur/progress-card";
import { IskurWeekHistory } from "@/components/student/iskur/week-history";
import { WEEK_STATUS_TONES } from "@/components/student/iskur/week-status";
import { useIskurReview, type IskurReviewer } from "@/hooks/use-iskur-review";
import { useReportDuration } from "@/hooks/use-report-format";
import {
  IskurWeekDecision,
  type IskurLeaderWeek,
} from "@/interfaces/iskur-weeks";
import { ISKUR_NOTE_MAX, ISKUR_TEAM_HREF } from "@/lib/iskur-tasks";
import { reportWeekLabel } from "@/lib/peer-daily-report";
import { formatReportDay, formatReportTime } from "@/lib/peer-weekly-report";
import { initials } from "@/lib/utils";

const DECISIONS: readonly IskurWeekDecision[] = [
  IskurWeekDecision.Approve,
  IskurWeekDecision.Revision,
  IskurWeekDecision.Reject,
];

type Review = ReturnType<typeof useIskurReview>;

/**
 * The leader's weekly review (Figma 4.1), also used by the program's coordinators for the weeks no leader can review.
 * Team work is shown in full; peer mentoring as counts and minutes only, with the "İçerik gizli" note.
 */
export function IskurReviewView({
  reviewer,
  weekId,
  backHref = ISKUR_TEAM_HREF,
}: {
  reviewer: IskurReviewer;
  weekId: string;
  backHref?: string;
}) {
  const t = useTranslations("iskurReview");
  const locale = useLocale();
  const review = useIskurReview(reviewer, weekId);
  if (review.loading) {
    return (
      <p role="status" className="type-body text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (!review.week) {
    return (
      <Card>
        <h1 className="type-h3 text-text-primary">
          {t(review.notFound ? "notFound" : "loadFailed")}
        </h1>
        <Link
          href={backHref}
          className="mt-3 inline-block type-label text-text-accent hover:underline"
        >
          {t("back")}
        </Link>
      </Card>
    );
  }
  const week = review.week;
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="type-label-sm text-text-accent hover:underline"
      >
        {t("back")}
      </Link>
      <div>
        <h1 className="type-h1 text-text-primary">
          {t("title", {
            name: week.person.fullName,
            week: reportWeekLabel(week.weekStart, locale),
          })}
        </h1>
        <p className="mt-1 type-body-sm text-text-secondary">
          {[
            week.person.weeklyDays == null
              ? null
              : t("days", { days: week.person.weeklyDays }),
            week.submittedAt
              ? t("submittedAt", {
                  at: formatReportTime(week.submittedAt, locale),
                })
              : null,
          ]
            .filter((part) => part != null)
            .join(" · ")}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Summary week={week} />
          <Team week={week} />
          <Mentoring week={week} />
        </div>
        <div className="space-y-6">
          <Decision review={review} week={week} />
          <IskurWeekHistory events={week.history} />
          <Queue review={review} />
        </div>
      </div>
    </div>
  );
}

function Summary({ week }: { week: IskurLeaderWeek }) {
  const t = useTranslations("iskurReview");
  return (
    <Card labelledBy="iskur-review-summary" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="iskur-review-summary" className="type-h3 text-text-primary">
          {t("summary")}
        </h2>
        <StatusBadge tone={WEEK_STATUS_TONES[week.status]}>
          {t(`status.${week.status}`)}
        </StatusBadge>
      </div>
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
      <p className="type-caption text-text-muted">{t("officialNote")}</p>
    </Card>
  );
}

function Team({ week }: { week: IskurLeaderWeek }) {
  const t = useTranslations("iskurReview");
  const locale = useLocale();
  const duration = useReportDuration();
  return (
    <Card labelledBy="iskur-review-team">
      <h2 id="iskur-review-team" className="type-h3 text-text-primary">
        {t("team")}
      </h2>
      <p className="type-body-sm text-text-secondary">{t("teamHint")}</p>
      {week.team.length === 0 ? (
        <p className="mt-4 type-body-sm text-text-muted">{t("noTeam")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border-subtle">
          {week.team.map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key -- a read-only list in the order the backend sends
            <li key={index} className="flex items-start gap-3 py-3">
              <Check aria-hidden className="mt-1 size-4 text-text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block type-body text-text-primary">
                  {line.title}
                </span>
                <span className="block type-caption text-text-muted">
                  {formatReportDay(line.date, locale).weekday}
                  {line.output
                    ? ` · ${t("output", { output: line.output })}`
                    : ""}
                  {line.handoverReason
                    ? ` · ${t("handedOver", { reason: line.handoverReason })}`
                    : ""}
                </span>
                {line.note ? (
                  <span className="block type-caption text-text-secondary">
                    {line.note}
                  </span>
                ) : null}
              </span>
              <span className="type-body-sm text-text-primary">
                {duration(line.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Mentoring({ week }: { week: IskurLeaderWeek }) {
  const t = useTranslations("iskurReview");
  const locale = useLocale();
  const duration = useReportDuration();
  return (
    <Card labelledBy="iskur-review-mentoring">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="iskur-review-mentoring" className="type-h3 text-text-primary">
          {t("mentoring")}
        </h2>
        <StatusBadge
          tone={StatusTone.Neutral}
          icon={<EyeOff aria-hidden className="size-3.5" />}
        >
          {t("contentHidden")}
        </StatusBadge>
      </div>
      <p className="type-body-sm text-text-secondary">{t("mentoringHint")}</p>
      {week.mentoring.days.length === 0 ? (
        <p className="mt-4 type-body-sm text-text-muted">{t("noMentoring")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border-subtle">
          {week.mentoring.days.map((day) => {
            const label = formatReportDay(day.date, locale);
            return (
              <li key={day.date} className="flex items-start gap-3 py-3">
                <span className="w-16 shrink-0 type-caption text-text-muted">
                  {label.weekday}
                </span>
                <span className="min-w-0 flex-1 type-body-sm text-text-primary">
                  {[
                    day.meetingCount > 0
                      ? t("meetings", {
                          count: day.meetingCount,
                          sent: day.reportsSubmitted,
                          due: day.reportsDue,
                        })
                      : null,
                    ...day.supportActivityTitles.map((title) =>
                      t("supportActivity", { title }),
                    ),
                  ]
                    .filter((part) => part != null)
                    .join(" · ") || t("otherWork")}
                </span>
                <span className="type-body-sm text-text-primary">
                  {duration(day.minutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 rounded-card bg-background-subtle p-3 type-caption text-text-secondary">
        {t("privacy")}
      </p>
    </Card>
  );
}

function Decision({ review, week }: { review: Review; week: IskurLeaderWeek }) {
  const t = useTranslations("iskurReview.decision");
  if (!week.canDecide) {
    return (
      <Card labelledBy="iskur-review-decision" className="space-y-2">
        <h2 id="iskur-review-decision" className="type-h3 text-text-primary">
          {t("title")}
        </h2>
        {week.decision ? (
          <>
            <StatusBadge tone={WEEK_STATUS_TONES[week.status]}>
              {t(`choice.${week.decision.decision}`)}
            </StatusBadge>
            {week.decision.reason ? (
              <p className="whitespace-pre-line type-body-sm text-text-primary">
                {week.decision.reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className="type-body-sm text-text-muted">{t("notSent")}</p>
        )}
        {week.objection ? (
          <p className="rounded-card bg-status-warning-bg p-3 type-body-sm text-status-warning-text">
            {t("objection", { text: week.objection.text })}
          </p>
        ) : null}
      </Card>
    );
  }
  const reasonNeeded = review.reasonNeeded;
  return (
    <Card labelledBy="iskur-review-decision">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          review.submit();
        }}
      >
        <h2 id="iskur-review-decision" className="type-h3 text-text-primary">
          {t("title")}
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("checks")}</legend>
          <Checkbox
            label={t("timeMatchesWork")}
            checked={review.form.timeMatchesWork}
            onChange={review.setTimeMatchesWork}
          />
          <Checkbox
            label={t("effortDocumented")}
            checked={review.form.effortDocumented}
            onChange={review.setEffortDocumented}
          />
          <Checkbox
            label={t("outputsSufficient")}
            checked={review.form.outputsSufficient}
            onChange={review.setOutputsSufficient}
          />
        </fieldset>
        <fieldset>
          <legend className="type-label text-text-primary">
            {t("choiceLabel")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DECISIONS.map((decision) => (
              <label
                key={decision}
                className={`flex h-10 cursor-pointer items-center rounded-full border px-4 type-label-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-selected ${
                  review.form.decision === decision
                    ? "border-border-selected bg-background-selected text-text-accent"
                    : "border-border-default bg-background-surface text-text-primary hover:bg-background-subtle"
                }`}
              >
                <input
                  type="radio"
                  name="iskur-review-decision"
                  value={decision}
                  checked={review.form.decision === decision}
                  onChange={() => review.setDecision(decision)}
                  className="sr-only"
                />
                {t(`choice.${decision}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-2">
          <span className="type-label text-text-primary">{t("reason")}</span>
          <textarea
            value={review.form.reason}
            maxLength={ISKUR_NOTE_MAX}
            rows={4}
            placeholder={t("reasonPlaceholder")}
            aria-required={reasonNeeded}
            aria-describedby="iskur-review-reason-hint"
            aria-invalid={reasonNeeded ? !review.form.reason.trim() : undefined}
            onChange={(event) => review.setReason(event.target.value)}
            className={ISKUR_FIELD_CLASS}
          />
          <span
            id="iskur-review-reason-hint"
            className="block type-caption text-text-muted"
          >
            {t("reasonHint", {
              length: review.form.reason.length,
              max: ISKUR_NOTE_MAX,
            })}
          </span>
        </label>
        <Button
          type="submit"
          fullWidth
          disabled={!review.canSubmit}
          aria-busy={review.submitting}
        >
          {t("submit")}
        </Button>
        <p className="type-caption text-text-muted">{t("footnote")}</p>
      </form>
    </Card>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5"
      />
      <span className="type-body-sm text-text-primary">{label}</span>
    </label>
  );
}

function Queue({ review }: { review: Review }) {
  const t = useTranslations("iskurReview");
  const others = review.others;
  if (others.length === 0) return null;
  return (
    <Card labelledBy="iskur-review-queue">
      <h2 id="iskur-review-queue" className="type-h3 text-text-primary">
        {t("queue")}
      </h2>
      <ul className="mt-3 space-y-2">
        {others.map((row) => (
          <li key={row.userId} className="flex items-center gap-3">
            <InitialsAvatar initials={initials(row.fullName)} />
            {row.weekId ? (
              <Link
                href={review.hrefOf(row.weekId)}
                className="flex-1 type-body text-text-primary hover:underline"
              >
                {row.fullName}
              </Link>
            ) : (
              <span className="flex-1 type-body text-text-primary">
                {row.fullName}
              </span>
            )}
            <StatusBadge
              tone={
                row.status ? WEEK_STATUS_TONES[row.status] : StatusTone.Neutral
              }
            >
              {row.status ? t(`status.${row.status}`) : t("notStarted")}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
