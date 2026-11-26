"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useAddProgramCoordinator } from "@/hooks/use-add-program-coordinator";
import { ADMIN_OVERVIEW_QUERY_KEY } from "@/hooks/use-admin-overview";
import { COORDINATOR_PROGRAMS_QUERY_KEY } from "@/hooks/use-coordinator-programs";
import type {
  CoordinatorProgramDetail,
  CoordinatorRef,
  ProgramEligibleEmail,
} from "@/interfaces/coordinator-program";
import { ProgramFeature } from "@/interfaces/program";
import { ToastTone } from "@/interfaces/toast";
import {
  addProgramEligibleEmails,
  getCoordinatorProgram,
  getLaunchPreview,
  getProgramEligibleEmails,
  launchCoordinatorProgram,
  removeProgramCoordinator,
  removeProgramEligibleEmail,
  setCoordinatorProgramArchived,
  updateCoordinatorProgram,
} from "@/lib/client/coordinator-programs";
import {
  detailsInput,
  parseEmailList,
  settingsDraftError,
  settingsDraftOf,
  SettingsSection,
  type ProgramSettingsDraft,
} from "@/lib/coordinator-program-detail";
import { hasFeature } from "@/lib/program-features";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

const COORDINATOR_PROGRAM_QUERY_ROOT = ["coordinator-program"] as const;

export const coordinatorProgramQueryKey = (programId: string) =>
  [...COORDINATOR_PROGRAM_QUERY_ROOT, programId] as const;

export function useCoordinatorProgram(programId: string) {
  return useQuery({
    queryKey: coordinatorProgramQueryKey(programId),
    queryFn: () => getCoordinatorProgram(programId),
  });
}

export function useProgramCache(programId: string) {
  const queryClient = useQueryClient();
  return {
    put: (detail: CoordinatorProgramDetail) => {
      queryClient.setQueryData(coordinatorProgramQueryKey(programId), detail);
      void queryClient.invalidateQueries({
        queryKey: COORDINATOR_PROGRAMS_QUERY_KEY,
      });
    },
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: coordinatorProgramQueryKey(programId),
      }),
  };
}

/** Genel bilgiler and Mentorluk kuralları share one draft and one "Değişiklikleri kaydet". */
export function useProgramSettings(
  programId: string,
  detail: CoordinatorProgramDetail,
) {
  const t = useTranslations("programSettings");
  const cache = useProgramCache(programId);
  const { showToast } = useToast();
  const [section, setSection] = useState(SettingsSection.General);
  const [draft, setDraft] = useState<ProgramSettingsDraft>(() =>
    settingsDraftOf(detail),
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (value: ProgramSettingsDraft) =>
      updateCoordinatorProgram(programId, detailsInput(value)),
    onSuccess: (saved) => {
      cache.put(saved);
      setDraft(settingsDraftOf(saved));
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
    onError: (failure) => setError(errorMessage(failure, t("saveFailed"))),
  });

  const update = (patch: Partial<ProgramSettingsDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  return {
    section,
    setSection,
    draft,
    update,
    dirty: JSON.stringify(draft) !== JSON.stringify(settingsDraftOf(detail)),
    error,
    saving: save.isPending,
    save: () => {
      const problem = settingsDraftError(draft);
      setError(problem);
      if (!problem) save.mutate(draft);
    },
    cancel: () => {
      setError(null);
      setDraft(settingsDraftOf(detail));
    },
  };
}

/** Koordinatörler: who runs the program, and adding or removing the others. */
export function useProgramCoordinators(
  programId: string,
  coordinators: CoordinatorRef[],
) {
  const t = useTranslations("programSettings");
  const cache = useProgramCache(programId);
  const { showToast } = useToast();
  const [picking, setPicking] = useState(false);
  const queryClient = useQueryClient();
  const refresh = () => {
    void cache.refresh();
    void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
  };
  const add = useAddProgramCoordinator(programId, () => {
    setPicking(false);
    refresh();
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeProgramCoordinator(programId, userId),
    onSuccess: refresh,
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("coordinatorFailed")),
        tone: ToastTone.Error,
      }),
  });
  return {
    coordinators,
    picking,
    openPicker: () => setPicking(true),
    closePicker: () => setPicking(false),
    pick: add.pick,
    remove: (userId: string) => remove.mutate(userId),
    busy: add.adding || remove.isPending,
  };
}

/**
 * The program's list of allowed addresses. It saves on each add/remove, apart from the settings draft, because
 * a coordinator pastes the list while the rule may already be on.
 */
