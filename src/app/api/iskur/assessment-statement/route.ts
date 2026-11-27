import {
  fetchMyIskurAssessmentStatement,
  sendIskurAssessmentStatement,
} from "@/lib/api/iskur-assessment-statement";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurAssessmentStatementSchema } from "@/lib/server/iskur-assessment-statement-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(
      await fetchMyIskurAssessmentStatement(session.userId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurAssessmentLoadFailed"),
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurAssessmentStatementSchema, {
      invalidMessage: "iskurAssessmentInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await sendIskurAssessmentStatement(
        session.userId,
        body.data.reason,
        body.data.text,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurAssessmentSaveFailed"),
    });
  }
}
