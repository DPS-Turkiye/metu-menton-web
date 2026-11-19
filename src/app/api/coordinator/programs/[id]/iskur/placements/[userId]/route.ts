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
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

// userId names the intern being placed (the target); the actor is always the session.
type Context = { params: Promise<{ id: string; userId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, userId } = await params;
    const body = await readJsonBody(request, iskurPlacementSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await placeIskurIntern(auth.session.userId, id, userId, body.data),
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
    const { id, userId } = await params;
    return backendResponse(
      await unplaceIskurIntern(auth.session.userId, id, userId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
