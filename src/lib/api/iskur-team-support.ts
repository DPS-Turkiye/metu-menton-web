import "server-only";

import type {
  IskurTeamSupport,
  IskurTeamSupportInput,
  IskurTeamSupports,
} from "@/interfaces/iskur-team-support";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const BASE = "/api/iskur/team-support";

export function fetchIskurTeamSupports(actorId: string) {
  return backendRequest<IskurTeamSupports>({
    method: HttpMethod.Get,
    url: BASE,
    params: { actorId },
  });
}

export function openIskurTeamSupport(
  actorId: string,
  input: IskurTeamSupportInput,
) {
  return backendRequest<IskurTeamSupports>({
    method: HttpMethod.Post,
    url: BASE,
    data: { ...input, actorId },
  });
}

export function answerIskurTeamSupport(
  actorId: string,
  requestId: string,
  accept: boolean,
  note: string | null,
) {
  return backendRequest<IskurTeamSupports>({
    method: HttpMethod.Post,
    url: `${BASE}/${encodeURIComponent(requestId)}/${accept ? "accept" : "decline"}`,
    data: { actorId, note },
  });
}

export function fetchIskurTaskSupports(actorId: string, taskId: string) {
  return backendRequest<IskurTeamSupport[]>({
    method: HttpMethod.Get,
    url: `/api/iskur/tasks/${encodeURIComponent(taskId)}/team-support`,
    params: { actorId },
  });
}
