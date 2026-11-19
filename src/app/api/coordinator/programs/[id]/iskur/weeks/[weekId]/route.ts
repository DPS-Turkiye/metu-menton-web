import { fetchIskurFallbackWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; weekId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurWeekInvalid");
    if (!program.ok) return program.response;
    const week = await readUuidParam(path.weekId, "iskurWeekInvalid");
    if (!week.ok) return week.response;
    return backendResponse(
      await fetchIskurFallbackWeek(auth.session.userId, program.id, week.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekLoadFailed"),
    });
  }
}
