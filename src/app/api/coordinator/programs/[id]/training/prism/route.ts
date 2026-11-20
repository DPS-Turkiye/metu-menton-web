import type { NextRequest } from "next/server";
import { z } from "zod";

import { fetchPrismLink, savePrismLink } from "@/lib/api/training";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

// The backend accepts https links only; here just a non-empty string of a sane length.
const prismLinkSchema = z.object({ url: z.string().trim().min(1).max(500) });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    return backendResponse(await fetchPrismLink(auth.session.userId, id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("trainingLoadFailed"),
    });
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await readJsonBody(request, prismLinkSchema, {
      invalidMessage: "prismLinkInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await savePrismLink(auth.session.userId, id, body.data.url),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("trainingSaveFailed"),
    });
  }
}
