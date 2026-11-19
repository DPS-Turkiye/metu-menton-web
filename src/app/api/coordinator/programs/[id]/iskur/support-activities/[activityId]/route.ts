import {
  deleteIskurSupportActivity,
  updateIskurSupportActivity,
} from "@/lib/api/iskur-support-activities";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurSupportActivitySchema } from "@/lib/server/iskur-task-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string; activityId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurSupportInvalid");
    if (!program.ok) return program.response;
    const activity = await readUuidParam(
      path.activityId,
      "iskurSupportInvalid",
    );
    if (!activity.ok) return activity.response;
    const id = program.id;
    const activityId = activity.id;
    const body = await readJsonBody(request, iskurSupportActivitySchema, {
      invalidMessage: "iskurSupportInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurSupportActivity(
        auth.session.userId,
        id,
        activityId,
        body.data,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurSupportSaveFailed"),
    });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "iskurSupportInvalid");
    if (!program.ok) return program.response;
    const activity = await readUuidParam(
      path.activityId,
      "iskurSupportInvalid",
    );
    if (!activity.ok) return activity.response;
    const id = program.id;
    const activityId = activity.id;
    return backendResponse(
      await deleteIskurSupportActivity(auth.session.userId, id, activityId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurSupportSaveFailed"),
    });
  }
}
