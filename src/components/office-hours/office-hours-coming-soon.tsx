// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { EmptyState } from "@/components/common/empty-state";

const LOGO_SRC = "/ia/illustrations/office-hours-coming-soon.webp";

/** What everyone but the admin sees in place of Office Hours until it opens (OFFICE_HOURS_ENABLED). */
export function OfficeHoursComingSoon() {
  const t = useTranslations("officeHoursComingSoon");
  return (
    <EmptyState
      title={t("title")}
      accent="blue"
      media={
        <Image
          src={LOGO_SRC}
          alt={t("logoAlt")}
          width={240}
          height={240}
          sizes="(min-width: 640px) 240px, 160px"
          className="h-auto w-40 sm:w-60"
        />
      }
    />
  );
}
