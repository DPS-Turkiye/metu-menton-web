import type { NextRequest } from "next/server";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import {
  removeIskurOnboardingDocument,
  uploadIskurOnboardingDocument,
} from "@/lib/api/iskur-onboarding";
import {
  apiErrorResponse,
  apiText,
  backendResponse,
} from "@/lib/server/api-response";
import { readIskurDocumentUpload } from "@/lib/server/iskur-document-upload";
import { readEnumParam } from "@/lib/server/path-params";
import { SessionRequiredError } from "@/lib/server/session-error";
import { getSessionUser } from "@/lib/session";

type Context = { params: Promise<{ slot: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const slot = await readEnumParam(
      (await params).slot,
      IskurDocumentSlot,
      "iskurDocumentInvalid",
    );
    if (!slot.ok) return slot.response;
    const upload = await readIskurDocumentUpload(request);
    if (!upload.ok) return upload.response;
    return backendResponse(
      await uploadIskurOnboardingDocument(
        session.userId,
        slot.value,
        upload.form,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurDocumentUploadFailed"),
    });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const session = await getSessionUser();
    if (!session) throw new SessionRequiredError();
    const slot = await readEnumParam(
      (await params).slot,
      IskurDocumentSlot,
      "iskurDocumentInvalid",
    );
    if (!slot.ok) return slot.response;
    return backendResponse(
      await removeIskurOnboardingDocument(session.userId, slot.value),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("iskurDocumentUploadFailed"),
    });
  }
}
