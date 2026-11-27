import { NextResponse } from "next/server";
import "server-only";

import { apiText } from "@/lib/server/api-response";
import type { BackendResponse } from "@/lib/server/backend-client";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

// A list asks for every person's photo again on each page, so answers are kept briefly: a photo a few minutes, "none"
// only one, so a new photo or a new mentorship shows soon. Vary keeps one browser's cache from handing a photo to the
// next account that signs in on it.
const PHOTO_CACHE = { "Cache-Control": "private, max-age=300", Vary: "Cookie" };
const NONE_CACHE = { "Cache-Control": "private, max-age=60", Vary: "Cookie" };

function imageType(header: unknown) {
  if (typeof header !== "string") return null;
  const type = header.split(";")[0]?.trim().toLowerCase() ?? "";
  return AVATAR_TYPES.includes(type) ? type : null;
}

/**
 * The browser's answer for an avatar `<img>`: the photo, or 204 when there is none to show. "No photo" and "not
 * yours to see" stay the same answer, and a 204 is not a failed request: the initials simply stay. Anything else the
 * backend says is this app's own 502, so a stray 401 is never read as a lost session.
 */
export async function avatarResponse(photo: BackendResponse<ArrayBuffer>) {
  if (photo.status === 404) {
    return new NextResponse(null, { status: 204, headers: NONE_CACHE });
  }
  const type = imageType(photo.headers["content-type"]);
  if (photo.status !== 200 || !type) {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: await apiText("photoLoadFailed"),
      },
      { status: 502 },
    );
  }
  return new NextResponse(Buffer.from(photo.data), {
    status: 200,
    headers: {
      ...PHOTO_CACHE,
      "Content-Type": type,
      "Content-Disposition": "inline",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
