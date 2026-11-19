import { deleteIskurUnit, updateIskurUnit } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurUnitSchema } from "@/lib/server/iskur-workspace-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; unitId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, unitId } = await params;
    const body = await readJsonBody(request, iskurUnitSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurUnit(auth.session.userId, id, unitId, body.data),
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
    const { id, unitId } = await params;
    return backendResponse(
      await deleteIskurUnit(auth.session.userId, id, unitId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
