"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { iskurWorkspaceQueryKey } from "@/hooks/use-iskur-workspace";
import {
  IskurDecisionProblem,
  IskurMentoringChoice,
  type IskurAssessmentDecisionForm,
  type IskurAssessmentDecisionInput,
  type IskurAssessmentStatement,
} from "@/interfaces/iskur-assessment-statement";
import { ToastTone } from "@/interfaces/toast";
import {
  decideIskurAssessmentStatement,
  getIskurAssessmentStatements,
} from "@/lib/client/iskur-assessment-statement";
import { isEnumValue } from "@/lib/enum";
import {
  decisionInput,
  decisionPreview,
  emptyDecisionForm,
  iskurAssessmentStatementsQueryKey,
  splitStatements,
} from "@/lib/iskur-assessment-statement";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

/**
 * The coordinator's assessment statements in the İŞKUR workspace: one decision per statement sets the intern's weekly
 * mentoring time (through their placement, so the workspace reloads), may reopen the Prism test and adds a note.
 */
export function useIskurAssessmentStatements(programId: string) {
  const t = useTranslations("iskurAssessment.coordinator");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [form, setForm] =
    useState<IskurAssessmentDecisionForm>(emptyDecisionForm);
  const query = useQuery({
    queryKey: iskurAssessmentStatementsQueryKey(programId),
    queryFn: () => getIskurAssessmentStatements(programId),
  });
  const close = () => {
    setDecidingId(null);
    setForm(emptyDecisionForm());
  };
  const decide = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: IskurAssessmentDecisionInput;
    }) => decideIskurAssessmentStatement(programId, id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        iskurAssessmentStatementsQueryKey(programId),
        data,
      );
      // The placement's mentoring time may have changed.
      void queryClient.invalidateQueries({
        queryKey: iskurWorkspaceQueryKey(programId),
      });
      close();
      showToast({ message: t("decided"), tone: ToastTone.Success });
    },
    onError: (failure: Error) => {
      showToast({
        message: errorMessage(failure, t("decideFailed")),
        tone: ToastTone.Error,
      });
      void queryClient.invalidateQueries({
        queryKey: iskurAssessmentStatementsQueryKey(programId),
      });
    },
  });
  const { waiting, closed } = splitStatements(query.data?.statements ?? []);
  const deciding: IskurAssessmentStatement | null =
    waiting.find((statement) => statement.id === decidingId) ?? null;
  const checked = deciding ? decisionInput(form, deciding) : null;

  return {
    loading: query.isPending,
    failed: query.isError,
    pendingCount: query.data?.pendingCount ?? 0,
    waiting,
    closed,
    // A statement decided by someone else or cancelled by an unplace leaves `waiting`; its form closes with it.
    decidingId: deciding?.id ?? null,
    form,
    preview: deciding ? decisionPreview(form, deciding) : null,
    problem: checked && !checked.ok ? checked.problem : null,
    // Every problem but an empty decision is about the typed hours.
    hoursInvalid:
      checked !== null &&
      !checked.ok &&
      checked.problem !== IskurDecisionProblem.Empty,
    canConfirm: checked?.ok === true && !decide.isPending,
    busy: decide.isPending,
    setChoice: (value: string) => {
      if (isEnumValue(IskurMentoringChoice, value))
        setForm((current) => ({ ...current, choice: value }));
    },
    setHours: (hours: string) => setForm((current) => ({ ...current, hours })),
    setRetake: (retake: boolean) =>
      setForm((current) => ({ ...current, retake })),
    setNote: (note: string) => setForm((current) => ({ ...current, note })),
    start: (id: string) => {
      if (decide.isPending) return;
      setDecidingId(id);
      setForm(emptyDecisionForm());
    },
    cancel: close,
    confirm: () => {
      if (decidingId && checked?.ok)
        decide.mutate({ id: decidingId, input: checked.input });
    },
  };
}

export type IskurAssessmentStatementsState = ReturnType<
  typeof useIskurAssessmentStatements
>;
