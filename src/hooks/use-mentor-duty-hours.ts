"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useInstitutionRecord } from "@/hooks/use-institution-record";
import { iskurOnboardingQueryKey } from "@/hooks/use-iskur-onboarding";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import { getIskurWeek } from "@/lib/client/iskur-weeks";
import { ISKUR_WEEK_KEY } from "@/lib/iskur-weeks";
import type { AvailabilityDraft } from "@/lib/mentor-availability";
import { isInsideDuty, type DutyRange } from "@/lib/mentor-duty-hours";

const NO_DUTY: DutyRange[] = [];
/** This week, as Bu Haftam caches it. */
const THIS_WEEK_KEY = [ISKUR_WEEK_KEY, "current"] as const;

/**
 * An İŞKUR intern's work hours and weekly mentoring target, which their mentoring hours must fit in (Figma 6.8). Empty
 * for a mentor who is not an intern, or one whose work hours are not known yet: they offer any hours they like.
 */
export function useMentorDutyHours() {
  const t = useTranslations("iaIskur.hours");
  const tDay = useTranslations("options.weekday");
  const institution = useInstitutionRecord();
  const intern = institution.data?.iskurParticipant ?? false;
  const onboarding = useQuery({
    queryKey: iskurOnboardingQueryKey,
    queryFn: getIskurOnboarding,
    enabled: intern,
    retry: false,
  });
  const form = onboarding.data?.form;
  const duty = form?.submittedAt ? form.schedule : NO_DUTY;
  const week = useQuery({
    queryKey: THIS_WEEK_KEY,
    queryFn: () => getIskurWeek(null),
    enabled: duty.length > 0,
    retry: false,
  });
  return {
    isLoading: institution.isLoading || onboarding.isLoading,
    duty,
    /** The week's mentoring minutes; null while the intern's split is not known. */
    mentoringMinutes: week.data?.split?.mentoringMinutes ?? null,
    /** Why these hours cannot be saved: one lies outside the work hours. */
    check: (draft: AvailabilityDraft) => {
      if (duty.length === 0) return null;
      const outside = draft.ranges.find((range) => !isInsideDuty(duty, range));
      return outside
        ? t("outsideError", { day: tDay(outside.dayOfWeek) })
        : null;
    },
  };
}

export type MentorDutyHours = ReturnType<typeof useMentorDutyHours>;
