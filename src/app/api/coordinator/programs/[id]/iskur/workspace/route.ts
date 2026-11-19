import { fetchIskurWorkspace } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    return backendResponse(await fetchIskurWorkspace(auth.session.userId, id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceLoadFailed"),
    });
  }
}
