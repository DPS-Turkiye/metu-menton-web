import type { MentorAvailabilitySlot } from "@/interfaces/mentor";
import {
  OfficeHoursRequestStatus,
  OfficeHoursRole,
  type OfficeHoursPerson,
  type OfficeHoursRequest,
  type OfficeHoursSlot,
} from "@/interfaces/office-hours";
import {
  formatPreferredSlot,
  parsePreferredSlotMachineValue,
  preferredSlotMachineValue,
  slotFromStartsAt,
} from "@/lib/mentor-availability-days";

// A Record, so a new role fails to compile until it says whom it meets.
const COUNTERPART: Record<OfficeHoursRole, "student" | "instructor"> = {
  [OfficeHoursRole.Instructor]: "student",
  [OfficeHoursRole.Student]: "instructor",
};

const OWN_SIDE: Record<OfficeHoursRole, "student" | "instructor"> = {
  [OfficeHoursRole.Instructor]: "instructor",
  [OfficeHoursRole.Student]: "student",
};

/** The viewer's own side of a request or meeting. */
export function ownSideOf(
  viewer: OfficeHoursRole,
  sides: { student: OfficeHoursPerson; instructor: OfficeHoursPerson },
) {
  return sides[OWN_SIDE[viewer]];
}

export function counterpartOf(
  viewer: OfficeHoursRole,
  sides: { student: OfficeHoursPerson; instructor: OfficeHoursPerson },
) {
  return sides[COUNTERPART[viewer]];
}

// The mentor slot columns are reused for office hours, so the slots take their shape.
export function asAvailabilitySlots(
  slots: readonly OfficeHoursSlot[],
): MentorAvailabilitySlot[] {
  return slots.map((slot) => ({
    id: slot.startsAt,
    startsAt: slot.startsAt,
    durationMinutes: slot.durationMinutes,
    booked: false,
  }));
}

export function slotLabel(machine: string, locale: string) {
  const slot = parsePreferredSlotMachineValue(machine);
  return (slot && formatPreferredSlot(slot, locale)) || machine;
}

export function machineSlotFromInstant(startsAt: string) {
  return preferredSlotMachineValue(slotFromStartsAt(startsAt));
}

export function meetingTimeLabel(startsAt: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(startsAt));
}

/** FR-OH-14: closer to the start than this, an academic has to say why they cancel, and the cancel counts as late. */
export const LATE_CANCEL_MS = 24 * 60 * 60 * 1000;

/** An accepted meeting can be called off until it starts; the backend checks the same. */
export function canCancelMeeting(request: OfficeHoursRequest, now: number) {
  return (
    request.status === OfficeHoursRequestStatus.Accepted &&
    request.meeting !== null &&
    Date.parse(request.meeting.startsAt) > now
  );
}

/**
 * Only the academic owes a reason, and only within 24 hours: the student was planning around the meeting. A student
 * may always cancel without one.
 */
export function cancelNeedsReason(
  viewer: OfficeHoursRole,
  startsAt: string,
  now: number,
) {
  return (
    viewer === OfficeHoursRole.Instructor &&
    Date.parse(startsAt) - now < LATE_CANCEL_MS
  );
}
