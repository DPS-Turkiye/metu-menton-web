"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button, ButtonVariant } from "@/components/ia/button";
import { Card } from "@/components/ia/card";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { InlineAlert } from "@/components/ia/inline-alert";
import { PageHeader } from "@/components/ia/page-header";
import { ProgramFeatureBadge } from "@/components/ia/program-type-badge";
import { SearchInput } from "@/components/ia/search-input";
import { StatusTone } from "@/components/ia/status-badge";
import { StepPills } from "@/components/ia/step-pills";
import { Tag } from "@/components/ia/tag";
import { useOdtuProgramWizard } from "@/hooks/use-odtu-program-wizard";
import { ProgramFeature } from "@/interfaces/program";
import {
  PROGRAM_DESCRIPTION_MAX,
  WIZARD_STEPS,
  WizardProblem,
  WizardStep,
  type CoordinatorLoad,
} from "@/lib/admin-program-wizard";
import { choiceKey, CoordinatorChoiceKind } from "@/lib/coordinator-picker";
import { PROGRAM_FEATURES } from "@/lib/program-features";
import { formatLongDateRange } from "@/lib/utils";

type Wizard = ReturnType<typeof useOdtuProgramWizard>;

/** The problems a field shows itself; any other one is said under the step. */
const FIELD_PROBLEMS = new Set([
  WizardProblem.NameRequired,
  WizardProblem.DatesOrder,
]);

/** A date field's upper bound, so a six-digit year cannot be typed. */
const LAST_DAY = "9999-12-31";

const FIELD =
  "w-full rounded-input border border-border-control bg-background-surface px-4 py-3 type-body text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected";

/** A step's heading; once the admin has moved between steps it takes focus, so a screen reader hears the new step. */
function StepHeading({
  focus,
  id,
  className,
  children,
}: {
  focus: boolean;
  id?: string | undefined;
  className: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  return (
    <h2
      ref={heading}
      id={id}
      tabIndex={-1}
      className={`${className} outline-none`}
    >
      {children}
    </h2>
  );
}

/** The ODTÜ admin's "Yeni Program Oluştur" (Figma 152:7171, 7260, 7306, 7375). */
export function OdtuProgramWizardView() {
  const t = useTranslations("odtuProgramWizard");
  const wizard = useOdtuProgramWizard();
  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        back={{ href: "/admin/programs", label: t("back") }}
        actions={
          <StepPills
            label={t("stepsLabel")}
            currentIndex={wizard.stepIndex}
            steps={WIZARD_STEPS.map((step) => ({
              key: step,
              label: t(`steps.${step}`),
            }))}
          />
        }
      />
      {wizard.step === WizardStep.Type ? (
        <FeaturesStep wizard={wizard} />
      ) : wizard.step === WizardStep.Info ? (
        <InfoStep wizard={wizard} />
      ) : wizard.step === WizardStep.Coordinators ? (
        <CoordinatorsStep wizard={wizard} />
      ) : (
        <SummaryStep wizard={wizard} />
      )}
      {wizard.error &&
      !(wizard.problem && FIELD_PROBLEMS.has(wizard.problem)) ? (
        <InlineAlert tone={StatusTone.Error}>{wizard.error}</InlineAlert>
      ) : null}
      <footer className="flex items-center justify-between border-t border-border-subtle pt-5">
        {wizard.stepIndex === 0 ? (
          <Button href="/admin/programs" variant={ButtonVariant.Ghost}>
            {t("cancel")}
          </Button>
        ) : (
          <Button variant={ButtonVariant.Ghost} onClick={wizard.back}>
            {t("previous")}
          </Button>
        )}
        {wizard.last ? (
          <Button onClick={wizard.submit} disabled={wizard.creating}>
            {wizard.creating ? t("saving") : t("save")}
          </Button>
        ) : (
          <Button onClick={wizard.next}>{t("next")}</Button>
        )}
      </footer>
    </div>
  );
}

