"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type {
  IskurTeamSupportInput,
  IskurTeamSupports,
} from "@/interfaces/iskur-team-support";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  answerIskurTeamSupport,
  getIskurTaskSupports,
  getIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/client/iskur-team-support";
import {
  answerNote,
  teamSupportInput,
  type IskurTeamSupportForm,
} from "@/lib/iskur-team-support";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const EMPTY_FORM: IskurTeamSupportForm = { toTeamId: "", need: "" };

export const iskurTeamSupportsQueryKey = ["iskur-team-support"] as const;
export const iskurTaskSupportsQueryKey = (taskId: string) =>
  ["iskur-task-support", taskId] as const;

/**
 * A team leader's support requests (handbook p.18, "Başka ekipten destek lazım → Liderin talep açar"): the form for
 * asking another team, optionally for one task, and the answers to what their own team was asked. Anyone who is not
 * a leader gets nothing (the backend says 403).
 */
export function useIskurTeamSupport(taskId: string | null = null) {
  const t = useTranslations("iskurTeamSupport");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState<IskurTeamSupportForm>(EMPTY_FORM);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const query = useQuery({
    queryKey: iskurTeamSupportsQueryKey,
    queryFn: async (): Promise<IskurTeamSupports | null> => {
      try {
        return await getIskurTeamSupports();
      } catch (error) {
        if (
          error instanceof ClientApiError &&
          (error.status === FORBIDDEN || error.status === NOT_FOUND)
        )
          return null;
        throw error;
      }
    },
    retry: false,
  });
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: iskurTeamSupportsQueryKey });
    if (taskId) {
      void queryClient.invalidateQueries({
        queryKey: iskurTaskSupportsQueryKey(taskId),
      });
    }
  };
  const failed = (fallback: string) => (failure: Error) => {
    showToast({
      message: errorMessage(failure, fallback),
      tone: ToastTone.Error,
    });
    refreshAll();
  };
  const open = useMutation({
    mutationFn: (input: IskurTeamSupportInput) => openIskurTeamSupport(input),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurTeamSupportsQueryKey, data);
      if (taskId) {
        void queryClient.invalidateQueries({
          queryKey: iskurTaskSupportsQueryKey(taskId),
        });
      }
      setWriting(false);
      setForm(EMPTY_FORM);
      showToast({ message: t("opened"), tone: ToastTone.Success });
    },
    onError: failed(t("openFailed")),
  });
  const answer = useMutation({
    mutationFn: (call: { id: string; accept: boolean; note: string | null }) =>
      answerIskurTeamSupport(call.id, call.accept, call.note),
    onSuccess: (data, call) => {
      queryClient.setQueryData(iskurTeamSupportsQueryKey, data);
      setAnsweringId(null);
      setNote("");
      showToast({
        message: t(call.accept ? "accepted" : "declined"),
        tone: ToastTone.Success,
      });
    },
    onError: failed(t("answerFailed")),
  });

  const data = query.data ?? null;
  const input = teamSupportInput(form, taskId);
  const cleanNote = answerNote(note);
  const busy = open.isPending || answer.isPending;

  return {
    data,
    loading: query.isPending,
    loadFailed: query.isError,
    teams: data?.teams ?? [],
    incoming: data?.incoming ?? [],
    outgoing: data?.outgoing ?? [],
    writing,
    form,
    setTeam: (toTeamId: string) => setForm({ ...form, toTeamId }),
    setNeed: (need: string) => setForm({ ...form, need }),
    canOpen: input !== null && !busy,
    busy,
    start: () => setWriting(true),
    cancel: () => {
      setWriting(false);
      setForm(EMPTY_FORM);
    },
    send: () => {
      if (input && !busy) open.mutate(input);
    },
    answeringId,
    note,
    setNote,
    noteTooLong: cleanNote === undefined,
    startAnswer: (id: string) => {
      if (busy) return;
      setAnsweringId(id);
      setNote("");
    },
    cancelAnswer: () => {
      setAnsweringId(null);
      setNote("");
    },
    reply: (accept: boolean) => {
      if (answeringId && cleanNote !== undefined && !busy)
        answer.mutate({ id: answeringId, accept, note: cleanNote });
    },
  };
}

export type IskurTeamSupportState = ReturnType<typeof useIskurTeamSupport>;

/** The support requests opened for one task, for its assignee and its team's leaders ("Görev detayı"). */
export function useIskurTaskSupports(taskId: string) {
  const query = useQuery({
    queryKey: iskurTaskSupportsQueryKey(taskId),
    queryFn: () => getIskurTaskSupports(taskId),
  });
  return {
    requests: query.data ?? [],
    loading: query.isPending,
    failed: query.isError,
  };
}