export function useProgramRoster(programId: string) {
  const t = useTranslations("programSettings");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const queryKey = [
    ...coordinatorProgramQueryKey(programId),
    "eligible-emails",
  ];
  const entries = useQuery({
    queryKey,
    queryFn: () => getProgramEligibleEmails(programId),
  });
  const onSaved = (saved: ProgramEligibleEmail[]) =>
    queryClient.setQueryData(queryKey, saved);
  const onError = (failure: Error) =>
    showToast({
      message: errorMessage(failure, t("roster.failed")),
      tone: ToastTone.Error,
    });
  const add = useMutation({
    mutationFn: (emails: string[]) =>
      addProgramEligibleEmails(programId, emails),
    onSuccess: (saved) => {
      onSaved(saved);
      setText("");
      showToast({ message: t("roster.saved"), tone: ToastTone.Success });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (entryId: string) =>
      removeProgramEligibleEmail(programId, entryId),
    onSuccess: onSaved,
    onError,
  });
  const pasted = parseEmailList(text);
  return {
    entries: entries.data ?? [],
    loading: entries.isLoading,
    text,
    setText,
    canAdd: pasted.length > 0 && !add.isPending,
    add: () => {
      if (pasted.length > 0) add.mutate(pasted);
    },
    remove: (entryId: string) => remove.mutate(entryId),
    busy: add.isPending || remove.isPending,
  };
}

/** Arşiv: archiving asks for confirmation; restoring does not. */
export function useProgramArchive(programId: string, archived: boolean) {
  const t = useTranslations("programSettings");
  const cache = useProgramCache(programId);
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      setCoordinatorProgramArchived(programId, value),
    onSuccess: (saved, value) => {
      cache.put(saved);
      setConfirming(false);
      showToast({
        message: value ? t("archived") : t("reopened"),
        tone: ToastTone.Success,
      });
    },
    onError: (failure) =>
      showToast({
        message: errorMessage(failure, t("archiveFailed")),
        tone: ToastTone.Error,
      }),
  });
  return {
    archived,
    confirming,
    ask: () => setConfirming(true),
    cancel: () => setConfirming(false),
    archive: () => mutation.mutate(true),
    restore: () => mutation.mutate(false),
    busy: mutation.isPending,
  };
}

/** "Programı Başlat": the admin turns a draft active; the admin's program list is refreshed too. */
export function useLaunchProgram(programId: string, onLaunched?: () => void) {
  const t = useTranslations("coordinatorPrograms");
  const cache = useProgramCache(programId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => launchCoordinatorProgram(programId),
    onSuccess: (detail) => {
      cache.put(detail);
      // The semester it completed changed too. Here rather than in mutate's own callback: the launch button unmounts
      // once the program is no longer a draft, and TanStack then skips that callback.
      void queryClient.invalidateQueries({
        queryKey: COORDINATOR_PROGRAM_QUERY_ROOT,
      });
      onLaunched?.();
      void queryClient.invalidateQueries({
        queryKey: ADMIN_OVERVIEW_QUERY_KEY,
      });
      showToast({
        message: t("launched", { name: detail.program.name }),
        tone: ToastTone.Success,
      });
    },
    onError: (failure) =>
      showToast({
        message: errorMessage(failure, t("launchFailed")),
        tone: ToastTone.Error,
      }),
  });
  return {
    launch: () => mutation.mutate(),
    launching: mutation.isPending,
  };
}

/**
 * The ODTÜ admin's "Programı Başlat": a confirmation that says which semester the launch completes and who moves into
 * the new one, read from the backend when the dialog opens.
 */
export function useSemesterLaunch(
  programId: string,
  program: CoordinatorProgramDetail["program"],
) {
  const [confirming, setConfirming] = useState(false);
  const launch = useLaunchProgram(programId, () => setConfirming(false));
  const preview = useQuery({
    queryKey: [...coordinatorProgramQueryKey(programId), "launch-preview"],
    queryFn: () => getLaunchPreview(programId),
    enabled: confirming,
    // Who moves can change while the dialog is closed; ask again each time it opens.
    staleTime: 0,
  });
  return {
    confirming,
    ask: () => setConfirming(true),
    close: () => {
      if (!launch.launching) setConfirming(false);
    },
    preview: preview.data ?? null,
    /** The launch waits for a fresh answer, so the admin confirms the numbers they see. */
    canConfirm: preview.data !== undefined && !preview.isFetching,
    /** Office Hours carries on university-wide, which the dialog says when the semester runs it. */
    officeHours: hasFeature(program, ProgramFeature.OfficeHours),
    previewLoading: preview.isLoading,
    previewError: preview.error,
    launching: launch.launching,
    confirm: () => {
      if (preview.data && !preview.isFetching) launch.launch();
    },
  };
}
