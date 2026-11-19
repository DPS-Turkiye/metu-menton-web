import { decideIskurLeaderWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurWeekDecisionSchema } from "@/lib/server/iskur-week-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ weekId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const week = await readUuidParam((await params).weekId, "iskurWeekInvalid");
    if (!week.ok) return week.response;
    const body = await readJsonBody(request, iskurWeekDecisionSchema, {
      invalidMessage: "iskurWeekInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await decideIskurLeaderWeek(session.userId, week.id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekSaveFailed"),
    });
  }
}
