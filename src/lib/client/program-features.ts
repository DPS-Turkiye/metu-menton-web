import type { MyProgramFeatures } from "@/interfaces/program";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

/** The signed-in person's semester features; [] when they are in no semester, null when the backend does not say. */
export async function getMyProgramFeatures() {
  const body = requireSuccess(
    await httpClient.get<MyProgramFeatures>("/api/me/program-features"),
  );
  return body.programFeatures;
}
