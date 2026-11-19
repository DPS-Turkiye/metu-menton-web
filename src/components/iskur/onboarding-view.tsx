"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { SimpleHeader } from "@/components/ia/simple-header";
import { OnboardingDaysStep } from "@/components/iskur/onboarding-days-step";
import { OnboardingDocumentsStep } from "@/components/iskur/onboarding-documents-step";
import { OnboardingLeadershipStep } from "@/components/iskur/onboarding-leadership-step";
import { OnboardingPreviewStep } from "@/components/iskur/onboarding-preview-step";
import { OnboardingStepper } from "@/components/iskur/onboarding-stepper";
import { OnboardingUnitsStep } from "@/components/iskur/onboarding-units-step";
import { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import { SUPPORT_EMAIL } from "@/lib/const";
import { errorMessage } from "@/lib/utils";
import { IaAccent } from "@/types/ia-theme";
import { IskurOnboardingStep } from "@/types/iskur-onboarding";

type Wizard = ReturnType<typeof useIskurOnboarding>;

const JOURNEY = ["form", "provisional", "trial", "final"] as const;
const PREPARE_ITEMS = [0, 1, 2, 3] as const;

/**
 * The İŞKUR intern's onboarding (Figma 284:2, 01–04 and the handbook's steps 1–4): the welcome, then the form's
 * five steps. A new intern is sent here until they submit it.
 */
export function IskurOnboardingView() {
  const wizard = useIskurOnboarding();
  return (
    <div
      data-ia-accent={IaAccent.Odtu}
      className="flex min-h-screen flex-col bg-background-surface"
    >
      <SimpleHeader
        homeHref="/student"
        helpHref={`mailto:${SUPPORT_EMAIL}`}
        onLogout={wizard.logout}
        loggingOut={wizard.exiting}
      />
      <Body wizard={wizard} />
    </div>
  );
}

function Body({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding");
  if (wizard.isLoading) {
    return <Notice role="status">{t("loading")}</Notice>;
  }
  if (wizard.notIntern) {
    return (
      <Notice role="status">
        <p className="type-title-card">{t("notIntern.title")}</p>
        <p>{t("notIntern.body")}</p>
        <Button href="/student">{t("notIntern.home")}</Button>
      </Notice>
    );
  }
  if (wizard.loadError || !wizard.form || !wizard.context) {
    return (
      <Notice role="alert">
        <p>{errorMessage(wizard.loadError, t("loadFailed"))}</p>
        <Button variant={ButtonVariant.Ghost} onClick={wizard.retry}>
          {t("retry")}
        </Button>
      </Notice>
    );
  }
  if (wizard.submitted) {
    // TEST UI: placeholder until the design team's screen; replace when it arrives.
    return (
      <Notice role="status">
        <p className="type-title-card">{t("submitted.title")}</p>
        <p>{t("submitted.body")}</p>
        <Button href="/student">{t("submitted.home")}</Button>
      </Notice>
    );
  }
  if (wizard.step === IskurOnboardingStep.Welcome)
    return <Welcome wizard={wizard} />;
  return <Form wizard={wizard} />;
}

/** 01 · Hoş geldin (Figma 286:215). */
function Welcome({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.welcome");
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 pt-12 pb-20 sm:px-8">
      <section className="flex flex-col gap-4 rounded-card bg-background-selected p-6 sm:p-10">
        <p className="type-overline text-text-accent uppercase">
          {t("overline")}
        </p>
        <h1 className="type-h1 text-text-primary">
          {t("title", { name: wizard.firstName })}
        </h1>
        <p className="type-body text-text-secondary">
          {t("intro", { units: wizard.unitCount, teams: wizard.teamCount })}
        </p>
      </section>
      <Card className="flex flex-col gap-4">
        <h2 className="type-h4 text-text-primary">{t("awaits")}</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {JOURNEY.map((item, index) => (
            <li
              key={item}
              className="flex flex-col gap-1.5 rounded-[12px] bg-background-subtle p-4"
            >
              <span className="type-h4 text-text-accent">{index + 1}</span>
              <span className="type-label text-text-primary">
                {t(`journey.${item}.title`)}
              </span>
              <span className="type-body-sm text-text-secondary">
                {t(`journey.${item}.hint`)}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="type-h4 text-text-primary">{t("prepare")}</h2>
        {PREPARE_ITEMS.map((item) => (
          <label
            key={item}
            className="flex items-center gap-2 type-body text-text-primary"
          >
            <input
              type="checkbox"
              checked={wizard.prepared.has(item)}
              onChange={() => wizard.togglePrepared(item)}
              className="size-5 shrink-0 accent-[var(--color-action-primary-bg)]"
            />
            {t(`prepareItems.${item}`)}
          </label>
        ))}
      </Card>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant={ButtonVariant.Tertiary} onClick={wizard.remindLater}>
          {t("later")}
        </Button>
        <Button size={ButtonSize.Large} onClick={wizard.start}>
          {t("start")}
        </Button>
      </div>
    </main>
  );
}

function Form({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.actions");
  const last = wizard.step === IskurOnboardingStep.Preview;
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (last) wizard.submit();
        else wizard.next();
      }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 pt-10 pb-16 sm:px-8 lg:flex-row lg:items-start lg:px-20">
        <OnboardingStepper steps={wizard.steps} onSelect={wizard.goTo} />
        <fieldset
          disabled={wizard.busy}
          className="flex min-w-0 flex-1 flex-col gap-6"
        >
          <StepBody wizard={wizard} />
        </fieldset>
      </div>
      <div className="sticky bottom-0 border-t border-border-subtle bg-background-surface">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-4 sm:px-8 lg:px-20">
          <Button
            variant={ButtonVariant.Secondary}
            disabled={wizard.busy}
            onClick={wizard.back}
          >
            {t("back")}
          </Button>
          <span className="flex-1" />
          <Button
            variant={ButtonVariant.Tertiary}
            disabled={wizard.busy}
            onClick={wizard.saveDraft}
          >
            {wizard.busy ? t("saving") : t("saveDraft")}
          </Button>
          <Button type="submit" disabled={wizard.busy || !wizard.canContinue}>
            {last ? (wizard.busy ? t("submitting") : t("submit")) : t("next")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function StepBody({ wizard }: { wizard: Wizard }) {
  switch (wizard.step) {
    case IskurOnboardingStep.Welcome:
    case IskurOnboardingStep.Days:
      return <OnboardingDaysStep wizard={wizard} />;
    case IskurOnboardingStep.Units:
      return <OnboardingUnitsStep wizard={wizard} />;
    case IskurOnboardingStep.Documents:
      return <OnboardingDocumentsStep wizard={wizard} />;
    case IskurOnboardingStep.Leadership:
      return <OnboardingLeadershipStep wizard={wizard} />;
    case IskurOnboardingStep.Preview:
      return <OnboardingPreviewStep wizard={wizard} />;
  }
}

function Notice({
  role,
  children,
}: {
  role: "status" | "alert";
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className="mx-auto mt-12 flex w-full max-w-xl flex-col items-start gap-4 rounded-card border border-border-subtle bg-background-surface p-6 type-body text-text-primary"
    >
      {children}
    </div>
  );
}
