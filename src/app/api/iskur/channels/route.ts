import type { NextRequest } from "next/server";

import { fetchIskurChannels } from "@/lib/api/iskur-channels";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { iskurChannelsQuerySchema } from "@/lib/server/iskur-channel-schemas";
import { readSearchParams } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      iskurChannelsQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchIskurChannels(user.userId, query.data.programId ?? null),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurChannelsLoadFailed"),
    });
  }
}
