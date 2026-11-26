// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import {
  useIskurTeamChanges,
  type IskurTeamChangesState,
} from "@/hooks/use-iskur-team-changes";
import {
  IskurTeamChangeStatus,
  type IskurTeamChange,
} from "@/interfaces/iskur-team-change";
import { ISKUR_TEAM_CHANGE_TEXT_MAX } from "@/lib/iskur-team-change";
import { formatDateTime } from "@/lib/utils";

/**
 * Team change requests in the İŞKUR workspace (student handbook p.18, "kararı koordinatör verir"): move the intern
 * with the placement dialog, which closes the request, or decline it with a note the intern reads.
 */
export function IskurTeamChangesCard({
  programId,
  onMove,
}: {
  programId: string;
  onMove: (userId: string) => void;
}) {
  const t = useTranslations("iskurTeamChange.coordinator");
  const state = useIskurTeamChanges(programId);
  if (state.loading) return null;
  return (
    <Card labelledBy="iskur-team-changes" className="flex flex-col gap-3">
      <div>
        <h2
          id="iskur-team-changes"
          className="type-title-card text-text-primary"
        >
          {t("title")}
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
          {state.waiting.map((request) => (
            <li key={request.id} className="py-3">
              <Waiting request={request} state={state} onMove={onMove} />
            </li>
          ))}
        </ul>
      )}
      {state.answered.length > 0 ? (
        <details>
          <summary className="cursor-pointer type-label text-text-secondary">
            {t("answered", { count: state.answered.length })}
          </summary>
          <ul className="mt-2 space-y-1">
            {state.answered.map((request) => (
              <li key={request.id} className="type-body-sm text-text-secondary">
                {request.fullName} · <Outcome request={request} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

function Waiting({
  request,
  state,
  onMove,
}: {
  request: IskurTeamChange;
  state: IskurTeamChangesState;
  onMove: (userId: string) => void;
}) {
  const t = useTranslations("iskurTeamChange.coordinator");
  const locale = useLocale();
  const declining = state.decliningId === request.id;
  const noteId = `iskur-team-change-note-${request.id}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-label text-text-primary">{request.fullName}</p>
          <p className="type-caption text-text-muted">
            {t("from", {
              team: request.fromTeamName ?? "",
              date: formatDateTime(request.createdAt, locale),
            })}
          </p>
        </div>
        {declining ? null : (
          <div className="flex gap-2">
            <Button
              size={ButtonSize.Small}
              aria-label={t("moveNamed", { name: request.fullName })}
              onClick={() => onMove(request.userId)}
            >
              {t("move")}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              aria-label={t("declineNamed", { name: request.fullName })}
              onClick={() => state.startDecline(request.id)}
            >
              {t("decline")}
            </Button>
          </div>
        )}
      </div>
      <p className="type-body-sm text-text-secondary">“{request.reason}”</p>
      {declining ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="type-label text-text-primary">
            {t("noteLabel")}
          </label>
          <textarea
            id={noteId}
            value={state.note}
            maxLength={ISKUR_TEAM_CHANGE_TEXT_MAX}
            aria-describedby={`${noteId}-hint`}
            onChange={(event) => state.setNote(event.target.value)}
            className={`${ISKUR_FIELD_CLASS} min-h-[80px]`}
          />
          <p id={`${noteId}-hint`} className="type-caption text-text-secondary">
            {t("noteHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={ButtonVariant.Destructive}
              size={ButtonSize.Small}
              disabled={!state.canDecline}
              onClick={state.confirmDecline}
            >
              {t("confirmDecline")}
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Small}
              onClick={state.cancelDecline}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Outcome({ request }: { request: IskurTeamChange }) {
  const t = useTranslations("iskurTeamChange.coordinator.status");
  switch (request.status) {
    case IskurTeamChangeStatus.Moved:
      return <>{t("MOVED", { team: request.currentTeamName ?? "" })}</>;
    case IskurTeamChangeStatus.Declined:
      return <>{t("DECLINED", { note: request.decisionNote ?? "" })}</>;
    case IskurTeamChangeStatus.Cancelled:
      return <>{t("CANCELLED")}</>;
    case IskurTeamChangeStatus.Pending:
      return null;
  }
}
