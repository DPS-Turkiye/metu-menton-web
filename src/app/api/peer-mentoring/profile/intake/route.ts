import type { NextRequest } from "next/server";
import { z } from "zod";

import { savePeerMentorIntake } from "@/lib/api/peer-mentoring";
import { PEER_CAPACITY_MAX, PEER_CAPACITY_MIN } from "@/lib/peer-mentoring";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

const peerMentorIntakeSchema = z.object({
  menteeCapacity: z
    .number()
    .int()
    .min(PEER_CAPACITY_MIN)
    .max(PEER_CAPACITY_MAX)
    .nullable(),
  acceptingRequests: z.boolean(),
});

/** "Kapasitem" on Mentor profilim: the capacity and the new-requests switch, saved at once. */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, peerMentorIntakeSchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await savePeerMentorIntake(session.userId, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("peerMentorProfileSaveFailed"),
    });
  }
}
