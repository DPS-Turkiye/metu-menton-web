"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { rosterQueryKey } from "@/hooks/use-program-badges";
import {
  PRISM_DECISION_MAX_ENTRIES,
  PrismDecision,
  type GateBadgeRow,
  type PrismDecisionInput,
} from "@/interfaces/badges";
import { postPrismDecisions } from "@/lib/client/badges";
import { canSendPrismList, parsePrismList } from "@/lib/prism-decisions";

/**
 * Katılımcılar › "Prism sonuçları": the coordinator pastes the Prism admin's list (or picks one person on Öğrenciler),
 * approves them as Akran mentors or asks them to retake the test, and sees what happened to each address.
 */
export function usePrismDecisions(programId: string) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [decision, setDecision] = useState(PrismDecision.Approved);
  const parsed = useMemo(() => parsePrismList(text), [text]);
  const sendable = canSendPrismList(parsed);

  const send = useMutation({
    mutationFn: (input: PrismDecisionInput) =>
      postPrismDecisions(programId, input),
    onSuccess: async () => {
      // The list is done; clearing it keeps a second click from sending the same batch again.
      setText("");
      await queryClient.invalidateQueries({
        queryKey: rosterQueryKey(programId),
      });
    },
  });

  return {
    open,
    openDialog: () => {
      send.reset();
      setDecision(PrismDecision.Approved);
      setOpen(true);
    },
    closeDialog: () => setOpen(false),
    text,
    setText,
    decision,
    setDecision,
    entryCount: parsed.entries.length,
    rejectedLines: parsed.rejectedLines,
    tooMany: parsed.entries.length > PRISM_DECISION_MAX_ENTRIES,
    maxEntries: PRISM_DECISION_MAX_ENTRIES,
    canSend: sendable && !send.isPending,
    send: () => {
      if (sendable && !send.isPending) {
        send.mutate({ decision, entries: parsed.entries });
      }
    },
    /** One person picked on Öğrenciler, without a score. */
    decideRow: (row: GateBadgeRow, rowDecision: PrismDecision) => {
      if (send.isPending) return;
      send.mutate({
        decision: rowDecision,
        entries: [{ email: row.email, score: null }],
      });
    },
    isSending: send.isPending,
    error: send.error,
    results: send.data ?? null,
  };
}
