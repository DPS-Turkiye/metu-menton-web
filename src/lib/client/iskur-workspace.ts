import type {
  IskurFinalizeInput,
  IskurPlacementInput,
  IskurTeamInput,
  IskurUnitInput,
  IskurWorkspace,
} from "@/interfaces/iskur-workspace";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur`;

export async function getIskurWorkspace(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurWorkspace>(`${base(programId)}/workspace`),
  );
}

export async function createDefaultIskurStructure(programId: string) {
  return requireSuccess(
    await httpClient.post<IskurWorkspace>(
      `${base(programId)}/structure/default`,
    ),
  );
}

export async function createIskurUnit(
  programId: string,
  input: IskurUnitInput,
) {
  return requireSuccess(
    await httpClient.post<IskurWorkspace>(`${base(programId)}/units`, input),
  );
}

export async function updateIskurUnit(
  programId: string,
  unitId: string,
  input: IskurUnitInput,
) {
  return requireSuccess(
    await httpClient.put<IskurWorkspace>(
      `${base(programId)}/units/${encodeURIComponent(unitId)}`,
      input,
    ),
  );
}

export async function deleteIskurUnit(programId: string, unitId: string) {
  return requireSuccess(
    await httpClient.delete<IskurWorkspace>(
      `${base(programId)}/units/${encodeURIComponent(unitId)}`,
    ),
  );
}

export async function createIskurTeam(
  programId: string,
  unitId: string,
  input: IskurTeamInput,
) {
  return requireSuccess(
    await httpClient.post<IskurWorkspace>(
      `${base(programId)}/units/${encodeURIComponent(unitId)}/teams`,
      input,
    ),
  );
}

export async function updateIskurTeam(
  programId: string,
  teamId: string,
  input: IskurTeamInput,
) {
  return requireSuccess(
    await httpClient.put<IskurWorkspace>(
      `${base(programId)}/teams/${encodeURIComponent(teamId)}`,
      input,
    ),
  );
}

export async function deleteIskurTeam(programId: string, teamId: string) {
  return requireSuccess(
    await httpClient.delete<IskurWorkspace>(
      `${base(programId)}/teams/${encodeURIComponent(teamId)}`,
    ),
  );
}

export async function placeIskurIntern(
  programId: string,
  userId: string,
  input: IskurPlacementInput,
) {
  return requireSuccess(
    await httpClient.put<IskurWorkspace>(
      `${base(programId)}/placements/${encodeURIComponent(userId)}`,
      input,
    ),
  );
}

export async function unplaceIskurIntern(programId: string, userId: string) {
  return requireSuccess(
    await httpClient.delete<IskurWorkspace>(
      `${base(programId)}/placements/${encodeURIComponent(userId)}`,
    ),
  );
}

export async function finalizeIskurPlacements(
  programId: string,
  input: IskurFinalizeInput,
) {
  return requireSuccess(
    await httpClient.post<IskurWorkspace>(
      `${base(programId)}/placements/finalize`,
      input,
    ),
  );
}
