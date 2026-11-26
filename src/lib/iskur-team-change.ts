import {
  IskurTeamChangeStatus,
  type IskurTeamChange,
} from "@/interfaces/iskur-team-change";

/** The backend's limit for the intern's reason and the coordinator's note. */
export const ISKUR_TEAM_CHANGE_TEXT_MAX = 500;

/** A reason or note worth sending: something besides spaces, within the limit. */
export function isSendableText(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= ISKUR_TEAM_CHANGE_TEXT_MAX;
}

export function isPending(request: IskurTeamChange) {
  return request.status === IskurTeamChangeStatus.Pending;
}

/** The coordinator's list in two parts: what waits for an answer, and what was answered. */
export function splitTeamChanges(requests: readonly IskurTeamChange[]) {
  return {
    waiting: requests.filter(isPending),
    answered: requests.filter((request) => !isPending(request)),
  };
}
