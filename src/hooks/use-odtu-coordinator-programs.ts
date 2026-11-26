"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useCoordinatorPrograms } from "@/hooks/use-coordinator-programs";
import type { CoordinatorProgram } from "@/interfaces/coordinator-program";
import { ProgramStatus } from "@/interfaces/program";
import {
  draftsToConfigure,
  filterOdtuPrograms,
  programDateLine,
  PROGRAMLARIM_SEGMENTS,
  programStats,
  type ProgramlarimSegment,
  type ProgramStat,
} from "@/lib/odtu-coordinator-programs";
import {
  ALL_PROGRAM_FEATURES,
  PROGRAM_FEATURES,
  type ProgramFeatureFilter,
} from "@/lib/program-features";
import { ProgramStatusFilter, statusCounts } from "@/lib/program-status-filter";

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
 * type cares about, the Tümü / Aktif / Taslak segments, a feature chip, and a reminder for drafts
 * whose terms still need setting.
 */
export function useOdtuCoordinatorPrograms() {
  const t = useTranslations("odtuCoordinatorPrograms");
  const tPrograms = useTranslations("coordinatorPrograms");
  const tFeature = useTranslations("programFeatures.names");
  const locale = useLocale();
  const query = useCoordinatorPrograms();
  const [segment, setSegment] = useState<ProgramlarimSegment>(
    ProgramStatusFilter.All,
  );
  const [feature, setFeature] =
    useState<ProgramFeatureFilter>(ALL_PROGRAM_FEATURES);

  const programs = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(() => statusCounts(programs), [programs]);
  const universityWide = tPrograms("universityWide");
  const cards = useMemo<ProgramCardData[]>(
    () =>
      filterOdtuPrograms(programs, segment, feature).map((program) => {
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
    [feature, locale, programs, segment, t, universityWide],
  );

  const featureOptions: { value: ProgramFeatureFilter; label: string }[] = [
    { value: ALL_PROGRAM_FEATURES, label: t("featureAll") },
    ...PROGRAM_FEATURES.map((value) => ({ value, label: tFeature(value) })),
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
    feature,
    featureOptions,
    setFeature,
  };
}
