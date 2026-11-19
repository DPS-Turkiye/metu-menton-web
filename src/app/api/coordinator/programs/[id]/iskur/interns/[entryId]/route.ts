import { removeIskurIntern } from "@/lib/api/iskur-interns";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

// entryId names a list entry, so no e-mail address travels in a URL; the actor is always the session.
type Context = { params: Promise<{ id: string; entryId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const entry = await readUuidParam(path.entryId, "invalidRequestFields");
    if (!entry.ok) return entry.response;
    return backendResponse(
      await removeIskurIntern(auth.session.userId, program.id, entry.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurInternsSaveFailed"),
    });
  }
}
