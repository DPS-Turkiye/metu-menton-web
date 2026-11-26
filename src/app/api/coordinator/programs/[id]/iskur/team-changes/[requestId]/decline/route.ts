import { declineIskurTeamChange } from "@/lib/api/iskur-team-change";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamChangeDeclineSchema } from "@/lib/server/iskur-team-change-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; requestId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurTeamChangeInvalid");
    if (!program.ok) return program.response;
    const requestId = await readUuidParam(
      path.requestId,
      "iskurTeamChangeInvalid",
    );
    if (!requestId.ok) return requestId.response;
    const body = await readJsonBody(request, iskurTeamChangeDeclineSchema, {
      invalidMessage: "iskurTeamChangeInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await declineIskurTeamChange(
        auth.session.userId,
        program.id,
        requestId.id,
        body.data.note,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTeamChangeSaveFailed"),
    });
  }
}
