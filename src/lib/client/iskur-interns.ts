import type { IskurInternList } from "@/interfaces/iskur-interns";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const base = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/interns`;

export async function getIskurInterns(programId: string) {
  return requireSuccess(await httpClient.get<IskurInternList>(base(programId)));
}

export async function addIskurInterns(programId: string, emails: string[]) {
  return requireSuccess(
    await httpClient.post<IskurInternList>(base(programId), { emails }),
  );
}

export async function removeIskurIntern(programId: string, entryId: string) {
  return requireSuccess(
    await httpClient.delete<IskurInternList>(
      `${base(programId)}/${encodeURIComponent(entryId)}`,
    ),
  );
}
