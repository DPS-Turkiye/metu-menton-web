import { resetPersonalCalendarFeed } from "@/lib/api/lti";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import { calendarLinkResponse } from "@/lib/server/office-hours-calendar";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";

/** A new personal link; the old one stops working. */
export async function POST() {
  try {
    const user = await requireOfficeHoursUser();
    return await calendarLinkResponse(
      await resetPersonalCalendarFeed(user.userId),
    );
  } catch (error) {
    return apiErrorResponse(error, {
      message: await apiText("officeHoursFailed"),
    });
  }
}
