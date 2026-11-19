import { replaceIskurUnitSkills } from "@/lib/api/iskur-onboarding";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurUnitSkillsSchema } from "@/lib/server/iskur-onboarding-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, unitId } = await params;
    const program = await readUuidParam(id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const unit = await readUuidParam(unitId, "invalidRequestFields");
    if (!unit.ok) return unit.response;
    const body = await readJsonBody(request, iskurUnitSkillsSchema, {
      invalidMessage: "iskurWorkspaceInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await replaceIskurUnitSkills(
        auth.session.userId,
        program.id,
        unit.id,
        body.data.names,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWorkspaceSaveFailed"),
    });
  }
}
