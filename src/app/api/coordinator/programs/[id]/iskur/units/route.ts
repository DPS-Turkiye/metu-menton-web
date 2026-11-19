import { createIskurUnit } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurUnitSchema } from "@/lib/server/iskur-workspace-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await readJsonBody(request, iskurUnitSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await createIskurUnit(auth.session.userId, id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
