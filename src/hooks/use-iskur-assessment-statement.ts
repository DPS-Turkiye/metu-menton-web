"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  IskurAssessmentReason,
  type IskurAssessmentMine,
} from "@/interfaces/iskur-assessment-statement";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  getMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/client/iskur-assessment-statement";
import { isEnumValue } from "@/lib/enum";
import {
  isSendableStatement,
  isWaiting,
} from "@/lib/iskur-assessment-statement";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const NOT_FOUND = 404;

export const iskurAssessmentQueryKey = ["iskur-assessment-statement"] as const;

/**
 * The intern's assessment statement on the training page: whether they may send one (placed, no badge, nothing
 * waiting), the reason and text they are writing, and their latest statement with the coordinator's decision.
 */
export function useIskurAssessmentStatement() {
  const t = useTranslations("iskurAssessment");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [writing, setWriting] = useState(false);
  const [reason, setReason] = useState<IskurAssessmentReason | "">("");
  const [text, setText] = useState("");
  const query = useQuery({
    queryKey: iskurAssessmentQueryKey,
    queryFn: async (): Promise<IskurAssessmentMine | null> => {
      try {
        return await getMyIskurAssessmentStatement();
      } catch (error) {
        // Not an İŞKUR intern: nothing to show.
        if (error instanceof ClientApiError && error.status === NOT_FOUND)
          return null;
        throw error;
      }
    },
    retry: false,
  });
  const reset = () => {
    setWriting(false);
    setReason("");
    setText("");
  };
  const send = useMutation({
    mutationFn: (input: { reason: IskurAssessmentReason; text: string }) =>
      sendIskurAssessmentStatement(input.reason, input.text),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurAssessmentQueryKey, data);
      reset();
      showToast({ message: t("sent"), tone: ToastTone.Success });
    },
    onError: (failure: Error) => {
      showToast({
        message: errorMessage(failure, t("sendFailed")),
        tone: ToastTone.Error,
      });
      // A refusal (a badge came in, one already waits) changes what may be sent.
      void queryClient.invalidateQueries({ queryKey: iskurAssessmentQueryKey });
    },
  });
  const mine = query.data ?? null;
  const latest = mine?.latest ?? null;
  const canSubmit =
    reason !== "" && isSendableStatement(text) && !send.isPending;

  return {
    ready: mine !== null,
    canSend: mine?.canSend ?? false,
    latest,
    waiting: latest !== null && isWaiting(latest),
    // The form stays open only while the backend still takes a statement (a refusal refetches `mine`).
    writing: writing && (mine?.canSend ?? false),
    reason,
    selectReason: (value: string) =>
      setReason(isEnumValue(IskurAssessmentReason, value) ? value : ""),
    text,
    setText,
    canSubmit,
    busy: send.isPending,
    start: () => setWriting(true),
    cancel: reset,
    submit: () => {
      if (canSubmit) send.mutate({ reason, text: text.trim() });
    },
  };
}
