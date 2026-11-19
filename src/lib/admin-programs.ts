import type { useTranslations } from "next-intl";

import type { AdminProgram, AdminUser } from "@/interfaces/admin-overview";
import { ProgramStatus, ProgramType } from "@/interfaces/program";
import { formatMonthYear, formatProgramRun } from "@/lib/coordinator-programs";
import {
  matchesStatus,
  type ProgramStatusFilter,
} from "@/lib/program-status-filter";
import {
  matchesProgramType,
  type ProgramTypeFilter,
} from "@/lib/program-types";

export type AdminProgramsT = ReturnType<
  typeof useTranslations<"odtuAdminPrograms">
>;

export const ALL_COORDINATORS = "ALL";

export type CoordinatorRef = { id: string; name: string };

export type AdminProgramFilters = {
  status: ProgramStatusFilter;
  type: ProgramTypeFilter;
  coordinatorId: string;
  search: string;
};

/**
 * A program's coordinators, first one first. The label lists the same people in the same order, so it names anyone
 * the user list lacks; a backend older than v1.6.53 sends no ids at all, so then the label is all there is (with
 * nothing to filter by).
 */
export function programCoordinators(
  program: AdminProgram,
  usersById: ReadonlyMap<string, AdminUser>,
): CoordinatorRef[] {
  const names = (program.coordinatorName ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!program.coordinatorIds) return names.map((name) => ({ id: "", name }));
  return program.coordinatorIds.map((id, index) => ({
    id,
    name: usersById.get(id)?.fullName ?? names[index] ?? "—",
  }));
}

/** Everyone who coordinates a listed program, once each, by name. */
export function coordinatorChoices(
  programs: readonly AdminProgram[],
  usersById: ReadonlyMap<string, AdminUser>,
): CoordinatorRef[] {
  const byId = new Map<string, CoordinatorRef>();
  for (const program of programs) {
    for (const coordinator of programCoordinators(program, usersById)) {
      if (coordinator.id) byId.set(coordinator.id, coordinator);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function filterAdminPrograms(
  programs: readonly AdminProgram[],
  filters: AdminProgramFilters,
) {
  const search = filters.search.trim().toLocaleLowerCase("tr");
  return programs.filter(
    (program) =>
      matchesStatus(program, filters.status) &&
      matchesProgramType(program.type, filters.type) &&
      (filters.coordinatorId === ALL_COORDINATORS ||
        (program.coordinatorIds ?? []).includes(filters.coordinatorId)) &&
      program.name.toLocaleLowerCase("tr").includes(search),
  );
}

/** "Elif Demir", "Elif Demir +1"; null when nobody coordinates the program yet. */
export function coordinatorLabel(
  coordinators: readonly CoordinatorRef[],
  t: AdminProgramsT,
) {
  const [first, ...others] = coordinators;
  if (!first) return null;
  return others.length === 0
    ? first.name
    : t("coordinatorMore", { name: first.name, count: others.length });
}

/**
 * The Tarih column: Office Hours runs university-wide; a draft shows its planned start; otherwise the run, with the
 * year named once inside one year ("Şub – Ara 2026", "Eyl 2026 – Oca 2027").
 */
export function programDateLabel(
  program: AdminProgram,
  t: AdminProgramsT,
  locale: string,
) {
  if (program.type === ProgramType.OfficeHours) return t("universityWide");
  const start = program.startDate ?? null;
  const end = program.endDate ?? null;
  if (program.status === ProgramStatus.Draft) {
    return start
      ? t("draftDate", { date: formatMonthYear(start, locale) })
      : "—";
  }
  return formatProgramRun(start, end, locale) || "—";
}

/**
 * The Katılımcı column: nobody takes part in a draft yet, an Office Hours program is open to the whole university,
 * a peer program counts its students, and a startup program its teams and mentors.
 */
export function participantsLabel(
  program: AdminProgram,
  t: AdminProgramsT,
  locale: string,
) {
  if (program.status === ProgramStatus.Draft) return "—";
  if (program.type === ProgramType.OfficeHours) return t("participantsAll");
  const count =
    program.type === ProgramType.PeerMentoring
      ? program.counts?.peer?.students
      : program.startupCount + program.acceptedMentorCount;
  return count === undefined
    ? "—"
    : new Intl.NumberFormat(locale).format(count);
}
