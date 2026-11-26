"use client";

import { useLocale, useTranslations } from "next-intl";

import type { AvailabilityItem } from "@/lib/academician-availability";
import { turkeyShortDay } from "@/lib/academician-office-hours";
import { exceptionLabel } from "@/lib/mentor-availability";
import { formatTurkishTime } from "@/lib/turkey-time";
import { AvailabilityItemKind } from "@/types/academician-office-hours";

export type AvailabilityRow = {
  key: string;
  label: string;
  /** The hours, or why the day is closed. */
  hours: string;
};

/** Turns "Müsaitliğim" items into labelled rows ("Her Salı", "14:00 – 16:00"). */
export function useAvailabilityRows() {
  const t = useTranslations("iaAcademician.common");
  const tWeekday = useTranslations("options.weekday");
  const locale = useLocale();

  return (item: AvailabilityItem, now: Date): AvailabilityRow => {
    switch (item.kind) {
      case AvailabilityItemKind.Recurring:
        return {
          key: item.rule.id,
          label: t("everyWeekday", {
            weekday: tWeekday(item.rule.dayOfWeek),
          }),
          hours: `${item.rule.startTime} – ${item.rule.endTime}`,
        };
      case AvailabilityItemKind.OneOff:
        return {
          key: item.oneOff.id ?? item.oneOff.startsAt,
          label: turkeyShortDay(item.oneOff.startsAt, locale),
          hours: t("oneOff", {
            hours: `${formatTurkishTime(item.oneOff.startsAt, locale)} – ${formatTurkishTime(item.oneOff.endsAt, locale)}`,
          }),
        };
      case AvailabilityItemKind.Unavailable: {
        const { reason } = item.exception;
        return {
          key: item.exception.id ?? item.exception.startsOn,
          label: exceptionLabel(
            { ...item.exception, reason: null },
            locale,
            now,
          ),
          hours:
            reason === null
              ? t("unavailable")
              : t("unavailableBecause", { reason }),
        };
      }
    }
  };
}
