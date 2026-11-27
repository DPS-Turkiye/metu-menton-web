"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { useInstitutionRecord } from "@/hooks/use-institution-record";
import { iskurOnboardingQueryKey } from "@/hooks/use-iskur-onboarding";
import { getIskurOnboarding } from "@/lib/client/iskur-onboarding";
import { getIskurWeek } from "@/lib/client/iskur-weeks";
import { iskurWeekQueryKey } from "@/lib/iskur-weeks";
import type { AvailabilityDraft } from "@/lib/mentor-availability";
import {
  isInsideDuty,
  suggestedOffers,
  type DutyRange,
} from "@/lib/mentor-duty-hours";

const NO_DUTY: DutyRange[] = [];

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
    queryKey: iskurWeekQueryKey(null),
    queryFn: () => getIskurWeek(null),
    enabled: duty.length > 0,
    retry: false,
  });
  const mentoringMinutes = week.data?.split?.mentoringMinutes ?? null;
  const suggestion = useMemo(
    () => suggestedOffers(duty, mentoringMinutes),
    [duty, mentoringMinutes],
  );
  return {
    // The week is waited for too, so a suggestion built from its target does not replace hours already shown.
    isLoading: institution.isLoading || onboarding.isLoading || week.isLoading,
    duty,
    /** The week's mentoring minutes; null while the intern's split is not known. */
    mentoringMinutes,
    /** Mentoring hours proposed from the work hours, for someone who has saved none yet. */
    suggestion,
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
