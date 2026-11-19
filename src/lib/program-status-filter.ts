import { ProgramStatus } from "@/interfaces/program";

/** The status segments of the ODTÜ program lists (Figma 152:7056, 152:7749): every program, or one stored status. */
export enum ProgramStatusFilter {
  All = "ALL",
  Active = "ACTIVE",
  Draft = "DRAFT",
  Completed = "COMPLETED",
}

const FILTER_STATUS: Record<
  Exclude<ProgramStatusFilter, ProgramStatusFilter.All>,
  ProgramStatus
> = {
  [ProgramStatusFilter.Active]: ProgramStatus.Active,
  [ProgramStatusFilter.Draft]: ProgramStatus.Draft,
  [ProgramStatusFilter.Completed]: ProgramStatus.Completed,
};

export function matchesStatus(
  program: { status: ProgramStatus },
  filter: ProgramStatusFilter,
) {
  return (
    filter === ProgramStatusFilter.All ||
    program.status === FILTER_STATUS[filter]
  );
}

/** How many programs each segment holds. */
export function statusCounts(
  programs: readonly { status: ProgramStatus }[],
): Record<ProgramStatusFilter, number> {
  const count = (filter: ProgramStatusFilter) =>
    programs.filter((program) => matchesStatus(program, filter)).length;
  return {
    [ProgramStatusFilter.All]: count(ProgramStatusFilter.All),
    [ProgramStatusFilter.Active]: count(ProgramStatusFilter.Active),
    [ProgramStatusFilter.Draft]: count(ProgramStatusFilter.Draft),
    [ProgramStatusFilter.Completed]: count(ProgramStatusFilter.Completed),
  };
}
