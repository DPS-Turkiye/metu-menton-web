"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { useAdminOverview } from "@/hooks/use-admin-overview";
import type { AdminProgram } from "@/interfaces/admin-overview";
import {
  ALL_COORDINATORS,
  coordinatorChoices,
  coordinatorLabel,
  filterAdminPrograms,
  participantsLabel,
  programCoordinators,
  programDateLabel,
} from "@/lib/admin-programs";
import {
  ALL_PROGRAM_FEATURES,
  PROGRAM_FEATURES,
  type ProgramFeatureFilter,
} from "@/lib/program-features";
import { ProgramStatusFilter, statusCounts } from "@/lib/program-status-filter";

/** One row of the ODTÜ Programlar table, with its texts worked out. */
export type AdminProgramRow = {
  program: AdminProgram;
  /** "Elif Demir +1" and whose initials the avatar shows; null when nobody coordinates the program yet. */
  coordinators: { label: string; leadName: string } | null;
  date: string;
  participants: string;
};

/** The program whose coordinator dialog is open. */
export type AssigningProgram = Pick<AdminProgram, "id" | "name">;

/**
 * The ODTÜ admin's Programlar (Figma 152:7056): the status segments with their counts, search, the feature and
 * coordinator chips, and the coordinator dialog a row opens.
 */
export function useOdtuAdminPrograms() {
  const t = useTranslations("odtuAdminPrograms");
  const tFeature = useTranslations("programFeatures.names");
  const locale = useLocale();
  const query = useAdminOverview();
  const [status, setStatus] = useState(ProgramStatusFilter.All);
  const [feature, setFeature] =
    useState<ProgramFeatureFilter>(ALL_PROGRAM_FEATURES);
  const [coordinatorId, setCoordinatorId] = useState(ALL_COORDINATORS);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<AssigningProgram | null>(null);

  const data = query.data;
  const usersById = useMemo(
    () => new Map((data?.users ?? []).map((user) => [user.id, user])),
    [data],
  );
  const programs = useMemo(() => data?.programs ?? [], [data]);

  const choices = useMemo(
    () => coordinatorChoices(programs, usersById),
    [programs, usersById],
  );
  // A coordinator who left every program after a refetch no longer narrows the list.
  const activeCoordinator = choices.some(
    (choice) => choice.id === coordinatorId,
  )
    ? coordinatorId
    : ALL_COORDINATORS;

  const rows = useMemo<AdminProgramRow[]>(
    () =>
      filterAdminPrograms(programs, {
        status,
        feature,
        coordinatorId: activeCoordinator,
        search,
      }).map((program) => {
        const coordinators = programCoordinators(program, usersById);
        const label = coordinatorLabel(coordinators, t);
        const lead = coordinators[0];
        return {
          program,
          coordinators: label && lead ? { label, leadName: lead.name } : null,
          date: programDateLabel(program, t, locale),
          participants: participantsLabel(program, t, locale),
        };
      }),
    [
      activeCoordinator,
      feature,
      locale,
      programs,
      search,
      status,
      t,
      usersById,
    ],
  );

  const stopAssigning = useCallback(() => setAssigning(null), []);
  const counts = useMemo(() => statusCounts(programs), [programs]);
  // No counts before the list has loaded, so "Tümü 0" never reads as real.
  const segments = data
    ? Object.values(ProgramStatusFilter).map((id) => ({
        id,
        label: t(`filters.${id}`, { count: counts[id] }),
        active: id === status,
      }))
    : [];
  const featureOptions: { value: ProgramFeatureFilter; label: string }[] = [
    { value: ALL_PROGRAM_FEATURES, label: t("featureAll") },
    ...PROGRAM_FEATURES.map((value) => ({ value, label: tFeature(value) })),
  ];
  const coordinatorOptions = [
    { value: ALL_COORDINATORS, label: t("coordinatorAll") },
    ...choices.map((coordinator) => ({
      value: coordinator.id,
      label: coordinator.name,
    })),
  ];

  return {
    isLoading: query.isLoading,
    loadError: query.error,
    hasPrograms: programs.length > 0,
    rows,
    segments,
    setStatus,
    search,
    setSearch,
    feature,
    featureOptions,
    setFeature,
    coordinatorId: activeCoordinator,
    coordinatorOptions,
    setCoordinatorId,
    assigning,
    startAssigning: (program: AdminProgram) =>
      setAssigning({ id: program.id, name: program.name }),
    stopAssigning,
  };
}
