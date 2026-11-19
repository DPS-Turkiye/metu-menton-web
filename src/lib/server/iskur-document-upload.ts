import { NextResponse, type NextRequest } from "next/server";
import "server-only";

import { ISKUR_DOCUMENT_MAX_BYTES } from "@/lib/iskur-onboarding";
import { apiText, type ApiErrorCode } from "@/lib/server/api-response";

/** Room for the form's boundaries on top of the largest file. */
const FORM_OVERHEAD_BYTES = 16 * 1024;
const INVALID_REQUEST: ApiErrorCode = "INVALID_REQUEST";

export type IskurDocumentUpload =
  { ok: true; form: FormData } | { ok: false; response: NextResponse };

async function refused(): Promise<IskurDocumentUpload> {
  return {
    ok: false,
    response: NextResponse.json(
      {
        code: INVALID_REQUEST,
        message: await apiText("iskurDocumentInvalid"),
        fields: [],
      },
      { status: 400 },
    ),
  };
}

/**
 * An onboarding CV or transcript, checked before it is passed on: a body no larger than one file can make and a
 * non-empty file within 10 MB. The backend checks it is really a PDF. The form is rebuilt from the file alone, so
 * nothing else the browser sends reaches the backend.
 */
export async function readIskurDocumentUpload(
  request: NextRequest,
): Promise<IskurDocumentUpload> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > ISKUR_DOCUMENT_MAX_BYTES + FORM_OVERHEAD_BYTES) return refused();
  const sent = await request.formData().catch(() => null);
  const file = sent?.get("file") ?? null;
  if (
    file === null ||
    typeof file === "string" ||
    file.size === 0 ||
    file.size > ISKUR_DOCUMENT_MAX_BYTES
  ) {
    return refused();
  }
  const form = new FormData();
  form.set("file", file);
  return { ok: true, form };
}
