// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import { useIskurAssessmentStatement } from "@/hooks/use-iskur-assessment-statement";
import {
  IskurAssessmentStatus,
  type IskurAssessmentStatement as Statement,
} from "@/interfaces/iskur-assessment-statement";
import {
  ISKUR_ASSESSMENT_REASONS,
  ISKUR_ASSESSMENT_TEXT_MAX,
  mentoringOutcome,
} from "@/lib/iskur-assessment-statement";
import { formatHours } from "@/lib/iskur-onboarding";
import { formatDateTime } from "@/lib/utils";

/**
 * "Değerlendirmeyi neden tamamlayamadım / geçemedim" (İŞKUR work model, 27 Nov): an intern without the badge tells
 * their coordinator why, then sees it wait and the coordinator's decision on their weekly mentoring time.
 */
export function IskurAssessmentStatement() {
  const t = useTranslations("iskurAssessment");
  const state = useIskurAssessmentStatement();
  if (!state.ready || (!state.canSend && state.latest === null)) return null;
  return (
    <Card labelledBy="iskur-assessment" className="flex flex-col gap-3">
      <h2 id="iskur-assessment" className="type-h4 text-text-primary">
        {t("title")}
      </h2>
      {state.latest ? <Latest statement={state.latest} /> : null}
      {state.canSend && !state.writing ? (
        <>
          <p className="type-body-sm text-text-secondary">{t("hint")}</p>
          <div>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              onClick={state.start}
            >
              {t("start")}
            </Button>
          </div>
        </>
      ) : null}
      {state.writing ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="iskur-assessment-reason"
            className="type-label text-text-primary"
          >
            {t("reasonLabel")}
          </label>
          <select
            id="iskur-assessment-reason"
            value={state.reason}
            onChange={(event) => state.selectReason(event.target.value)}
            className={ISKUR_FIELD_CLASS}
          >
            <option value="">{t("reasonPlaceholder")}</option>
            {ISKUR_ASSESSMENT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {t(`reasons.${reason}`)}
              </option>
            ))}
          </select>
          <label
            htmlFor="iskur-assessment-text"
            className="type-label text-text-primary"
          >
            {t("textLabel")}
          </label>
          <textarea
            id="iskur-assessment-text"
            value={state.text}
            maxLength={ISKUR_ASSESSMENT_TEXT_MAX}
            aria-describedby="iskur-assessment-text-hint"
            onChange={(event) => state.setText(event.target.value)}
            className={`${ISKUR_FIELD_CLASS} min-h-[96px]`}
          />
          <p
            id="iskur-assessment-text-hint"
            className="type-caption text-text-secondary"
          >
            {t("textHint", { max: ISKUR_ASSESSMENT_TEXT_MAX })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size={ButtonSize.Small}
              disabled={!state.canSubmit}
              onClick={state.submit}
            >
              {state.busy ? t("sending") : t("send")}
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
      ) : null}
    </Card>
  );
}

function Latest({ statement }: { statement: Statement }) {
  const t = useTranslations("iskurAssessment");
  const locale = useLocale();
  switch (statement.status) {
    case IskurAssessmentStatus.Pending:
      return (
        <div className="flex flex-col gap-1" role="status">
          <p className="type-label text-text-primary">
            {t("waiting", {
              date: formatDateTime(statement.createdAt, locale),
            })}
          </p>
          <p className="type-body-sm text-text-secondary">
            {t("yourReason", { reason: t(`reasons.${statement.reason}`) })}
          </p>
          <p className="type-caption text-text-muted">{t("waitingHint")}</p>
        </div>
      );
    case IskurAssessmentStatus.Decided: {
      const outcome = mentoringOutcome(statement);
      return (
        <div className="flex flex-col gap-1">
          <p className="type-label text-text-primary">
            {statement.decidedAt
              ? t("decidedTitle", {
                  date: formatDateTime(statement.decidedAt, locale),
                })
              : t("decidedUndated")}
          </p>
          <p className="type-body-sm text-text-primary">
            {t(outcome.key, { hours: formatHours(outcome.minutes, locale) })}
          </p>
          {statement.retakeOpened ? (
            <p className="type-body-sm text-text-primary">
              {t("retakeOpened")}
            </p>
          ) : null}
          {statement.decisionNote ? (
            <p className="type-body-sm text-text-secondary">
              {t("note", { note: statement.decisionNote })}
            </p>
          ) : null}
        </div>
      );
    }
    case IskurAssessmentStatus.Cancelled:
      return (
        <p className="type-body-sm text-text-secondary">
          {t("cancelledTitle")}
        </p>
      );
  }
}
