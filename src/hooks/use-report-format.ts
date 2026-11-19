"use client";

import { useLocale, useTranslations } from "next-intl";

import { splitMinutes } from "@/lib/peer-reports";
import { formatReportDay } from "@/lib/peer-weekly-report";

/** "Pzt · 9 Kasım" for a report day ("yyyy-mm-dd"). */
export function useReportDayLabel() {
  const locale = useLocale();
  return (day: string) => {
    const { weekday, date } = formatReportDay(day, locale);
    return `${weekday} · ${date}`;
  };
}

/** "11 sa 20 dk", "2 sa" on the hour, or "45 dk" under an hour. */
export function useReportDuration() {
  const t = useTranslations("iaIskurReports.duration");
  return (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (hours === 0) return t("minutes", { minutes });
    return minutes === 0
      ? t("hours", { hours })
      : t("hoursMinutes", { hours, minutes });
  };
}
