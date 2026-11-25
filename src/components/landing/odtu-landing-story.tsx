import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";

import styles from "@/components/landing/odtu-landing.module.css";
import { ODTU_LANDING_STEPS } from "@/lib/const/odtu-landing";

export enum StoryTone {
  /** ODTÜ red: peer mentoring. */
  Odtu = "odtu",
  /** Blue: Office Hours. */
  Info = "info",
}

const EYEBROW_CLASSES: Record<StoryTone, string> = {
  [StoryTone.Odtu]: "text-brand-odtu-primary",
  [StoryTone.Info]: "text-status-info-text",
};

const STEP_CLASSES: Record<StoryTone, { card: string; mark: string }> = {
  [StoryTone.Odtu]: {
    card: "border-action-secondary-border bg-brand-odtu-bg",
    mark: "bg-brand-odtu-primary",
  },
  [StoryTone.Info]: {
    card: "border-status-info-border bg-status-info-bg",
    mark: "bg-status-info-icon",
  },
};

export function LandingEyebrow({
  tone = StoryTone.Odtu,
  children,
}: {
  tone?: StoryTone;
  children: ReactNode;
}) {
  return (
    <p className={`mb-4 text-[13px] font-semibold ${EYEBROW_CLASSES[tone]}`}>
      {children}
    </p>
  );
}

/** A section heading in the landing's own, larger scale. */
export function LandingHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="font-display text-[32px] leading-10 font-extrabold tracking-[-0.025em] text-balance text-text-primary sm:text-[38px] sm:leading-[46px] lg:text-[48px] lg:leading-[56px]"
    >
      {children}
    </h2>
  );
}

export function LandingLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-[18px] text-[16px] leading-[26px] text-text-secondary sm:text-[18px] sm:leading-[30px]">
      {children}
    </p>
  );
}

/** An illustration beside a short text: Akran Mentörlüğü, Office Hours and "Bildiğini paylaş". */
export function LandingStory({
  id,
  story,
  image,
  imageHeight,
  tone = StoryTone.Odtu,
  flip = false,
}: {
  id: string;
  story: "peer" | "officeHours" | "mentor";
  image: string;
  /** The illustration is drawn 308 wide. */
  imageHeight: number;
  tone?: StoryTone;
  flip?: boolean;
}) {
  const t = useTranslations("odtuLanding.stories");
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-[72px] py-[72px] sm:py-[88px] lg:py-[120px]"
    >
      <div className="mx-auto grid max-w-[1160px] items-center gap-7 px-5 sm:px-10 lg:grid-cols-2 lg:gap-[72px]">
        <div
          className={`mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center lg:max-w-[440px] ${styles.reveal ?? ""} ${flip ? "lg:order-2" : ""}`}
        >
          <Image
            src={image}
            alt=""
            width={308}
            height={imageHeight}
            className={`h-auto w-[82%] drop-shadow-[0_24px_30px_rgb(28_32_38/0.12)] ${styles.float ?? ""} ${tone === StoryTone.Info ? (styles.floatLater ?? "") : ""}`}
          />
        </div>
        <div className={styles.reveal}>
          <LandingEyebrow tone={tone}>{t(`${story}.eyebrow`)}</LandingEyebrow>
          <LandingHeading id={headingId}>{t(`${story}.title`)}</LandingHeading>
          <LandingLead>{t(`${story}.lead`)}</LandingLead>
          {story === "mentor" ? null : (
            <ol
              aria-label={t(`${story}.stepsLabel`)}
              className="mt-[30px] grid gap-2 sm:grid-cols-3 sm:gap-4"
            >
              {ODTU_LANDING_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`flex items-center gap-3.5 rounded-[18px] border px-3.5 py-3 font-display text-[16px] leading-[21px] font-bold text-text-primary sm:flex-col sm:items-start sm:gap-2.5 sm:px-4 sm:pt-4 sm:pb-[18px] ${STEP_CLASSES[tone].card}`}
                >
                  <span
                    aria-hidden
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white ${STEP_CLASSES[tone].mark}`}
                  >
                    {index + 1}
                  </span>
                  {t(`${story}.steps.${step}`)}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-[18px] flex gap-2 type-body-sm text-text-muted">
            <Image
              src="/ia/icons/info.svg"
              alt=""
              width={16}
              height={16}
              className="mt-0.5 size-4 shrink-0"
            />
            {t(`${story}.note`)}
          </p>
        </div>
      </div>
    </section>
  );
}
