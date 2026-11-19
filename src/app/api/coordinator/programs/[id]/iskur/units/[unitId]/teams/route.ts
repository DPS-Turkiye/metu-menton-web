import { createIskurTeam } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamSchema } from "@/lib/server/iskur-workspace-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; unitId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, unitId } = await params;
    const body = await readJsonBody(request, iskurTeamSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await createIskurTeam(auth.session.userId, id, unitId, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
