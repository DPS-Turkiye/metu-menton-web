import { NextResponse } from "next/server";
import "server-only";

import { APP_URL } from "@/lib/const";

/**
 * A 403 for a state-changing call that did not come from this app's own pages, or null to go on. The office-hours
 * cookie is SameSite=None so it works inside Moodle's frame, which also lets another site's form send it; browsers
 * always name the origin of a POST, so a missing or foreign one is refused.
 */
export function refuseCrossSite(request: Request) {
  if (request.headers.get("origin") === new URL(APP_URL).origin) return null;
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
