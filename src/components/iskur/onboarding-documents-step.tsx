"use client";

import { Check, CircleCheck, FileText, Lock, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import {
  IskurDocumentSlot,
  type IskurFileRef,
} from "@/interfaces/iskur-onboarding";
import { ISKUR_DOCUMENT_MAX_BYTES } from "@/lib/iskur-onboarding";
import { formatFileSize } from "@/lib/utils";

type Wizard = ReturnType<typeof useIskurOnboarding>;

const REQUIREMENTS = ["pdfOnly", "maxSize", "cvPages"] as const;

/**
 * 5.3c · Belgeler (Revised 3:20876): the CV (needed while uploads are on) and an optional transcript, with the file
 * rules and who sees them beside; closed while file storage is off.
 */
export function OnboardingDocumentsStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.documents");
  const form = wizard.form;
  const context = wizard.context;
  if (!form || !context) return null;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>
      {context.documentsEnabled ? (
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <DocumentSlot
              wizard={wizard}
              slot={IskurDocumentSlot.Cv}
              file={form.documents.cv}
              required
            />
            <DocumentSlot
              wizard={wizard}
              slot={IskurDocumentSlot.Transcript}
              file={form.documents.transcript}
              required={false}
            />
          </div>
          <aside className="flex flex-col gap-5 xl:w-[280px] xl:shrink-0">
            <Card className="flex flex-col gap-3">
              <h2 className="type-title-card text-text-primary">
                {t("requirementsTitle")}
              </h2>
              <ul className="flex flex-col gap-2">
                {REQUIREMENTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 type-body-sm text-text-secondary"
                  >
                    <Check aria-hidden className="size-4 shrink-0" />
                    {t(`requirements.${item}`, {
                      max: formatFileSize(ISKUR_DOCUMENT_MAX_BYTES),
                    })}
                  </li>
                ))}
              </ul>
            </Card>
            <div className="flex flex-col gap-3 rounded-card bg-background-subtle p-6">
              <h2 className="type-title-card text-text-primary">
                {t("whoTitle")}
              </h2>
              <p className="flex items-start gap-2 type-body-sm text-text-secondary">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t("whoCoordinators")}
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <InlineAlert tone={StatusTone.Info} title={t("off")}>
          {t("offBody")}
        </InlineAlert>
      )}
    </>
  );
}

function DocumentSlot({
  wizard,
  slot,
  file,
  required,
}: {
  wizard: Wizard;
  slot: IskurDocumentSlot;
  file: IskurFileRef | null;
  required: boolean;
}) {
  const t = useTranslations("iskurOnboarding.documents");
  const headingId = useId();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  // A sent form keeps its CV: it can be replaced, not removed.
  const removable = file !== null && !(required && wizard.form?.submittedAt);
  const uploading = wizard.uploadingSlot === slot;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
      // A file dropped on the slot, empty or not, is its new file rather than a page the browser opens.
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files[0];
        if (dropped) wizard.upload(slot, dropped);
      }}
    >
      <div className="flex items-center gap-2">
        <h2 id={headingId} className="type-h4 text-text-primary">
          {t(slot)}
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 type-label-sm ${
            required
              ? "bg-brand-odtu-bg text-brand-odtu-strong"
              : "bg-background-muted text-text-secondary"
          }`}
        >
          {t(required ? "required" : "optional")}
        </span>
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label={t("chooseLabel", { slot: t(slot) })}
        // With a file shown, Değiştir opens the picker; the input itself is not a second stop.
        tabIndex={file ? -1 : 0}
        disabled={wizard.busy}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) wizard.upload(slot, chosen);
        }}
      />
      {file ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-status-success-border bg-status-success-bg px-4 py-3">
          <FileText
            aria-hidden
            className="size-5 shrink-0 text-text-secondary"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="break-all type-label text-text-primary">
              {file.fileName}
            </p>
            <p className="flex items-center gap-1 type-caption text-status-success-text">
              {t("uploaded", { size: formatFileSize(file.sizeBytes) })}
              <CircleCheck aria-hidden className="size-3.5" />
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Small}
              disabled={wizard.busy}
              aria-label={t("replaceLabel", { slot: t(slot) })}
              onClick={() => input.current?.click()}
            >
              {uploading ? t("uploading") : t("replace")}
            </Button>
            {removable ? (
              <Button
                variant={ButtonVariant.Ghost}
                size={ButtonSize.Small}
                disabled={wizard.busy}
                onClick={() => wizard.removeDocument(slot)}
              >
                {t("remove")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-border-strong px-4 py-7 text-center focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-border-selected">
          <Upload aria-hidden className="size-4 text-text-secondary" />
          {uploading ? (
            <p role="status" className="type-label text-text-primary">
              {t("uploading")}
            </p>
          ) : (
            <p className="type-label text-text-primary">
              {t("drop")}{" "}
              <label
                htmlFor={inputId}
                className="cursor-pointer text-text-accent hover:underline"
              >
                {t("dropChoose")}
              </label>
            </p>
          )}
          <p className="type-caption text-text-muted">
            {t("formats", { max: formatFileSize(ISKUR_DOCUMENT_MAX_BYTES) })}
          </p>
        </div>
      )}
    </section>
  );
}
