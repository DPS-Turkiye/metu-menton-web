import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  PRISM_DECISION_MAX_ENTRIES,
  PRISM_SCORE_MAX,
  PrismDecision,
} from "@/interfaces/badges";
import { decidePrismResults } from "@/lib/api/badges";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

const prismDecisionSchema = z.object({
  decision: z.enum(PrismDecision),
  entries: z
    .array(
      z.object({
        email: z.string().trim().min(1).max(320),
        score: z.string().trim().max(PRISM_SCORE_MAX).nullable().default(null),
      }),
    )
    .min(1)
    .max(PRISM_DECISION_MAX_ENTRIES),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await readJsonBody(request, prismDecisionSchema, {
      invalidMessage: "prismDecisionInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await decidePrismResults(auth.session.userId, id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("prismDecisionFailed"),
    });
  }
}
