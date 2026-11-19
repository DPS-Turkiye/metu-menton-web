import "server-only";

import type {
  IskurFinalizeInput,
  IskurPlacementInput,
  IskurTeamInput,
  IskurUnitInput,
  IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur`;

export function fetchIskurWorkspace(actorId: string, programId: string) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Get,
    url: `${base(programId)}/workspace`,
    params: { actorId },
  });
}

export function createDefaultIskurStructure(
  actorId: string,
  programId: string,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Post,
    url: `${base(programId)}/structure/default`,
    data: { actorId },
  });
}

export function createIskurUnit(
  actorId: string,
  programId: string,
  input: IskurUnitInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Post,
    url: `${base(programId)}/units`,
    data: { ...input, actorId },
  });
}

export function updateIskurUnit(
  actorId: string,
  programId: string,
  unitId: string,
  input: IskurUnitInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Put,
    url: `${base(programId)}/units/${encodeURIComponent(unitId)}`,
    data: { ...input, actorId },
  });
}

export function deleteIskurUnit(
  actorId: string,
  programId: string,
  unitId: string,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Delete,
    url: `${base(programId)}/units/${encodeURIComponent(unitId)}`,
    params: { actorId },
  });
}

export function createIskurTeam(
  actorId: string,
  programId: string,
  unitId: string,
  input: IskurTeamInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Post,
    url: `${base(programId)}/units/${encodeURIComponent(unitId)}/teams`,
    data: { ...input, actorId },
  });
}

export function updateIskurTeam(
  actorId: string,
  programId: string,
  teamId: string,
  input: IskurTeamInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Put,
    url: `${base(programId)}/teams/${encodeURIComponent(teamId)}`,
    data: { ...input, actorId },
  });
}

export function deleteIskurTeam(
  actorId: string,
  programId: string,
  teamId: string,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Delete,
    url: `${base(programId)}/teams/${encodeURIComponent(teamId)}`,
    params: { actorId },
  });
}

export function placeIskurIntern(
  actorId: string,
  programId: string,
  userId: string,
  input: IskurPlacementInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Put,
    url: `${base(programId)}/placements/${encodeURIComponent(userId)}`,
    data: { ...input, actorId },
  });
}

export function unplaceIskurIntern(
  actorId: string,
  programId: string,
  userId: string,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Delete,
    url: `${base(programId)}/placements/${encodeURIComponent(userId)}`,
    params: { actorId },
  });
}

export function finalizeIskurPlacements(
  actorId: string,
  programId: string,
  input: IskurFinalizeInput,
) {
  return backendRequest<IskurWorkspace>({
    method: HttpMethod.Post,
    url: `${base(programId)}/placements/finalize`,
    data: { ...input, actorId },
  });
}
