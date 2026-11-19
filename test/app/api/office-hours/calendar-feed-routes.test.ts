import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as resetPersonalLink } from "@/app/api/office-hours/calendar-feed/reset/route";
import { GET as personalLink } from "@/app/api/office-hours/calendar-feed/route";
import { GET as feed } from "@/app/api/office-hours/calendar/[token]/route";
import { POST as resetCourseLink } from "@/app/api/office-hours/courses/[courseId]/calendar-feed/reset/route";
import { GET as courseLink } from "@/app/api/office-hours/courses/[courseId]/calendar-feed/route";
import {
  fetchCalendarFeed,
  fetchCourseCalendarFeed,
  fetchPersonalCalendarFeed,
  resetCourseCalendarFeed,
  resetPersonalCalendarFeed,
} from "@/lib/api/lti";
import { APP_URL } from "@/lib/const";
import { Locale } from "@/lib/i18n";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";
import { SessionRequiredError } from "@/lib/server/session-error";
import { backendRefusal, backendResponse } from "@test/fixtures/route-handlers";

vi.mock("@/lib/api/lti", () => ({
  fetchCalendarFeed: vi.fn(),
  fetchCourseCalendarFeed: vi.fn(),
  fetchPersonalCalendarFeed: vi.fn(),
  resetCourseCalendarFeed: vi.fn(),
  resetPersonalCalendarFeed: vi.fn(),
}));
vi.mock("@/lib/server/office-hours-session", () => ({
  requireOfficeHoursUser: vi.fn(),
}));

const TOKEN = "t".repeat(43);
const COURSE_ID = "8d3c3f0e-6f1a-4c1e-9a55-2f4f8a1b7c10";
const CALENDAR = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";

function feedRequest(segment: string, query = "", forwardedFor?: string) {
  return feed(
    new NextRequest(
      `http://localhost/api/office-hours/calendar/${segment}${query}`,
      forwardedFor === undefined
        ? undefined
        : { headers: { "x-forwarded-for": forwardedFor } },
    ),
    { params: Promise.resolve({ token: segment }) },
  );
}

/** A POST from this app's own page, as a browser sends it. */
function fromApp() {
  return new Request("http://localhost", {
    method: "POST",
    headers: { origin: new URL(APP_URL).origin },
  });
}

function course(courseId: string) {
  return { params: Promise.resolve({ courseId }) };
}

describe("office hours calendar feed (the open route Moodle fetches)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_OFFICE_HOURS_CALENDAR_FEED_ENABLED", "true");
  });

  it("lets one address fetch 300 times a minute, then asks it to wait", async () => {
    vi.mocked(fetchCalendarFeed).mockResolvedValue(backendResponse(CALENDAR));
    for (let i = 0; i < 300; i++) {
      expect((await feedRequest(TOKEN, "", "198.51.100.7")).status).toBe(200);
    }

    const refused = await feedRequest(TOKEN, "", "198.51.100.7");

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(fetchCalendarFeed).toHaveBeenCalledTimes(300);
    expect((await feedRequest(TOKEN, "", "198.51.100.8")).status).toBe(200);
  });

  it("serves the backend's calendar as an uncached, unindexed .ics", async () => {
    vi.mocked(fetchCalendarFeed).mockResolvedValue(backendResponse(CALENDAR));

    const response = await feedRequest(`${TOKEN}.ics`, "?lang=en");

    expect(fetchCalendarFeed).toHaveBeenCalledWith(TOKEN, Locale.En);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(await response.text()).toBe(CALENDAR);
  });

  it("never asks the backend about something that can't be a token", async () => {
    const response = await feedRequest("..%2F..%2Fusers");

    expect(response.status).toBe(404);
    expect(fetchCalendarFeed).not.toHaveBeenCalled();
  });

  it("passes the backend's limit for a link on as a 429 with its wait", async () => {
    vi.mocked(fetchCalendarFeed).mockResolvedValue({
      ...backendRefusal(429),
      headers: { "x-rate-limit-retry-after-seconds": "42" },
    });

    const response = await feedRequest(TOKEN, "", "198.51.100.9");

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
  });

  it("answers an unknown or reset link with 404, and any other failure with 502", async () => {
    vi.mocked(fetchCalendarFeed).mockResolvedValueOnce(backendRefusal(404));
    expect((await feedRequest(TOKEN)).status).toBe(404);

    vi.mocked(fetchCalendarFeed).mockResolvedValueOnce(backendRefusal(500));
    expect((await feedRequest(TOKEN)).status).toBe(502);

    vi.mocked(fetchCalendarFeed).mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = await feedRequest(TOKEN);
    expect(failed.status).toBe(502);
    expect(failed.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(fetchCalendarFeed).toHaveBeenLastCalledWith(TOKEN, Locale.Tr);
  });
});

