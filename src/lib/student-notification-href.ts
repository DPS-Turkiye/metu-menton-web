import {
  PEER_MENTOR_GIVE_HREF,
  PEER_MENTORSHIPS_HREF,
} from "@/lib/peer-mentoring";

const APPOINTMENTS_HREF = "/student/appointments";

/** The Menton screens a mentoring notification names, and the student workspace's screen for the same thing. */
const STUDENT_SCREENS: Record<string, string> = {
  "/mentor-request/status": PEER_MENTORSHIPS_HREF,
  "/mentorships": PEER_MENTORSHIPS_HREF,
  "/mentor-dashboard": PEER_MENTOR_GIVE_HREF,
  "/mentor-dashboard/messages": PEER_MENTOR_GIVE_HREF,
  "/mentor-dashboard/calendar": APPOINTMENTS_HREF,
  "/dashboard": APPOINTMENTS_HREF,
};

/**
 * Peer mentoring shares its requests and meetings with startup mentoring, so the backend's notifications link to the
 * Menton screens; an ODTÜ student opens the same thing in their own workspace. Any other link stays as it is.
 */
export function studentNotificationHref(href: string) {
  const path = href.split(/[?#]/, 1)[0] ?? href;
  return STUDENT_SCREENS[path] ?? href;
}
