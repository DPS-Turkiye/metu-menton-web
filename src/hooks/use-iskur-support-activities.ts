"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type {
  IskurSupportActivities,
  IskurSupportActivity,
} from "@/interfaces/iskur-support-activities";
import { ToastTone } from "@/interfaces/toast";
import {
  createDefaultIskurSupportActivities,
  createIskurSupportActivity,
  deleteIskurSupportActivity,
  getIskurSupportActivities,
  updateIskurSupportActivity,
} from "@/lib/client/iskur-support-activities";
import { supportActivityInput } from "@/lib/iskur-support-activities";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";
import type { IskurSupportForm } from "@/types/iskur-tasks";

export const iskurSupportActivitiesQueryKey = (programId: string) =>
  ["iskur-support-activities", programId] as const;

/**
 * The coordinator's support-activity pool: one query, one form for adding or editing an activity, and every change
 * answers with the whole pool, which replaces the cached one.
 */
export function useIskurSupportActivities(programId: string) {
  const t = useTranslations("iskurSupport");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IskurSupportForm | null>(null);
  const query = useQuery({
    queryKey: iskurSupportActivitiesQueryKey(programId),
    queryFn: () => getIskurSupportActivities(programId),
  });

  const change = useMutation({
    mutationFn: (call: () => Promise<IskurSupportActivities>) => call(),
    onSuccess: (data) => {
      queryClient.setQueryData(iskurSupportActivitiesQueryKey(programId), data);
      setForm(null);
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("saveFailed")),
        tone: ToastTone.Error,
      }),
  });
  const run = (call: () => Promise<IskurSupportActivities>) => {
    if (!change.isPending) change.mutate(call);
  };
  const input = form ? supportActivityInput(form) : null;
  const update = (patch: Partial<IskurSupportForm>) => {
    if (form) setForm({ ...form, ...patch });
  };

  return {
    activities: query.data?.activities ?? [],
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    busy: change.isPending,
    form,
    startNew: () =>
      setForm({ id: null, title: "", description: "", active: true }),
    startEdit: (activity: IskurSupportActivity) =>
      setForm({
        id: activity.id,
        title: activity.title,
        description: activity.description ?? "",
        active: activity.active,
      }),
    cancel: () => setForm(null),
    setTitle: (title: string) => update({ title }),
    setDescription: (description: string) => update({ description }),
    setActive: (active: boolean) => update({ active }),
    canSave: input != null && !change.isPending,
    save: () => {
      if (!form || !input) return;
      const id = form.id;
      run(() =>
        id
          ? updateIskurSupportActivity(programId, id, input)
          : createIskurSupportActivity(programId, input),
      );
    },
    createDefaults: () =>
      run(() => createDefaultIskurSupportActivities(programId)),
    toggleActive: (activity: IskurSupportActivity) =>
      run(() =>
        updateIskurSupportActivity(programId, activity.id, {
          title: activity.title,
          description: activity.description,
          active: !activity.active,
        }),
      ),
    remove: (activity: IskurSupportActivity) =>
      run(() => deleteIskurSupportActivity(programId, activity.id)),
  };
}
