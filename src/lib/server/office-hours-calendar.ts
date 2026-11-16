import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import "server-only";

import type { OfficeHoursCalendarFeedToken } from "@/lib/api/lti";
import {
  calendarFeedUrl,
  feedLocale,
  isCalendarFeedEnabled,
} from "@/lib/office-hours-calendar";
import { backendResponse } from "@/lib/server/api-response";
import type { BackendResponse } from "@/lib/server/backend-client";

/**
 * The backend hands out only the token; this server knows its own public address, so it answers with the whole
 * link, in the language the person reads the app in.
 */
export async function calendarLinkResponse(
  response: BackendResponse<OfficeHoursCalendarFeedToken>,
) {
  if (response.status !== 200) return backendResponse(response);
  return NextResponse.json(
    {
      url: calendarFeedUrl(response.data.token, feedLocale(await getLocale())),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** A 404 for the link routes while the links are off, or null to go on. */
export function calendarLinksOff() {
  if (isCalendarFeedEnabled()) return null;
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