// TEST UI: placeholder until the design team's screen; replace when it arrives.
function FeaturesStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("odtuProgramWizard");
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <div className="space-y-6">
        <StepHeading
          focus={wizard.moved}
          id={headingId}
          className="type-h3 text-text-primary"
        >
          {t("featuresQuestion")}
        </StepHeading>
        <p className="type-body text-text-secondary">{t("featuresNote")}</p>
      </div>
      <div
        role="group"
        aria-labelledby={headingId}
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {PROGRAM_FEATURES.map((feature) => (
          <FeatureCard
            key={feature}
            feature={feature}
            selected={wizard.draft.features.includes(feature)}
            onChange={(on) => wizard.setFeature(feature, on)}
          />
        ))}
      </div>
    </section>
  );
}

/** A feature card around a native checkbox. */
function FeatureCard({
  feature,
  selected,
  onChange,
}: {
  feature: ProgramFeature;
  selected: boolean;
  onChange: (on: boolean) => void;
}) {
  const t = useTranslations("odtuProgramWizard");
  const tFeature = useTranslations("programFeatures.names");
  const hintId = useId();
  return (
    <label
      className={`flex cursor-pointer flex-col gap-4 rounded-card p-6 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-selected ${
        selected
          ? "border-2 border-border-selected bg-background-subtle"
          : "border border-border-default bg-background-surface"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={tFeature(feature)}
        aria-describedby={hintId}
        className="sr-only"
      />
      <span className="flex w-full items-center justify-between">
        <ProgramFeatureBadge feature={feature} />
        <span
          aria-hidden
          className={`grid size-[22px] place-items-center rounded-md ${
            selected
              ? "bg-background-inverse"
              : "border border-border-control bg-background-surface"
          }`}
        >
          {selected ? (
            <Image
              alt=""
              src="/ia/icons/check-inverse.svg"
              width={12}
              height={12}
            />
          ) : null}
        </span>
      </span>
      <span className="type-h4 text-text-primary">{tFeature(feature)}</span>
      <span id={hintId} className="type-body-sm text-text-secondary">
        {t(`features.${feature}.description`)}
        {feature === ProgramFeature.Iskur ? ` ${t("needsPeer")}.` : null}
      </span>
      <span aria-hidden className="h-px w-full bg-border-subtle" />
      <span className="type-overline text-text-muted">{t("includes")}</span>
      <span className="flex flex-col gap-4">
        {(["first", "second", "third"] as const).map((item) => (
          <span key={item} className="flex items-center gap-2">
            <Image alt="" src="/ia/icons/check.svg" width={14} height={14} />
            <span className="type-body-sm text-text-primary">
              {t(`features.${feature}.${item}`)}
            </span>
          </span>
        ))}
      </span>
    </label>
  );
}

function InfoStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("odtuProgramWizard");
  const id = useId();
  const { draft } = wizard;
  const nameMissing = wizard.problem === WizardProblem.NameRequired;
  const datesReversed = wizard.problem === WizardProblem.DatesOrder;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <StepHeading focus={wizard.moved} className="sr-only">
          {t("steps.INFO")}
        </StepHeading>
        <div className="space-y-5">
          <p className="flex flex-wrap items-center gap-2 type-caption text-text-secondary">
            {t("featuresLabel")}
            {draft.features.map((feature) => (
              <ProgramFeatureBadge key={feature} feature={feature} />
            ))}
          </p>
          <div className="space-y-2">
            <label htmlFor={`${id}-name`} className="type-label">
              {t("name")}{" "}
              <span aria-hidden className="text-status-error-text">
                *
              </span>
            </label>
            <input
              id={`${id}-name`}
              aria-required
              aria-invalid={nameMissing}
              aria-describedby={nameMissing ? `${id}-name-error` : undefined}
              value={draft.name}
              onChange={(event) => wizard.update({ name: event.target.value })}
              placeholder={t("namePlaceholder")}
              className={FIELD}
            />
            {nameMissing ? (
              <p
                id={`${id}-name-error`}
                className="type-caption text-status-error-text"
              >
                {wizard.error}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor={`${id}-start`} className="type-label">
                {t("start")}
              </label>
              <input
                id={`${id}-start`}
                type="date"
                max={LAST_DAY}
                value={draft.startDate}
                onChange={(event) =>
                  wizard.update({ startDate: event.target.value })
                }
                className={FIELD}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-end`} className="type-label">
                {t("end")}
              </label>
              <input
                id={`${id}-end`}
                type="date"
                value={draft.endDate}
                min={draft.startDate || undefined}
                max={LAST_DAY}
                aria-invalid={datesReversed}
                aria-describedby={datesReversed ? `${id}-end-error` : undefined}
                onChange={(event) =>
                  wizard.update({ endDate: event.target.value })
                }
                className={FIELD}
              />
              {datesReversed ? (
                <p
                  id={`${id}-end-error`}
                  className="type-caption text-status-error-text"
                >
                  {wizard.error}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-description`} className="type-label">
              {t("description")}
            </label>
            <textarea
              id={`${id}-description`}
              rows={4}
              maxLength={PROGRAM_DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) =>
                wizard.update({ description: event.target.value })
              }
              aria-describedby={`${id}-description-hint`}
              className={FIELD}
            />
            <p
              id={`${id}-description-hint`}
              className="flex items-center gap-1.5 type-caption text-text-muted"
            >
              <Image alt="" src="/ia/icons/info.svg" width={14} height={14} />
              {t("descriptionHint", {
                used: draft.description.length,
                max: PROGRAM_DESCRIPTION_MAX,
              })}
            </p>
          </div>
        </div>
      </Card>
      <InlineAlert
        tone={StatusTone.Info}
        title={t("termsTitle")}
        className="h-fit bg-status-info-bg"
      >
        {t("termsBody")}
      </InlineAlert>
    </div>
  );
}

function CoordinatorsStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("odtuProgramWizard");
  const headingId = useId();
  const { coordinators } = wizard;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card labelledBy={headingId}>
        <div className="space-y-4">
          <StepHeading
            focus={wizard.moved}
            id={headingId}
            className="type-h4 text-text-primary"
          >
            {t("coordinatorsTitle")}
          </StepHeading>
          <p className="max-w-[700px] type-body-sm text-text-secondary">
            {t("coordinatorsNote")}
          </p>
          <SearchInput
            label={t("coordinatorSearch")}
            placeholder={t("coordinatorSearch")}
            value={coordinators.query}
            onChange={coordinators.setQuery}
          />
          {coordinators.loading ? (
            <p role="status" className="type-body-sm text-text-muted">
              {t("coordinatorsLoading")}
            </p>
          ) : coordinators.loadError ? (
            <p role="alert" className="type-body-sm text-status-error-text">
              {t("coordinatorsFailed")}
            </p>
          ) : (
            <>
              <p className="type-overline text-text-muted">
                {t("coordinatorResults", { count: coordinators.shown.length })}
              </p>
              {coordinators.shown.length === 0 ? (
                <p className="type-body-sm text-text-secondary">
                  {t("noCoordinators")}
                </p>
              ) : (
                <ul aria-labelledby={headingId} className="space-y-2">
                  {coordinators.shown.map((load) => (
                    <li key={load.id}>
                      <CoordinatorRow
                        load={load}
                        chosen={coordinators.isChosen(load)}
                        onToggle={() => coordinators.toggle(load)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Card>
      <section
        aria-label={t("chosenTitle")}
        className="h-fit space-y-3 rounded-[20px] border border-border-subtle bg-background-surface p-6"
      >
        <h2 className="type-title-card text-text-primary">
          {t("chosenTitle")}
        </h2>
        {wizard.draft.coordinators.length === 0 ? (
          <p className="type-caption text-text-muted">{t("noneChosen")}</p>
        ) : (
          <ul className="space-y-2">
            {wizard.draft.coordinators.map((choice) => (
              <li
                key={choiceKey(choice)}
                className="flex items-center gap-2.5 rounded-xl bg-background-subtle p-3"
              >
                <InitialsAvatar
                  name={choice.fullName}
                  personId={
                    choice.kind === CoordinatorChoiceKind.Existing
                      ? choice.id
                      : null
                  }
                  large
                />
                <span className="min-w-0 flex-1 truncate type-label text-text-primary">
                  {choice.fullName}
                </span>
                <button
                  type="button"
                  aria-label={t("removeCoordinator", {
                    name: choice.fullName,
                  })}
                  onClick={() => coordinators.remove(choiceKey(choice))}
                  className="grid size-8 place-items-center rounded-full hover:bg-background-muted"
                >
                  <Image
                    alt=""
                    src="/ia/icons/close.svg"
                    width={16}
                    height={16}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CoordinatorRow({
  load,
  chosen,
  onToggle,
}: {
  load: CoordinatorLoad;
  chosen: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("odtuProgramWizard");
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={chosen}
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-[14px] p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected ${
        chosen
          ? "border border-border-selected bg-background-subtle"
          : "border border-transparent hover:bg-background-subtle"
      }`}
    >
      <InitialsAvatar name={load.fullName} personId={load.id} large />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-label text-text-primary">{load.fullName}</span>
        <span
          title={load.programs.join(", ")}
          className="truncate type-caption text-text-muted"
        >
          {load.programs.length === 0
            ? t("noPrograms")
            : t("programLoad", {
                count: load.programs.length,
                names: load.programs.join(", "),
              })}
        </span>
      </span>
      <Tag tone={load.busy ? StatusTone.Warning : StatusTone.Success}>
        {load.busy ? t("busy") : t("available")}
      </Tag>
      <span
        aria-hidden
        className={`grid size-[22px] shrink-0 place-items-center rounded-md ${
          chosen
            ? "bg-background-inverse"
            : "border border-border-control bg-background-surface"
        }`}
      >
        {chosen ? (
          <Image
            alt=""
            src="/ia/icons/check-inverse.svg"
            width={12}
            height={12}
          />
        ) : null}
      </span>
    </button>
  );
}

function SummaryStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("odtuProgramWizard");
  const tFeature = useTranslations("programFeatures.names");
  const locale = useLocale();
  const { draft } = wizard;
  const coordinatorNames = draft.coordinators
    .map((choice) => choice.fullName)
    .join(", ");
  const rows = [
    {
      label: t("summaryFeatures"),
      value: draft.features.map((feature) => tFeature(feature)).join(", "),
    },
    { label: t("summaryName"), value: draft.name.trim() },
    {
      label: t("summaryDates"),
      value:
        formatLongDateRange(draft.startDate, draft.endDate, locale) ||
        t("noDates"),
    },
    { label: t("summaryCoordinators"), value: coordinatorNames },
    { label: t("summaryStatus"), value: t("savedAsDraft") },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
      <Card>
        <StepHeading focus={wizard.moved} className="type-h4 text-text-primary">
          {t("summaryTitle")}
        </StepHeading>
        <dl className="mt-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-t border-border-subtle py-3"
            >
              <dt className="type-body-sm text-text-secondary">{row.label}</dt>
              <dd className="text-right type-label text-text-primary">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="h-fit">
        <h2 className="type-title-card text-text-primary">{t("afterTitle")}</h2>
        <ol className="mt-4 space-y-3">
          {[
            t("afterDraft"),
            t("afterCoordinator", { names: coordinatorNames }),
            t("afterLaunch"),
          ].map((line, index) => (
            <li key={line} className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-[22px] shrink-0 place-items-center rounded-full bg-background-muted type-label-sm text-text-secondary"
              >
                {index + 1}
              </span>
              <span className="type-body-sm text-text-secondary">{line}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
