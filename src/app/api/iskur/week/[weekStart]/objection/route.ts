import { objectToIskurWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurObjectionSchema } from "@/lib/server/iskur-week-schemas";
import { readIsoDayParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ weekStart: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const week = await readIsoDayParam((await params).weekStart);
    if (!week.ok) return week.response;
    const body = await readJsonBody(request, iskurObjectionSchema, {
      invalidMessage: "iskurWeekInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await objectToIskurWeek(session.userId, week.day, body.data.objection),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekSaveFailed"),
    });
  }
}
