"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type {
  IskurLeaderWeek,
  IskurWeekDecision,
} from "@/interfaces/iskur-weeks";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  decideIskurFallbackWeek,
  decideIskurLeaderWeek,
  getIskurFallbackQueue,
  getIskurFallbackWeek,
  getIskurLeaderQueue,
  getIskurLeaderWeek,
} from "@/lib/client/iskur-weeks";
import {
  decisionInput,
  emptyDecisionForm,
  ISKUR_REVIEW_QUEUE_KEY,
  ISKUR_WEEK_KEY,
  iskurFallbackWeekHref,
  iskurLeaderWeekHref,
  reasonNeeded,
} from "@/lib/iskur-weeks";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import type { IskurDecisionForm } from "@/types/iskur-weeks";

/** Whose review it is: a team leader's, or a program coordinator's for the weeks no leader can review. */
export interface IskurReviewer {
  /** null: a team leader's review; a program id: the coordinators' review of that program's fallback weeks. */
  programId: string | null;
}

function reviewHref(reviewer: IskurReviewer, weekId: string) {
  return reviewer.programId == null
    ? iskurLeaderWeekHref(weekId)
    : iskurFallbackWeekHref(reviewer.programId, weekId);
}

const reviewKey = (reviewer: IskurReviewer, weekId: string) =>
  ["iskur-review", reviewer.programId ?? "leader", weekId] as const;

export const iskurReviewQueueKey = (
  reviewer: IskurReviewer,
  weekStart: string | null,
) =>
  [
    ISKUR_REVIEW_QUEUE_KEY,
    reviewer.programId ?? "leader",
    weekStart ?? "current",
  ] as const;

/** "Haftalık kayıtlar": the people whose week the caller reviews, for one week. */
export function useIskurReviewQueue(
  reviewer: IskurReviewer,
  weekStart: string | null,
  enabled = true,
) {
  const query = useQuery({
    queryKey: iskurReviewQueueKey(reviewer, weekStart),
    queryFn: () =>
      reviewer.programId == null
        ? getIskurLeaderQueue(weekStart)
        : getIskurFallbackQueue(reviewer.programId, weekStart),
    enabled,
  });
  return {
    people: query.data?.people ?? [],
    loading: query.isPending && enabled,
    failed: query.isError,
    hrefOf: (weekId: string) => reviewHref(reviewer, weekId),
  };
}

/** One week under review (4.1) and the leader's Değerlendirme form. */
export function useIskurReview(reviewer: IskurReviewer, weekId: string) {
  const t = useTranslations("iskurReview");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IskurDecisionForm>(emptyDecisionForm);
  const query = useQuery({
    queryKey: reviewKey(reviewer, weekId),
    queryFn: () =>
      reviewer.programId == null
        ? getIskurLeaderWeek(weekId)
        : getIskurFallbackWeek(reviewer.programId, weekId),
    retry: (failures, error) =>
      !(error instanceof ClientApiError && error.status === 404) &&
      failures < 1,
  });
  const input = decisionInput(form);
  const decide = useMutation({
    mutationFn: () => {
      if (!input) throw new Error(t("decisionIncomplete"));
      return reviewer.programId == null
        ? decideIskurLeaderWeek(weekId, input)
        : decideIskurFallbackWeek(reviewer.programId, weekId, input);
    },
    onSuccess: (data: IskurLeaderWeek) => {
      queryClient.setQueryData(reviewKey(reviewer, weekId), data);
      void queryClient.invalidateQueries({
        queryKey: [ISKUR_REVIEW_QUEUE_KEY],
      });
      void queryClient.invalidateQueries({ queryKey: [ISKUR_WEEK_KEY] });
      setForm(emptyDecisionForm());
      showToast({ message: t("decided"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("decideFailed")),
        tone: ToastTone.Error,
      }),
  });
  const update = (patch: Partial<IskurDecisionForm>) =>
    setForm((current) => ({ ...current, ...patch }));
  const week = query.data ?? null;
  return {
    week,
    /** The other people of the queue: the reviewed person is the screen itself. */
    others:
      week?.queue.filter((row) => row.userId !== week.person.userId) ?? [],
    reasonNeeded: reasonNeeded(form),
    loading: query.isPending,
    notFound:
      query.error instanceof ClientApiError && query.error.status === 404,
    failed: query.isError,
    form,
    setDecision: (decision: IskurWeekDecision) => update({ decision }),
    setTimeMatchesWork: (value: boolean) => update({ timeMatchesWork: value }),
    setEffortDocumented: (value: boolean) =>
      update({ effortDocumented: value }),
    setOutputsSufficient: (value: boolean) =>
      update({ outputsSufficient: value }),
    setReason: (reason: string) => update({ reason }),
    canSubmit: input != null && !decide.isPending,
    submitting: decide.isPending,
    submit: () => {
      if (input && !decide.isPending) decide.mutate();
    },
    hrefOf: (id: string) => reviewHref(reviewer, id),
  };
}
