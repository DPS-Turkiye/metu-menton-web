"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { IskurApplication } from "@/interfaces/iskur-onboarding";
import { ToastTone } from "@/interfaces/toast";
import {
  getIskurApplications,
  replaceIskurUnitSkills,
} from "@/lib/client/iskur-onboarding";
import {
  ISKUR_SKILL_NAME_MAX,
  ISKUR_UNIT_SKILLS_MAX,
  placementPreference,
  skillNamesFromText,
  skillNamesText,
} from "@/lib/iskur-onboarding";
import { errorMessage } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export const iskurApplicationsQueryKey = (programId: string) =>
  ["iskur-applications", programId] as const;

/**
 * The coordinator's side of İŞKUR onboarding on the placement screen: the interns' submitted forms (the "Tercihler"
 * panel, and the answers that pre-fill a new placement) and the editor for each unit's skills.
 */
export function useIskurApplications(programId: string) {
  const t = useTranslations("iskurOnboarding.coordinator");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: iskurApplicationsQueryKey(programId),
    queryFn: () => getIskurApplications(programId),
  });
  const data = query.data ?? null;
  const [editing, setEditing] = useState<{
    unitId: string;
    text: string;
  } | null>(null);

  const saveSkills = useMutation({
    mutationFn: ({ unitId, names }: { unitId: string; names: string[] }) =>
      replaceIskurUnitSkills(programId, unitId, names),
    onSuccess: (next) => {
      queryClient.setQueryData(iskurApplicationsQueryKey(programId), next);
      setEditing(null);
      showToast({ message: t("skillsSaved"), tone: ToastTone.Success });
    },
    onError: (failure: Error) =>
      showToast({
        message: errorMessage(failure, t("skillsSaveFailed")),
        tone: ToastTone.Error,
      }),
  });

  const names = editing ? skillNamesFromText(editing.text) : [];
  const namesValid =
    names.length <= ISKUR_UNIT_SKILLS_MAX &&
    names.every((name) => name.length <= ISKUR_SKILL_NAME_MAX);

  const applicationOf = (userId: string): IskurApplication | null =>
    data?.applications.find((application) => application.userId === userId) ??
    null;

  return {
    isLoading: query.isLoading,
    loadError: query.error,
    units: data?.units ?? [],
    submittedCount: data?.applications.length ?? 0,
    drafts: data?.drafts ?? 0,
    applicationOf,
    placementPreferenceOf: (userId: string) => {
      const application = applicationOf(userId);
      return application && data
        ? placementPreference(application, data.units)
        : null;
    },
    unitName: (unitId: string) =>
      data?.units.find((unit) => unit.id === unitId)?.name ?? null,
    skillName: (skillId: string) =>
      data?.units
        .flatMap((unit) => unit.skills)
        .find((skill) => skill.id === skillId)?.name ?? null,

    editing,
    namesValid,
    savingSkills: saveSkills.isPending,
    editSkills: (unitId: string) => {
      const unit = data?.units.find((item) => item.id === unitId);
      if (unit) setEditing({ unitId, text: skillNamesText(unit.skills) });
    },
    setSkillsText: (text: string) =>
      setEditing((current) => (current ? { ...current, text } : current)),
    cancelSkills: () => setEditing(null),
    saveSkills: () => {
      if (!editing || !namesValid || saveSkills.isPending) return;
      saveSkills.mutate({ unitId: editing.unitId, names });
    },
  };
}

export type IskurApplicationsState = ReturnType<typeof useIskurApplications>;