describe("office hours calendar links (for the signed-in person)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_OFFICE_HOURS_CALENDAR_FEED_ENABLED", "true");
    vi.mocked(requireOfficeHoursUser).mockResolvedValue({
      userId: "user-1",
      fullName: "Ali Kaya",
    });
  });

  it("turns the backend's token into the whole link, in the person's language", async () => {
    vi.mocked(fetchPersonalCalendarFeed).mockResolvedValue(
      backendResponse({ token: TOKEN }),
    );

    expect(await (await personalLink()).json()).toEqual({
      url: `${APP_URL}/api/office-hours/calendar/${TOKEN}.ics?lang=tr`,
    });
    expect(fetchPersonalCalendarFeed).toHaveBeenCalledWith("user-1");
  });

  it("resets the person's and the course's links for the signed-in person", async () => {
    vi.mocked(resetPersonalCalendarFeed).mockResolvedValue(
      backendResponse({ token: TOKEN }),
    );
    vi.mocked(fetchCourseCalendarFeed).mockResolvedValue(
      backendResponse({ token: TOKEN }),
    );

    expect((await resetPersonalLink(fromApp())).status).toBe(200);
    expect(resetPersonalCalendarFeed).toHaveBeenCalledWith("user-1");
    expect(
      (await courseLink(new Request("http://localhost"), course(COURSE_ID)))
        .status,
    ).toBe(200);
    expect(fetchCourseCalendarFeed).toHaveBeenCalledWith("user-1", COURSE_ID);
  });

  it("passes on the backend's 403 when a student resets the course's shared link", async () => {
    vi.mocked(resetCourseCalendarFeed).mockResolvedValue(
      backendRefusal(403, {
        message: "Only the course's academics can reset its link.",
      }),
    );

    expect((await resetCourseLink(fromApp(), course(COURSE_ID))).status).toBe(
      403,
    );
  });

  it("refuses a course id that is not a uuid before the backend is asked", async () => {
    const response = await courseLink(
      new Request("http://localhost"),
      course(".."),
    );

    expect(response.status).toBe(400);
    expect(fetchCourseCalendarFeed).not.toHaveBeenCalled();
  });

  it("needs an office-hours session", async () => {
    vi.mocked(requireOfficeHoursUser).mockRejectedValue(
      new SessionRequiredError(),
    );

    expect((await personalLink()).status).toBe(401);
    expect((await resetCourseLink(fromApp(), course(COURSE_ID))).status).toBe(
      401,
    );
    expect(fetchPersonalCalendarFeed).not.toHaveBeenCalled();
    expect(resetCourseCalendarFeed).not.toHaveBeenCalled();
  });

  it("refuses a reset sent from another site or with no origin, before the backend is asked", async () => {
    const foreign = new Request("http://localhost", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });

    expect((await resetPersonalLink(foreign)).status).toBe(403);
    expect(
      (
        await resetCourseLink(
          new Request("http://localhost"),
          course(COURSE_ID),
        )
      ).status,
    ).toBe(403);
    expect(resetPersonalCalendarFeed).not.toHaveBeenCalled();
    expect(resetCourseCalendarFeed).not.toHaveBeenCalled();
  });

  it("marks a link answer as never to be cached", async () => {
    vi.mocked(fetchPersonalCalendarFeed).mockResolvedValue(
      backendResponse({ token: TOKEN }),
    );

    expect((await personalLink()).headers.get("Cache-Control")).toBe(
      "no-store",
    );
  });
});

describe("office hours calendar routes while the links are off", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_OFFICE_HOURS_CALENDAR_FEED_ENABLED", "");
  });

  it("answers 404 on all five routes and asks the backend nothing", async () => {
    const answers = await Promise.all([
      feedRequest(TOKEN),
      personalLink(),
      resetPersonalLink(new Request("http://localhost")),
      courseLink(new Request("http://localhost"), course(COURSE_ID)),
      resetCourseLink(new Request("http://localhost"), course(COURSE_ID)),
    ]);

    expect(answers.map((answer) => answer.status)).toEqual([
      404, 404, 404, 404, 404,
    ]);
    expect(requireOfficeHoursUser).not.toHaveBeenCalled();
    expect(fetchCalendarFeed).not.toHaveBeenCalled();
    expect(fetchPersonalCalendarFeed).not.toHaveBeenCalled();
    expect(resetPersonalCalendarFeed).not.toHaveBeenCalled();
    expect(fetchCourseCalendarFeed).not.toHaveBeenCalled();
    expect(resetCourseCalendarFeed).not.toHaveBeenCalled();
  });
});
