import "server-only";

import type {
  IskurAssessmentDecisionInput,
  IskurAssessmentMine,
  IskurAssessmentReason,
  IskurAssessmentStatements,
} from "@/interfaces/iskur-assessment-statement";
import { HttpMethod } from "@/lib/http-method";
import { backendRequest } from "@/lib/server/backend-client";

const MINE = "/api/iskur/assessment-statement";
const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/assessment-statements`;

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

export function fetchIskurAssessmentStatements(
  actorId: string,
  programId: string,
) {
  return backendRequest<IskurAssessmentStatements>({
    method: HttpMethod.Get,
    url: coordinatorBase(programId),
    params: { actorId },
  });
}

export function decideIskurAssessmentStatement(
  actorId: string,
  programId: string,
  statementId: string,
  input: IskurAssessmentDecisionInput,
) {
  return backendRequest<IskurAssessmentStatements>({
    method: HttpMethod.Post,
    url: `${coordinatorBase(programId)}/${encodeURIComponent(statementId)}/decide`,
    data: { actorId, ...input },
  });
}
