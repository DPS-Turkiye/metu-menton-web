import type { NextRequest } from "next/server";

import { fetchIskurFallbackQueue } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurWeekQuerySchema } from "@/lib/server/iskur-task-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readSearchParams } from "@/lib/server/request-body";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const program = await readUuidParam((await params).id, "iskurWeekInvalid");
    if (!program.ok) return program.response;
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      iskurWeekQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchIskurFallbackQueue(
        auth.session.userId,
        program.id,
        query.data.weekStart ?? null,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekLoadFailed"),
    });
  }
}
