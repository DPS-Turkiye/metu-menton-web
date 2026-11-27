import type {
  AdminStudentRow,
  ProgramMembership,
} from "@/interfaces/admin-membership";
import type { ProgramBlocker } from "@/interfaces/program";

/** What the admin does to a student's semester from Kullanıcılar › Öğrenciler. */
export enum MembershipAction {
  Add = "ADD",
  Remove = "REMOVE",
}

/**
 * The row menu's actions: a student can be added (moved), and removed when in a semester; other badge holders have
 * none, since only students belong to a semester.
 */
export function membershipActions(
  row: Pick<AdminStudentRow, "programId" | "student">,
): MembershipAction[] {
  if (!row.student) return [];
  return row.programId === null
    ? [MembershipAction.Add]
    : [MembershipAction.Add, MembershipAction.Remove];
}

/** Whether the action takes the student out of their current semester, so its open work must be finished first. */
export function leavesCurrent(
  action: MembershipAction,
  membership: Pick<ProgramMembership, "current">,
) {
  return action === MembershipAction.Remove || membership.current !== null;
}

/**
 * The open work that stops the action, as far as the dialog knows: a refusal's own list wins, otherwise what the
 * backend said before confirming, and nothing when the student does not leave a semester.
 */
export function membershipBlockers(
  action: MembershipAction,
  membership: ProgramMembership | null,
  refused: readonly ProgramBlocker[],
): readonly ProgramBlocker[] {
  if (refused.length > 0) return refused;
  if (!membership || !leavesCurrent(action, membership)) return [];
  return membership.blockers;
}
