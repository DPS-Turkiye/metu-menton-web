import type {
  IskurSupportActivities,
  IskurSupportActivityInput,
} from "@/interfaces/iskur-support-activities";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/support-activities`;

export async function getIskurSupportActivities(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurSupportActivities>(base(programId)),
  );
}

export async function createDefaultIskurSupportActivities(programId: string) {
  return requireSuccess(
    await httpClient.post<IskurSupportActivities>(`${base(programId)}/default`),
  );
}

export async function createIskurSupportActivity(
  programId: string,
  input: IskurSupportActivityInput,
) {
  return requireSuccess(
    await httpClient.post<IskurSupportActivities>(base(programId), input),
  );
}

export async function updateIskurSupportActivity(
  programId: string,
  activityId: string,
  input: IskurSupportActivityInput,
) {
  return requireSuccess(
    await httpClient.put<IskurSupportActivities>(
      `${base(programId)}/${encodeURIComponent(activityId)}`,
      input,
    ),
  );
}

export async function deleteIskurSupportActivity(
  programId: string,
  activityId: string,
) {
  return requireSuccess(
    await httpClient.delete<IskurSupportActivities>(
      `${base(programId)}/${encodeURIComponent(activityId)}`,
    ),
  );
}
