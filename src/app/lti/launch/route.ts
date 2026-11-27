import type { NextRequest } from "next/server";

import { completeLtiLaunch } from "@/lib/api/lti";
import {
  OFFICE_HOURS_COMING_SOON_PATH,
  officeHoursCoursePath,
} from "@/lib/lti";
import {
  ltiFailureResponse,
  ltiRefusalResponse,
  redirectTo,
} from "@/lib/server/lti-response";
import { saveOfficeHoursUser } from "@/lib/server/office-hours-session";
import { officeHoursEnabled } from "@/lib/server/office-hours-switch";

// The launch is the sign-in: office-hours people have no Menton account, so a verified launch is what opens
// their own session.
export async function POST(request: NextRequest) {
  // While Office Hours is coming soon no launch is completed, so no Office Hours session is opened.
  if (!officeHoursEnabled()) {
    return redirectTo(request, OFFICE_HOURS_COMING_SOON_PATH);
  }
  try {
    const response = await completeLtiLaunch(
      Object.fromEntries(await request.formData()),
    );
    if (response.status !== 200) {
      return ltiRefusalResponse(request, response.status);
    }
    const launch = response.data;
    await saveOfficeHoursUser({
      userId: launch.userId,
      fullName: launch.fullName,
    });
    return redirectTo(request, officeHoursCoursePath(launch.courseId));
  } catch (error) {
    return ltiFailureResponse(request, error);
  }
}
