import { describe, expect, it } from "vitest";

import { AppointmentKind, AppointmentSide } from "@/interfaces/appointment";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import {
  appointmentProfileHref,
  peerMenteeHref,
  peerMentorHref,
  requestMenteeHref,
} from "@/lib/peer-profile-links";

const person = { userId: "u 1", fullName: "Zeynep Koç", department: null };
const counterpart = { ...person, title: null };

describe("profile links", () => {
  it("names the mentor's and the mentee's own pages", () => {
    expect(peerMentorHref("u 1")).toBe("/student/peer-mentoring/mentors/u%201");
    expect(peerMenteeHref("u 1")).toBe("/student/peer-mentoring/mentees/u%201");
  });

  it.each([
    [MentorshipRequestStatus.Pending, true],
    [MentorshipRequestStatus.MoreInfoRequested, true],
    [MentorshipRequestStatus.CounterProposed, true],
    [MentorshipRequestStatus.Accepted, true],
    [MentorshipRequestStatus.Declined, false],
    [MentorshipRequestStatus.Withdrawn, false],
  ])("opens the mentee of a %s request: %s", (status, opens) => {
    expect(requestMenteeHref({ mentee: person, status })).toBe(
      opens ? peerMenteeHref(person.userId) : null,
    );
  });

  it("opens the other side of a peer meeting, and nobody on Office Hours", () => {
    const peer = { kind: AppointmentKind.PeerMentoring, counterpart };
    expect(
      appointmentProfileHref({ ...peer, side: AppointmentSide.Mentor }),
    ).toBe(peerMenteeHref(person.userId));
    expect(
      appointmentProfileHref({ ...peer, side: AppointmentSide.Mentee }),
    ).toBe(peerMentorHref(person.userId));
    expect(
      appointmentProfileHref({
        kind: AppointmentKind.OfficeHours,
        side: AppointmentSide.Mentee,
        counterpart,
      }),
    ).toBeNull();
  });
});
