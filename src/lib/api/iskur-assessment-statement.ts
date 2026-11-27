import "server-only";

import type {
  IskurAssessmentMine,
  IskurAssessmentReason,
} from "@/interfaces/iskur-assessment-statement";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const MINE = "/api/iskur/assessment-statement";

export function fetchMyIskurAssessmentStatement(actorId: string) {
  return backendRequest<IskurAssessmentMine>({
    method: HttpMethod.Get,
    url: MINE,
    params: { actorId },
  });
}

export function sendIskurAssessmentStatement(
  actorId: string,
  reason: IskurAssessmentReason,
  text: string,
) {
  return backendRequest<IskurAssessmentMine>({
    method: HttpMethod.Post,
    url: MINE,
    data: { actorId, reason, text },
  });
}
