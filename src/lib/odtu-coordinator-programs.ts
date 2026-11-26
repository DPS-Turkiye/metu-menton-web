import type { useTranslations } from "next-intl";

import type { CoordinatorProgram } from "@/interfaces/coordinator-program";
import { ProgramFeature, ProgramStatus } from "@/interfaces/program";
import {
  formatMonthYear,
  formatProgramRun,
  openActionCount,
} from "@/lib/coordinator-programs";
import {
  hasFeature,
  isOfficeHoursOnly,
  matchesFeatureFilter,
  type ProgramFeatureFilter,
} from "@/lib/program-features";
import {
  matchesStatus,
  ProgramStatusFilter,
} from "@/lib/program-status-filter";

export type OdtuProgramsT = ReturnType<
  typeof useTranslations<"odtuCoordinatorPrograms">
>;

/** What a card shows for a number or date it does not have. */
export const NO_VALUE = "—";

/** Programlarım's segments, in display order (Figma 152:7749); "Tümü" also holds the completed programs. */
export const PROGRAMLARIM_SEGMENTS = [
  ProgramStatusFilter.All,
  ProgramStatusFilter.Active,
  ProgramStatusFilter.Draft,
] as const;

export type ProgramlarimSegment = (typeof PROGRAMLARIM_SEGMENTS)[number];

export function filterOdtuPrograms(
  programs: readonly CoordinatorProgram[],
  segment: ProgramlarimSegment,
  feature: ProgramFeatureFilter,
) {
  return programs.filter(
    (program) =>
      matchesStatus(program, segment) && matchesFeatureFilter(program, feature),
  );
}

/** The drafts a coordinator still has to set up before the admin starts them. */
export function draftsToConfigure(programs: readonly CoordinatorProgram[]) {
  return programs.filter((program) => program.status === ProgramStatus.Draft);
}

/**
 * The card's date line: Office Hours alone runs university-wide; a draft shows when it is planned to start; otherwise the
 * run.
 */
export function programDateLine(
  program: CoordinatorProgram,
  universityWide: string,
  locale: string,
) {
  if (isOfficeHoursOnly(program)) return universityWide;
  if (program.status === ProgramStatus.Draft) {
    return program.startDate
      ? formatMonthYear(program.startDate, locale)
      : NO_VALUE;
  }
  return (
    formatProgramRun(program.startDate, program.endDate, locale) || NO_VALUE
  );
}

/** The numbers a card can show; each names its label under `stats` in the messages. */
export enum ProgramStatKey {
  Teams = "teams",
  Mentors = "mentors",
  OpenActions = "openActions",
  Students = "students",
  PeerMentors = "peerMentors",
  OpenRequests = "openRequests",
  ActiveCategories = "activeCategories",
  Academicians = "academicians",
  WithAvailability = "withAvailability",
  AwaitingDecision = "awaitingDecision",
}

export type ProgramStat = { key: ProgramStatKey; value: string; label: string };

/**
 * The three numbers on a card, by the program's features: a startup program's teams, mentors and open actions; with
 * Akran Mentörlüğü, its students, peer mentors and open requests; with Office Hours alone, the academicians, those
 * with weekly hours and requests awaiting a decision. A peer draft shows its active categories instead of requests, and its
 * students as a dash, as the frame draws them before the program starts. A count an older backend does not send
 * reads as a dash too.
 */
export function programStats(
  program: CoordinatorProgram,
  t: OdtuProgramsT,
  locale: string,
): ProgramStat[] {
  const number = (value: number | undefined) =>
    value === undefined
      ? NO_VALUE
      : new Intl.NumberFormat(locale).format(value);
  const stat = (key: ProgramStatKey, value: number | undefined) => ({
    key,
    value: number(value),
    label: t(`stats.${key}`),
  });
  if (hasFeature(program, ProgramFeature.PeerMentoring)) {
    const peer = program.counts?.peer ?? undefined;
    const draft = program.status === ProgramStatus.Draft;
    return [
      stat(ProgramStatKey.Students, draft ? undefined : peer?.students),
      stat(ProgramStatKey.PeerMentors, peer?.peerMentors),
      draft
        ? stat(ProgramStatKey.ActiveCategories, peer?.activeCategories)
        : stat(ProgramStatKey.OpenRequests, peer?.openRequests),
    ];
  }
  if (hasFeature(program, ProgramFeature.OfficeHours)) {
    const officeHours = program.counts?.officeHours ?? undefined;
    return [
      stat(ProgramStatKey.Academicians, officeHours?.academicians),
      stat(ProgramStatKey.WithAvailability, officeHours?.withAvailability),
      stat(ProgramStatKey.AwaitingDecision, officeHours?.awaitingDecision),
    ];
  }
  return [
    stat(ProgramStatKey.Teams, program.teamCount),
    stat(ProgramStatKey.Mentors, program.mentorCount),
    stat(ProgramStatKey.OpenActions, openActionCount(program)),
  ];
}
