"use client";

import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useId, type ReactNode } from "react";

import { Card } from "@/components/ia/card";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import { formatHours } from "@/lib/iskur-onboarding";
import { IskurOnboardingStep } from "@/types/iskur-onboarding";

type Wizard = ReturnType<typeof useIskurOnboarding>;

/** 5.5 · Önizle (Revised 3:21071): everything the form will send, one card per part with a way back to its step. */
export function OnboardingPreviewStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.preview");
  const tDays = useTranslations("iskurOnboarding.days");
  const tUnits = useTranslations("iskurOnboarding.units");
  const tDocs = useTranslations("iskurOnboarding.documents");
  const locale = useLocale();
  const form = wizard.form;
  const context = wizard.context;
  if (!form || !context) return null;
  const unitNames = context.units
    .filter((unit) => form.unitIds.includes(unit.id))
    .map((unit) => unit.name);
  const { cv, transcript } = form.documents;
  const skills = wizard.skillGroups.flatMap((group) => group.skills);

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>
      <div className="flex max-w-[720px] flex-col gap-4">
        <Section
          title={t("daysTitle")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Days)}
        >
          <Row label={t("weekly")}>
            {t("daysValue", {
              days: form.weeklyDays ?? 0,
              hours: formatHours(wizard.totalMinutes, locale),
            })}
          </Row>
          <Row label={t("calendar")}>
            {wizard.scheduledDays
              .map(
                (day) =>
                  `${tDays(`short.${day}`)} ${tDays("dayHours", { hours: formatHours(wizard.dayMinutes(day), locale) })}`,
              )
              .join(" · ") || t("none")}
          </Row>
          <Row label={t("right")}>
            {t("rightValue", { days: wizard.remainingDays })}
          </Row>
        </Section>
        <Section
          title={t("unitsTitle")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Units)}
        >
          <Row label={t("units")}>{unitNames.join(" · ") || t("none")}</Row>
          <Row label={t("skills")}>
            {skills.length === 0
              ? t("none")
              : skills.map((skill) => {
                  const level = wizard.levelOf(skill.id);
                  return (
                    <span key={skill.id} className="block">
                      {skill.name}:{" "}
                      {level ? tUnits(`level.${level}`) : t("none")}
                    </span>
                  );
                })}
          </Row>
          <Row label={t("roles")}>
            {form.teamRoles.map((role) => tUnits(`role.${role}`)).join(" · ") ||
              t("none")}
          </Row>
        </Section>
        <Section
          title={t("documents")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Documents)}
        >
          {context.documentsEnabled ? (
            <>
              <Row label={tDocs("CV")}>
                <FileValue
                  name={cv?.fileName ?? null}
                  missing={t("notUploaded")}
                />
              </Row>
              <Row label={tDocs("TRANSCRIPT")}>
                <FileValue
                  name={transcript?.fileName ?? null}
                  missing={t("notUploadedOptional")}
                />
              </Row>
            </>
          ) : (
            <Row label={t("documents")}>{tDocs("off")}</Row>
          )}
        </Section>
        <Section
          title={t("leadershipTitle")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Leadership)}
        >
          <Row label={t("application")}>
            {t(form.leadership.wants ? "leadershipYes" : "leadershipNo")}
          </Row>
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("iskurOnboarding.preview");
  const headingId = useId();
  return (
    <Card compact labelledBy={headingId} className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <h2 id={headingId} className="type-title-card text-text-primary">
          {title}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("editSection", { section: title })}
          className="inline-flex items-center gap-1 rounded-lg px-1 type-label-sm text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected"
        >
          <Image alt="" src="/ia/icons/edit.svg" width={14} height={14} />
          {t("edit")}
        </button>
      </div>
      <dl className="divide-y divide-border-subtle">{children}</dl>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
      <dt className="type-body-sm text-text-muted sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 type-body-sm text-text-primary">{children}</dd>
    </div>
  );
}

function FileValue({
  name,
  missing,
}: {
  name: string | null;
  missing: string;
}) {
  if (!name) return <span className="text-text-muted">{missing}</span>;
  return (
    <span className="inline-flex items-center gap-1 break-all text-status-success-text">
      {name}
      <CircleCheck aria-hidden className="size-3.5 shrink-0" />
    </span>
  );
}
