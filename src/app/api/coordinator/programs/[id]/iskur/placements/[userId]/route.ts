import {
  placeIskurIntern,
  unplaceIskurIntern,
} from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurPlacementSchema } from "@/lib/server/iskur-workspace-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

// userId names the intern being placed (the target); the actor is always the session.
type Context = { params: Promise<{ id: string; userId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const intern = await readUuidParam(path.userId, "invalidRequestFields");
    if (!intern.ok) return intern.response;
    const body = await readJsonBody(request, iskurPlacementSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await placeIskurIntern(
        auth.session.userId,
        program.id,
        intern.id,
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
    const intern = await readUuidParam(path.userId, "invalidRequestFields");
    if (!intern.ok) return intern.response;
    return backendResponse(
      await unplaceIskurIntern(auth.session.userId, program.id, intern.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
