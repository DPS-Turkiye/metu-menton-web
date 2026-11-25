import { describe, expect, it } from "vitest";

import { studentNotificationHref } from "@/lib/student-notification-href";

describe("studentNotificationHref", () => {
  it.each([
    ["/mentor-request/status?request=r1", "/student/peer-mentoring?tab=mine"],
    ["/mentorships", "/student/peer-mentoring?tab=mine"],
    ["/mentor-dashboard", "/student/peer-mentoring?as=MENTOR"],
    [
      "/mentor-dashboard/messages?thread=1",
      "/student/peer-mentoring?as=MENTOR",
    ],
    ["/mentor-dashboard/calendar", "/student/appointments"],
    ["/dashboard", "/student/appointments"],
  ])("opens %s on the student's own screen", (href, expected) => {
    expect(studentNotificationHref(href)).toBe(expected);
  });

  it.each([
    "/student/team/tasks/t1",
    "/mentor-dashboard-archive",
    "/meetings/research?id=m1",
  ])("leaves %s as it is", (href) => {
    expect(studentNotificationHref(href)).toBe(href);
  });
});
