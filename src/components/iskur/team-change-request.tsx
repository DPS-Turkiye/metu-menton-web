// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import { useIskurTeamChange } from "@/hooks/use-iskur-team-change";
import {
  IskurTeamChangeStatus,
  type IskurTeamChange,
} from "@/interfaces/iskur-team-change";
import { ISKUR_TEAM_CHANGE_TEXT_MAX } from "@/lib/iskur-team-change";
import { formatDateTime } from "@/lib/utils";

/**
 * "Ekibimi değiştirebilir miyim?" (student handbook p.18) on the team reveal: during the trial the intern sends a short
 * reason, then sees the request wait and the coordinator's answer.
 */
export function IskurTeamChangeRequest() {
  const t = useTranslations("iskurTeamChange");
  const state = useIskurTeamChange();
  if (!state.ready || (!state.canAsk && state.latest === null)) return null;
  return (
    <Card labelledBy="iskur-team-change" className="flex flex-col gap-3">
      <h3 id="iskur-team-change" className="type-h4 text-text-primary">
        {t("title")}
      </h3>
      {state.latest ? <Latest request={state.latest} /> : null}
      {state.canAsk && !state.writing ? (
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
            htmlFor="iskur-team-change-reason"
            className="type-label text-text-primary"
          >
            {t("reasonLabel")}
          </label>
          <textarea
            id="iskur-team-change-reason"
            value={state.reason}
            maxLength={ISKUR_TEAM_CHANGE_TEXT_MAX}
            aria-describedby="iskur-team-change-reason-hint"
            onChange={(event) => state.setReason(event.target.value)}
            className={`${ISKUR_FIELD_CLASS} min-h-[96px]`}
          />
          <p
            id="iskur-team-change-reason-hint"
            className="type-caption text-text-secondary"
          >
            {t("reasonHint", { max: ISKUR_TEAM_CHANGE_TEXT_MAX })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size={ButtonSize.Small}
              disabled={!state.canSend}
              onClick={state.send}
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

function Latest({ request }: { request: IskurTeamChange }) {
  const t = useTranslations("iskurTeamChange");
  const locale = useLocale();
  switch (request.status) {
    case IskurTeamChangeStatus.Pending:
      return (
        <div className="flex flex-col gap-1" role="status">
          <p className="type-label text-text-primary">
            {t("waiting", {
              date: formatDateTime(request.createdAt, locale),
            })}
          </p>
          <p className="type-body-sm text-text-secondary">
            {t("yourReason", { reason: request.reason })}
          </p>
          <p className="type-caption text-text-muted">{t("waitingHint")}</p>
        </div>
      );
    case IskurTeamChangeStatus.Moved:
      return (
        <p className="type-body-sm text-text-primary">
          {t("moved", { team: request.currentTeamName ?? "" })}
        </p>
      );
    case IskurTeamChangeStatus.Declined:
      return (
        <div className="flex flex-col gap-1">
          <p className="type-label text-text-primary">{t("declinedTitle")}</p>
          <p className="type-body-sm text-text-secondary">
            {t("declinedNote", { note: request.decisionNote ?? "" })}
          </p>
        </div>
      );
    case IskurTeamChangeStatus.Cancelled:
      return (
        <p className="type-body-sm text-text-secondary">
          {t("cancelledTitle")}
        </p>
      );
  }
}
