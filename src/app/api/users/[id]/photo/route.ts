import { fetchPersonPhoto } from "@/lib/api/person-photo";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import { avatarResponse } from "@/lib/server/avatar-response";
import { readUuidParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionIds } from "@/lib/session";

/** A person's avatar photo; the backend decides who sees whose. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await getSessionIds();
    if (!userId) throw new SessionRequiredError();
    const person = await readUuidParam((await params).id, "personIdInvalid");
    if (!person.ok) return person.response;
    return await avatarResponse(await fetchPersonPhoto(person.id, userId));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("photoLoadFailed"),
    });
  }
}
