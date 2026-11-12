import { resetCourseCalendarFeed } from "@/lib/api/lti";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import { calendarLinkResponse } from "@/lib/server/office-hours-calendar";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";
import { readUuidParam } from "@/lib/server/path-params";

/** A new course link, for the course's academics only (the backend answers a student with 403). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const user = await requireOfficeHoursUser();
    const course = await readUuidParam(
      (await params).courseId,
      "officeHoursFailed",
    );
    if (!course.ok) return course.response;
    return await calendarLinkResponse(
      await resetCourseCalendarFeed(user.userId, course.id),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursFailed"),
    });
  }
}
