import { z } from "zod";

import { ProgramFeature } from "@/interfaces/program";
import { updateCoordinatorProgramFeatures } from "@/lib/api/coordinator-programs";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

// Which set is allowed (at least one, İŞKUR with Akran Mentörlüğü, who may change it when) is the backend's rule.
const featuresSchema = z.object({
  features: z.array(z.enum(ProgramFeature)).max(3),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await readJsonBody(request, featuresSchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await updateCoordinatorProgramFeatures(
        auth.session.userId,
        id,
        body.data.features,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("programFeaturesSaveFailed"),
    });
  }
}
