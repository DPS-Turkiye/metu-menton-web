import type { OfficeHoursCalendarLink } from "@/interfaces/office-hours";
import { requireSuccess } from "@/lib/client/api";
import { httpClient } from "@/lib/http-client";

const PERSONAL = "/api/office-hours/calendar-feed";

function coursePath(courseId: string) {
  return `/api/office-hours/courses/${encodeURIComponent(courseId)}/calendar-feed`;
}

export async function getPersonalCalendarLink() {
  return requireSuccess(
    await httpClient.get<OfficeHoursCalendarLink>(PERSONAL),
  );
}

export async function resetPersonalCalendarLink() {
  return requireSuccess(
    await httpClient.post<OfficeHoursCalendarLink>(`${PERSONAL}/reset`),
  );
}

export async function getCourseCalendarLink(courseId: string) {
  return requireSuccess(
    await httpClient.get<OfficeHoursCalendarLink>(coursePath(courseId)),
  );
}

export async function resetCourseCalendarLink(courseId: string) {
  return requireSuccess(
    await httpClient.post<OfficeHoursCalendarLink>(
      `${coursePath(courseId)}/reset`,
    ),
  );
}
