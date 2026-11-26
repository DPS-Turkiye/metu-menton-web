"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ToastTone } from "@/interfaces/toast";
import {
  declineIskurTeamChange,
  getIskurTeamChanges,
} from "@/lib/client/iskur-team-change";
import { isSendableText, splitTeamChanges } from "@/lib/iskur-team-change";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export const iskurTeamChangesQueryKey = (programId: string) =>
  ["iskur-team-changes", programId] as const;

/**
 * The coordinator's team change requests in the İŞKUR workspace: moving the intern happens in the usual placement
 * dialog (which closes the request on the backend); declining takes a note for the intern.
 */
export function useIskurTeamChanges(programId: string) {
  const t = useTranslations("iskurTeamChange");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const query = useQuery({
    queryKey: iskurTeamChangesQueryKey(programId),
    queryFn: () => getIskurTeamChanges(programId),
  });
  const decline = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      declineIskurTeamChange(programId, id, text),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurTeamChangesQueryKey(programId), data);
      setDecliningId(null);
      setNote("");
      showToast({ message: t("declined"), tone: ToastTone.Success });
    },
    onError: (failure: Error) => {
      showToast({
        message: errorMessage(failure, t("declineFailed")),
        tone: ToastTone.Error,
      });
      // It may have been answered meanwhile (a move in another tab): show what is true now.
      void queryClient.invalidateQueries({
        queryKey: iskurTeamChangesQueryKey(programId),
      });
    },
  });
  const { waiting, answered } = splitTeamChanges(query.data?.requests ?? []);
  const canDecline = isSendableText(note) && !decline.isPending;

  return {
    loading: query.isPending,
    failed: query.isError,
    waiting,
    answered,
    decliningId,
    note,
    setNote,
    canDecline,
    busy: decline.isPending,
    startDecline: (id: string) => {
      if (decline.isPending) return;
      setDecliningId(id);
      setNote("");
    },
    cancelDecline: () => {
      setDecliningId(null);
      setNote("");
    },
    confirmDecline: () => {
      if (decliningId && canDecline)
        decline.mutate({ id: decliningId, text: note.trim() });
    },
  };
}

export type IskurTeamChangesState = ReturnType<typeof useIskurTeamChanges>;
