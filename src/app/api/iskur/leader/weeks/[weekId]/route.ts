import { fetchIskurLeaderWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ weekId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const week = await readUuidParam((await params).weekId, "iskurWeekInvalid");
    if (!week.ok) return week.response;
    return backendResponse(await fetchIskurLeaderWeek(session.userId, week.id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekLoadFailed"),
    });
  }
}
