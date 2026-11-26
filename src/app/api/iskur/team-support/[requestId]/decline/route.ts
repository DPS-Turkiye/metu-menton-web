import { answerIskurTeamSupport } from "@/lib/api/iskur-team-support";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamSupportAnswerSchema } from "@/lib/server/iskur-team-support-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const requestId = await readUuidParam(
      (await params).requestId,
      "iskurTeamSupportInvalid",
    );
    if (!requestId.ok) return requestId.response;
    const body = await readJsonBody(request, iskurTeamSupportAnswerSchema, {
      invalidMessage: "iskurTeamSupportInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await answerIskurTeamSupport(
        session.userId,
        requestId.id,
        false,
        body.data.note,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamSupportSaveFailed"),
    });
  }
}
