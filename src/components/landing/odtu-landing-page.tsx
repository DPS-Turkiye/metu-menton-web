"use client";

import { ArrowRight, ArrowUp, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { MentonWordmark } from "@/components/common/menton-wordmark";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { OdtuLandingHeader } from "@/components/landing/odtu-landing-header";
import {
  LandingEyebrow,
  LandingHeading,
  LandingLead,
  LandingStory,
  StoryTone,
} from "@/components/landing/odtu-landing-story";
import styles from "@/components/landing/odtu-landing.module.css";
import { usePublicSessionDestination } from "@/hooks/use-public-session-destination";
import { SUPPORT_EMAIL } from "@/lib/const";
import {
  ODTU_LANDING_QUESTIONS,
  ODTU_LANDING_TOPICS,
} from "@/lib/const/odtu-landing";
import { IaAccent } from "@/types/ia-theme";

const PATHS = [
  {
    key: "peer",
    href: "#akran-mentorluk",
    image: "/ia/landing/peer-mentoring.webp",
    width: 132,
    tone: "text-brand-odtu-primary",
    hover: "hover:border-action-secondary-border",
  },
  {
    key: "officeHours",
    href: "#office-hours",
    image: "/ia/landing/office-hours.webp",
    width: 198,
    tone: "text-status-info-text",
    hover: "hover:border-status-info-border",
  },
] as const;

/** Open section spacing: 72 px on phones, 120 px on desktop. */
const SECTION = "scroll-mt-[72px] py-[72px] sm:py-[88px] lg:py-[120px]";
const WRAP = "mx-auto max-w-[1160px] px-5 sm:px-10";

/** The ODTÜ deployment's front page: hocam by menton, for students. */
export function OdtuLandingPage() {
  const t = useTranslations("odtuLanding");
  return (
    <div
      data-ia-accent={IaAccent.Odtu}
      id="top"
      className="flex min-h-screen flex-col bg-background-surface text-text-primary"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[60] focus:rounded-button-sm focus:bg-background-inverse focus:px-3.5 focus:py-2.5 focus:text-text-inverse"
      >
        {t("skip")}
      </a>
      <OdtuLandingHeader />
      <main id="main" className="flex-1 overflow-x-clip">
        <Hero />
        <LandingStory
          id="akran-mentorluk"
          story="peer"
          image="/ia/landing/peer-mentoring.webp"
          imageHeight={308}
        />
        <LandingStory
          id="office-hours"
          story="officeHours"
          image="/ia/landing/office-hours.webp"
          imageHeight={205}
          tone={StoryTone.Info}
          flip
        />
        <Topics />
        <LandingStory
          id="mentor-ol"
          story="mentor"
          image="/ia/landing/share.webp"
          imageHeight={277}
        />
        <Community />
        <Questions />
      </main>
      <footer className="border-t border-border-subtle py-9">
        <div
          className={`${WRAP} flex flex-wrap items-center justify-between gap-6`}
        >
          <MentonWordmark />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 type-body-sm text-text-muted">
            <span>{t("footer")}</span>
            {/* A plain link: the help address is a mailto, which next/link does not handle. */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline hover:text-text-primary"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <Button
            href="#top"
            size={ButtonSize.Small}
            variant={ButtonVariant.Ghost}
          >
            {t("backToTop")}
            <ArrowUp aria-hidden className="size-4" strokeWidth={1.6} />
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  const t = useTranslations("odtuLanding.hero");
  return (
    <section
      id="baslangic"
      aria-labelledby="odtu-landing-title"
      className="scroll-mt-[72px] px-5 pt-[72px] pb-20 text-center sm:px-10 lg:pt-[120px] lg:pb-[112px]"
    >
      <div className="mx-auto max-w-[960px]">
        <h1
          id="odtu-landing-title"
          className="font-display text-[46px] leading-[52px] font-extrabold tracking-[-0.04em] sm:text-[64px] sm:leading-[68px] lg:text-[88px] lg:leading-[92px]"
        >
          {t.rich("title", {
            accent: (chunks) => (
              <span className="text-brand-odtu-primary">{chunks}</span>
            ),
          })}
        </h1>
        <p className="mx-auto mt-7 max-w-[640px] text-[16.5px] leading-[27px] text-balance text-text-secondary sm:text-[20px] sm:leading-8">
          {t("lead")}
        </p>
        <div className="mx-auto mt-9 grid max-w-[760px] gap-3.5 sm:mt-[52px] sm:grid-cols-2 sm:gap-5">
          {PATHS.map((path) => (
            <a
              key={path.key}
              href={path.href}
              className={`group flex flex-col items-center gap-1.5 rounded-featured border border-border-subtle bg-background-surface px-6 pt-7 pb-[26px] shadow-raised transition motion-safe:hover:-translate-y-1 hover:shadow-modal ${path.hover}`}
            >
              <Image
                src={path.image}
                alt=""
                width={path.width}
                height={132}
                priority
                className="mb-2.5 h-24 w-auto transition-transform duration-300 motion-safe:group-hover:scale-105 motion-safe:group-hover:-rotate-3 sm:h-[132px]"
              />
              <span className="font-display text-[22px] leading-7 font-extrabold tracking-[-0.02em] sm:text-[26px] sm:leading-8">
                {t(`paths.${path.key}.title`)}
              </span>
              <span className="text-[14.5px] leading-[22px] text-text-secondary">
                {t(`paths.${path.key}.caption`)}
              </span>
              <span
                className={`mt-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold ${path.tone}`}
              >
                {t(`paths.${path.key}.action`)}
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.6} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Topics() {
  const t = useTranslations("odtuLanding.topics");
  return (
    <section id="konular" aria-labelledby="konular-title" className={SECTION}>
      <div className={WRAP}>
        <div className={`max-w-[720px] ${styles.reveal ?? ""}`}>
          <LandingEyebrow>{t("eyebrow")}</LandingEyebrow>
          <LandingHeading id="konular-title">{t("title")}</LandingHeading>
          <LandingLead>{t("lead")}</LandingLead>
        </div>
        <ul className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {ODTU_LANDING_TOPICS.map((topic) => (
            <li
              key={topic.key}
              className={`group grid grid-cols-[72px_minmax(0,1fr)] items-start gap-x-4 rounded-[26px] border border-border-subtle bg-background-surface px-[22px] pt-[26px] pb-6 transition-[border-color,box-shadow] duration-300 hover:border-action-secondary-border hover:shadow-hover sm:block ${styles.reveal ?? ""}`}
            >
              <Image
                src={topic.image}
                alt=""
                width={92}
                height={92}
                className="row-span-2 size-[72px] object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 motion-safe:group-hover:-rotate-3 sm:size-[92px]"
              />
              <h3 className="mt-1 font-display text-[19px] leading-[25px] font-extrabold tracking-[-0.015em] sm:mt-[18px]">
                {t(`items.${topic.key}.title`)}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-[22px] text-text-secondary sm:mt-3">
                {t(`items.${topic.key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Community() {
  const t = useTranslations("odtuLanding.community");
  const tShared = useTranslations("sharedUi");
  return (
    <section
      id="karsilikli"
      aria-labelledby="karsilikli-title"
      className="relative scroll-mt-16 overflow-hidden bg-status-error-icon py-24 text-white lg:py-[136px]"
    >
      <div
        aria-hidden
        className={`font-display font-extrabold ${styles.watermark ?? ""}`}
      >
        {tShared("wordmark")}
      </div>
      <div className={`relative ${WRAP}`}>
        <p className="mb-4 text-[13px] font-semibold text-[#ffb9c2]">
          {t("eyebrow")}
        </p>
        <h2
          id="karsilikli-title"
          className="max-w-[960px] font-display text-[40px] leading-[46px] font-extrabold tracking-[-0.04em] sm:text-[54px] sm:leading-[58px] lg:text-[76px] lg:leading-[80px]"
        >
          {t.rich("title", {
            accent: (chunks) => (
              <span className="text-[#ffb9c2]">{chunks}</span>
            ),
          })}
        </h2>
        <p className="mt-7 max-w-[620px] text-[16px] leading-[26px] text-white/85 sm:text-[19px] sm:leading-[30px]">
          {t("lead")}
        </p>
      </div>
    </section>
  );
}

function Questions() {
  const t = useTranslations("odtuLanding.questions");
  const destination = usePublicSessionDestination();
  return (
    <section id="sss" aria-labelledby="sss-title" className={SECTION}>
      <div
        className={`${WRAP} grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16`}
      >
        <div>
          <LandingHeading id="sss-title">{t("title")}</LandingHeading>
          <LandingLead>{t("lead")}</LandingLead>
          <div className="mt-7">
            <Button
              href={destination.primaryAction.href}
              size={ButtonSize.Large}
            >
              {destination.signup ? t("join") : destination.primaryAction.label}
            </Button>
          </div>
        </div>
        <div className="border-t border-border-subtle">
          {/* One name: the browser keeps a single answer open. */}
          {ODTU_LANDING_QUESTIONS.map((question, index) => (
            <details
              key={question}
              name="odtu-landing-faq"
              open={index === 0}
              className="group border-b border-border-subtle"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-[22px] font-display text-[17px] leading-6 font-bold [&::-webkit-details-marker]:hidden">
                <h3>{t(`items.${question}.title`)}</h3>
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-background-subtle transition group-open:rotate-45 group-open:bg-brand-odtu-bg group-open:text-brand-odtu-primary motion-reduce:transition-none"
                >
                  <Plus className="size-4" strokeWidth={1.6} />
                </span>
              </summary>
              <p className="pr-12 pb-[22px] pl-1 text-[15px] leading-[25px] text-text-secondary">
                {t(`items.${question}.body`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
