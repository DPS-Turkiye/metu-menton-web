import { fetchIskurTaskSupports } from "@/lib/api/iskur-team-support";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const taskId = await readUuidParam(
      (await params).taskId,
      "iskurTeamSupportInvalid",
    );
    if (!taskId.ok) return taskId.response;
    return backendResponse(
      await fetchIskurTaskSupports(session.userId, taskId.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamSupportLoadFailed"),
    });
  }
}
