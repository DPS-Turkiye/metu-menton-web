import type { NextRequest } from "next/server";

import {
  fetchIskurChannelPreferences,
  updateIskurChannelPreferences,
} from "@/lib/api/iskur-channels";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import {
  iskurChannelPreferencesSchema,
  iskurProgramQuerySchema,
} from "@/lib/server/iskur-channel-schemas";
import { readJsonBody, readSearchParams } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      iskurProgramQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchIskurChannelPreferences(user.userId, query.data.programId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurChannelsLoadFailed"),
    });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const body = await readJsonBody(request, iskurChannelPreferencesSchema, {
      invalidMessage: "iskurChannelsInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await updateIskurChannelPreferences(
        user.userId,
        body.data.programId,
        body.data.mutedKinds,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurPreferencesSaveFailed"),
    });
  }
}
