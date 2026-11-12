import { NextResponse, type NextRequest } from "next/server";

import { fetchCalendarFeed } from "@/lib/api/lti";
import { feedLocale, feedToken } from "@/lib/office-hours-calendar";

// Moodle fetches this from its own server with no session, so this route is open: the token is the only key, and
// the backend decides whether it is one. Answers are plain text, since a calendar client shows nothing else.
const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

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
  const token = feedToken((await params).token);
  if (token === null) return plain(404, "Not found");
  try {
    const response = await fetchCalendarFeed(
      token,
      feedLocale(request.nextUrl.searchParams.get("lang")),
    );
    if (response.status === 404) return plain(404, "Not found");
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
