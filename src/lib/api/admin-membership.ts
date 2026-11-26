import "server-only";

import type {
  ProgramMembership,
  ProgramMembershipChange,
} from "@/interfaces/admin-membership";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const membershipUrl = (userId: string) =>
  `/api/admin/users/${encodeURIComponent(userId)}/program`;

export function fetchProgramMembership(actorId: string, userId: string) {
  return backendRequest<ProgramMembership>({
    method: HttpMethod.Get,
    url: membershipUrl(userId),
    params: { actorId },
  });
}

/** "Programa ekle": the backend takes the acting admin from the token alone; the service credentials cannot. */
export function putProgramMembership(
  userId: string,
  programId: string,
  idToken: string,
) {
  return backendRequest<ProgramMembershipChange>(
    { method: HttpMethod.Put, url: membershipUrl(userId), data: { programId } },
    { idToken },
  );
}

/** "Programdan çıkar", with the acting admin's own token, as for the move. */
export function deleteProgramMembership(userId: string, idToken: string) {
  return backendRequest<ProgramMembershipChange>(
    { method: HttpMethod.Delete, url: membershipUrl(userId) },
    { idToken },
  );
}
