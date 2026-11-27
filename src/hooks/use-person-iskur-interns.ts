"use client";

import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useAppSession } from "@/components/providers/session-provider";
import { useCoordinatorPrograms } from "@/hooks/use-coordinator-programs";
import {
  iskurInternsQueryKey,
  settleIskurInterns,
} from "@/hooks/use-iskur-interns";
import { UserRole } from "@/interfaces/session";
import { ToastTone } from "@/interfaces/toast";
import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import {
  internEntryFor,
  iskurListProgramIds,
  personIskurState,
  type PersonIskurState,
} from "@/lib/iskur-interns";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export type PersonIskurRow = {
  programId: string;
  programName: string;
  /** No list to show: the first load failed. A failed refetch keeps showing the last list. */
  loadFailed: boolean;
  /** Null while the list loads or when it failed. */
  state: PersonIskurState | null;
  /** A placed intern is taken off the list only after leaving their team; the backend refuses it before. */
  placed: boolean;
  canRemove: boolean;
};

/**
 * The İŞKUR intern list as seen from one person's profile: per program where the coordinator may change it, whether
 * the person's address is listed, and adding or removing it. Coordinators only: admins and everyone else get no rows.
 * A program the person has two rows in (mentor and mentee) gets its status on the first row only.
 */
export function usePersonIskurInterns({
  email,
  programs,
}: {
  email: string;
  programs: readonly { key: string; id: string; name: string }[];
}) {
  const t = useTranslations("personSummary.iskur");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const coordinator = useAppSession()?.role === UserRole.Coordinator;
  const myPrograms = useCoordinatorPrograms({ enabled: coordinator });
  const programIds = coordinator
    ? iskurListProgramIds(
        programs.map((program) => program.id),
        myPrograms.data ?? [],
      )
    : [];
  const lists = useQueries({
    queries: programIds.map((programId) => ({
      queryKey: iskurInternsQueryKey(programId),
      queryFn: () => getIskurInterns(programId),
    })),
  });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (programId: string) => addIskurInterns(programId, [email]),
    onSuccess: (list, programId) => {
      settleIskurInterns(queryClient, programId, list);
      // An address the backend could not read comes back in `rejected`, not as an error.
      showToast(
        internEntryFor(list, email)
          ? { message: t("added"), tone: ToastTone.Success }
          : { message: t("addFailed"), tone: ToastTone.Error },
      );
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("addFailed")),
        tone: ToastTone.Error,
      }),
  });

  const remove = useMutation({
    mutationFn: ({
      programId,
      entryId,
    }: {
      programId: string;
      entryId: string;
    }) => removeIskurIntern(programId, entryId),
    onSuccess: (list, { programId }) => {
      settleIskurInterns(queryClient, programId, list);
      setConfirmingId(null);
      showToast({ message: t("removed"), tone: ToastTone.Success });
    },
    onError: (failure: Error, { programId }) => {
      // The entry may have changed elsewhere (removed, or its owner placed): show the list as it is now.
      void queryClient.invalidateQueries({
        queryKey: iskurInternsQueryKey(programId),
      });
      setConfirmingId(null);
      showToast({
        message: errorMessage(failure, t("removeFailed")),
        tone: ToastTone.Error,
      });
    },
  });

  const names = new Map(programs.map((program) => [program.id, program.name]));
  const firstRowKeys = new Map<string, string>();
  for (const program of programs) {
    if (!firstRowKeys.has(program.id))
      firstRowKeys.set(program.id, program.key);
  }
  const entryIds = new Map<string, string>();
  const rows = new Map<string, PersonIskurRow>();
  programIds.forEach((programId, index) => {
    const query = lists[index];
    const list = query?.data;
    const entry = list ? internEntryFor(list, email) : null;
    if (entry) entryIds.set(programId, entry.id);
    rows.set(programId, {
      programId,
      programName: names.get(programId) ?? "",
      loadFailed: !list && Boolean(query?.error),
      state: list ? personIskurState(entry) : null,
      placed: entry?.placed ?? false,
      canRemove: entry !== null && !entry.placed,
    });
  });
  const busy = add.isPending || remove.isPending;
  // The dialog closes itself when the entry is gone or its owner was placed meanwhile.
  const confirming = confirmingId ? rows.get(confirmingId) : undefined;

  return {
    rowFor: ({ key, id }: { key: string; id: string }) =>
      firstRowKeys.get(id) === key ? (rows.get(id) ?? null) : null,
    busy,
    addTo: (programId: string) => {
      if (busy) return;
      add.mutate(programId);
    },
    confirming: confirming?.canRemove ? confirming : null,
    removing: remove.isPending,
    startRemove: (programId: string) => setConfirmingId(programId),
    cancelRemove: () => setConfirmingId(null),
    confirmRemove: () => {
      const entryId = confirmingId ? entryIds.get(confirmingId) : undefined;
      if (!confirmingId || !entryId || busy) return;
      remove.mutate({ programId: confirmingId, entryId });
    },
  };
}

export type PersonIskurInternsState = ReturnType<typeof usePersonIskurInterns>;
