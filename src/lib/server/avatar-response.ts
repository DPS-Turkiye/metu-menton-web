import { NextResponse } from "next/server";
import "server-only";

import { apiText } from "@/lib/server/api-response";
import type { BackendResponse } from "@/lib/server/backend-client";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

// A list asks for every person's photo again on each page, so the answer, "none" included, is kept a few minutes.
// Vary keeps one browser's cache from handing a photo to the next account that signs in on it.
const CACHED = {
  "Cache-Control": "private, max-age=600",
  Vary: "Cookie",
};

/**
 * The browser's answer for an avatar `<img>`: the photo, or 204 when there is none to show. "No photo" and "not
 * yours to see" stay the same answer, and a 204 is not a failed request: the initials simply stay.
 */
export async function avatarResponse(photo: BackendResponse<ArrayBuffer>) {
  if (photo.status === 404) {
    return new NextResponse(null, { status: 204, headers: CACHED });
  }
  const type = String(photo.headers["content-type"] ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  if (photo.status !== 200 || !type || !AVATAR_TYPES.includes(type)) {
    return NextResponse.json(
      { message: await apiText("photoLoadFailed") },
      { status: photo.status === 200 ? 502 : photo.status },
    );
  }
  return new NextResponse(Buffer.from(photo.data), {
    status: 200,
    headers: {
      ...CACHED,
      "Content-Type": type,
      "Content-Disposition": "inline",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
