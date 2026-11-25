"use client";

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
import { formatFileSize } from "@/lib/utils";

type Wizard = ReturnType<typeof useIskurOnboarding>;

// TEST UI: placeholder until the design team's screen; replace when it arrives.
/** Belgeler: the CV (needed while uploads are on) and an optional transcript; closed while file storage is off. */
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
        <div className="flex flex-col gap-4">
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
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-1">
        <p className="type-title-card text-text-primary">
          {t(slot)}{" "}
          <span className="type-caption text-text-muted">
            · {t(required ? "required" : "optional")}
          </span>
        </p>
        <p className="type-body-sm text-text-secondary">
          {file
            ? t("file", {
                name: file.fileName,
                size: formatFileSize(file.sizeBytes),
              })
            : t("empty")}
        </p>
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label={t(slot)}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) wizard.upload(slot, chosen);
        }}
      />
      <div className="flex gap-2">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Small}
          disabled={wizard.busy}
          onClick={() => input.current?.click()}
        >
          {wizard.busy ? t("uploading") : t(file ? "replace" : "choose")}
        </Button>
        {/* A sent form keeps its CV: it can be replaced, not removed. */}
        {file && !(required && wizard.form?.submittedAt) ? (
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
    </Card>
  );
}
