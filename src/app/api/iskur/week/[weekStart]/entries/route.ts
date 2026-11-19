import { saveIskurWeekEntries } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurWeekEntriesSchema } from "@/lib/server/iskur-week-schemas";
import { readIsoDayParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ weekStart: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const week = await readIsoDayParam((await params).weekStart);
    if (!week.ok) return week.response;
    const body = await readJsonBody(request, iskurWeekEntriesSchema, {
      invalidMessage: "iskurWeekInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await saveIskurWeekEntries(session.userId, week.day, body.data.entries),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekSaveFailed"),
    });
  }
}
