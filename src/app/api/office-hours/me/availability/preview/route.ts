import type { NextRequest } from "next/server";

import { previewMyOfficeHoursAvailability } from "@/lib/api/office-hours-me";
import { toBackendPayload } from "@/lib/office-hours-availability";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { officeHoursAvailabilitySchema } from "@/lib/server/office-hours-me-schemas";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

/** The meetings and requests a change to the hours would leave out, before it is saved (FR-OH-29). */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, officeHoursAvailabilitySchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await previewMyOfficeHoursAvailability(
        session.userId,
        toBackendPayload(body.data),
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("availabilitySettingsUpdateFailed"),
    });
  }
}
