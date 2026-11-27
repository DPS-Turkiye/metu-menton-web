import "server-only";

import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

/** The backend decides whose photo the signed-in person may see; "no" and "no photo" are both 404. */
export function fetchPersonPhoto(personId: string, actorId: string) {
  return backendRequest<ArrayBuffer>({
    method: HttpMethod.Get,
    url: `/api/users/${encodeURIComponent(personId)}/photo`,
    params: { actorId },
    responseType: "arraybuffer",
    // Its errors are JSON, so asking for images only would turn a 404 into a 406.
    headers: { Accept: "*/*" },
  });
}
