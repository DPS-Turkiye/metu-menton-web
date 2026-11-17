"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useCoordinatorPrograms } from "@/hooks/use-coordinator-programs";
import { useEdition } from "@/hooks/use-edition";
import type { CoordinatorProgram } from "@/interfaces/coordinator-program";
import { ProgramStatus } from "@/interfaces/program";
import { programTypesOf } from "@/lib/edition-screens";
import {
  draftsToConfigure,
  filterOdtuPrograms,
  programDateLine,
  PROGRAMLARIM_SEGMENTS,
  programStats,
  type ProgramlarimSegment,
  type ProgramStat,
} from "@/lib/odtu-coordinator-programs";
import { ProgramStatusFilter, statusCounts } from "@/lib/program-status-filter";
import { ALL_PROGRAM_TYPES, type ProgramTypeFilter } from "@/lib/program-types";

/** One Programlarım card with its texts worked out. */
export type ProgramCardData = {
  program: CoordinatorProgram;
  dateLine: string;
  stats: ProgramStat[];
  /** A draft is set up in Program Ayarları; anything else opens on its overview. */
  href: string;
  draft: boolean;
};

/**
 * The ODTÜ coordinator's Programlarım (Figma 152:7749): every program they coordinate as a card with the numbers its
 * type cares about, the Tümü / Aktif / Taslak segments, the edition's program types, and a reminder for drafts
 * whose terms still need setting.
 */
export function useOdtuCoordinatorPrograms() {
  const t = useTranslations("odtuCoordinatorPrograms");
  const tPrograms = useTranslations("coordinatorPrograms");
  const tType = useTranslations("programTypes");
  const locale = useLocale();
  const edition = useEdition();
  const query = useCoordinatorPrograms();
  const [segment, setSegment] = useState<ProgramlarimSegment>(
    ProgramStatusFilter.All,
  );
  const [type, setType] = useState<ProgramTypeFilter>(ALL_PROGRAM_TYPES);

  const programs = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(() => statusCounts(programs), [programs]);
  const universityWide = tPrograms("universityWide");
  const cards = useMemo<ProgramCardData[]>(
    () =>
      filterOdtuPrograms(programs, segment, type).map((program) => {
        const draft = program.status === ProgramStatus.Draft;
        const base = `/coordinator/programs/${encodeURIComponent(program.id)}`;
        return {
          program,
          dateLine: programDateLine(program, universityWide, locale),
          stats: programStats(program, t, locale),
          href: draft ? `${base}/settings` : base,
          draft,
        };
      }),
    [locale, programs, segment, t, type, universityWide],
  );

  const typeOptions: { value: ProgramTypeFilter; label: string }[] = [
    { value: ALL_PROGRAM_TYPES, label: t("typeAll") },
    ...programTypesOf(edition).map((value) => ({
      value,
      label: tType(value),
    })),
  ];
  const drafts = draftsToConfigure(programs).map((program) => program.name);

  return {
    /** The filters show once the list has loaded, so "Tümü 0" never reads as real. */
    loaded: query.data !== undefined,
    isLoading: query.isLoading,
    loadError: query.error,
    total: programs.length,
    cards,
    drafts:
      drafts.length > 0
        ? new Intl.ListFormat(locale, { type: "conjunction" }).format(drafts)
        : null,
    segments: PROGRAMLARIM_SEGMENTS.map((id) => ({
      id,
      label: t(`segments.${id}`, { count: counts[id] }),
      active: id === segment,
    })),
    setSegment,
    type,
    typeOptions,
    setType,
  };
}
