import {
  askIskurTeamChange,
  fetchMyIskurTeamChange,
} from "@/lib/api/iskur-team-change";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamChangeAskSchema } from "@/lib/server/iskur-team-change-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(await fetchMyIskurTeamChange(session.userId));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamChangeLoadFailed"),
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurTeamChangeAskSchema, {
      invalidMessage: "iskurTeamChangeInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await askIskurTeamChange(session.userId, body.data.reason),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamChangeSaveFailed"),
    });
  }
}
