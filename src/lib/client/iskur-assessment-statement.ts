import type {
  IskurAssessmentDecisionInput,
  IskurAssessmentMine,
  IskurAssessmentReason,
  IskurAssessmentStatements,
} from "@/interfaces/iskur-assessment-statement";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const MINE = "/api/iskur/assessment-statement";
const coordinatorBase = (programId: string) =>
  `/api/coordinator/programs/${encodeURIComponent(programId)}/iskur/assessment-statements`;

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

export async function getIskurAssessmentStatements(programId: string) {
  return requireSuccess(
    await httpClient.get<IskurAssessmentStatements>(coordinatorBase(programId)),
  );
}

export async function decideIskurAssessmentStatement(
  programId: string,
  statementId: string,
  input: IskurAssessmentDecisionInput,
) {
  return requireSuccess(
    await httpClient.post<IskurAssessmentStatements>(
      `${coordinatorBase(programId)}/${encodeURIComponent(statementId)}/decide`,
      input,
    ),
  );
}
