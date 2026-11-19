"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { iskurApplicationsQueryKey } from "@/hooks/use-iskur-applications";
import { iskurWorkspaceQueryKey } from "@/hooks/use-iskur-workspace";
import type { IskurInternList } from "@/interfaces/iskur-interns";
import { ToastTone } from "@/interfaces/toast";
import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import {
  internEmailsFromText,
  ISKUR_INTERN_PASTE_MAX,
} from "@/lib/iskur-interns";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export const iskurInternsQueryKey = (programId: string) =>
  ["iskur-interns", programId] as const;

/**
 * The coordinator's İŞKUR intern list: the pasted addresses to add, and removing one. The list decides who the
 * placement pool and the onboarding forms count, so every change also refreshes those.
 */
export function useIskurInterns(programId: string) {
  const t = useTranslations("iskurInterns");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: iskurInternsQueryKey(programId),
    queryFn: () => getIskurInterns(programId),
  });
  const [text, setText] = useState("");
  const [rejected, setRejected] = useState<string[]>([]);

  const settle = (list: IskurInternList) => {
    queryClient.setQueryData(iskurInternsQueryKey(programId), list);
    void queryClient.invalidateQueries({
      queryKey: iskurWorkspaceQueryKey(programId),
    });
    void queryClient.invalidateQueries({
      queryKey: iskurApplicationsQueryKey(programId),
    });
  };

  const add = useMutation({
    mutationFn: (emails: string[]) => addIskurInterns(programId, emails),
    onSuccess: (list) => {
      settle(list);
      // The unreadable entries stay in the box, so the coordinator can fix them and add them again.
      setRejected(list.rejected);
      setText(list.rejected.join("\n"));
      showToast({ message: t("added"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("addFailed")),
        tone: ToastTone.Error,
      }),
  });

  const remove = useMutation({
    mutationFn: (entryId: string) => removeIskurIntern(programId, entryId),
    onSuccess: (list) => {
      settle(list);
      showToast({ message: t("removed"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("removeFailed")),
        tone: ToastTone.Error,
      }),
  });

  const emails = internEmailsFromText(text);
  const tooMany = emails.length > ISKUR_INTERN_PASTE_MAX;
  const busy = add.isPending || remove.isPending;

  return {
    isLoading: query.isLoading,
    loadError: query.error,
    list: query.data ?? null,
    text,
    setText,
    tooMany,
    rejected,
    busy,
    canAdd: emails.length > 0 && !tooMany && !busy,
    addPasted: () => {
      if (emails.length === 0 || tooMany || busy) return;
      setRejected([]);
      add.mutate(emails);
    },
    removeEntry: (entryId: string) => {
      if (busy) return;
      remove.mutate(entryId);
    },
  };
}

export type IskurInternsState = ReturnType<typeof useIskurInterns>;
