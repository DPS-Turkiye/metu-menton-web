import type {
  ProgramMembership,
  ProgramMembershipChange,
} from "@/interfaces/admin-membership";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const membershipUrl = (userId: string) =>
  `/api/admin/users/${encodeURIComponent(userId)}/program`;

const bearer = (idToken: string) => ({
  headers: { Authorization: `Bearer ${idToken}` },
});

export async function getProgramMembership(userId: string) {
  return requireSuccess(
    await httpClient.get<ProgramMembership>(membershipUrl(userId)),
  );
}

/** A refusal for open work carries it as `ClientApiError.blockers`. */
export async function addStudentToProgram(
  userId: string,
  programId: string,
  idToken: string,
) {
  return requireSuccess(
    await httpClient.put<ProgramMembershipChange>(
      membershipUrl(userId),
      { programId },
      bearer(idToken),
    ),
  );
}

export async function removeStudentFromProgram(
  userId: string,
  idToken: string,
) {
  return requireSuccess(
    await httpClient.delete<ProgramMembershipChange>(
      membershipUrl(userId),
      bearer(idToken),
    ),
  );
}
