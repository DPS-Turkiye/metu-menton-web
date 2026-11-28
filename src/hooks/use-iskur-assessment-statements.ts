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
  type IskurAssessmentStatements,
} from "@/interfaces/iskur-assessment-statement";
import { ToastTone } from "@/interfaces/toast";
import {
  decideIskurAssessmentStatement,
  getIskurAssessmentStatements,
} from "@/lib/client/iskur-assessment-statement";
import { isEnumValue } from "@/lib/enum";
import {
  confirmDecisionId,
  decisionInput,
  decisionPreview,
  emptyDecisionForm,
  iskurAssessmentStatementsQueryKey,
  nextWaitingId,
  returnFocusId,
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
  // The element (by DOM id) that takes focus next, so keyboard and screen-reader users are not dropped to the top of
  // the page when the form closes or a save ends. Cleared when a form opens or a save starts, so it can be set again.
  const [focusId, setFocusId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: iskurAssessmentStatementsQueryKey(programId),
    queryFn: () => getIskurAssessmentStatements(programId),
  });
  const close = (focusStatementId: string | null) => {
    setDecidingId(null);
    setForm(emptyDecisionForm());
    setFocusId(returnFocusId(focusStatementId));
  };
  const decide = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: IskurAssessmentDecisionInput;
    }) => decideIskurAssessmentStatement(programId, id, input),
    onSuccess: (data, { id }) => {
      const before = splitStatements(
        queryClient.getQueryData<IskurAssessmentStatements>(
          iskurAssessmentStatementsQueryKey(programId),
        )?.statements ?? [],
      ).waiting;
      queryClient.setQueryData(
        iskurAssessmentStatementsQueryKey(programId),
        data,
      );
      // The placement's mentoring time may have changed.
      void queryClient.invalidateQueries({
        queryKey: iskurWorkspaceQueryKey(programId),
      });
      close(
        nextWaitingId(before, id, splitStatements(data.statements).waiting),
      );
      showToast({ message: t("decided"), tone: ToastTone.Success });
    },
    onError: (failure: Error, { id }) => {
      // The save button was disabled while saving; a Vazgeç pressed meanwhile has already chosen a target.
      setFocusId((current) => current ?? confirmDecisionId(id));
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
  // A statement decided by someone else or cancelled by an unplace leaves `waiting`; its form closes with it, and focus
  // goes to the heading, whose count tells what changed.
  if (decidingId !== null && deciding === null && !decide.isPending)
    close(null);
  const checked = deciding ? decisionInput(form, deciding) : null;

  return {
    loading: query.isPending,
    failed: query.isError,
    pendingCount: query.data?.pendingCount ?? 0,
    waiting,
    closed,
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
    /** The element to focus now, by DOM id; null leaves focus where it is. Every button is disabled while saving. */
    focusTargetId: decide.isPending ? null : focusId,
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
      setFocusId(null);
    },
    cancel: () => close(decidingId),
    confirm: () => {
      if (decidingId && checked?.ok) {
        setFocusId(null);
        decide.mutate({ id: decidingId, input: checked.input });
      }
    },
  };
}

export type IskurAssessmentStatementsState = ReturnType<
  typeof useIskurAssessmentStatements
>;
