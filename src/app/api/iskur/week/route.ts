import type { NextRequest } from "next/server";

import { fetchIskurWeek } from "@/lib/api/iskur-weeks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurWeekQuerySchema } from "@/lib/server/iskur-task-schemas";
import { readSearchParams } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      iskurWeekQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchIskurWeek(session.userId, query.data.weekStart ?? null),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurWeekLoadFailed"),
    });
  }
}
