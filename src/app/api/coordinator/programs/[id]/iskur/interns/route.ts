import { addIskurInterns, fetchIskurInterns } from "@/lib/api/iskur-interns";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurInternEmailsSchema } from "@/lib/server/iskur-interns-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    return backendResponse(
      await fetchIskurInterns(auth.session.userId, program.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurInternsLoadFailed"),
    });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const path = await params;
    const program = await readUuidParam(path.id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const body = await readJsonBody(request, iskurInternEmailsSchema, {
      invalidMessage: "iskurInternsInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await addIskurInterns(auth.session.userId, program.id, body.data.emails),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurInternsSaveFailed"),
    });
  }
}
