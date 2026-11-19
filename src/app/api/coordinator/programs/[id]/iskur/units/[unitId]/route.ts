import { deleteIskurUnit, updateIskurUnit } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurUnitSchema } from "@/lib/server/iskur-workspace-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; unitId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const unit = await readUuidParam(path.unitId, "invalidRequestFields");
    if (!unit.ok) return unit.response;
    const body = await readJsonBody(request, iskurUnitSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurUnit(
        auth.session.userId,
        program.id,
        unit.id,
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
    const unit = await readUuidParam(path.unitId, "invalidRequestFields");
    if (!unit.ok) return unit.response;
    return backendResponse(
      await deleteIskurUnit(auth.session.userId, program.id, unit.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
