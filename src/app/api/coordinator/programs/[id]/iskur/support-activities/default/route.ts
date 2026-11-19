import { createDefaultIskurSupportActivities } from "@/lib/api/iskur-support-activities";
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
    const program = await readUuidParam(
      (await params).id,
      "iskurSupportInvalid",
    );
    if (!program.ok) return program.response;
    const id = program.id;
    return backendResponse(
      await createDefaultIskurSupportActivities(auth.session.userId, id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurSupportSaveFailed"),
    });
  }
}
