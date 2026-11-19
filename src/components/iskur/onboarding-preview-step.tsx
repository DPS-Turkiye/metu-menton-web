"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import { formatHours } from "@/lib/iskur-onboarding";
import { IskurOnboardingStep } from "@/types/iskur-onboarding";

type Wizard = ReturnType<typeof useIskurOnboarding>;

// TEST UI: placeholder until the design team's screen; replace when it arrives.
/** Önizle: everything the form will send, each part with a way back to its step. */
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
  const files = [form.documents.cv, form.documents.transcript].filter(
    (file) => file !== null,
  );

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>
      <Card className="flex flex-col divide-y divide-border-subtle p-0">
        <Row
          title={t("days")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Days)}
        >
          <p>
            {t("daysValue", {
              days: form.weeklyDays ?? 0,
              hours: formatHours(wizard.totalMinutes, locale),
            })}
          </p>
          <p>
            {wizard.scheduledDays
              .map(
                (day) =>
                  `${tDays(`short.${day}`)} ${tDays("dayHours", { hours: formatHours(wizard.dayMinutes(day), locale) })}`,
              )
              .join(" · ")}
          </p>
          <p>{t("prior", { days: wizard.remainingDays })}</p>
        </Row>
        <Row
          title={t("units")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Units)}
        >
          <p>{unitNames.join(" · ") || t("none")}</p>
        </Row>
        <Row
          title={t("skills")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Units)}
        >
          {wizard.skillGroups.flatMap((group) =>
            group.skills.map((skill) => {
              const level = wizard.levelOf(skill.id);
              return (
                <p key={skill.id}>
                  {skill.name}: {level ? tUnits(`level.${level}`) : t("none")}
                </p>
              );
            }),
          )}
        </Row>
        <Row
          title={t("roles")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Units)}
        >
          <p>
            {form.teamRoles.map((role) => tUnits(`role.${role}`)).join(" · ") ||
              t("none")}
          </p>
        </Row>
        <Row
          title={t("documents")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Documents)}
        >
          <p>
            {context.documentsEnabled
              ? files.map((file) => file.fileName).join(" · ") || t("none")
              : tDocs("off")}
          </p>
        </Row>
        <Row
          title={t("leadership")}
          onEdit={() => wizard.goTo(IskurOnboardingStep.Leadership)}
        >
          <p>{t(form.leadership.wants ? "leadershipYes" : "leadershipNo")}</p>
        </Row>
      </Card>
    </>
  );
}

function Row({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("iskurOnboarding.preview");
  return (
    <section className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start">
      <h2 className="type-label text-text-primary sm:w-48">{title}</h2>
      <div className="flex flex-1 flex-col gap-1 type-body-sm text-text-secondary">
        {children}
      </div>
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Small}
        onClick={onEdit}
      >
        {t("edit")}
      </Button>
    </section>
  );
}
