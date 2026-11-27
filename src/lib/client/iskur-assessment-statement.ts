import type {
  IskurAssessmentMine,
  IskurAssessmentReason,
} from "@/interfaces/iskur-assessment-statement";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const MINE = "/api/iskur/assessment-statement";

export async function getMyIskurAssessmentStatement() {
  return requireSuccess(await httpClient.get<IskurAssessmentMine>(MINE));
}

export async function sendIskurAssessmentStatement(
  reason: IskurAssessmentReason,
  text: string,
) {
  return requireSuccess(
    await httpClient.post<IskurAssessmentMine>(MINE, { reason, text }),
  );
}
