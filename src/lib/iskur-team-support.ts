import type { IskurTeamSupportInput } from "@/interfaces/iskur-team-support";

/** The backend's limit for what the team needs and for the answer's note. */
export const ISKUR_TEAM_SUPPORT_TEXT_MAX = 500;

export interface IskurTeamSupportForm {
  toTeamId: string;
  need: string;
}

/** What to send for the open form, or null while a team or the need is missing or the need is too long. */
export function teamSupportInput(
  form: IskurTeamSupportForm,
  taskId: string | null,
): IskurTeamSupportInput | null {
  const need = form.need.trim();
  if (!form.toTeamId || !need || need.length > ISKUR_TEAM_SUPPORT_TEXT_MAX) {
    return null;
  }
  return { toTeamId: form.toTeamId, taskId, need };
}

/** An optional note: blank becomes null; too long is not sendable (undefined). */
export function answerNote(note: string): string | null | undefined {
  const trimmed = note.trim();
  if (trimmed.length > ISKUR_TEAM_SUPPORT_TEXT_MAX) return undefined;
  return trimmed === "" ? null : trimmed;
}
