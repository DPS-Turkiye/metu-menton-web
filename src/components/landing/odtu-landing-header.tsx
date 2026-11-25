"use client";

import { useTranslations } from "next-intl";

import { MentonWordmark } from "@/components/common/menton-wordmark";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { usePublicSessionDestination } from "@/hooks/use-public-session-destination";
import { useSectionProgress } from "@/hooks/use-section-progress";
import { ODTU_LANDING_SECTIONS } from "@/lib/const/odtu-landing";

const SECTION_IDS = ODTU_LANDING_SECTIONS.map((section) => section.id);

function numberOf(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** The sticky header: the wordmark, where on the page the reader is, and sign-in / sign-up. */
export function OdtuLandingHeader() {
  const t = useTranslations("odtuLanding");
  const destination = usePublicSessionDestination();
  const current = useSectionProgress(SECTION_IDS);
  const currentKey = ODTU_LANDING_SECTIONS[current]?.key;

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-background-surface/90 backdrop-blur-[14px]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <MentonWordmark />
        <nav
          aria-label={t("sectionsLabel")}
          className="hidden items-center gap-3.5 lg:flex"
        >
          <ol className="flex gap-1">
            {ODTU_LANDING_SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-label={t(`sections.${section.key}`)}
                  aria-current={index === current ? "location" : undefined}
                  className="group block py-2.5"
                >
                  <span
                    aria-hidden
                    className={`block h-1 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
                      index === current
                        ? "w-10 bg-brand-odtu-primary"
                        : index < current
                          ? "w-[22px] bg-brand-odtu-primary/40"
                          : "w-[22px] bg-border-default group-hover:bg-border-strong"
                    }`}
                  />
                </a>
              </li>
            ))}
          </ol>
          {currentKey ? (
            <p
              aria-hidden
              className="flex min-w-[190px] items-baseline gap-2 type-body-sm text-text-secondary"
            >
              <span className="font-display font-extrabold text-status-error-icon tabular-nums">
                {numberOf(current)}
              </span>
              {t(`sections.${currentKey}`)}
            </p>
          ) : null}
        </nav>
        <div className="flex gap-2 lg:justify-self-end">
          <Button
            href={destination.href}
            size={ButtonSize.Small}
            variant={
              destination.signup ? ButtonVariant.Ghost : ButtonVariant.Primary
            }
          >
            {destination.label}
          </Button>
          {destination.signup ? (
            <Button href={destination.signup.href} size={ButtonSize.Small}>
              {t("signUp")}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
