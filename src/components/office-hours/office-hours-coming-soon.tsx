// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/empty-state";

/** What everyone but the admin sees in place of Office Hours until it opens (OFFICE_HOURS_ENABLED). */
export function OfficeHoursComingSoon() {
  const t = useTranslations("officeHoursComingSoon");
  return <EmptyState title={t("title")} body={t("body")} accent="blue" />;
}
