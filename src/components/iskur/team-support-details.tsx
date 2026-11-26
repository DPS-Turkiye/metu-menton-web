// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";

import type { IskurTeamSupport } from "@/interfaces/iskur-team-support";

/** What was asked, for which task, and where it stands. */
export function IskurTeamSupportDetails({
  request,
}: {
  request: IskurTeamSupport;
}) {
  const t = useTranslations("iskurTeamSupport");
  return (
    <div className="flex flex-col gap-0.5">
      <p className="type-body-sm text-text-secondary">
        {t("quote", { need: request.need })}
      </p>
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
