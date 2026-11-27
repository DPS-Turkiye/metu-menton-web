import { LtiLaunchError } from "@/interfaces/office-hours";

export function ltiErrorPath(reason: LtiLaunchError) {
  return `/office-hours/launch-error?${new URLSearchParams({ reason })}`;
}

export function ltiErrorFor(status: number): LtiLaunchError {
  if (status === 403) return LtiLaunchError.NoRole;
  if (status === 400 || status === 401) return LtiLaunchError.Rejected;
  return LtiLaunchError.Unavailable;
}

export function isLtiLaunchError(value: unknown): value is LtiLaunchError {
  return Object.values(LtiLaunchError).includes(value as LtiLaunchError);
}

/** Where an ODTÜClass launch lands while Office Hours is coming soon. */
export const OFFICE_HOURS_COMING_SOON_PATH = "/office-hours/coming-soon";

export function officeHoursCoursePath(courseId: string) {
  return `/office-hours/courses/${encodeURIComponent(courseId)}`;
}
