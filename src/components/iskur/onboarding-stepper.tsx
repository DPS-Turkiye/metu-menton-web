"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import type { IskurFormStep } from "@/lib/iskur-onboarding";
import { IskurStepState } from "@/types/iskur-onboarding";

/** "Adımlar" (Figma 02–04): the form's five steps beside it; an answered step can be opened again. */
export function OnboardingStepper({
  steps,
  onSelect,
}: {
  steps: { step: IskurFormStep; state: IskurStepState }[];
  onSelect: (step: IskurFormStep) => void;
}) {
  const t = useTranslations("iskurOnboarding.steps");
  return (
    <aside
      aria-label={t("label")}
      className="flex w-full flex-col gap-1 rounded-card border border-border-subtle bg-background-surface p-4 lg:w-[300px] lg:shrink-0"
    >
      <ol className="flex flex-col gap-1">
        {steps.map(({ step, state }, index) => (
          <li key={step}>
            <button
              type="button"
              onClick={() => onSelect(step)}
              aria-current={
                state === IskurStepState.Current ? "step" : undefined
              }
              className={`flex w-full items-center gap-3 rounded-[8px] px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-border-selected ${
                state === IskurStepState.Current
                  ? "border-r-4 border-border-selected"
                  : ""
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full type-label-sm ${
                  state === IskurStepState.Upcoming
                    ? "bg-background-subtle text-text-muted"
                    : "bg-action-primary-bg text-text-inverse"
                }`}
              >
                {state === IskurStepState.Done ? (
                  <Image
                    src="/ia/profile/step-done.svg"
                    alt={t("done")}
                    width={14}
                    height={14}
                  />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={`type-label ${
                    state === IskurStepState.Upcoming
                      ? "text-text-secondary"
                      : "text-text-primary"
                  }`}
                >
                  {t(`${step}.title`)}
                </span>
                <span className="type-caption text-text-muted">
                  {t(`${step}.hint`)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-0.5 rounded-[8px] bg-background-subtle p-3 type-caption">
        <p className="type-label-sm text-text-primary">
          {t("notEliminating.title")}
        </p>
        <p className="text-text-secondary">{t("notEliminating.body")}</p>
      </div>
    </aside>
  );
}
