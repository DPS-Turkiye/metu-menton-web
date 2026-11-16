import { fetchProgramOfficeHoursAppointment } from "@/lib/api/program-office-hours";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, requestId } = await params;
    const program = await readUuidParam(id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const request = await readUuidParam(requestId, "invalidRequestFields");
    if (!request.ok) return request.response;
    return backendResponse(
      await fetchProgramOfficeHoursAppointment(
        auth.session.userId,
        program.id,
        request.id,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursAppointmentLoadFailed"),
    });
  }
}
