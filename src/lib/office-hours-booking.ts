import { OfficeHoursAppointmentAction } from "@/interfaces/academician-office-hours";
import type { MentorAvailabilitySlot } from "@/interfaces/mentor";
import {
  OfficeHoursRole,
  type OfficeHoursPerson,
  type OfficeHoursRequest,
  type OfficeHoursSlot,
} from "@/interfaces/office-hours";
import { cancelNeedsReason } from "@/lib/academician-calendar";
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

/** The backend's limit on a cancel reason (`@Size(max = 2000)`); the field stops there instead of a 400. */
export const CANCEL_REASON_MAX_LENGTH = 2000;

/**
 * The backend offers CANCEL while the meeting is ahead. The list is as of the last load, so a meeting that has
 * started since stops offering it here too; the backend refuses it with 409 either way.
 */
export function canCancelMeeting(request: OfficeHoursRequest, now: Date) {
  return (
    request.allowedActions.includes(OfficeHoursAppointmentAction.Cancel) &&
    request.meeting !== null &&
    Date.parse(request.meeting.startsAt) > now.getTime()
  );
}

/**
 * Only the academic owes a reason, and only within 24 hours: the student was planning around the meeting. A student
 * may always cancel without one.
 */
export function courseCancelNeedsReason(
  viewer: OfficeHoursRole,
  meeting: OfficeHoursSlot,
  now: Date,
) {
  return (
    viewer === OfficeHoursRole.Instructor && cancelNeedsReason(meeting, now)
  );
}
