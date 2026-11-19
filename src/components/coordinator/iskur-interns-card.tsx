"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import {
  useIskurInterns,
  type IskurInternsState,
} from "@/hooks/use-iskur-interns";
import {
  IskurInternAccountState,
  type IskurInternEntry,
} from "@/interfaces/iskur-interns";
import { ISKUR_INTERN_PASTE_MAX } from "@/lib/iskur-interns";
import { errorMessage } from "@/lib/utils";

const STATE_TONES: Record<IskurInternAccountState, StatusTone> = {
  [IskurInternAccountState.Intern]: StatusTone.Success,
  [IskurInternAccountState.NotSignedUp]: StatusTone.Neutral,
  [IskurInternAccountState.OutsideProgram]: StatusTone.Warning,
};

/**
 * "İŞKUR stajyerleri": the e-mail addresses whose accounts count as the program's İŞKUR interns. The coordinator
 * pastes addresses, sees who has signed up, and removes an address (not while its owner is placed in a team).
 */
export function IskurInternsCard({ programId }: { programId: string }) {
  const t = useTranslations("iskurInterns");
  const state = useIskurInterns(programId);
  const titleId = useId();
  const fieldId = useId();
  const hintId = useId();
  const list = state.list;
  return (
    <Card labelledBy={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id={titleId} className="flex-1 type-title-card text-text-primary">
          {t("title")}
        </h2>
        {list ? (
          <p className="type-label-sm text-text-muted">
            {t("summary", {
              listed: list.counts.listed,
              interns: list.counts.interns,
              notSignedUp: list.counts.notSignedUp,
            })}
          </p>
        ) : null}
      </div>
      <p className="type-body-sm text-text-secondary">{t("hint")}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="type-label text-text-primary">
          {t("pasteLabel")}
        </label>
        <textarea
          id={fieldId}
          value={state.text}
          aria-describedby={hintId}
          onChange={(event) => state.setText(event.target.value)}
          className={`${ISKUR_FIELD_CLASS} min-h-[120px]`}
        />
        <p id={hintId} className="type-caption text-text-muted">
          {t("pasteHint")}
        </p>
        {state.tooMany ? (
          <p role="alert" className="type-caption text-status-error-text">
            {t("tooMany", { max: ISKUR_INTERN_PASTE_MAX })}
          </p>
        ) : null}
        {state.rejected.length > 0 ? (
          <p role="alert" className="type-caption text-status-error-text">
            {t("rejected", { entries: state.rejected.join(", ") })}
          </p>
        ) : null}
        <div>
          <Button
            size={ButtonSize.Small}
            disabled={!state.canAdd}
            onClick={state.addPasted}
          >
            {t("add")}
          </Button>
        </div>
      </div>

      <InternList state={state} />
    </Card>
  );
}

function InternList({ state }: { state: IskurInternsState }) {
  const t = useTranslations("iskurInterns");
  if (state.isLoading) {
    return (
      <p role="status" className="type-body-sm text-text-muted">
        {t("loading")}
      </p>
    );
  }
  if (state.loadError || !state.list) {
    return (
      <p role="alert" className="type-body-sm text-status-error-text">
        {errorMessage(state.loadError, t("loadFailed"))}
      </p>
    );
  }
  if (state.list.entries.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-default px-6 py-6 text-center type-body-sm text-text-secondary">
        {t("empty")}
      </p>
    );
  }
  return (
    <ul
      aria-label={t("listLabel")}
      className="flex max-h-[420px] flex-col divide-y divide-border-subtle overflow-y-auto rounded-[12px] border border-border-subtle"
    >
      {state.list.entries.map((entry) => (
        <InternRow key={entry.id} entry={entry} state={state} />
      ))}
    </ul>
  );
}

function InternRow({
  entry,
  state,
}: {
  entry: IskurInternEntry;
  state: IskurInternsState;
}) {
  const t = useTranslations("iskurInterns");
  const placedHintId = useId();
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="break-all type-body-sm text-text-primary">
          {entry.email}
        </p>
        {entry.fullName ? (
          <p className="type-caption text-text-muted">{entry.fullName}</p>
        ) : null}
      </div>
      <StatusBadge tone={STATE_TONES[entry.account]}>
        {t(`states.${entry.account}`)}
      </StatusBadge>
      {entry.placed ? (
        <StatusBadge tone={StatusTone.Info}>{t("placed")}</StatusBadge>
      ) : null}
      <Button
        variant={ButtonVariant.Ghost}
        size={ButtonSize.Small}
        aria-label={t("removeNamed", { email: entry.email })}
        aria-describedby={entry.placed ? placedHintId : undefined}
        disabled={entry.placed || state.busy}
        onClick={() => state.removeEntry(entry.id)}
      >
        {t("remove")}
      </Button>
      {entry.placed ? (
        <p id={placedHintId} className="w-full type-caption text-text-muted">
          {t("removePlacedHint")}
        </p>
      ) : null}
    </li>
  );
}
