// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import {
  useIskurAssessmentStatements,
  type IskurAssessmentStatementsState,
} from "@/hooks/use-iskur-assessment-statements";
import {
  IskurAssessmentStatus,
  IskurDecisionProblem,
  IskurMentoringChoice,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";
import {
  canOfferRetake,
  ISKUR_ASSESSMENT_NOTE_MAX,
  mentoringOutcome,
} from "@/lib/iskur-assessment-statement";
import { formatHours } from "@/lib/iskur-onboarding";
import { defaultMentoringMinutes } from "@/lib/iskur-workspace";
import { formatDateTime } from "@/lib/utils";

const CHOICES = Object.values(IskurMentoringChoice);

/**
 * Assessment statements in the İŞKUR workspace (İŞKUR work model, 27 Nov): an intern without the badge says why they
 * could not pass the assessment, and the coordinator decides their weekly mentoring time in one step.
 */
export function IskurAssessmentStatementsCard({
  programId,
}: {
  programId: string;
}) {
  const t = useTranslations("iskurAssessment.coordinator");
  const state = useIskurAssessmentStatements(programId);
  if (state.loading) return null;
  return (
    <Card
      labelledBy="iskur-assessment-statements"
      className="flex flex-col gap-3"
    >
      <div>
        <h2
          id="iskur-assessment-statements"
          className="type-title-card text-text-primary"
        >
          {t("title", { count: state.pendingCount })}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("hint")}</p>
      </div>
      {state.failed ? (
        <p role="alert" className="type-body-sm text-status-error-text">
          {t("loadFailed")}
        </p>
      ) : state.waiting.length === 0 ? (
        <p className="type-body-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {state.waiting.map((statement) => (
            <li key={statement.id} className="py-3">
              <Waiting statement={statement} state={state} />
            </li>
          ))}
        </ul>
      )}
      {state.closed.length > 0 ? (
        <details>
          <summary className="cursor-pointer type-label text-text-secondary">
            {t("closed", { count: state.closed.length })}
          </summary>
          <ul className="mt-2 space-y-1">
            {state.closed.map((statement) => (
              <li
                key={statement.id}
                className="type-body-sm text-text-secondary"
              >
                {statement.fullName} · <Outcome statement={statement} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

function Waiting({
  statement,
  state,
}: {
  statement: IskurAssessmentStatement;
  state: IskurAssessmentStatementsState;
}) {
  const t = useTranslations("iskurAssessment");
  const locale = useLocale();
  const deciding = state.decidingId === statement.id;
  const hours = (minutes: number) => formatHours(minutes, locale);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-label text-text-primary">
            {statement.fullName}
            {statement.peerMentor ? ` · ${t("coordinator.badgeNow")}` : ""}
          </p>
          <p className="type-caption text-text-muted">
            {[
              statement.teamName,
              statement.weeklyDays === null
                ? t("coordinator.daysUnknown")
                : t("coordinator.week", {
                    days: statement.weeklyDays,
                    hours: hours(statement.currentMentoringMinutes ?? 0),
                  }) +
                  (statement.mentoringIsDefault
                    ? ` ${t("coordinator.defaultTag")}`
                    : ""),
              formatDateTime(statement.createdAt, locale),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {deciding ? null : (
          <Button
            size={ButtonSize.Small}
            disabled={state.busy}
            aria-label={t("coordinator.decideNamed", {
              name: statement.fullName,
            })}
            onClick={() => state.start(statement.id)}
          >
            {t("coordinator.decide")}
          </Button>
        )}
      </div>
      <p className="type-body-sm text-text-primary">
        {t(`reasons.${statement.reason}`)}
        {statement.trainingState
          ? ` · ${t(`coordinator.training.${statement.trainingState}`)}`
          : ""}
      </p>
      <p className="type-body-sm text-text-secondary">“{statement.text}”</p>
      {deciding ? <DecisionForm statement={statement} state={state} /> : null}
    </div>
  );
}

function DecisionForm({
  statement,
  state,
}: {
  statement: IskurAssessmentStatement;
  state: IskurAssessmentStatementsState;
}) {
  const t = useTranslations("iskurAssessment.coordinator");
  const tw = useTranslations("iskurWorkspace");
  const locale = useLocale();
  const id = `iskur-assessment-decision-${statement.id}`;
  const days = statement.weeklyDays;
  const fallback = days === null ? null : defaultMentoringMinutes(days);
  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-1">
        <legend className="type-label text-text-primary">
          {t("mentoringLabel")}
        </legend>
        {CHOICES.map((choice) => (
          <label key={choice} className="flex items-center gap-2 type-body-sm">
            <input
              type="radio"
              name={`${id}-choice`}
              value={choice}
              checked={state.form.choice === choice}
              onChange={(event) => state.setChoice(event.target.value)}
            />
            {choice === IskurMentoringChoice.Default && fallback !== null
              ? t("choiceDefaultHours", {
                  hours: formatHours(fallback, locale),
                })
              : t(`choice.${choice}`)}
          </label>
        ))}
      </fieldset>
      {state.form.choice === IskurMentoringChoice.Hours ? (
        <>
          <label
            htmlFor={`${id}-hours`}
            className="type-label text-text-primary"
          >
            {t("hoursLabel")}
          </label>
          <input
            id={`${id}-hours`}
            inputMode="decimal"
            value={state.form.hours}
            aria-invalid={state.hoursInvalid}
            aria-describedby={state.hoursInvalid ? `${id}-problem` : undefined}
            onChange={(event) => state.setHours(event.target.value)}
            className={ISKUR_FIELD_CLASS}
          />
        </>
      ) : null}
      {state.preview ? (
        <p role="status" className="type-caption text-text-secondary">
          {t("preview", {
            mentoring: formatHours(state.preview.mentoringMinutes, locale),
            team: formatHours(state.preview.teamMinutes, locale),
          })}
        </p>
      ) : null}
      {canOfferRetake(statement) ? (
        <label className="flex items-center gap-2 type-body-sm">
          <input
            type="checkbox"
            checked={state.form.retake}
            onChange={(event) => state.setRetake(event.target.checked)}
          />
          {t("retake")}
        </label>
      ) : null}
      <label htmlFor={`${id}-note`} className="type-label text-text-primary">
        {t("noteLabel")}
      </label>
      <textarea
        id={`${id}-note`}
        value={state.form.note}
        maxLength={ISKUR_ASSESSMENT_NOTE_MAX}
        onChange={(event) => state.setNote(event.target.value)}
        className={`${ISKUR_FIELD_CLASS} min-h-[64px]`}
      />
      {state.problem ? (
        <p
          id={`${id}-problem`}
          aria-live="polite"
          className="type-caption text-text-secondary"
        >
          {state.problem === IskurDecisionProblem.Empty
            ? t("emptyDecision")
            : tw(`problems.${state.problem}`)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size={ButtonSize.Small}
          disabled={!state.canConfirm}
          onClick={state.confirm}
        >
          {t("confirm")}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Small}
          onClick={state.cancel}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

function Outcome({ statement }: { statement: IskurAssessmentStatement }) {
  const t = useTranslations("iskurAssessment");
  const locale = useLocale();
  if (statement.status === IskurAssessmentStatus.Cancelled)
    return <>{t("coordinator.cancelled")}</>;
  const outcome = mentoringOutcome(statement);
  return (
    <>
      {t(outcome.key, { hours: formatHours(outcome.minutes, locale) })}
      {statement.retakeOpened ? ` · ${t("coordinator.retakeOpened")}` : ""}
    </>
  );
}
