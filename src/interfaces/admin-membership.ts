import type { GateBadgeRow } from "@/interfaces/badges";
import type { ProgramBlocker, ProgramStatus } from "@/interfaces/program";

/** A semester as the membership dialog names it. */
export type SemesterRef = {
  id: string;
  name: string;
  status: ProgramStatus;
};

/**
 * What the admin's "Programa ekle" / "Programdan çıkar" dialog shows before confirming
 * (`GET /api/admin/users/{userId}/program`): the student's semester, the draft or active semesters they may move
 * to, and the open work that keeps them in their current one ([] when they are free to go).
 */
export type ProgramMembership = {
  current: SemesterRef | null;
  targets: SemesterRef[];
  blockers: ProgramBlocker[];
};

/** What a move or a removal did; `toProgramId` is null after "Programdan çıkar". */
export type ProgramMembershipChange = {
  userId: string;
  fromProgramId: string | null;
  toProgramId: string | null;
  movedMentorRow: boolean;
};

/**
 * One row of Kullanıcılar › Öğrenciler (`GET /api/admin/students`): one per approved student, in their current
 * semester or in none (`programId` null, no award); the badge state is the one in that row's semester.
 */
export type AdminStudentRow = Omit<
  GateBadgeRow,
  "programId" | "programName"
> & {
  programId: string | null;
  programName: string | null;
};
