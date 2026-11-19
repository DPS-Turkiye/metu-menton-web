import type { NextRequest } from "next/server";

import { createIskurTask, fetchIskurTeamTasks } from "@/lib/api/iskur-tasks";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import {
  iskurTaskSchema,
  iskurWeekQuerySchema,
} from "@/lib/server/iskur-task-schemas";
import { readJsonBody, readSearchParams } from "@/lib/server/request-body";
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
      await fetchIskurTeamTasks(session.userId, query.data.weekStart ?? null),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTasksLoadFailed"),
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurTaskSchema, {
      invalidMessage: "iskurTaskInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(await createIskurTask(session.userId, body.data));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurTaskSaveFailed"),
    });
  }
}
