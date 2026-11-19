import "server-only";

import type { IskurInternList } from "@/interfaces/iskur-interns";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/interns`;

export function fetchIskurInterns(actorId: string, programId: string) {
  return backendRequest<IskurInternList>({
    method: HttpMethod.Get,
    url: base(programId),
    params: { actorId },
  });
}

export function addIskurInterns(
  actorId: string,
  programId: string,
  emails: string[],
) {
  return backendRequest<IskurInternList>({
    method: HttpMethod.Post,
    url: base(programId),
    data: { actorId, emails },
  });
}

export function removeIskurIntern(
  actorId: string,
  programId: string,
  entryId: string,
) {
  return backendRequest<IskurInternList>({
    method: HttpMethod.Delete,
    url: `${base(programId)}/${encodeURIComponent(entryId)}`,
    params: { actorId },
  });
}
