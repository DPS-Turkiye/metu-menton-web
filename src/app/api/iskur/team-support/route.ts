import {
  fetchIskurTeamSupports,
  openIskurTeamSupport,
} from "@/lib/api/iskur-team-support";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamSupportOpenSchema } from "@/lib/server/iskur-team-support-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(await fetchIskurTeamSupports(session.userId));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamSupportLoadFailed"),
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurTeamSupportOpenSchema, {
      invalidMessage: "iskurTeamSupportInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await openIskurTeamSupport(session.userId, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamSupportSaveFailed"),
    });
  }
}
