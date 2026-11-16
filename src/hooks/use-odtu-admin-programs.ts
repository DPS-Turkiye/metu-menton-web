"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { useAdminOverview } from "@/hooks/use-admin-overview";
import { useEdition } from "@/hooks/use-edition";
import type { AdminProgram } from "@/interfaces/admin-overview";
import {
  ALL_COORDINATORS,
  coordinatorChoices,
  coordinatorLabel,
  filterAdminPrograms,
  participantsLabel,
  programCoordinators,
  programDateLabel,
  ProgramStatusFilter,
  statusCounts,
} from "@/lib/admin-programs";
import { programTypesOf } from "@/lib/edition-screens";
import { ALL_PROGRAM_TYPES, type ProgramTypeFilter } from "@/lib/program-types";

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
 * The ODTÜ admin's Programlar (Figma 152:7056): the status segments with their counts, search, the type and
 * coordinator chips (only the edition's own program types), and the coordinator dialog a row opens.
 */
export function useOdtuAdminPrograms() {
  const t = useTranslations("odtuAdminPrograms");
  const tType = useTranslations("programTypes");
  const locale = useLocale();
  const edition = useEdition();
  const query = useAdminOverview();
  const [status, setStatus] = useState(ProgramStatusFilter.All);
  const [type, setType] = useState<ProgramTypeFilter>(ALL_PROGRAM_TYPES);
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
        type,
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
    [activeCoordinator, locale, programs, search, status, t, type, usersById],
  );

  const stopAssigning = useCallback(() => setAssigning(null), []);
  const counts = useMemo(() => statusCounts(programs), [programs]);
  const segments = Object.values(ProgramStatusFilter).map((id) => ({
    id,
    label: t(`filters.${id}`, { count: counts[id] }),
    active: id === status,
  }));
  const typeOptions: { value: ProgramTypeFilter; label: string }[] = [
    { value: ALL_PROGRAM_TYPES, label: t("typeAll") },
    ...programTypesOf(edition).map((value) => ({
      value,
      label: tType(value),
    })),
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
    type,
    typeOptions,
    setType,
    coordinatorId: activeCoordinator,
    coordinatorOptions,
    setCoordinatorId,
    assigning,
    startAssigning: (program: AdminProgram) =>
      setAssigning({ id: program.id, name: program.name }),
    stopAssigning,
  };
}
