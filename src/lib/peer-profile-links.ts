import {
  AppointmentKind,
  AppointmentSide,
  type Appointment,
} from "@/interfaces/appointment";
import { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import type { PeerMentoringRequest } from "@/interfaces/peer-mentoring";

/** The public page of a peer mentor, for students. */
export function peerMentorHref(userId: string) {
  return `/student/peer-mentoring/mentors/${encodeURIComponent(userId)}`;
}

/** A mentee's page, for the peer mentor they asked. */
export function peerMenteeHref(userId: string) {
  return `/student/peer-mentoring/mentees/${encodeURIComponent(userId)}`;
}

const CLOSED: readonly MentorshipRequestStatus[] = [
  MentorshipRequestStatus.Declined,
  MentorshipRequestStatus.Withdrawn,
];

/** The mentee of a received request; null once it is declined or withdrawn, when the mentor may not read them. */
export function requestMenteeHref(
  request: Pick<PeerMentoringRequest, "mentee" | "status">,
) {
  return CLOSED.includes(request.status)
    ? null
    : peerMenteeHref(request.mentee.userId);
}

/** The other person of a peer meeting, from the viewer's side; Office Hours pictures open nothing. */
export function appointmentProfileHref(
  appointment: Pick<Appointment, "kind" | "side" | "counterpart">,
) {
  if (appointment.kind !== AppointmentKind.PeerMentoring) return null;
  return appointment.side === AppointmentSide.Mentor
    ? peerMenteeHref(appointment.counterpart.userId)
    : peerMentorHref(appointment.counterpart.userId);
}
