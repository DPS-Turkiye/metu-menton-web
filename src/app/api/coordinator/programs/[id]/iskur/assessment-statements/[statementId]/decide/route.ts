import { decideIskurAssessmentStatement } from "@/lib/api/iskur-assessment-statement";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurAssessmentDecisionSchema } from "@/lib/server/iskur-assessment-statement-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; statementId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurAssessmentInvalid");
    if (!program.ok) return program.response;
    const statement = await readUuidParam(
      path.statementId,
      "iskurAssessmentInvalid",
    );
    if (!statement.ok) return statement.response;
    const body = await readJsonBody(request, iskurAssessmentDecisionSchema, {
      invalidMessage: "iskurAssessmentInvalid",
    });
    if (!body.ok) return body.response;
    const { note, ...rest } = body.data;
    return backendResponse(
      await decideIskurAssessmentStatement(
        auth.session.userId,
        program.id,
        statement.id,
        { ...rest, note: note || null },
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurAssessmentSaveFailed"),
    });
  }
}
