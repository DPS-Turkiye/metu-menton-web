import { NextResponse, type NextRequest } from "next/server";

import { fetchCalendarFeed } from "@/lib/api/lti";
import {
  feedLocale,
  feedToken,
  isCalendarFeedEnabled,
} from "@/lib/office-hours-calendar";
import { clientAddress, createRateLimiter } from "@/lib/server/rate-limit";

// Moodle fetches this from its own server with no session, so this route is open: the token is the only key, and
// the backend decides whether it is one. Answers are plain text, since a calendar client shows nothing else.
const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// Per address, before the backend's per-link limit. Moodle fetches every subscription from its own server, one
// address for the whole university, so the budget is wide: it stops a flood, not a busy Moodle.
const FEED_FETCHES_PER_MINUTE = 300;
const takeFetch = createRateLimiter(FEED_FETCHES_PER_MINUTE, 60_000);

const BACKEND_RETRY_AFTER_HEADER = "x-rate-limit-retry-after-seconds";

function tooMany(retryAfterSeconds: number) {
  const response = plain(429, "Too many requests");
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

function plain(status: number, text: string) {
  return new NextResponse(text, {
    status,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isCalendarFeedEnabled()) return plain(404, "Not found");
  const turn = takeFetch(clientAddress(request.headers));
  if (!turn.allowed) return tooMany(turn.retryAfterSeconds);
  const token = feedToken((await params).token);
  if (token === null) return plain(404, "Not found");
  try {
    const response = await fetchCalendarFeed(
      token,
      feedLocale(request.nextUrl.searchParams.get("lang")),
    );
    if (response.status === 404) return plain(404, "Not found");
    // The backend's limit for this link: passed on, so the calendar waits instead of reading an outage.
    if (response.status === 429) {
      return tooMany(
        Number(response.headers[BACKEND_RETRY_AFTER_HEADER] ?? 60) || 60,
      );
    }
    if (response.status !== 200) return plain(502, "Calendar unavailable");
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="office-hours.ics"',
      },
    });
  } catch (error) {
    console.error("Office hours calendar feed failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return plain(502, "Calendar unavailable");
  }
}
