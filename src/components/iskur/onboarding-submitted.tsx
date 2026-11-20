"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ia/button";
import type { IskurNextStep } from "@/types/iskur-onboarding";

/** 5.6 · Kaydın alındı (Figma 469:6664): the form is in, and what happens to it next. */
export function OnboardingSubmitted({
  firstName,
  nextSteps,
}: {
  firstName: string;
  nextSteps: readonly IskurNextStep[];
}) {
  const t = useTranslations("iskurOnboarding.submitted");
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The form and its focused "Formu gönder" button are gone; land keyboard and screen-reader users on the result.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 px-4 pt-[72px] pb-16 text-center sm:px-0">
      <span className="grid size-16 place-items-center rounded-full bg-status-success-bg">
        <Image src="/ia/iskur/check-circle.svg" alt="" width={32} height={32} />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="type-h1 text-text-primary outline-none"
      >
        {firstName ? t("titleNamed", { name: firstName }) : t("title")}
      </h1>
      <p className="type-body-lg text-text-secondary">{t("body")}</p>
      <section
        aria-labelledby="iskur-next-steps"
        className="w-full rounded-2xl border border-border-default bg-background-surface px-6 py-2 text-left"
      >
        <h2 id="iskur-next-steps" className="sr-only">
          {t("nextTitle")}
        </h2>
        <ol className="divide-y divide-border-default">
          {nextSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-4 py-3.5">
              <span
                aria-hidden
                // The first step is the one under way now (Figma 5.6), so it alone takes the accent.
                className={`grid size-6 shrink-0 place-items-center rounded-full type-label-sm ${
                  index === 0
                    ? "bg-brand-mentee-bg text-brand-mentee-strong"
                    : "bg-status-neutral-bg text-status-neutral-text"
                }`}
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="type-label text-text-primary">
                  {t(`next.${step}.title`)}
                </p>
                <p className="type-body-sm text-text-muted">
                  {t(`next.${step}.hint`)}
                </p>
              </div>
              <p className="shrink-0 type-caption text-text-muted">
                {t(`next.${step}.when`)}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <Button href="/student">{t("home")}</Button>
    </main>
  );
}
