import { fetchCourseCalendarFeed } from "@/lib/api/lti";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import {
  calendarLinkResponse,
  calendarLinksOff,
} from "@/lib/server/office-hours-calendar";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";
import { readUuidParam } from "@/lib/server/path-params";

/** The course's calendar link: its academics' office hours, with no student in it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const off = calendarLinksOff();
  if (off) return off;
  try {
    const user = await requireOfficeHoursUser();
    const course = await readUuidParam(
      (await params).courseId,
      "officeHoursFailed",
    );
    if (!course.ok) return course.response;
    return await calendarLinkResponse(
      await fetchCourseCalendarFeed(user.userId, course.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursFailed"),
    });
  }
}
