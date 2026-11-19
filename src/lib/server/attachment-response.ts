import { NextResponse } from "next/server";
import "server-only";

import { contentDispositionHeader } from "@/lib/content-disposition";
import type { BackendResponse } from "@/lib/server/backend-client";

/**
 * A file the backend handed over, passed on for saving only: always an attachment of opaque bytes with nosniff and a
 * sandbox, so nothing a user uploaded is ever rendered or run in this origin, whatever its type. Never cached: every
 * download is checked against who asks.
 */
export function attachmentResponse(
  file: BackendResponse<ArrayBuffer>,
  fallbackName: string,
) {
  const disposition = file.headers["content-disposition"];
  return new NextResponse(Buffer.from(file.data), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        typeof disposition === "string" && /^attachment/i.test(disposition)
          ? disposition
          : contentDispositionHeader("attachment", fallbackName),
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
