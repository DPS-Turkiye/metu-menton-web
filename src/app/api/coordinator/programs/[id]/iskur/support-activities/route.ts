import {
  createIskurSupportActivity,
  fetchIskurSupportActivities,
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

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
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
      await fetchIskurSupportActivities(auth.session.userId, id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurSupportLoadFailed"),
    });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const program = await readUuidParam(
      (await params).id,
      "iskurSupportInvalid",
    );
    if (!program.ok) return program.response;
    const id = program.id;
    const body = await readJsonBody(request, iskurSupportActivitySchema, {
      invalidMessage: "iskurSupportInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await createIskurSupportActivity(auth.session.userId, id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurSupportSaveFailed"),
    });
  }
}
