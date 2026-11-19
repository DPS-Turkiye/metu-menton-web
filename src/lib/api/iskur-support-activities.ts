import "server-only";

import type {
  IskurSupportActivities,
  IskurSupportActivityInput,
} from "@/interfaces/iskur-support-activities";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/support-activities`;

export function fetchIskurSupportActivities(
  actorId: string,
  programId: string,
) {
  return backendRequest<IskurSupportActivities>({
    method: HttpMethod.Get,
    url: base(programId),
    params: { actorId },
  });
}

export function createDefaultIskurSupportActivities(
  actorId: string,
  programId: string,
) {
  return backendRequest<IskurSupportActivities>({
    method: HttpMethod.Post,
    url: `${base(programId)}/default`,
    data: { actorId },
  });
}

export function createIskurSupportActivity(
  actorId: string,
  programId: string,
  input: IskurSupportActivityInput,
) {
  return backendRequest<IskurSupportActivities>({
    method: HttpMethod.Post,
    url: base(programId),
    data: { ...input, actorId },
  });
}

export function updateIskurSupportActivity(
  actorId: string,
  programId: string,
  activityId: string,
  input: IskurSupportActivityInput,
) {
  return backendRequest<IskurSupportActivities>({
    method: HttpMethod.Put,
    url: `${base(programId)}/${encodeURIComponent(activityId)}`,
    data: { ...input, actorId },
  });
}

export function deleteIskurSupportActivity(
  actorId: string,
  programId: string,
  activityId: string,
) {
  return backendRequest<IskurSupportActivities>({
    method: HttpMethod.Delete,
    url: `${base(programId)}/${encodeURIComponent(activityId)}`,
    params: { actorId },
  });
}
