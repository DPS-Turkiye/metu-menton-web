import { fetchIskurAssessmentStatements } from "@/lib/api/iskur-assessment-statement";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const program = await readUuidParam(
      (await params).id,
      "iskurAssessmentInvalid",
    );
    if (!program.ok) return program.response;
    return backendResponse(
      await fetchIskurAssessmentStatements(auth.session.userId, program.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurAssessmentLoadFailed"),
    });
  }
}
