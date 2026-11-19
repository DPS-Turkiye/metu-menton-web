"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ISKUR_TEAM_TASKS_KEY } from "@/hooks/use-iskur-team";
import { IskurTaskStatus, type IskurTask } from "@/interfaces/iskur-tasks";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  deleteIskurTask,
  getIskurTask,
  updateIskurTask,
} from "@/lib/client/iskur-tasks";
import {
  completeBlock,
  ISKUR_TEAM_HREF,
  linkSavable,
  minutesSavable,
  taskForm,
  taskUpdateInput,
} from "@/lib/iskur-tasks";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import type { IskurTaskForm } from "@/types/iskur-tasks";

export const iskurTaskQueryKey = (taskId: string) =>
  ["iskur-task", taskId] as const;

/**
 * "Görev detayı": the assignee's actual time and output over the saved task, and the moves it allows: save,
 * complete, hand over to next week (with a reason), reopen; a leader may reopen or delete.
 */
export function useIskurTask(taskId: string) {
  const t = useTranslations("iskurTask");
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<IskurTaskForm | null>(null);
  const [handingOver, setHandingOver] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const query = useQuery({
    queryKey: iskurTaskQueryKey(taskId),
    queryFn: () => getIskurTask(taskId),
    retry: (failures, error) =>
      !(error instanceof ClientApiError && error.status === 404) &&
      failures < 1,
  });
  const task = query.data ?? null;
  const form = draft ?? (task ? taskForm(task) : null);

  const change = useMutation({
    mutationFn: (status: IskurTaskStatus | null) =>
      updateIskurTask(taskId, taskUpdateInput(form ?? emptyForm(), status)),
    onSuccess: (data: IskurTask, status) => {
      queryClient.setQueryData(iskurTaskQueryKey(taskId), data);
      void queryClient.invalidateQueries({ queryKey: [ISKUR_TEAM_TASKS_KEY] });
      setDraft(null);
      setHandingOver(false);
      showToast({
        message: t(status == null ? "saved" : `moved.${status}`),
        tone: ToastTone.Success,
      });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });

  const remove = useMutation({
    mutationFn: () => deleteIskurTask(taskId),
    onSuccess: () => {
      setConfirmingDelete(false);
      queryClient.removeQueries({ queryKey: iskurTaskQueryKey(taskId) });
      void queryClient.invalidateQueries({ queryKey: [ISKUR_TEAM_TASKS_KEY] });
      showToast({ message: t("deleted"), tone: ToastTone.Success });
      router.push(ISKUR_TEAM_HREF);
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });

  const busy = change.isPending || remove.isPending;
  const update = (patch: Partial<IskurTaskForm>) => {
    if (form) setDraft({ ...form, ...patch });
  };
  const block = task && form ? completeBlock(task, form) : null;
  const reason = form?.handoverReason.trim() ?? "";
  const open = task?.status === IskurTaskStatus.Open;

  return {
    task,
    form,
    loading: query.isPending,
    notFound:
      query.error instanceof ClientApiError && query.error.status === 404,
    failed: query.isError,
    busy,
    canWork: task?.canWork ?? false,
    canManage: task?.canManage ?? false,
    open,
    completeBlock: block,
    handingOver,
    setActualMinutes: (actualMinutes: string) => update({ actualMinutes }),
    setOutputLink: (outputLink: string) => update({ outputLink }),
    setOutputNote: (outputNote: string) => update({ outputNote }),
    setHandoverReason: (handoverReason: string) => update({ handoverReason }),
    linkInvalid: form != null && !linkSavable(form),
    minutesInvalid: form != null && !minutesSavable(form),
    canSave:
      draft != null &&
      form != null &&
      linkSavable(form) &&
      minutesSavable(form) &&
      !busy,
    save: () => {
      if (!busy) change.mutate(null);
    },
    canComplete:
      task?.status !== IskurTaskStatus.Done && block == null && !busy,
    complete: () => {
      if (!busy && block == null) change.mutate(IskurTaskStatus.Done);
    },
    startHandover: () => setHandingOver(true),
    cancelHandover: () => setHandingOver(false),
    canHandOver: open && reason.length > 0 && !busy,
    handOver: () => {
      if (!busy && reason) change.mutate(IskurTaskStatus.HandedOver);
    },
    reopen: () => {
      if (!busy) change.mutate(IskurTaskStatus.Open);
    },
    confirmingDelete,
    askDelete: () => setConfirmingDelete(true),
    cancelDelete: () => setConfirmingDelete(false),
    remove: () => {
      if (!busy) remove.mutate();
    },
  };
}

function emptyForm(): IskurTaskForm {
  return {
    actualMinutes: "",
    outputLink: "",
    outputNote: "",
    handoverReason: "",
  };
}
