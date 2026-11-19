import { createDefaultIskurStructure } from "@/lib/api/iskur-workspace";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    return backendResponse(
      await createDefaultIskurStructure(auth.session.userId, program.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
