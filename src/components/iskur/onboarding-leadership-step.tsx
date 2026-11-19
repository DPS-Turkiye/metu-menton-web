"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useId } from "react";

import { Card } from "@/components/ia/card";
import { ISKUR_FIELD_CLASS } from "@/components/student/iskur-ui";
import type { useIskurOnboarding } from "@/hooks/use-iskur-onboarding";
import type { IskurLeadership } from "@/interfaces/iskur-onboarding";
import { ISKUR_ANSWER_MAX } from "@/lib/iskur-onboarding";

type Wizard = ReturnType<typeof useIskurOnboarding>;
type AnswerField = keyof Omit<IskurLeadership, "wants">;

const QUESTIONS: readonly AnswerField[] = [
  "motivation",
  "experience",
  "conflict",
];
const WEEK_ITEMS = [0, 1, 2, 3] as const;

/** 04 · Liderlik başvurusu (Figma 287:570): the optional application, its eligibility and three short answers. */
export function OnboardingLeadershipStep({ wizard }: { wizard: Wizard }) {
  const t = useTranslations("iskurOnboarding.leadership");
  const toggleId = useId();
  const form = wizard.form;
  const context = wizard.context;
  if (!form || !context) return null;
  const { eligibility } = wizard;
  const wants = form.leadership.wants;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-text-primary">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("intro")}</p>
      </header>

      <Card className="flex items-center gap-3">
        <button
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={wants}
          onClick={() => wizard.setWantsLeadership(!wants)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected ${
            wants ? "bg-action-primary-bg" : "bg-border-strong"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block size-5 rounded-full bg-background-surface transition-transform ${
              wants ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <label htmlFor={toggleId} className="type-body text-text-primary">
          {t("toggle")}
        </label>
      </Card>

      {wants ? (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="type-title-card text-text-primary">
              {t("eligibilityTitle")}
            </h2>
            <Condition
              met={eligibility.enoughDays}
              label={t("minDays", { days: context.minimumLeaderDays })}
              detail={t("daysChosen", { days: form.weeklyDays ?? 0 })}
            />
            <Condition
              met={eligibility.enoughDaysLeft}
              label={t("daysLeft")}
              detail={t("daysLeftValue", { days: wizard.remainingDays })}
            />
            <Condition
              met={eligibility.hasCv}
              label={t("cv")}
              detail={
                !context.documentsEnabled
                  ? t("cvOff")
                  : (form.documents.cv?.fileName ?? t("cvMissing"))
              }
            />
            {eligibility.eligible ? null : (
              <p role="alert" className="type-body-sm text-status-error-text">
                {t("notEligible")}
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-2 rounded-card bg-background-subtle p-6">
            <h2 className="type-title-card text-text-primary">
              {t("weekTitle")}
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 type-body-sm text-text-secondary">
              {WEEK_ITEMS.map((item) => (
                <li key={item}>{t(`week.${item}`)}</li>
              ))}
            </ul>
          </div>

          <Card className="flex flex-col gap-5">
            <h2 className="type-title-card text-text-primary">
              {t("answersTitle")}
            </h2>
            {QUESTIONS.map((field) => (
              <Answer
                key={field}
                label={t(field)}
                value={form.leadership[field] ?? ""}
                onChange={(value) => wizard.setAnswer(field, value)}
              />
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

function Condition({
  met,
  label,
  detail,
}: {
  met: boolean;
  label: string;
  detail: string;
}) {
  const t = useTranslations("iskurOnboarding.leadership");
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full type-label-sm ${
          met
            ? "bg-status-success-bg text-status-success-text"
            : "bg-status-error-bg text-status-error-text"
        }`}
      >
        <span aria-hidden>{met ? "✓" : "!"}</span>
        <span className="sr-only">{t(met ? "met" : "notMet")}</span>
      </span>
      <p className="flex-1 type-label text-text-primary">{label}</p>
      <p className="type-body-sm text-text-muted">{detail}</p>
    </div>
  );
}

function Answer({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("iskurOnboarding.leadership");
  const id = useId();
  const helpId = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="type-label text-text-primary">
        {label} <span className="text-status-error-text">*</span>
      </label>
      <textarea
        id={id}
        value={value}
        required
        maxLength={ISKUR_ANSWER_MAX}
        aria-describedby={helpId}
        onChange={(event) => onChange(event.target.value)}
        className={`${ISKUR_FIELD_CLASS} min-h-[120px]`}
      />
      <p
        id={helpId}
        className="flex items-center gap-1 type-caption text-text-secondary"
      >
        <Image src="/ia/profile/info-alt.svg" alt="" width={16} height={16} />
        {t("limit", { max: ISKUR_ANSWER_MAX })}
        <span className="text-text-muted">
          {t("counter", { count: value.length, max: ISKUR_ANSWER_MAX })}
        </span>
      </p>
    </div>
  );
}
