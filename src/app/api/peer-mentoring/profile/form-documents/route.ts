import type { NextRequest } from "next/server";
import { z } from "zod";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import { PeerDocumentVisibility } from "@/interfaces/peer-mentor-documents";
import {
  addPeerMentorFormDocument,
  fetchPeerMentorFormDocuments,
} from "@/lib/api/peer-mentor-documents";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/request-body";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

const formDocumentSchema = z.object({
  slot: z.enum(IskurDocumentSlot),
  visibility: z.enum(PeerDocumentVisibility),
});

/** The CV and transcript the signed-in mentor gave with their İŞKUR form. */
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(await fetchPeerMentorFormDocuments(session.userId));
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("documentsLoadFailed"),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const body = await readJsonBody(request, formDocumentSchema);
    if (!body.ok) return body.response;
    return backendResponse(
      await addPeerMentorFormDocument(session.userId, body.data),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("documentAddFailed"),
    });
  }
}
