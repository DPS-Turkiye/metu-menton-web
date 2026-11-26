import { z } from "zod";

import { ProgramFeature } from "@/interfaces/program";
import { setProgramCoordinatorFeatures } from "@/lib/api/coordinator-programs";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { requireAdminSession } from "@/lib/server/require-admin";

// The backend checks the list is a subset of the program's features.
const featuresSchema = z.object({
  features: z.array(z.enum(ProgramFeature)).min(1).max(3),
});

/** Which of a semester's features one coordinator runs; only admins change it, as they choose who coordinates. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    const { id, userId } = await params;
    const body = await readJsonBody(request, featuresSchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await setProgramCoordinatorFeatures(
        auth.session.userId,
        id,
        userId,
        body.data.features,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("coordinatorFeaturesSaveFailed"),
    });
  }
}
