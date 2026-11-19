import type { NextRequest } from "next/server";

import { fetchIskurMessages, postIskurMessage } from "@/lib/api/iskur-channels";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import {
  iskurMessageSchema,
  iskurMessagesQuerySchema,
} from "@/lib/server/iskur-channel-schemas";
import { readUuidParam } from "@/lib/server/path-params";
import { readJsonBody, readSearchParams } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const channel = await readUuidParam(
      (await params).id,
      "iskurChannelsInvalid",
    );
    if (!channel.ok) return channel.response;
    const query = await readSearchParams(
      request.nextUrl.searchParams,
      iskurMessagesQuerySchema,
    );
    if (!query.ok) return query.response;
    return backendResponse(
      await fetchIskurMessages(
        user.userId,
        channel.id,
        query.data.before ?? null,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurChannelsLoadFailed"),
    });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const channel = await readUuidParam(
      (await params).id,
      "iskurChannelsInvalid",
    );
    if (!channel.ok) return channel.response;
    const body = await readJsonBody(request, iskurMessageSchema, {
      invalidMessage: "iskurChannelsInvalid",
    });
    if (!body.ok) return body.response;
    return backendResponse(
      await postIskurMessage(user.userId, channel.id, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurMessageSendFailed"),
    });
  }
}
