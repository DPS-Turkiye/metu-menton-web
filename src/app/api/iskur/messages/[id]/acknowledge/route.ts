import { acknowledgeIskurMessage } from "@/lib/api/iskur-channels";
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
    const message = await readUuidParam(
      (await params).id,
      "iskurChannelsInvalid",
    );
    if (!message.ok) return message.response;
    return backendResponse(
      await acknowledgeIskurMessage(user.userId, message.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurAcknowledgeFailed"),
    });
  }
}
