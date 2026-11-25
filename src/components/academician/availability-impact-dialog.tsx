"use client";

// TEST UI: placeholder until the design team's screen; replace when it arrives.
import { useTranslations } from "next-intl";
import { useId } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import type {
  AcademicianAvailabilityEditor,
  AffectedRow,
} from "@/hooks/use-academician-availability-editor";

/** Before a change to the hours is saved: the meetings and requests it leaves outside them (FR-OH-29). */
export function AvailabilityImpactDialog({
  editor,
}: {
  editor: AcademicianAvailabilityEditor;
}) {
  const t = useTranslations("iaAcademician.availability.impact");
  const titleId = useId();
  const { review } = editor;
  if (!review) return null;
  return (
    <ModalDialog
      labelledBy={titleId}
      onClose={editor.closeReview}
      overlayClassName="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-background-inverse/30 px-4 py-8"
      panelClassName="w-full max-w-[520px] space-y-5 rounded-featured bg-background-surface p-6 shadow-modal outline-none"
    >
      <h2 id={titleId} className="type-h3 text-text-primary">
        {t("title")}
      </h2>
      <ChangedNotice changed={review.changed} />
      <p className="type-body-sm text-text-secondary">{t("intro")}</p>
      <AffectedList title={t("meetings")} rows={review.meetings} />
      <AffectedList title={t("requests")} rows={review.requests} />
      {/* The dialog focuses its first control, so the safe "Vazgeç" comes first and the link that leaves the page last. */}
      <div className="flex justify-end gap-2">
        <Button variant={ButtonVariant.Ghost} onClick={editor.closeReview}>
          {t("cancel")}
        </Button>
        <Button disabled={editor.isSaving} onClick={editor.confirmReview}>
          {t("confirm")}
        </Button>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 type-caption text-text-muted">
        {t("manageHint")}
        <Button variant={ButtonVariant.Tertiary} href={editor.manageHref}>
          {t("manage")}
        </Button>
      </p>
    </ModalDialog>
  );
}

/** Shown when the save was refused because the list changed after the academician saw it. */
function ChangedNotice({ changed }: { changed: boolean }) {
  const t = useTranslations("iaAcademician.availability.impact");
  if (!changed) return null;
  return <InlineAlert tone={StatusTone.Warning}>{t("changed")}</InlineAlert>;
}

function AffectedList({ title, rows }: { title: string; rows: AffectedRow[] }) {
  const titleId = useId();
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h3 id={titleId} className="type-label text-text-primary">
        {title}
      </h3>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-2xl border border-border-default px-4 py-3"
          >
            <span className="block type-label text-text-primary">
              {row.title}
            </span>
            {row.lines.map((line, index) => (
              <span
                // eslint-disable-next-line react/no-array-index-key -- a row's lines are fixed in order and a topic may repeat the course name
                key={index}
                className="block type-caption text-text-secondary"
              >
                {line}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
