import type {
  IskurTeamSupport,
  IskurTeamSupportInput,
  IskurTeamSupports,
} from "@/interfaces/iskur-team-support";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const BASE = "/api/iskur/team-support";

export async function getIskurTeamSupports() {
  return requireSuccess(await httpClient.get<IskurTeamSupports>(BASE));
}

export async function openIskurTeamSupport(input: IskurTeamSupportInput) {
  return requireSuccess(await httpClient.post<IskurTeamSupports>(BASE, input));
}

export async function answerIskurTeamSupport(
  requestId: string,
  accept: boolean,
  note: string | null,
) {
  return requireSuccess(
    await httpClient.post<IskurTeamSupports>(
      `${BASE}/${encodeURIComponent(requestId)}/${accept ? "accept" : "decline"}`,
      { note },
    ),
  );
}

export async function getIskurTaskSupports(taskId: string) {
  return requireSuccess(
    await httpClient.get<IskurTeamSupport[]>(
      `/api/iskur/tasks/${encodeURIComponent(taskId)}/team-support`,
    ),
  );
}
