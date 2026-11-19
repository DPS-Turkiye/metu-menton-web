import { fetchIskurApplications } from "@/lib/api/iskur-onboarding";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const program = await readUuidParam(
      (await params).id,
      "invalidRequestFields",
    );
    if (!program.ok) return program.response;
    return backendResponse(
      await fetchIskurApplications(auth.session.userId, program.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurApplicationsLoadFailed"),
    });
  }
}
