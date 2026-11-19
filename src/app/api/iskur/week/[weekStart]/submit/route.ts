import { submitIskurWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readIsoDayParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ weekStart: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const week = await readIsoDayParam((await params).weekStart);
    if (!week.ok) return week.response;
    return backendResponse(await submitIskurWeek(session.userId, week.day));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekSaveFailed"),
    });
  }
}
