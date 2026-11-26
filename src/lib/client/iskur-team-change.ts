import type {
  IskurTeamChangeMine,
  IskurTeamChanges,
} from "@/interfaces/iskur-team-change";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/team-changes`;

export async function getMyIskurTeamChange() {
  return requireSuccess(
    await httpClient.get<IskurTeamChangeMine>("/api/iskur/team-change"),
  );
}

export async function askIskurTeamChange(reason: string) {
  return requireSuccess(
    await httpClient.post<IskurTeamChangeMine>("/api/iskur/team-change", {
      reason,
    }),
  );
}

export async function getIskurTeamChanges(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurTeamChanges>(coordinatorBase(programId)),
  );
}

export async function declineIskurTeamChange(
  programId: string,
  requestId: string,
  note: string,
) {
  return requireSuccess(
    await httpClient.post<IskurTeamChanges>(
      `${coordinatorBase(programId)}/${encodeURIComponent(requestId)}/decline`,
      { note },
    ),
  );
}
