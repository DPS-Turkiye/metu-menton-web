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
import { ProgramType, type ProgramFeature } from "@/interfaces/program";
import { ToastTone } from "@/interfaces/toast";
import { ClientApiError } from "@/lib/client/api";
import {
  addProgramEligibleEmails,
  getCoordinatorProgram,
  getProgramEligibleEmails,
  launchCoordinatorProgram,
  removeProgramCoordinator,
  removeProgramEligibleEmail,
  setCoordinatorProgramArchived,
  setProgramCoordinatorFeatures,
  updateCoordinatorProgram,
  updateCoordinatorProgramFeatures,
} from "@/lib/client/coordinator-programs";
import {
  detailsInput,
  parseEmailList,
  settingsDraftError,
  settingsDraftOf,
  SettingsSection,
  type ProgramSettingsDraft,
} from "@/lib/coordinator-program-detail";
import {
  coordinatorFeatureChange,
  featureLock,
  featureSetProblem,
  programFeaturesOf,
  sameFeatures,
  withFeature,
} from "@/lib/program-features";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export const coordinatorProgramQueryKey = (programId: string) =>
  ["coordinator-program", programId] as const;

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

/**
 * Program özellikleri: the semester's feature switches, saved on their own. A switch-off the backend refuses because
 * of open work comes back as `blockers`, and nothing is saved.
 */
export function useProgramFeatures(
  programId: string,
  detail: CoordinatorProgramDetail,
  admin: boolean,
) {
  const t = useTranslations("programFeatures");
  const cache = useProgramCache(programId);
  const { showToast } = useToast();
  const saved = programFeaturesOf(detail.program);
  const [draft, setDraft] = useState<ProgramFeature[]>(() => [...saved]);
  const save = useMutation({
    mutationFn: (features: ProgramFeature[]) =>
      updateCoordinatorProgramFeatures(programId, features),
    onSuccess: (next) => {
      cache.put(next);
      setDraft([...programFeaturesOf(next.program)]);
      showToast({ message: t("saved"), tone: ToastTone.Success });
    },
  });
  const problem = featureSetProblem(draft);
  const blockers =
    save.error instanceof ClientApiError ? save.error.blockers : [];
  const lock = featureLock(detail.program.lifecycle, admin);

  return {
    features: draft,
    /** Why the switches are closed, or null when the caller may change them. */
    lock: lock ? t(lock) : null,
    setFeature: (feature: ProgramFeature, on: boolean) => {
      save.reset();
      setDraft((current) => withFeature(current, feature, on));
    },
    dirty: !sameFeatures(draft, saved),
    problem: problem ? t(`problems.${problem}`) : null,
    blockers,
    error:
      save.error && blockers.length === 0
        ? errorMessage(save.error, t("refused"))
        : null,
    saving: save.isPending,
    save: () => {
      if (!problem && !lock) save.mutate(draft);
    },
    cancel: () => {
      save.reset();
      setDraft([...saved]);
    },
  };
}

/** Koordinatörler: who runs the program, and adding or removing the others. */
export function useProgramCoordinators(
  programId: string,
  coordinators: CoordinatorRef[],
  program?: CoordinatorProgramDetail["program"],
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
  const features = useMutation({
    mutationFn: ({
      userId,
      next,
    }: {
      userId: string;
      next: ProgramFeature[];
    }) => setProgramCoordinatorFeatures(programId, userId, next),
    // Stay pending until the detail is read again: the next switch builds on the coordinator's saved features.
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_OVERVIEW_QUERY_KEY,
      });
      return cache.refresh();
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("coordinatorFeaturesFailed")),
        tone: ToastTone.Error,
      }),
  });
  const programFeatures =
    program?.type === ProgramType.Semester ? programFeaturesOf(program) : [];
  const change = (coordinator: CoordinatorRef, feature: ProgramFeature) => {
    const held = coordinator.features ?? [];
    return coordinatorFeatureChange(held, feature, !held.includes(feature));
  };
  return {
    coordinators,
    /** A semester's features, each of which a coordinator may run; none for other program types. */
    featureOptions: programFeatures,
    /** The features a coordinator runs, or null when the backend does not say (no switches are drawn then). */
    featuresOf: (coordinator: CoordinatorRef) => coordinator.features ?? null,
    /** The owner runs every feature of the program; only the others' features are chosen. */
    choosesFeatures: (coordinator: CoordinatorRef) => !coordinator.owner,
    /** Whether switching this feature is allowed: a coordinator keeps at least one. */
    canToggle: (coordinator: CoordinatorRef, feature: ProgramFeature) =>
      change(coordinator, feature) !== null,
    toggleFeature: (coordinator: CoordinatorRef, feature: ProgramFeature) => {
      const next = change(coordinator, feature);
      if (next && coordinator.features) {
        features.mutate({ userId: coordinator.id, next });
      }
    },
    picking,
    openPicker: () => setPicking(true),
    closePicker: () => setPicking(false),
    pick: add.pick,
    remove: (userId: string) => remove.mutate(userId),
    busy: add.adding || remove.isPending || features.isPending,
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
export function useLaunchProgram(programId: string) {
  const t = useTranslations("coordinatorPrograms");
  const cache = useProgramCache(programId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => launchCoordinatorProgram(programId),
    onSuccess: (detail) => {
      cache.put(detail);
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
  return { launch: () => mutation.mutate(), launching: mutation.isPending };
}
