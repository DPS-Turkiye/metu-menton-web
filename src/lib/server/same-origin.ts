import { NextResponse } from "next/server";
import "server-only";

import { APP_URL } from "@/lib/const";

/**
 * The origins this app's own pages are served from: APP_URL's, plus any listed in APP_ALLOWED_ORIGINS
 * (comma-separated) for a deployment reachable under more than one. A malformed entry throws, so a typo shows as a
 * failure rather than quietly letting nothing, or the wrong thing, through.
 */
export function appOrigins(): Set<string> {
  const origins = new Set([new URL(APP_URL).origin]);
  for (const entry of (process.env.APP_ALLOWED_ORIGINS ?? "").split(",")) {
    const value = entry.trim();
    if (value !== "") origins.add(new URL(value).origin);
  }
  return origins;
}

/**
 * A 403 for a write that did not come from this app's own pages, or null to go on. The office-hours cookie is
 * SameSite=None so it travels inside Moodle's frame, which also lets another site's form send it. Browsers name the
 * origin of every POST and PUT, same-origin ones included, so a missing or "null" one is refused too. Our pages in
 * Moodle's frame are still our origin, so their calls pass.
 */
export function refuseCrossSite(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== null && appOrigins().has(origin)) return null;
  return NextResponse.json({ code: "CROSS_SITE_REFUSED" }, { status: 403 });
}
