import "server-only";

import type {
  IskurTeamChangeMine,
  IskurTeamChanges,
} from "@/interfaces/iskur-team-change";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/team-changes`;

export function fetchMyIskurTeamChange(actorId: string) {
  return backendRequest<IskurTeamChangeMine>({
    method: HttpMethod.Get,
    url: "/api/iskur/team-change",
    params: { actorId },
  });
}

export function askIskurTeamChange(actorId: string, reason: string) {
  return backendRequest<IskurTeamChangeMine>({
    method: HttpMethod.Post,
    url: "/api/iskur/team-change",
    data: { actorId, reason },
  });
}

export function fetchIskurTeamChanges(actorId: string, programId: string) {
  return backendRequest<IskurTeamChanges>({
    method: HttpMethod.Get,
    url: coordinatorBase(programId),
    params: { actorId },
  });
}

export function declineIskurTeamChange(
  actorId: string,
  programId: string,
  requestId: string,
  note: string,
) {
  return backendRequest<IskurTeamChanges>({
    method: HttpMethod.Post,
    url: `${coordinatorBase(programId)}/${encodeURIComponent(requestId)}/decline`,
    data: { actorId, note },
  });
}
