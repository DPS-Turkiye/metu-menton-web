import type { NextRequest } from "next/server";

import {
  fetchOwnPeerMentorDocuments,
  uploadPeerMentorDocument,
} from "@/lib/api/peer-mentor-documents";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readPeerEvidenceUpload } from "@/lib/server/peer-evidence-upload";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    return backendResponse(await fetchOwnPeerMentorDocuments(session.userId));
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
    const upload = await readPeerEvidenceUpload(request);
    if (!upload.ok) return upload.response;
    return backendResponse(
      await uploadPeerMentorDocument(session.userId, upload.form),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("documentAddFailed"),
    });
  }
}
