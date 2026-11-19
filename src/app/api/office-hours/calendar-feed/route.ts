import { fetchPersonalCalendarFeed } from "@/lib/api/lti";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import {
  calendarLinkResponse,
  calendarLinksOff,
} from "@/lib/server/office-hours-calendar";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";

/** The signed-in person's own calendar link: their meetings, for Moodle's calendar. */
export async function GET() {
  const off = calendarLinksOff();
  if (off) return off;
  try {
    const user = await requireOfficeHoursUser();
    return await calendarLinkResponse(
      await fetchPersonalCalendarFeed(user.userId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursFailed"),
    });
  }
}
