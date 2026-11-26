"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { IskurTeamChangeMine } from "@/interfaces/iskur-team-change";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  askIskurTeamChange,
  getMyIskurTeamChange,
} from "@/lib/client/iskur-team-change";
import { isPending, isSendableText } from "@/lib/iskur-team-change";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const NOT_FOUND = 404;

export const iskurTeamChangeQueryKey = ["iskur-team-change"] as const;

/**
 * The intern's team change request on the team reveal (handbook p.18): whether they may ask, the short reason they
 * are writing, and their latest request with the coordinator's answer.
 */
export function useIskurTeamChange() {
  const t = useTranslations("iskurTeamChange");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [writing, setWriting] = useState(false);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: iskurTeamChangeQueryKey,
    queryFn: async (): Promise<IskurTeamChangeMine | null> => {
      try {
        return await getMyIskurTeamChange();
      } catch (error) {
        if (error instanceof ClientApiError && error.status === NOT_FOUND)
          return null;
        throw error;
      }
    },
    retry: false,
  });
  const ask = useMutation({
    mutationFn: (text: string) => askIskurTeamChange(text),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurTeamChangeQueryKey, data);
      setWriting(false);
      setReason("");
      showToast({ message: t("sent"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("sendFailed")),
        tone: ToastTone.Error,
      }),
  });
  const mine = query.data ?? null;
  const latest = mine?.latest ?? null;
  const canSend = isSendableText(reason) && !ask.isPending;

  return {
    ready: mine !== null,
    canAsk: mine?.canAsk ?? false,
    latest,
    waiting: latest !== null && isPending(latest),
    writing,
    reason,
    setReason,
    canSend,
    busy: ask.isPending,
    start: () => setWriting(true),
    cancel: () => {
      setWriting(false);
      setReason("");
    },
    send: () => {
      if (canSend) ask.mutate(reason.trim());
    },
  };
}

export type IskurTeamChangeState = ReturnType<typeof useIskurTeamChange>;
