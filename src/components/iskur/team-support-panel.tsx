// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { IskurTeamSupportForm } from "@/components/iskur/team-support-form";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import {
  useIskurTeamSupport,
  type IskurTeamSupportState,
} from "@/hooks/use-iskur-team-support";
import type { IskurTeamSupport } from "@/interfaces/iskur-team-support";
import { ISKUR_TEAM_SUPPORT_TEXT_MAX } from "@/lib/iskur-team-support";
import { formatDateTime } from "@/lib/utils";

/**
 * Ekibim › Destek talepleri for a leader (handbook p.18, "Başka ekipten destek lazım → Liderin talep açar"): open a
 * request to another team, answer what other teams asked of yours, and follow what you opened.
 */
export function IskurTeamSupportPanel() {
  const t = useTranslations("iskurTeamSupport");
  const state = useIskurTeamSupport();
  if (state.loading) return null;
  if (state.loadFailed || !state.data) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {t("loadFailed")}
      </p>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card labelledBy="iskur-support-incoming" className="flex flex-col gap-3">
        <h2
          id="iskur-support-incoming"
          className="type-title-card text-text-primary"
        >
          {t("incomingTitle")}
        </h2>
        {state.incoming.length === 0 ? (
          <p className="type-body-sm text-text-muted">{t("incomingEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {state.incoming.map((request) => (
              <li key={request.id} className="py-3">
                <Incoming request={request} state={state} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card labelledBy="iskur-support-outgoing" className="flex flex-col gap-3">
        <h2
          id="iskur-support-outgoing"
          className="type-title-card text-text-primary"
        >
          {t("title")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("hint")}</p>
        <IskurTeamSupportForm state={state} idPrefix="iskur-support" />
        <h3 className="type-h4 text-text-primary">{t("outgoingTitle")}</h3>
        {state.outgoing.length === 0 ? (
          <p className="type-body-sm text-text-muted">{t("outgoingEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {state.outgoing.map((request) => (
              <li key={request.id} className="py-3">
                <Outgoing request={request} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Incoming({
  request,
  state,
}: {
  request: IskurTeamSupport;
  state: IskurTeamSupportState;
}) {
  const t = useTranslations("iskurTeamSupport");
  const locale = useLocale();
  const answering = state.answeringId === request.id;
  const noteId = `iskur-support-note-${request.id}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-label text-text-primary">
            {t("fromLine", {
              team: request.fromTeamName,
              date: formatDateTime(request.createdAt, locale),
            })}
          </p>
          <Details request={request} />
        </div>
        {request.canAnswer && !answering ? (
          <Button
            size={ButtonSize.Small}
            disabled={state.busy}
            aria-label={t("answerNamed", { team: request.fromTeamName })}
            onClick={() => state.startAnswer(request.id)}
          >
            {t("answer")}
          </Button>
        ) : null}
      </div>
      {answering ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="type-label text-text-primary">
            {t("noteLabel")}
          </label>
          <textarea
            id={noteId}
            value={state.note}
            maxLength={ISKUR_TEAM_SUPPORT_TEXT_MAX}
            aria-describedby={`${noteId}-hint`}
            onChange={(event) => state.setNote(event.target.value)}
            className={`${ISKUR_FIELD_CLASS} min-h-[72px]`}
          />
          <p id={`${noteId}-hint`} className="type-caption text-text-secondary">
            {t("noteHint", { max: ISKUR_TEAM_SUPPORT_TEXT_MAX })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size={ButtonSize.Small}
              disabled={state.busy || state.noteTooLong}
              onClick={() => state.reply(true)}
            >
              {t("accept")}
            </Button>
            <Button
              variant={ButtonVariant.Destructive}
              size={ButtonSize.Small}
              disabled={state.busy || state.noteTooLong}
              onClick={() => state.reply(false)}
            >
              {t("decline")}
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Small}
              onClick={state.cancelAnswer}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Outgoing({ request }: { request: IskurTeamSupport }) {
  const t = useTranslations("iskurTeamSupport");
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-1">
      <p className="type-label text-text-primary">
        {t("toLine", {
          team: request.toTeamName,
          date: formatDateTime(request.createdAt, locale),
        })}
      </p>
      <Details request={request} />
    </div>
  );
}

/** What was asked, for which task, and where it stands. */
export function Details({ request }: { request: IskurTeamSupport }) {
  const t = useTranslations("iskurTeamSupport");
  return (
    <div className="flex flex-col gap-0.5">
      <p className="type-body-sm text-text-secondary">“{request.need}”</p>
      {request.taskTitle ? (
        <p className="type-caption text-text-muted">
          {t("forTask", { task: request.taskTitle })}
        </p>
      ) : null}
      {request.openedByName ? (
        <p className="type-caption text-text-muted">
          {t("openedBy", { name: request.openedByName })}
        </p>
      ) : null}
      <p className="type-caption text-text-primary">
        {t(`status.${request.status}`)}
      </p>
      {request.answerNote ? (
        <p className="type-caption text-text-secondary">
          {t("answerNoteLine", { note: request.answerNote })}
        </p>
      ) : null}
    </div>
  );
}
