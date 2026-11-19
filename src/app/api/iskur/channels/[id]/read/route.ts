import { markIskurChannelRead } from "@/lib/api/iskur-channels";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) throw new SessionRequiredError();
    const channel = await readUuidParam(
      (await params).id,
      "iskurChannelsInvalid",
    );
    if (!channel.ok) return channel.response;
    return backendResponse(await markIskurChannelRead(user.userId, channel.id));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurChannelsLoadFailed"),
    });
  }
}
