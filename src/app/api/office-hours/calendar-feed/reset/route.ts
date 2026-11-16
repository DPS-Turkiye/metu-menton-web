import { resetPersonalCalendarFeed } from "@/lib/api/lti";
import { apiErrorResponse, apiText } from "@/lib/server/api-response";
import {
  calendarLinkResponse,
  calendarLinksOff,
} from "@/lib/server/office-hours-calendar";
import { requireOfficeHoursUser } from "@/lib/server/office-hours-session";
import { refuseCrossSite } from "@/lib/server/same-origin";

/** A new personal link; the old one stops working. */
export async function POST(request: Request) {
  const off = calendarLinksOff();
  if (off) return off;
  const crossSite = refuseCrossSite(request);
  if (crossSite) return crossSite;
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
