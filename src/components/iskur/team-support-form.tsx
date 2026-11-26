// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import type { IskurTeamSupportState } from "@/hooks/use-iskur-team-support";
import { ISKUR_TEAM_SUPPORT_TEXT_MAX } from "@/lib/iskur-team-support";

/** The leader's "Destek talebi aç": which team, and what is needed. A task page passes its task to the hook. */
export function IskurTeamSupportForm({
  state,
  idPrefix,
}: {
  state: IskurTeamSupportState;
  idPrefix: string;
}) {
  const t = useTranslations("iskurTeamSupport");
  if (!state.writing) {
    return (
      <div>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          onClick={state.start}
        >
          {t("start")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`${idPrefix}-team`}
        className="type-label text-text-primary"
      >
        {t("teamLabel")}
      </label>
      <select
        id={`${idPrefix}-team`}
        value={state.form.toTeamId}
        onChange={(event) => state.setTeam(event.target.value)}
        className={ISKUR_FIELD_CLASS}
      >
        <option value="">{t("teamPlaceholder")}</option>
        {state.teams.map((team) => (
          <option key={team.id} value={team.id}>
            {t("teamOption", { team: team.name, unit: team.unitName })}
          </option>
        ))}
      </select>
      <label
        htmlFor={`${idPrefix}-need`}
        className="type-label text-text-primary"
      >
        {t("needLabel")}
      </label>
      <textarea
        id={`${idPrefix}-need`}
        value={state.form.need}
        maxLength={ISKUR_TEAM_SUPPORT_TEXT_MAX}
        aria-describedby={`${idPrefix}-need-hint`}
        onChange={(event) => state.setNeed(event.target.value)}
        className={`${ISKUR_FIELD_CLASS} min-h-[80px]`}
      />
      <p
        id={`${idPrefix}-need-hint`}
        className="type-caption text-text-secondary"
      >
        {t("needHint", { max: ISKUR_TEAM_SUPPORT_TEXT_MAX })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size={ButtonSize.Small}
          disabled={!state.canOpen}
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
  );
}
