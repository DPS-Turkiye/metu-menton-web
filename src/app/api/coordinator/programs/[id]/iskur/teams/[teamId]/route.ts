import { deleteIskurTeam, updateIskurTeam } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurTeamSchema } from "@/lib/server/iskur-workspace-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; teamId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const team = await readUuidParam(path.teamId, "invalidRequestFields");
    if (!team.ok) return team.response;
    const body = await readJsonBody(request, iskurTeamSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurTeam(
        auth.session.userId,
        program.id,
        team.id,
        body.data,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const team = await readUuidParam(path.teamId, "invalidRequestFields");
    if (!team.ok) return team.response;
    return backendResponse(
      await deleteIskurTeam(auth.session.userId, program.id, team.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
