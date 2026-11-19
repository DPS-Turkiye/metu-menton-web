import { NextResponse } from "next/server";

import { IskurDocumentSlot } from "@/interfaces/iskur-onboarding";
import { fetchIskurApplicationDocument } from "@/lib/api/iskur-onboarding";
import { contentDispositionHeader } from "@/lib/content-disposition";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import { readEnumParam, readUuidParam } from "@/lib/server/path-params";
import { requireCoordinatorOrAdminSession } from "@/lib/server/require-coordinator";

const PDF = "application/pdf";

type Context = {
  params: Promise<{ id: string; userId: string; slot: string }>;
};

/**
 * An intern's CV or transcript, for the program's coordinators. It always leaves as an attachment, so an uploaded
 * file is never rendered in this origin.
 */
export async function GET(_request: Request, { params }: Context) {
  try {
    const auth = await requireCoordinatorOrAdminSession();
    if (!auth.ok) return auth.response;
    const { id, userId, slot } = await params;
    const program = await readUuidParam(id, "invalidRequestFields");
    if (!program.ok) return program.response;
    const intern = await readUuidParam(userId, "invalidRequestFields");
    if (!intern.ok) return intern.response;
    const document = await readEnumParam(
      slot,
      IskurDocumentSlot,
      "iskurDocumentInvalid",
    );
    if (!document.ok) return document.response;
    const file = await fetchIskurApplicationDocument(
      auth.session.userId,
      program.id,
      intern.id,
      document.value,
    );
    if (file.status !== 200) {
      return NextResponse.json(
        { message: await apiText("fileOpenFailed") },
        { status: file.status },
      );
    }
    const disposition = file.headers["content-disposition"];
    return new NextResponse(Buffer.from(file.data), {
      status: 200,
      headers: {
        "Content-Type":
          file.headers["content-type"] === PDF
            ? PDF
            : "application/octet-stream",
        "Content-Disposition":
          typeof disposition === "string" && /^attachment/i.test(disposition)
            ? disposition
            : contentDispositionHeader("attachment", "document.pdf"),
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("fileOpenFailed"),
    });
  }
}
