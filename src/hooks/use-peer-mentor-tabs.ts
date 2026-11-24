"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  MENTOR_AVAILABILITY_SETTINGS_QUERY_KEY,
  useMentorAvailabilitySettings,
} from "@/hooks/use-mentor-profile";
import {
  PEER_MENTOR_PROFILE_QUERY_KEY,
  usePeerRequestDecision,
} from "@/hooks/use-peer-mentor-give";
import { PROFILE_COMPLETION_CATEGORIES_QUERY_KEY } from "@/hooks/use-student-profile-completion";
import type {
  PeerMentorProfile,
  SavePeerMentorIntakeInput,
} from "@/interfaces/peer-mentoring";
import { ToastTone } from "@/interfaces/toast";
import { savePeerMentorIntake } from "@/lib/client/peer-mentoring";
import { getProfileCompletionCategories } from "@/lib/client/student-profile-completion";
import { exceptionLabel } from "@/lib/mentor-availability";
import {
  hoursByDays,
  offeredSubTopics,
  PEER_CAPACITY_MAX,
  PEER_CAPACITY_MIN,
  weeklyHours,
} from "@/lib/peer-mentoring";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import { PeerDeclineReason } from "@/types/iskur-student";

export const PEER_DECLINE_REASONS = Object.values(PeerDeclineReason);

/** Talepler (Figma 7.1): accepting a request, or declining it with a reason that goes to the student. */
export function usePeerRequestActions() {
  const tReason = useTranslations("iaIskur.give.requests.reason");
  const decision = usePeerRequestDecision();
  const [declining, setDeclining] = useState<{
    id: string;
    reason: PeerDeclineReason;
  } | null>(null);
  return {
    pendingId: decision.pendingId,
    accept: decision.accept,
    /** The request whose reasons are open, and the chosen one; the first is chosen to start with. */
    declining,
    startDecline: (id: string) =>
      setDeclining({ id, reason: PeerDeclineReason.Times }),
    chooseReason: (reason: PeerDeclineReason) =>
      setDeclining((current) => current && { ...current, reason }),
    cancelDecline: () => setDeclining(null),
    confirmDecline: () => {
      if (!declining) return;
      decision.decline(declining.id, tReason(declining.reason));
      setDeclining(null);
    },
  };
}

export type PeerRequestActions = ReturnType<typeof usePeerRequestActions>;

/** "Müsaitliğim" on Mentor profilim (7.7): the weekly hours by day, the closed days and the meeting length. */
export function usePeerMentorHours() {
  const locale = useLocale();
  const settings = useMentorAvailabilitySettings();
  const data = settings.data;
  return {
    isLoading: settings.isLoading,
    error: settings.error,
    hours: data ? weeklyHours(data.rules) : [],
    days: data ? hoursByDays(weeklyHours(data.rules)) : [],
    closedDays: data
      ? data.exceptions.map((exception) => exceptionLabel(exception, locale))
      : [],
    minutes: data?.defaultMeetingDurationMinutes ?? null,
  };
}

/** The mentor's sub-topics the catalogue still names. */
export function usePeerMentorSubTopics(ids: readonly string[]) {
  const catalogue = useQuery({
    queryKey: PROFILE_COMPLETION_CATEGORIES_QUERY_KEY,
    queryFn: getProfileCompletionCategories,
  });
  return offeredSubTopics(catalogue.data ?? [], ids).flatMap(({ entry }) =>
    entry ? [entry] : [],
  );
}

/** "Kapasitem" (7.7): the limit and the new-requests switch, each saved as soon as it changes. */
export function usePeerMentorIntake(
  profile: PeerMentorProfile,
  capacity: number | null,
) {
  const t = useTranslations("iaIskur.give.profile.intake");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: savePeerMentorIntake,
    onSuccess: async (saved) => {
      queryClient.setQueryData(PEER_MENTOR_PROFILE_QUERY_KEY, saved);
      // The capacity is also part of the availability settings the other tabs read.
      await queryClient.invalidateQueries({
        queryKey: MENTOR_AVAILABILITY_SETTINGS_QUERY_KEY,
      });
    },
    onError: (failure) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });
  // A press while the last one is being saved is dropped; the controls stay enabled so the keyboard keeps its place.
  const send = (input: SavePeerMentorIntakeInput) => {
    if (!save.isPending) save.mutate(input);
  };
  const setCapacity = (menteeCapacity: number) =>
    send({ menteeCapacity, acceptingRequests: profile.acceptingRequests });
  return {
    canDecrease: capacity !== null && capacity > PEER_CAPACITY_MIN,
    canIncrease: capacity === null || capacity < PEER_CAPACITY_MAX,
    decrease: () => {
      if (capacity !== null) setCapacity(capacity - 1);
    },
    /** With no limit yet, the first press sets the lowest one. */
    increase: () =>
      setCapacity(capacity === null ? PEER_CAPACITY_MIN : capacity + 1),
    setAccepting: (acceptingRequests: boolean) =>
      send({ menteeCapacity: null, acceptingRequests }),
  };
}
