import { decideIskurFallbackWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurWeekDecisionSchema } from "@/lib/server/iskur-week-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; weekId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurWeekInvalid");
    if (!program.ok) return program.response;
    const week = await readUuidParam(path.weekId, "iskurWeekInvalid");
    if (!week.ok) return week.response;
    const body = await readJsonBody(request, iskurWeekDecisionSchema, {
      invalidMessage: "iskurWeekInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await decideIskurFallbackWeek(
        auth.session.userId,
        program.id,
        week.id,
        body.data,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekSaveFailed"),
    });
  }
}
